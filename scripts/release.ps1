param(
  [Parameter(Position = 0)]
  [string]$Message,
  [switch]$AllowExistingCommit
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$RepositoryUrl = 'https://github.com/baranovnazar97-byte/gaming-simulator.git'
$ExpectedRepository = 'github.com/baranovnazar97-byte/gaming-simulator'

function Find-Git {
  $Command = Get-Command git.exe -ErrorAction SilentlyContinue
  if ($Command) { return $Command.Source }

  $Candidates = @(
    'C:\Program Files\Git\cmd\git.exe',
    "$env:LOCALAPPDATA\Programs\Git\cmd\git.exe"
  )
  return $Candidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
}

function Run-Git([string[]]$Arguments) {
  & $script:Git --no-pager @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Git failed with exit code $LASTEXITCODE."
  }
}

if ([string]::IsNullOrWhiteSpace($Message)) {
  $Message = Read-Host 'Describe this week update briefly'
}
$Message = [Convert]::ToString($Message).Trim()
if ($Message.Length -lt 5 -or $Message.Length -gt 100 -or $Message.Contains("`n")) {
  throw 'The update description must be 5 to 100 characters on one line.'
}

$script:Git = Find-Git
if (-not $script:Git) {
  $Winget = Get-Command winget.exe -ErrorAction SilentlyContinue
  if (-not $Winget) {
    throw 'Git is not installed. Install Git for Windows: https://git-scm.com/download/win'
  }
  Write-Host 'Git was not found. Installing Git for Windows...' -ForegroundColor Yellow
  & $Winget.Source install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements
  if ($LASTEXITCODE -ne 0) { throw 'Git for Windows installation failed.' }
  $script:Git = Find-Git
  if (-not $script:Git) { throw 'Git is installed but not visible yet. Restart VS Code and retry.' }
}

