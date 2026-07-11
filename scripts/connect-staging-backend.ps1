param(
  [Parameter(Mandatory = $true)]
  [string]$ProjectRef,

  [Parameter(Mandatory = $true)]
  [string]$SupabaseUrl,

  [Parameter(Mandatory = $true)]
  [string]$SupabaseAnonKey,

  [string]$CronSecret = $env:CRON_SECRET,
  [string]$StagingAccessToken = $env:JASIC_STAGING_ACCESS_TOKEN,
  [string]$OpenAiApiKey = $env:OPENAI_API_KEY,
  [string]$OpenAiModel = $env:OPENAI_MODEL,
  [ValidateSet("rule_based", "openai")]
  [string]$AiMode = "rule_based",

  [switch]$ForceEnv,
  [switch]$SkipCloudDeploy,
  [switch]$SkipDbPush,
  [switch]$SkipSmoke,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $projectRoot

$npm = if ($IsWindows -or $env:OS -eq "Windows_NT") { "npm.cmd" } else { "npm" }
$supabase = Join-Path $projectRoot "node_modules\.bin\supabase.cmd"

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

function RequireValue($Name, $Value) {
  if (-not $Value) {
    throw "$Name is required."
  }
}

function LooksLikePlaceholder($Value) {
  if (-not $Value) { return $true }
  $lower = $Value.ToLowerInvariant()
  return $lower.Contains("your-") -or $lower.Contains("example.com") -or $lower.Contains("placeholder")
}

RequireValue "ProjectRef" $ProjectRef
RequireValue "SupabaseUrl" $SupabaseUrl
RequireValue "SupabaseAnonKey" $SupabaseAnonKey

if ($SupabaseUrl -notmatch "^https://[a-zA-Z0-9-]+\.supabase\.co/?$") {
  throw "SupabaseUrl should look like https://YOUR_PROJECT.supabase.co"
}

if (LooksLikePlaceholder $ProjectRef) {
  throw "ProjectRef still looks like a placeholder."
}

if (LooksLikePlaceholder $SupabaseAnonKey) {
  throw "SupabaseAnonKey still looks like a placeholder."
}

if ($SupabaseAnonKey -match "service_role" -or $SupabaseAnonKey -match "service-role") {
  throw "SupabaseAnonKey must be the public anon key, not a service-role key."
}

if ($AiMode -eq "openai" -and -not $OpenAiApiKey) {
  throw "OPENAI_API_KEY is required when AiMode=openai. Use AiMode=rule_based for the nearly-free staging path."
}

if (-not $CronSecret) {
  throw "CRON_SECRET is required. Run npm run free-staging:secret or pass -CronSecret."
}

if ($CronSecret.Length -lt 32) {
  throw "CRON_SECRET should be at least 32 characters."
}

if (-not (Test-Path $supabase)) {
  throw "Supabase CLI not found at $supabase. Run npm install first."
}

Write-Output "JASIC staging backend connection"
Write-Output "================================"
Write-Output "Project ref: $ProjectRef"
Write-Output "Project URL: $($SupabaseUrl.TrimEnd('/'))"
Write-Output "AI mode: $AiMode"
Write-Output "OpenAI: $(if ($AiMode -eq 'openai') { 'enabled' } else { 'skipped / rule-based' })"
Write-Output "Cloud deploy: $(if ($SkipCloudDeploy) { 'skipped' } else { 'enabled' })"
Write-Output "Smoke tests: $(if ($SkipSmoke) { 'skipped' } else { 'enabled' })"
Write-Output "Dry run: $(if ($DryRun) { 'yes' } else { 'no' })"

Step "Write local live-mode .env.local" {
  $args = @(
    "run", "free-staging:env", "--",
    "-SupabaseUrl", $SupabaseUrl,
    "-SupabaseAnonKey", $SupabaseAnonKey
  )
  if ($StagingAccessToken) {
    $args += @("-StagingAccessToken", $StagingAccessToken)
  }
  if ($ForceEnv) {
    $args += "-Force"
  }
  if ($DryRun) {
    $args += "-DryRun"
  }
  Run $npm $args
}

Step "Validate local staging env values" {
  Run $npm @("run", "doctor:staging-env", "--", "--require-live", "--free-mode")
}

Step "Run static readiness preflight" {
  Run $npm @("run", "package1:preflight")
}

if ($SkipCloudDeploy) {
  Write-Output ""
  Write-Output "Cloud deployment skipped. .env.local and local readiness checks are complete."
  exit 0
}

Step "Link Supabase project" {
  Run $supabase @("link", "--project-ref", $ProjectRef)
}

if (-not $SkipDbPush) {
  Step "Push database migrations" {
    Run $supabase @("db", "push")
  }
} else {
  Write-Output ""
  Write-Output "Database migration push skipped."
}

Step "Set Supabase Edge secrets" {
  $env:JASIC_AI_MODE = $AiMode
  $env:CRON_SECRET = $CronSecret
  if ($OpenAiApiKey) {
    $env:OPENAI_API_KEY = $OpenAiApiKey
  }
  if ($OpenAiModel) {
    $env:OPENAI_MODEL = $OpenAiModel
  }
  Run $npm @("run", "supabase:set:secrets")
}

Step "Deploy Supabase Edge Functions" {
  Run $npm @("run", "supabase:deploy:functions")
}

if (-not $SkipSmoke) {
  Step "Smoke CORS/reachability for all functions" {
    Run $npm @("run", "smoke:supabase")
  }

  Step "Smoke live POST response shapes" {
    Run $npm @("run", "smoke:live-readiness")
  }
} else {
  Write-Output ""
  Write-Output "Smoke tests skipped."
}

Write-Output ""
Write-Output "Staging backend connection completed."
