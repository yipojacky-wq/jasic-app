param(
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $projectRoot

$functions = @(
  "market-summary",
  "discovery-latest",
  "reports-latest",
  "ai-check",
  "market-data-ingest",
  "score-calculate",
  "stock-war-room",
  "watchlist-summary",
  "alert-evaluate",
  "report-generate",
  "report-detail",
  "profile-settings",
  "data-health",
  "user-data-export",
  "account-delete",
  "portfolio-summary",
  "ai-check-history"
)

$supabase = Join-Path $projectRoot "node_modules\.bin\supabase.cmd"
if (-not (Test-Path $supabase)) {
  throw "Supabase CLI not found at $supabase. Run npm install first."
}

Write-Output "Supabase functions to deploy:"
$functions | ForEach-Object { Write-Output " - $_" }

foreach ($functionName in $functions) {
  $functionPath = Join-Path $projectRoot "supabase\functions\$functionName\index.ts"
  if (-not (Test-Path $functionPath)) {
    throw "Missing function entrypoint: $functionPath"
  }
}

if ($DryRun) {
  Write-Output "Dry run complete. No functions deployed."
  exit 0
}

foreach ($functionName in $functions) {
  Write-Output "Deploying $functionName..."
  & $supabase functions deploy $functionName
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to deploy function: $functionName"
  }
}

Write-Output "All Supabase functions deployed."
