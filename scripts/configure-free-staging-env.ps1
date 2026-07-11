param(
  [Parameter(Mandatory = $true)]
  [string]$SupabaseUrl,

  [Parameter(Mandatory = $true)]
  [string]$SupabaseAnonKey,

  [string]$StagingAccessToken = "",

  [switch]$Force,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$envPath = Join-Path $projectRoot ".env.local"

function Fail($Message) {
  throw "Free staging env refused: $Message"
}

if ($SupabaseUrl -notmatch "^https://[a-zA-Z0-9-]+\.supabase\.co/?$") {
  Fail "SupabaseUrl should look like https://YOUR_PROJECT.supabase.co"
}

if ($SupabaseAnonKey -match "service_role" -or $SupabaseAnonKey -match "service-role") {
  Fail "SupabaseAnonKey looks like a service-role key. Use the public anon key only."
}

if ($SupabaseAnonKey.Length -lt 80) {
  Fail "SupabaseAnonKey looks too short. Copy the public anon key from Supabase Project Settings -> API."
}

if ((Test-Path $envPath) -and -not $Force) {
  Fail ".env.local already exists. Re-run with -Force if you intentionally want to overwrite it."
}

$normalizedUrl = $SupabaseUrl.TrimEnd("/")
$lines = @(
  "EXPO_PUBLIC_SUPABASE_URL=$normalizedUrl",
  "EXPO_PUBLIC_SUPABASE_ANON_KEY=$SupabaseAnonKey",
  "EXPO_PUBLIC_DEMO_MODE=false",
  "JASIC_AI_MODE=rule_based"
)

if ($StagingAccessToken) {
  if ($StagingAccessToken -match "service_role" -or $StagingAccessToken -match "service-role") {
    Fail "StagingAccessToken must be a short-lived user access token, not a service-role key."
  }
  $lines += "JASIC_STAGING_ACCESS_TOKEN=$StagingAccessToken"
} else {
  $lines += "JASIC_STAGING_ACCESS_TOKEN="
}

Write-Output "Free staging .env.local configuration:"
Write-Output " - EXPO_PUBLIC_SUPABASE_URL: $normalizedUrl"
Write-Output " - EXPO_PUBLIC_SUPABASE_ANON_KEY: [redacted]"
Write-Output " - EXPO_PUBLIC_DEMO_MODE: false"
Write-Output " - JASIC_AI_MODE: rule_based"
Write-Output " - JASIC_STAGING_ACCESS_TOKEN: $(if ($StagingAccessToken) { '[redacted]' } else { '[empty]' })"

if ($DryRun) {
  Write-Output "Dry run complete. No file was written."
  exit 0
}

Set-Content -LiteralPath $envPath -Value ($lines -join [Environment]::NewLine) -Encoding utf8
Write-Output ".env.local written. This file is ignored by git."
Write-Output "Next: npm run doctor:staging-env -- --require-live --free-mode"

