param(
  [string]$ProjectRef = "",
  [string]$CronSecret = $env:CRON_SECRET,
  [switch]$SkipDbPush,
  [switch]$SkipSeedReminder,
  [switch]$SkipSmoke,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $projectRoot

$supabase = Join-Path $projectRoot "node_modules\.bin\supabase.cmd"
$npm = if ($IsWindows -or $env:OS -eq "Windows_NT") { "npm.cmd" } else { "npm" }

function Step($Name, [scriptblock]$Action) {
  Write-Output ""
  Write-Output "==> $Name"
  & $Action
}

function Run($Command, [string[]]$Arguments) {
  $printable = @($Command) + $Arguments
  Write-Output ("$ " + ($printable -join " "))
  if ($DryRun) { return }
  & $Command @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed: $($printable -join ' ')"
  }
}

if (-not (Test-Path $supabase)) {
  throw "Supabase CLI not found at $supabase. Run npm install first."
}

if ((-not $DryRun) -and (-not (Test-Path (Join-Path $projectRoot ".env.local")))) {
  throw ".env.local not found. Run npm run free-staging:env first."
}

if ((-not $DryRun) -and (-not $CronSecret)) {
  throw "CRON_SECRET is required. Set `$env:CRON_SECRET or pass -CronSecret."
}

if ($DryRun -and -not $CronSecret) {
  $CronSecret = "dry-run-placeholder-cron-secret-not-written"
}

Write-Output "JASIC free staging deployment"
Write-Output "============================="
Write-Output "Mode: $(if ($DryRun) { 'dry run' } else { 'live deployment' })"
Write-Output "AI mode: rule_based"
Write-Output "OpenAI: skipped"
Write-Output "Project ref: $(if ($ProjectRef) { $ProjectRef } else { '[use existing Supabase link]' })"

Step "Static preflight" {
  Run $npm @("run", "package1:preflight")
}

Step "Free staging environment gate" {
  Run $npm @("run", "doctor:staging-env", "--", "--require-live", "--free-mode")
}

if ($ProjectRef) {
  Step "Link Supabase project" {
    Run $supabase @("link", "--project-ref", $ProjectRef)
  }
} else {
  Write-Output ""
  Write-Output "Skipping supabase link because -ProjectRef was not provided."
  Write-Output "Assuming the project is already linked."
}

if (-not $SkipDbPush) {
  Step "Push database migrations" {
    Run $supabase @("db", "push")
  }
} else {
  Write-Output ""
  Write-Output "Skipping database migration push."
}

if (-not $SkipSeedReminder) {
  Write-Output ""
  Write-Output "Manual seed reminder:"
  Write-Output " - Run supabase/seed.sql in the Supabase SQL editor if baseline staging data is not inserted yet."
}

Step "Set Supabase Edge secrets for free mode" {
  $env:JASIC_AI_MODE = "rule_based"
  $env:CRON_SECRET = $CronSecret
  Run $npm @("run", "supabase:set:secrets")
}

Step "Deploy Supabase Edge Functions" {
  Run $npm @("run", "supabase:deploy:functions")
}

if (-not $SkipSmoke) {
  Step "Smoke Supabase function endpoints" {
    Run $npm @("run", "smoke:supabase")
  }

  Step "Smoke live readiness responses" {
    Run $npm @("run", "smoke:live-readiness")
  }
} else {
  Write-Output ""
  Write-Output "Skipping smoke tests."
}

Write-Output ""
Write-Output "Free staging deployment flow completed."
