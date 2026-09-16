param(
  [Parameter(Mandatory = $true, Position = 0)]
  [string]$Domain,
  [string]$Server = '81.90.25.140',
  [switch]$NoWww
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$Domain = $Domain.Trim().ToLowerInvariant()
if ($Domain -match '^(https?://|www\.)') {
  throw 'Pass only the root domain, for example: example.ru'
}
if ($Domain.Length -gt 253 -or $Domain -notmatch '^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$') {
  throw 'Invalid domain. Use a root domain such as example.ru.'
}
if ($Server -notmatch '^[a-zA-Z0-9.-]+$') { throw 'Invalid server address.' }

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$KeyPath = Join-Path $ProjectRoot '.deploy/algorithmika_vps_ed25519'
if (-not (Test-Path -LiteralPath $KeyPath)) {
  throw 'Deployment SSH key is missing. Publish stage 1 before configuring the domain.'
}

$SiteAddress = if ($NoWww) { $Domain } else { "$Domain, www.$Domain" }
$RemoteCommand = @'
set -Eeuo pipefail
install_dir=/opt/algorithmika
env_file="$install_dir/.env"
[[ -f "$install_dir/.managed-by-deploy" && -f "$env_file" && ! -L "$env_file" ]]
cp "$env_file" "$env_file.before-domain"
sed -i -E '/^(SITE_ADDRESS|FRONTEND_URL)=/d' "$env_file"
printf '\nSITE_ADDRESS={0}\nFRONTEND_URL=https://{1}\n' >> "$env_file"
chmod 600 "$env_file"
current="$(readlink -f "$install_dir/current")"
[[ "$current" == "$install_dir/releases/"* && -f "$current/docker-compose.yml" ]]
cd "$current"
release_id="$(basename "$current")"
RELEASE_ID="$release_id" docker compose -p algorithmika --env-file "$env_file" -f docker-compose.yml up -d --no-build
for attempt in $(seq 1 60); do
  if curl --fail --silent --show-error https://{1}/api/health >/dev/null 2>&1; then
    echo 'Domain and HTTPS are ready: https://{1}'
    exit 0
  fi
  sleep 2
done
echo 'HTTPS did not become ready. Check DNS records and container logs.' >&2
RELEASE_ID="$release_id" docker compose -p algorithmika --env-file "$env_file" -f docker-compose.yml logs --tail=100 caddy >&2
exit 1
'@ -f $SiteAddress, $Domain

$SshOptions = @(
  '-i', $KeyPath,
  '-o', 'IdentitiesOnly=yes',
  '-o', 'StrictHostKeyChecking=yes',
  '-o', 'ConnectTimeout=15',
  "root@$Server",
  $RemoteCommand
)

Write-Host "Configuring HTTPS for $Domain..." -ForegroundColor Cyan
& ssh.exe @SshOptions
if ($LASTEXITCODE -ne 0) { throw 'Domain setup failed.' }

$DomainStatePath = Join-Path $ProjectRoot '.deploy/domain.txt'
[IO.File]::WriteAllText($DomainStatePath, "https://$Domain", (New-Object Text.UTF8Encoding($false)))
Write-Host "Open: https://$Domain" -ForegroundColor Green
