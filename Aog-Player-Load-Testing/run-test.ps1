param(
    [string]$Script = "member2-full-test.js",
    [string]$Stage = "smoke"
)

$k6Path = if ($env:K6_PATH) { $env:K6_PATH } else { "k6" }
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  AOG Player Load Test" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Script : $Script" -ForegroundColor White
Write-Host "  Stage  : $Stage" -ForegroundColor White
Write-Host "  Press Ctrl+C to stop early" -ForegroundColor DarkGray
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Trap Ctrl+C so we can still generate reports after interruption
$interrupted = $false
try {
    Write-Host "Running k6 test..." -ForegroundColor Yellow
    & $k6Path run -e STAGE=$Stage $Script
} catch {
    $interrupted = $true
    Write-Host ""
    Write-Host "Test interrupted. Generating report from collected data..." -ForegroundColor Yellow
}

# Small delay to ensure k6 has flushed the JSON file
Start-Sleep -Seconds 2

Write-Host ""

if (Test-Path "results/latest-result.json") {
    Write-Host "Generating reports..." -ForegroundColor Yellow
    node generate-report.js

    $report = Get-ChildItem -Path "reports" -Filter "*.html" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($report) {
        Write-Host ""
        Write-Host "Opening report in browser..." -ForegroundColor Green
        Start-Process $report.FullName
    }

    Write-Host ""
    Write-Host "Cleaning up test sessions..." -ForegroundColor Yellow
    node logout-all.js
} else {
    Write-Host "No results found. Test may not have started." -ForegroundColor Red
}

Write-Host ""
Write-Host "Complete." -ForegroundColor Green
Write-Host ""
