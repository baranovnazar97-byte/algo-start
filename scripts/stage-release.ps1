param(
  [Parameter(Mandatory = $true)]
  [ValidateRange(1, 6)]
  [int]$Stage,
  [switch]$Preview
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$ConfigPath = Join-Path $ProjectRoot 'frontend/src/config/release.ts'
$StateDir = Join-Path $ProjectRoot '.deploy'
$StatePath = Join-Path $StateDir 'publication-state.json'

$StageNames = @{
  1 = 'Foundation: pages, registration, login, database'
  2 = 'First game: sequence, three levels, saved results'
  3 = 'Second game: robot routes'
  4 = 'Third game: find algorithm errors'
  5 = 'Fourth game: conditions'
  6 = 'Full release: progress, achievements, profile'
}

if (-not $Preview) {
  $PublishedStage = 0
  if (Test-Path -LiteralPath $StatePath) {
    $State = Get-Content -Raw -LiteralPath $StatePath | ConvertFrom-Json
    $PublishedStage = [int]$State.publishedStage
    if ($PublishedStage -lt 0 -or $PublishedStage -gt 6) {
      throw 'Invalid publication state. Stop and inspect .deploy/publication-state.json.'
    }
  }

  if ($Stage -ne ($PublishedStage + 1)) {
    throw "Publish stages in order. Last completed stage: $PublishedStage. Expected: $($PublishedStage + 1)."
  }
}

$Config = [IO.File]::ReadAllText($ConfigPath)
if ($Config -notmatch 'export const releaseStage: number = [1-6];') {
  throw 'Cannot find the releaseStage setting. No changes were made.'
}
$Updated = [regex]::Replace($Config, 'export const releaseStage: number = [1-6];', "export const releaseStage: number = $Stage;")
[IO.File]::WriteAllText($ConfigPath, $Updated, (New-Object Text.UTF8Encoding($false)))

Write-Host ''
Write-Host "Publication stage $Stage of 6" -ForegroundColor Cyan
Write-Host $StageNames[$Stage]
Write-Host 'These are planned publications of an existing project, not historical development commits.'
Write-Host ''

if ($Preview) {
  Write-Host 'Preview only: no Git push or VPS deployment will run.' -ForegroundColor Yellow
  Write-Host 'Start the local site with: npm run dev'
  Write-Host 'To restore the full local interface: .\stage-6.cmd -Preview'
  exit 0
}

& powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$PSScriptRoot/release.ps1" -Message "Publication stage ${Stage}/6: $($StageNames[$Stage])" -AllowExistingCommit
if ($LASTEXITCODE -ne 0) {
  throw "Stage $Stage was not marked complete. Resolve the reported error and retry the same stage command."
}

New-Item -ItemType Directory -Force -Path $StateDir | Out-Null
$StateJson = @{ publishedStage = $Stage; publishedAt = [DateTime]::UtcNow.ToString('o') } | ConvertTo-Json
[IO.File]::WriteAllText($StatePath, $StateJson, (New-Object Text.UTF8Encoding($false)))
if ($Stage -lt 6) {
  Write-Host "Stage $Stage is published. Next week use stage-$($Stage + 1).cmd." -ForegroundColor Green
} else {
  Write-Host 'Stage 6 is published. The planned publication cycle is complete.' -ForegroundColor Green
}
