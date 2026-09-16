param(
  [string]$Server = '81.90.25.140',
  [string]$User = 'root',
  [string]$InstallDir = '/opt/algorithmika',
  [string]$Revision = '',
  [switch]$SkipChecks
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if ($Server -notmatch '^[a-zA-Z0-9.-]+$') {
  throw 'Invalid server address.'
}

if ($User -notmatch '^[a-zA-Z0-9_-]+$') {
  throw 'Invalid SSH user name.'
}

if ($InstallDir -ne '/opt/algorithmika') {
  throw 'Only /opt/algorithmika is supported for safety.'
}

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$DeployDir = Join-Path $ProjectRoot '.deploy'
$KeyPath = Join-Path $DeployDir 'algorithmika_vps_ed25519'
$ArchivePath = Join-Path $DeployDir 'algorithmika-release.tar.gz'
$DomainStatePath = Join-Path $DeployDir 'domain.txt'
$UploadId = [Guid]::NewGuid().ToString('N')
$RemoteStage = "/tmp/algorithmika-upload-$UploadId"
$RemoteArchive = "$RemoteStage/release.tar.gz"

function Require-Command([string]$Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "$Name was not found. Install the Windows OpenSSH Client component."
  }
}

function Run-Native([string]$Program, [string[]]$Arguments) {
  & $Program @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "$Program failed with exit code $LASTEXITCODE."
  }
}

Require-Command 'ssh.exe'
Require-Command 'scp.exe'
Require-Command 'ssh-keygen.exe'
Require-Command 'tar.exe'
Require-Command 'npm.cmd'

New-Item -ItemType Directory -Force -Path $DeployDir | Out-Null

Push-Location $ProjectRoot
try {
  if (-not $SkipChecks) {
    Write-Host ''
    Write-Host '1/6 Running build and tests...' -ForegroundColor Cyan
    Run-Native 'npm.cmd' @('run', 'build')
    Run-Native 'npm.cmd' @('test')
  } else {
    Write-Host 'Checks skipped by -SkipChecks.' -ForegroundColor Yellow
  }

  Write-Host ''
  Write-Host '2/6 Creating release archive...' -ForegroundColor Cyan
  if (Test-Path -LiteralPath $ArchivePath) {
    Remove-Item -LiteralPath $ArchivePath -Force
  }

  $ArchiveItems = @(
    'docker-compose.yml',
    'Caddyfile',
    '.env.example',
    'backend/Dockerfile',
    'backend/.dockerignore',
    'backend/package.json',
    'backend/package-lock.json',
    'backend/nest-cli.json',
    'backend/tsconfig.json',
    'backend/tsconfig.build.json',
    'backend/src',
    'frontend/Dockerfile',
    'frontend/.dockerignore',
    'frontend/package.json',
    'frontend/package-lock.json',
    'frontend/index.html',
    'frontend/nginx.conf',
    'frontend/tsconfig.json',
    'frontend/tsconfig.app.json',
    'frontend/tsconfig.node.json',
    'frontend/vite.config.ts',
    'frontend/src',
    'scripts/vps-deploy.sh'
  )

  $MissingItems = $ArchiveItems | Where-Object { -not (Test-Path -LiteralPath $_) }
  if ($MissingItems) {
    throw "Project files are missing: $($MissingItems -join ', ')"
  }

  Run-Native 'tar.exe' (@('-czf', $ArchivePath) + $ArchiveItems)

  Write-Host ''
  Write-Host '3/6 Preparing the deployment SSH key...' -ForegroundColor Cyan
  if (-not (Test-Path -LiteralPath $KeyPath)) {
    Run-Native 'ssh-keygen.exe' @('-q', '-t', 'ed25519', '-f', $KeyPath, '-N', '""', '-C', 'algorithmika-deploy')
  }

  $SshOptions = @(
    '-i', $KeyPath,
    '-o', 'IdentitiesOnly=yes',
    '-o', 'StrictHostKeyChecking=yes',
    '-o', 'ConnectTimeout=15'
  )
  $Target = "$User@$Server"

  & ssh.exe @SshOptions '-o' 'BatchMode=yes' $Target 'true' 2>$null
  if ($LASTEXITCODE -ne 0) {
    Write-Host ''
    Write-Host 'First run: SSH will ask for the VPS root password.' -ForegroundColor Yellow
    Write-Host 'The password is not displayed while typing. This is expected.' -ForegroundColor Yellow

    $PublicKey = (Get-Content -Raw -LiteralPath "$KeyPath.pub").Trim()
    $PublicKeyBase64 = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($PublicKey))
    $InstallKeyCommand = 'umask 077; mkdir -p ~/.ssh; touch ~/.ssh/authorized_keys; chmod 700 ~/.ssh; chmod 600 ~/.ssh/authorized_keys; key="$(printf %s {0} | base64 -d)"; grep -qxF "$key" ~/.ssh/authorized_keys || printf "%s\n" "$key" >> ~/.ssh/authorized_keys' -f $PublicKeyBase64
    Write-Host 'Compare the SSH fingerprint with the VPS panel before answering yes.' -ForegroundColor Yellow
    Run-Native 'ssh.exe' @('-o', 'ConnectTimeout=15', $Target, $InstallKeyCommand)
  }

  Write-Host ''
  Write-Host '4/6 Uploading the release to the VPS...' -ForegroundColor Cyan
  Run-Native 'ssh.exe' ($SshOptions + @($Target, "umask 077; mkdir '$RemoteStage'"))
  Run-Native 'scp.exe' ($SshOptions + @($ArchivePath, "${Target}:$RemoteArchive"))

  Write-Host ''
  Write-Host '5/6 Installing or updating Docker containers...' -ForegroundColor Cyan
  if ($Revision -and $Revision -notmatch '^[a-f0-9]{40}$') { throw 'Invalid Git revision.' }
  $Checksum = (Get-FileHash -LiteralPath $ArchivePath -Algorithm SHA256).Hash.ToLowerInvariant()
  $RemoteCommand = 'set -eu; trap ''rm -rf -- "{0}"'' EXIT; echo ''{1}  {2}'' | sha256sum -c -; mkdir ''{0}/source''; tar -xzf ''{2}'' -C ''{0}/source''; sed -i ''s/\r$//'' ''{0}/source/scripts/vps-deploy.sh''; bash ''{0}/source/scripts/vps-deploy.sh'' ''{3}'' ''{4}'' ''{0}/source'' ''{5}''' -f $RemoteStage, $Checksum, $RemoteArchive, $InstallDir, $Server, $Revision
  Run-Native 'ssh.exe' ($SshOptions + @($Target, $RemoteCommand))

  Write-Host ''
  Write-Host '6/6 Deployment complete.' -ForegroundColor Green
  $WebsiteUrl = "http://$Server"
  if (Test-Path -LiteralPath $DomainStatePath) {
    $SavedUrl = (Get-Content -Raw -LiteralPath $DomainStatePath).Trim()
    if ($SavedUrl -match '^https://[a-zA-Z0-9.-]+$') {
      $WebsiteUrl = $SavedUrl
    }
  }
  Write-Host "Website: $WebsiteUrl" -ForegroundColor Green
  Write-Host "API health: $WebsiteUrl/api/health" -ForegroundColor Green
  Write-Host ''
  Write-Host 'For the next update, run: .\deploy.cmd'
} finally {
  Pop-Location
}
