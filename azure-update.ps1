# ============================================================
#  InformationScreen - Azure Update Script (Sicheres Update)
#  Baut Docker-Images und aktualisiert bestehende Container Apps.
#  KEINE Infrastruktur-Aenderungen, KEINE Secret-Aenderungen,
#  KEIN JWT-Key-Reset -> Daten und Sessions bleiben erhalten.
# ============================================================
#  Voraussetzungen:
#    - Azure CLI installiert und eingeloggt (az login)
#    - Docker Desktop laeuft
#    - Container Apps muessen bereits existieren (azure-deploy.ps1)
#    - Script aus dem Projekt-Root ausfuehren
# ============================================================

param(
    [switch]$SkipBuild,
    [switch]$BackendOnly,
    [switch]$FrontendOnly,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

# ============================================================
# KONFIGURATION
# ============================================================
$SUBSCRIPTION      = "ABB-APP-NMG-PROD-APM0012632-01"
$RESOURCE_GROUP     = "CHCMC-Production"
$ACR_NAME           = "acrchcmcinfoscreen"
$CA_BACKEND         = "ca-infoscreen-backend"
$CA_FRONTEND        = "ca-infoscreen-frontend"
$CA_RTSPTOWEB       = "ca-infoscreen-rtsptoweb"

# ============================================================
# Hilfsfunktionen
# ============================================================
function Write-Step($step, $message) {
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host " [$step] $message" -ForegroundColor Cyan
    Write-Host "============================================" -ForegroundColor Cyan
}

function Write-Info($message) {
    Write-Host "  > $message" -ForegroundColor Gray
}

function Write-OK($message) {
    Write-Host "  [OK] $message" -ForegroundColor Green
}

# ============================================================
# Bestimmen welche Apps aktualisiert werden
# ============================================================
$updateBackend  = -not $FrontendOnly
$updateFrontend = -not $BackendOnly
$updateRtsp     = -not $BackendOnly -and -not $FrontendOnly

# ============================================================
# START
# ============================================================
Write-Host ""
Write-Host "========================================================" -ForegroundColor Magenta
Write-Host "  InformationScreen - Azure Update (Sicher)" -ForegroundColor Magenta
Write-Host "  Subscription: $SUBSCRIPTION" -ForegroundColor Magenta
Write-Host "  Resource Group: $RESOURCE_GROUP" -ForegroundColor Magenta
Write-Host "========================================================" -ForegroundColor Magenta
Write-Host ""
Write-Host "  Dieses Script aendert NUR Container-Images." -ForegroundColor Green
Write-Host "  Keine Infrastruktur, keine Secrets, kein JWT-Reset." -ForegroundColor Green
Write-Host "  -> Daten und Sessions bleiben erhalten." -ForegroundColor Green

if ($DryRun) {
    Write-Host ""
    Write-Host "  *** DRY-RUN Modus - es wird nichts geaendert ***" -ForegroundColor Yellow
}

$scope = @()
if ($updateBackend)  { $scope += "Backend" }
if ($updateRtsp)     { $scope += "RTSPtoWeb" }
if ($updateFrontend) { $scope += "Frontend" }
Write-Host ""
Write-Host "  Scope: $($scope -join ', ')" -ForegroundColor White

# Subscription setzen
Write-Step "1" "Subscription setzen"
az account set --subscription $SUBSCRIPTION
if ($LASTEXITCODE -ne 0) { throw "Subscription konnte nicht gesetzt werden." }
Write-OK "Subscription: $SUBSCRIPTION"

# ============================================================
# Pruefen ob Container Apps existieren
# ============================================================
Write-Step "2" "Container Apps pruefen"

$oldEAP = $ErrorActionPreference; $ErrorActionPreference = 'Continue'

if ($updateBackend) {
    $BACKEND_EXISTS = az containerapp show --name $CA_BACKEND --resource-group $RESOURCE_GROUP --query "name" -o tsv 2>$null
    if (-not $BACKEND_EXISTS) {
        $ErrorActionPreference = $oldEAP
        throw "Backend Container App '$CA_BACKEND' existiert nicht. Bitte zuerst azure-deploy.ps1 ausfuehren."
    }
    Write-OK "Backend: $CA_BACKEND vorhanden"
}

if ($updateRtsp) {
    $RTSP_EXISTS = az containerapp show --name $CA_RTSPTOWEB --resource-group $RESOURCE_GROUP --query "name" -o tsv 2>$null
    if (-not $RTSP_EXISTS) {
        $ErrorActionPreference = $oldEAP
        throw "RTSPtoWeb Container App '$CA_RTSPTOWEB' existiert nicht. Bitte zuerst azure-deploy.ps1 ausfuehren."
    }
    Write-OK "RTSPtoWeb: $CA_RTSPTOWEB vorhanden"
}

if ($updateFrontend) {
    $FRONTEND_EXISTS = az containerapp show --name $CA_FRONTEND --resource-group $RESOURCE_GROUP --query "name" -o tsv 2>$null
    if (-not $FRONTEND_EXISTS) {
        $ErrorActionPreference = $oldEAP
        throw "Frontend Container App '$CA_FRONTEND' existiert nicht. Bitte zuerst azure-deploy.ps1 ausfuehren."
    }
    Write-OK "Frontend: $CA_FRONTEND vorhanden"
}

$ErrorActionPreference = $oldEAP

# ============================================================
# DOCKER BUILD & PUSH
# ============================================================
if (-not $SkipBuild) {

    Write-Step "3" "Docker-Images bauen und pushen"

    $ACR_URL = "$ACR_NAME.azurecr.io"

    Write-Info "ACR Login..."
    az acr login --name $ACR_NAME
    if ($LASTEXITCODE -ne 0) { throw "ACR Login fehlgeschlagen" }

    if ($updateBackend) {
        Write-Info "Backend-Image bauen..."
        if (-not $DryRun) {
            docker build -f docker/Dockerfile.backend -t "${ACR_URL}/infoscreen-backend:latest" .
            if ($LASTEXITCODE -ne 0) { throw "Backend Docker Build fehlgeschlagen" }
            Write-OK "Backend-Image gebaut"

            Write-Info "Backend-Image pushen..."
            docker push "${ACR_URL}/infoscreen-backend:latest"
            if ($LASTEXITCODE -ne 0) { throw "Backend Docker Push fehlgeschlagen" }
            Write-OK "Backend-Image gepusht"
        } else {
            Write-Host "  [DRY-RUN] docker build/push backend" -ForegroundColor Yellow
        }
    }

    if ($updateFrontend) {
        Write-Info "Frontend-Image bauen..."
        if (-not $DryRun) {
            docker build -f docker/Dockerfile.frontend -t "${ACR_URL}/infoscreen-frontend:latest" .
            if ($LASTEXITCODE -ne 0) { throw "Frontend Docker Build fehlgeschlagen" }
            Write-OK "Frontend-Image gebaut"

            Write-Info "Frontend-Image pushen..."
            docker push "${ACR_URL}/infoscreen-frontend:latest"
            if ($LASTEXITCODE -ne 0) { throw "Frontend Docker Push fehlgeschlagen" }
            Write-OK "Frontend-Image gepusht"
        } else {
            Write-Host "  [DRY-RUN] docker build/push frontend" -ForegroundColor Yellow
        }
    }

    if ($updateRtsp) {
        Write-Info "RTSPtoWeb-Image bauen..."
        if (-not $DryRun) {
            docker build -f docker/Dockerfile.rtsptoweb -t "${ACR_URL}/infoscreen-rtsptoweb:latest" .
            if ($LASTEXITCODE -ne 0) { throw "RTSPtoWeb Docker Build fehlgeschlagen" }
            Write-OK "RTSPtoWeb-Image gebaut"

            Write-Info "RTSPtoWeb-Image pushen..."
            docker push "${ACR_URL}/infoscreen-rtsptoweb:latest"
            if ($LASTEXITCODE -ne 0) { throw "RTSPtoWeb Docker Push fehlgeschlagen" }
            Write-OK "RTSPtoWeb-Image gepusht"
        } else {
            Write-Host "  [DRY-RUN] docker build/push rtsptoweb" -ForegroundColor Yellow
        }
    }

} else {
    Write-Step "SKIP" "Docker-Build wird uebersprungen (-SkipBuild)"
}

# ============================================================
# CONTAINER APPS AKTUALISIEREN (nur Image + neue Revision)
# ============================================================
Write-Step "4" "Container Apps aktualisieren (neue Revision)"

$REV_SUFFIX = "v" + (Get-Date -Format "yyyyMMddHHmm")
$ACR_URL = "$ACR_NAME.azurecr.io"

Write-Info "Revision-Suffix: $REV_SUFFIX"

if ($updateBackend) {
    Write-Info "Backend aktualisieren..."
    if (-not $DryRun) {
        az containerapp update `
            --name $CA_BACKEND `
            --resource-group $RESOURCE_GROUP `
            --image "${ACR_URL}/infoscreen-backend:latest" `
            --revision-suffix $REV_SUFFIX `
            -o none
        if ($LASTEXITCODE -ne 0) { throw "Backend Update fehlgeschlagen" }
    } else {
        Write-Host "  [DRY-RUN] az containerapp update --name $CA_BACKEND --revision-suffix $REV_SUFFIX" -ForegroundColor Yellow
    }
    Write-OK "Backend aktualisiert"
}

if ($updateRtsp) {
    Write-Info "RTSPtoWeb aktualisieren..."
    if (-not $DryRun) {
        az containerapp update `
            --name $CA_RTSPTOWEB `
            --resource-group $RESOURCE_GROUP `
            --image "${ACR_URL}/infoscreen-rtsptoweb:latest" `
            --revision-suffix $REV_SUFFIX `
            -o none
        if ($LASTEXITCODE -ne 0) { throw "RTSPtoWeb Update fehlgeschlagen" }
    } else {
        Write-Host "  [DRY-RUN] az containerapp update --name $CA_RTSPTOWEB --revision-suffix $REV_SUFFIX" -ForegroundColor Yellow
    }
    Write-OK "RTSPtoWeb aktualisiert"
}

if ($updateFrontend) {
    Write-Info "Frontend aktualisieren..."
    if (-not $DryRun) {
        az containerapp update `
            --name $CA_FRONTEND `
            --resource-group $RESOURCE_GROUP `
            --image "${ACR_URL}/infoscreen-frontend:latest" `
            --revision-suffix $REV_SUFFIX `
            -o none
        if ($LASTEXITCODE -ne 0) { throw "Frontend Update fehlgeschlagen" }
    } else {
        Write-Host "  [DRY-RUN] az containerapp update --name $CA_FRONTEND --revision-suffix $REV_SUFFIX" -ForegroundColor Yellow
    }
    Write-OK "Frontend aktualisiert"
}

# ============================================================
# ZUSAMMENFASSUNG
# ============================================================
Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host "  UPDATE ABGESCHLOSSEN!" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Aktualisiert:" -ForegroundColor White
if ($updateBackend)  { Write-Host "    - Backend:   $CA_BACKEND" -ForegroundColor Gray }
if ($updateRtsp)     { Write-Host "    - RTSPtoWeb: $CA_RTSPTOWEB" -ForegroundColor Gray }
if ($updateFrontend) { Write-Host "    - Frontend:  $CA_FRONTEND" -ForegroundColor Gray }
Write-Host "    Revision:  $REV_SUFFIX" -ForegroundColor Gray
Write-Host ""
Write-Host "  Nicht veraendert:" -ForegroundColor White
Write-Host "    - Infrastruktur (Cosmos DB, Storage, Key Vault)" -ForegroundColor Gray
Write-Host "    - Secrets (JWT-Key, Connection Strings)" -ForegroundColor Gray
Write-Host "    - Datenbank-Inhalte" -ForegroundColor Gray
Write-Host "    - Benutzer-Sessions" -ForegroundColor Gray
Write-Host ""

if (-not $DryRun) {
    $FRONTEND_URL = az containerapp show --name $CA_FRONTEND --resource-group $RESOURCE_GROUP --query "properties.configuration.ingress.fqdn" -o tsv
    Write-Host "  App-URL: https://$FRONTEND_URL" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
