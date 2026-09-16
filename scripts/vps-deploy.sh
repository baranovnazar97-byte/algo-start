#!/usr/bin/env bash
# Invoked after uploading source; also used by the GitHub weekly workflow.
set -Eeuo pipefail
umask 077

INSTALL_DIR="${1:-/opt/algorithmika}"
PUBLIC_HOST="${2:-81.90.25.140}"
STAGE_DIR="${3:?Pass the extracted release directory}"
REVISION="${4:-}"

[[ ${EUID} == 0 ]] || { echo 'Run this script as root.' >&2; exit 1; }
[[ "$INSTALL_DIR" == /opt/algorithmika && ! -L "$INSTALL_DIR" ]] || exit 1
[[ "$PUBLIC_HOST" =~ ^[a-zA-Z0-9.-]+$ ]] || exit 1
[[ -z "$REVISION" || "$REVISION" =~ ^[a-f0-9]{40}$ ]] || exit 1
[[ -f "$STAGE_DIR/docker-compose.yml" ]] || { echo 'Release is missing compose.' >&2; exit 1; }

# Never adopt or overwrite an unrelated existing project directory.
if [[ -d "$INSTALL_DIR" && ! -f "$INSTALL_DIR/.managed-by-deploy" ]]; then
  echo '/opt/algorithmika already exists but was not created by this script. Stop and inspect it.' >&2
  exit 1
fi
mkdir -p "$INSTALL_DIR"
touch "$INSTALL_DIR/.managed-by-deploy"
exec 9>"$INSTALL_DIR/deploy.lock"
flock -n 9 || { echo 'Another deployment is already running.' >&2; exit 1; }

. /etc/os-release
[[ "$ID" == ubuntu ]] || { echo 'This installer supports Ubuntu only.' >&2; exit 1; }
if ! command -v docker >/dev/null 2>&1 || ! docker compose version >/dev/null 2>&1; then
  echo 'Installing Docker from Ubuntu packages...'
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y docker.io docker-compose-v2 curl openssl
fi
systemctl enable --now docker
command -v curl >/dev/null || { apt-get update; apt-get install -y curl; }
command -v openssl >/dev/null || { apt-get update; apt-get install -y openssl; }

mkdir -p "$INSTALL_DIR/releases" "$INSTALL_DIR/backups"
if [[ -L "$INSTALL_DIR/current" ]]; then
  PREVIOUS="$(readlink -f "$INSTALL_DIR/current")"
  [[ "$PREVIOUS" == "$INSTALL_DIR/releases/"* && -f "$PREVIOUS/docker-compose.yml" ]] || exit 1
else
  PREVIOUS=''
fi

if [[ -n "$REVISION" && -n "$PREVIOUS" && -f "$PREVIOUS/.revision" && "$(<"$PREVIOUS/.revision")" == "$REVISION" ]]; then
  echo "Revision $REVISION is already deployed. No update needed."
  exit 0
fi

if [[ ! -f "$INSTALL_DIR/.env" ]]; then
  # Public VPS secrets are generated; local postgres/root settings stay local.
  JWT_SECRET="$(openssl rand -hex 32)"
  printf '%s\n' \
    'COMPOSE_PROJECT_NAME=algorithmika' \
    'APP_BIND_ADDRESS=0.0.0.0' 'APP_PORT=80' 'HTTPS_PORT=443' 'SITE_ADDRESS=:80' \
    'POSTGRES_DB=algorithmika' 'POSTGRES_USER=postgres' \
    'POSTGRES_PASSWORD=root' 'DB_USER=postgres' 'DB_PASSWORD=root' \
    "JWT_SECRET=$JWT_SECRET" 'JWT_EXPIRES_IN=7d' \
    "FRONTEND_URL=http://$PUBLIC_HOST" 'TRUST_PROXY_HOPS=1' 'DB_SSL=false' \
    > "$INSTALL_DIR/.env"
  chmod 600 "$INSTALL_DIR/.env"
fi
[[ ! -L "$INSTALL_DIR/.env" ]] || exit 1

# Compose interpolates .env itself. We deliberately don't source it as shell code.
compose_at() {
  local directory="$1"
  shift
  local release_id
  release_id="$(basename "$directory")"
  RELEASE_ID="$release_id" docker compose -p algorithmika --env-file "$INSTALL_DIR/.env" \
    -f "$directory/docker-compose.yml" "$@"
}

RELEASE_DIR="$(mktemp -d "$INSTALL_DIR/releases/release-$(date -u +%Y%m%d-%H%M%S)-XXXXXX")"
cp -a "$STAGE_DIR/." "$RELEASE_DIR/"
printf '%s\n' "$REVISION" > "$RELEASE_DIR/.revision"
compose_at "$RELEASE_DIR" config --quiet

# Build before touching the live containers.
echo 'Building new images while the current site keeps running...'
compose_at "$RELEASE_DIR" build
if [[ -n "$PREVIOUS" ]]; then
  if compose_at "$PREVIOUS" ps --status running --services | grep -qx db; then
    BACKUP_FILE="$INSTALL_DIR/backups/$(basename "$RELEASE_DIR").dump"
    echo "Backing up PostgreSQL to $BACKUP_FILE..."
    compose_at "$PREVIOUS" exec -T db sh -c \
      'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$BACKUP_FILE"
    chmod 600 "$BACKUP_FILE"
  else
    echo 'The existing database is not running. Refusing update without a backup.' >&2
    exit 1
  fi
fi

rollback_code() {
  echo 'Deployment failed. Database backups are never restored automatically.' >&2
  compose_at "$RELEASE_DIR" logs --tail=80 backend frontend >&2 || true
  if [[ -n "$PREVIOUS" ]]; then
    echo "Attempting code-only rollback to $PREVIOUS..." >&2
    compose_at "$PREVIOUS" up -d --no-build || true
  fi
}
trap rollback_code ERR
compose_at "$RELEASE_DIR" up -d --no-build

HEALTHY=0
for _ in $(seq 1 90); do
  if compose_at "$RELEASE_DIR" exec -T frontend \
    wget -q -O /dev/null http://127.0.0.1/api/health 2>/dev/null; then
    HEALTHY=1
    break
  fi
  sleep 2
done
[[ "$HEALTHY" == 1 ]] || { echo 'New containers did not become healthy in 180 seconds.' >&2; false; }

if [[ -n "$PREVIOUS" ]]; then
  ln -sfn "$PREVIOUS" "$INSTALL_DIR/previous"
fi
ln -sfn "$RELEASE_DIR" "$INSTALL_DIR/current"
trap - ERR
compose_at "$RELEASE_DIR" ps
echo "Done. Website: http://$PUBLIC_HOST"
echo 'HTTP is for demonstration only. Configure a domain and HTTPS before collecting real personal data.'
echo "Environment: $INSTALL_DIR/.env; backups: $INSTALL_DIR/backups."
