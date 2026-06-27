param(
  [string]$OpenAiApiKey = $env:OPENAI_API_KEY,
  [string]$OpenAiModel = $env:OPENAI_MODEL,
  [string]$CronSecret = $env:CRON_SECRET,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $projectRoot

$supabase = Join-Path $projectRoot "node_modules\.bin\supabase.cmd"
if (-not (Test-Path $supabase)) {
  throw "Supabase CLI not found at $supabase. Run npm install first."
}

if (-not $OpenAiApiKey) {
  throw "OPENAI_API_KEY is required. Pass -OpenAiApiKey or set the OPENAI_API_KEY environment variable."
}

if (-not $OpenAiModel) {
  $OpenAiModel = "gpt-5.4-mini"
}

if (-not $CronSecret) {
  throw "CRON_SECRET is required. Pass -CronSecret or set the CRON_SECRET environment variable."
}

Write-Output "Supabase secrets to set:"
Write-Output " - OPENAI_API_KEY: [redacted]"
Write-Output " - OPENAI_MODEL: $OpenAiModel"
Write-Output " - CRON_SECRET: [redacted]"

if ($DryRun) {
  Write-Output "Dry run complete. No secrets were written."
  exit 0
}

& $supabase secrets set "OPENAI_API_KEY=$OpenAiApiKey"
if ($LASTEXITCODE -ne 0) { throw "Failed to set OPENAI_API_KEY" }

& $supabase secrets set "OPENAI_MODEL=$OpenAiModel"
if ($LASTEXITCODE -ne 0) { throw "Failed to set OPENAI_MODEL" }

& $supabase secrets set "CRON_SECRET=$CronSecret"
if ($LASTEXITCODE -ne 0) { throw "Failed to set CRON_SECRET" }

Write-Output "Supabase secrets set."
