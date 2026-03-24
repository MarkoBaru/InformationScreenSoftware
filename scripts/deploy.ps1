# Deploy Script - Baut Backend + Frontends und startet den Server.

param(
    [string]$Configuration = "Release"
)

$root = Split-Path $PSScriptRoot

Write-Host "=== Backend bauen ===" -ForegroundColor Cyan
$backendDir = Join-Path $root "src\Backend\InformationScreen.Api"
dotnet publish $backendDir -c $Configuration -o (Join-Path $root "publish")

Write-Host "`n=== Kiosk-App bauen ===" -ForegroundColor Cyan
$kioskDir = Join-Path $root "src\Frontend\kiosk-app"
Push-Location $kioskDir
npm run build
Pop-Location

Write-Host "`n=== Admin-App bauen ===" -ForegroundColor Cyan
$adminDir = Join-Path $root "src\Frontend\admin-app"
Push-Location $adminDir
npm run build
Pop-Location

# Kiosk- und Admin-Dist in wwwroot kopieren
$wwwroot = Join-Path $root "publish\wwwroot"
if (!(Test-Path $wwwroot)) { New-Item -ItemType Directory -Path $wwwroot -Force | Out-Null }

$kioskDist = Join-Path $kioskDir "dist"
$adminDist = Join-Path $adminDir "dist"

if (Test-Path $kioskDist) {
    Copy-Item -Path "$kioskDist\*" -Destination (Join-Path $wwwroot "kiosk") -Recurse -Force
    Write-Host "Kiosk-App -> wwwroot/kiosk kopiert"
}
if (Test-Path $adminDist) {
    Copy-Item -Path "$adminDist\*" -Destination (Join-Path $wwwroot "admin") -Recurse -Force
    Write-Host "Admin-App -> wwwroot/admin kopiert"
}

Write-Host "`n=== Deployment abgeschlossen ===" -ForegroundColor Green
Write-Host "Server starten mit: dotnet $(Join-Path $root 'publish\InformationScreen.Api.dll')"
