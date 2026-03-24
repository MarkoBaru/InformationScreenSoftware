# Edge Kiosk Mode Setup
# Dieses Script startet Microsoft Edge im Kiosk-Modus (Vollbild)
# für einen bestimmten Bildschirm (Screen-Slug).

param(
    [Parameter(Mandatory=$true)]
    [string]$Slug,

    [string]$BaseUrl = "http://localhost:5001"
)

$edgePath = "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
if (!(Test-Path $edgePath)) {
    $edgePath = "C:\Program Files\Microsoft\Edge\Application\msedge.exe"
}
if (!(Test-Path $edgePath)) {
    Write-Error "Microsoft Edge nicht gefunden."
    exit 1
}

$url = "$BaseUrl/kiosk/$Slug"

Write-Host "Starte Edge im Kiosk-Modus: $url"
Start-Process $edgePath -ArgumentList "--kiosk `"$url`" --edge-kiosk-type=fullscreen --no-first-run"