Push-Location $ProjectRoot
try {
  Write-Host ''
  Write-Host '1/5 Running project checks...' -ForegroundColor Cyan
  & npm.cmd run build
  if ($LASTEXITCODE -ne 0) { throw 'Build failed.' }
  & npm.cmd test
  if ($LASTEXITCODE -ne 0) { throw 'Tests failed.' }

  Write-Host ''
  Write-Host '2/5 Preparing Git...' -ForegroundColor Cyan
  $FirstRepositorySetup = -not (Test-Path -LiteralPath '.git')
  if ($FirstRepositorySetup) {
    Run-Git @('init', '-b', 'main')
    Run-Git @('remote', 'add', 'origin', $RepositoryUrl)
  }

  # The first import can be interrupted after git init/reset. Keep a local Git
  # marker so retrying the same stage safely finishes that import.
  $ImportMarker = & $script:Git config --local --get algorithmika.repositoryImported 2>$null
  $NeedsRepositoryImport = $FirstRepositorySetup -or [Convert]::ToString($ImportMarker).Trim() -ne 'true'

  $OriginOutput = & $script:Git remote get-url origin 2>$null
  if ($LASTEXITCODE -ne 0) {
    Run-Git @('remote', 'add', 'origin', $RepositoryUrl)
    $Origin = $RepositoryUrl
  } else {
    $Origin = [Convert]::ToString($OriginOutput).Trim()
  }
  $NormalizedOrigin = $Origin.ToLowerInvariant().Replace('https://', '').Replace('http://', '').Replace('.git', '')
  if ($NormalizedOrigin -ne $ExpectedRepository) {
    throw "origin points to a different repository: $Origin"
  }

  $AuthorName = [Convert]::ToString((& $script:Git config --local --get user.name 2>$null)).Trim()
  $AuthorEmail = [Convert]::ToString((& $script:Git config --local --get user.email 2>$null)).Trim()
  $AuthorConfirmed = [Convert]::ToString((& $script:Git config --local --get algorithmika.authorConfirmed 2>$null)).Trim()
  if (-not $AuthorName -or -not $AuthorEmail -or $AuthorConfirmed -ne 'true') {
    Write-Host ''
    Write-Host 'Configure the author of commits in this project.' -ForegroundColor Yellow
    Write-Host 'Use your own GitHub name and verified/noreply email, not the repository owner credentials.' -ForegroundColor Yellow
    $AuthorName = [Convert]::ToString((Read-Host 'Your GitHub username or real name')).Trim()
    $AuthorEmail = [Convert]::ToString((Read-Host 'Your GitHub verified or noreply email')).Trim()
    if ($AuthorName.Length -lt 1 -or $AuthorName.Length -gt 100 -or $AuthorName.Contains("`n")) {
      throw 'Invalid Git author name.'
    }
    if ($AuthorEmail.Length -gt 254 -or $AuthorEmail -notmatch '^[^\s@]+@[^\s@]+$') {
      throw 'Invalid Git author email.'
    }
    Run-Git @('config', '--local', 'user.name', $AuthorName)
    Run-Git @('config', '--local', 'user.email', $AuthorEmail)
    Run-Git @('config', '--local', 'algorithmika.authorConfirmed', 'true')
  }

  if ($NeedsRepositoryImport) {
    Write-Host 'Fetching existing main history without changing local files...'
    & $script:Git fetch origin main
    if ($LASTEXITCODE -eq 0) {
      & $script:Git show-ref --verify --quiet refs/remotes/origin/main
      if ($LASTEXITCODE -eq 0) {
        # Mixed reset attaches the local main branch to GitHub history but does
        # not overwrite any file in the working directory.
        Run-Git @('reset', 'origin/main')
        $PreviousOutputEncoding = [Console]::OutputEncoding
        try {
          [Console]::OutputEncoding = New-Object Text.UTF8Encoding($false)
          $RemoteFiles = & $script:Git -c core.quotepath=false ls-tree -r --name-only origin/main
          if ($LASTEXITCODE -ne 0) { throw 'Failed to list files from GitHub main.' }
        } finally {
          [Console]::OutputEncoding = $PreviousOutputEncoding
        }
        foreach ($RemoteFile in $RemoteFiles) {
          if ([string]::IsNullOrWhiteSpace($RemoteFile)) { continue }
          if ([IO.Path]::IsPathRooted($RemoteFile) -or $RemoteFile -match '(^|/)\.\.(/|$)') {
            throw "GitHub contains an unsafe file path: $RemoteFile"
          }
          $LocalFile = Join-Path $ProjectRoot $RemoteFile
          if (-not (Test-Path -LiteralPath $LocalFile)) {
            Run-Git @('checkout', 'origin/main', '--', ":(literal)$RemoteFile")
          }
        }
      } elseif ($LASTEXITCODE -ne 1) {
        throw 'Failed to inspect the GitHub main branch.'
      }
    } else {
      # An empty repository has no main branch yet. Authentication/network
      # errors will still surface on push; no history is overwritten.
      Write-Host 'GitHub main is empty. The first commit will be created.' -ForegroundColor Yellow
    }
    Run-Git @('config', '--local', 'algorithmika.repositoryImported', 'true')
  } else {
    $CurrentBranch = (& $script:Git branch --show-current).Trim()
    if ($LASTEXITCODE -ne 0 -or $CurrentBranch -ne 'main') {
      throw "Weekly releases are allowed only from main. Current branch: $CurrentBranch"
    }
    Run-Git @('fetch', 'origin', 'main')
    & $script:Git merge-base --is-ancestor origin/main HEAD
    if ($LASTEXITCODE -eq 1) {
      throw 'GitHub has newer commits. Run git pull and review the changes first.'
    }
    if ($LASTEXITCODE -ne 0) { throw 'Failed to compare local and remote history.' }
  }

  Run-Git @('add', '--all')
  & $script:Git diff --cached --quiet
  if ($LASTEXITCODE -eq 0) {
    & $script:Git rev-parse --verify HEAD 2>$null | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'There are no files for the first release.' }
    & $script:Git show-ref --verify --quiet refs/remotes/origin/main
    if ($LASTEXITCODE -eq 0) {
      $AheadCount = [int]((& $script:Git rev-list --count origin/main..HEAD).Trim())
      if ($LASTEXITCODE -ne 0 -or ($AheadCount -eq 0 -and -not $AllowExistingCommit)) {
        throw 'There are no new changes for a weekly release.'
      }
      Write-Host 'Using the existing local commit for this publication.' -ForegroundColor Yellow
    } elseif ($LASTEXITCODE -ne 1) {
      throw 'Failed to inspect remote history.'
    }
  } elseif ($LASTEXITCODE -eq 1) {
    Write-Host 'Files included in this release:' -ForegroundColor Gray
    Run-Git @('diff', '--cached', '--stat')
    Run-Git @('commit', '-m', "Update: $Message")
  } else {
    throw 'Failed to inspect staged changes.'
  }

  $Dirty = & $script:Git status --porcelain
  if ($LASTEXITCODE -ne 0 -or $Dirty) {
    throw 'The working tree changed during release preparation. Review it before pushing.'
  }

  Write-Host ''
  Write-Host '3/5 Pushing the commit to GitHub...' -ForegroundColor Cyan
  Write-Host 'GitHub may open a sign-in window on the first run.' -ForegroundColor Yellow
  Run-Git @('push', '-u', 'origin', 'main')
  $Revision = (& $script:Git rev-parse HEAD).Trim()
  if ($LASTEXITCODE -ne 0 -or $Revision -notmatch '^[a-f0-9]{40}$') {
    throw 'Failed to identify the pushed commit.'
  }

  Write-Host ''
  Write-Host '4/5 Updating the VPS...' -ForegroundColor Cyan
  & powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$PSScriptRoot\deploy-vps.ps1" -Revision $Revision -SkipChecks
  if ($LASTEXITCODE -ne 0) {
    throw 'GitHub was updated but the VPS failed. Fix the issue and rerun the same stage command.'
  }

  Write-Host ''
  Write-Host '5/5 Weekly release complete.' -ForegroundColor Green
  Write-Host "GitHub: https://github.com/baranovnazar97-byte/gaming-simulator/commit/$Revision"
  $WebsiteUrl = 'http://81.90.25.140'
  $DomainStatePath = Join-Path $ProjectRoot '.deploy/domain.txt'
  if (Test-Path -LiteralPath $DomainStatePath) {
    $SavedUrl = (Get-Content -Raw -LiteralPath $DomainStatePath).Trim()
    if ($SavedUrl -match '^https://[a-zA-Z0-9.-]+$') {
      $WebsiteUrl = $SavedUrl
    }
  }
  Write-Host "Website: $WebsiteUrl"
} finally {
  Pop-Location
}
