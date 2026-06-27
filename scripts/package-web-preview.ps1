param(
  [string]$OutputPath = "..\jasic-web-preview-dist.zip"
)

$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$distPath = Join-Path $projectRoot "dist"
$resolvedOutputPath = [System.IO.Path]::GetFullPath((Join-Path $projectRoot $OutputPath))

if (-not (Test-Path $distPath)) {
  throw "dist directory not found. Run npm run build:web first."
}

$indexPath = Join-Path $distPath "index.html"
$expoPath = Join-Path $distPath "_expo"

if (-not (Test-Path $indexPath)) {
  throw "dist/index.html not found. Web build output is incomplete."
}

if (-not (Test-Path $expoPath)) {
  throw "dist/_expo not found. Expo web bundle output is incomplete."
}

$outputDir = Split-Path $resolvedOutputPath -Parent
if (-not (Test-Path $outputDir)) {
  New-Item -ItemType Directory -Path $outputDir | Out-Null
}

if (Test-Path $resolvedOutputPath) {
  Remove-Item -LiteralPath $resolvedOutputPath -Force
}

Compress-Archive -Path (Join-Path $distPath "*") -DestinationPath $resolvedOutputPath -Force

$zip = Get-Item $resolvedOutputPath
Write-Output "Created web preview package:"
Write-Output $zip.FullName
Write-Output ("Size: {0} bytes" -f $zip.Length)
