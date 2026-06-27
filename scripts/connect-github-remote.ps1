param(
  [Parameter(Mandatory = $true)]
  [string]$RepoUrl,

  [string]$Branch = "main",

  [switch]$Force
)

$ErrorActionPreference = "Stop"

function Run-Git {
  param([Parameter(ValueFromRemainingArguments = $true)][string[]]$Args)
  & git @Args
  if ($LASTEXITCODE -ne 0) {
    throw "git $($Args -join ' ') failed with exit code $LASTEXITCODE"
  }
}

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $projectRoot

$status = & git status --short
if ($LASTEXITCODE -ne 0) {
  throw "git is required and this directory must be a Git repository."
}

if ($status -and -not $Force) {
  Write-Output "Working tree is not clean:"
  Write-Output $status
  throw "Commit or stash changes before connecting GitHub. Use -Force only if you understand the risk."
}

$existingOrigin = (& git remote get-url origin 2>$null)
if ($LASTEXITCODE -eq 0 -and $existingOrigin) {
  if ($existingOrigin -eq $RepoUrl) {
    Write-Output "origin already points to $RepoUrl"
  } elseif ($Force) {
    Run-Git remote set-url origin $RepoUrl
    Write-Output "origin updated to $RepoUrl"
  } else {
    throw "origin already exists: $existingOrigin. Re-run with -Force to replace it."
  }
} else {
  Run-Git remote add origin $RepoUrl
  Write-Output "origin added: $RepoUrl"
}

Run-Git branch -M $Branch
Run-Git push -u origin $Branch

Write-Output "GitHub remote connected and pushed:"
Write-Output $RepoUrl
