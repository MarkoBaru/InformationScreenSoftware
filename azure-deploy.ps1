# ============================================================
#  InformationScreen - Azure Full Deployment Script
#  Erstellt alle Ressourcen, baut Docker-Images und deployed.
# ============================================================
#  Voraussetzungen:
#    - Azure CLI installiert und eingeloggt (az login)
#    - Docker Desktop laeuft
#    - Script aus dem Projekt-Root ausfuehren
# ============================================================

param(
    [switch]$SkipBuild,
    [switch]$SkipInfra,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

# ============================================================
# KONFIGURATION - Hier anpassen
# ============================================================
$SUBSCRIPTION      = "ABB-APP-NMG-PROD-APM0012632-01"
$RESOURCE_GROUP     = "CHCMC-Production"
$LOCATION           = "westeurope"

$COSMOS_ACCOUNT     = "cosmos-chcmc-infoscreen"
$COSMOS_DB_NAME     = "informationscreen"

$STORAGE_ACCOUNT    = "stchcmcinfoscreenmedia"
$BLOB_CONTAINER     = "media"

$ACR_NAME           = "acrchcmcinfoscreen"

$KEYVAULT_NAME      = "kv-chcmc-infoscreen"

$CAE_NAME           = "cae-chcmc-production"
$CA_BACKEND         = "ca-infoscreen-backend"
$CA_FRONTEND        = "ca-infoscreen-frontend"

$JWT_ISSUER         = "InformationScreen"

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

function Invoke-AzCommand($description, $command) {
    Write-Info $description
    if ($DryRun) {
        Write-Host "  [DRY-RUN] $command" -ForegroundColor Yellow
        return ""
    }
    $result = Invoke-Expression $command
    if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) {
        Write-Host "  [FEHLER] $description fehlgeschlagen!" -ForegroundColor Red
        throw "Befehl fehlgeschlagen: $command"
    }
    return $result
}

# ============================================================
# START
# ============================================================
Write-Host ""
Write-Host "========================================================" -ForegroundColor Magenta
Write-Host "  InformationScreen - Azure Deployment" -ForegroundColor Magenta
Write-Host "  Subscription: $SUBSCRIPTION" -ForegroundColor Magenta
Write-Host "  Resource Group: $RESOURCE_GROUP" -ForegroundColor Magenta
Write-Host "  Location: $LOCATION" -ForegroundColor Magenta
Write-Host "========================================================" -ForegroundColor Magenta

if ($DryRun) {
    Write-Host "  *** DRY-RUN Modus - es wird nichts erstellt ***" -ForegroundColor Yellow
}

# Subscription setzen
Write-Step "0" "Subscription setzen"
Invoke-AzCommand "Subscription auswaehlen" "az account set --subscription '$SUBSCRIPTION'"
Write-OK "Subscription: $SUBSCRIPTION"

# ============================================================
# INFRASTRUKTUR
# ============================================================
if (-not $SkipInfra) {

    # --- Resource Group ---
    Write-Step "1" "Resource Group erstellen"
    Invoke-AzCommand "Resource Group" "az group create --name $RESOURCE_GROUP --location $LOCATION -o none"
    Write-OK "$RESOURCE_GROUP in $LOCATION"

    # --- Cosmos DB (MongoDB API, Serverless) ---
    Write-Step "2" "Cosmos DB erstellen (Serverless, MongoDB API)"
    Write-Info "Das kann 3-5 Minuten dauern..."

    Invoke-AzCommand "Cosmos DB Account" "az cosmosdb create --name $COSMOS_ACCOUNT --resource-group $RESOURCE_GROUP --kind MongoDB --server-version 4.2 --default-consistency-level Session --locations regionName=$LOCATION failoverPriority=0 --capabilities EnableServerless -o none"
    Write-OK "$COSMOS_ACCOUNT erstellt"

    # --- Blob Storage ---
    Write-Step "3" "Azure Blob Storage erstellen"
    Invoke-AzCommand "Storage Account" "az storage account create --name $STORAGE_ACCOUNT --resource-group $RESOURCE_GROUP --location $LOCATION --sku Standard_LRS -o none"

    $STORAGE_KEY = Invoke-AzCommand "Storage Key abrufen" "az storage account keys list --account-name $STORAGE_ACCOUNT --resource-group $RESOURCE_GROUP --query '[0].value' -o tsv"

    Invoke-AzCommand "Blob Container" "az storage container create --name $BLOB_CONTAINER --account-name $STORAGE_ACCOUNT --account-key '$STORAGE_KEY' --public-access blob -o none"
    Write-OK "$STORAGE_ACCOUNT / $BLOB_CONTAINER"

    # --- Container Registry ---
    Write-Step "4" "Azure Container Registry erstellen"
    Invoke-AzCommand "ACR" "az acr create --name $ACR_NAME --resource-group $RESOURCE_GROUP --sku Basic --admin-enabled true -o none"
    Write-OK "$ACR_NAME"

    # --- Key Vault ---
    Write-Step "5" "Azure Key Vault erstellen"
    Invoke-AzCommand "Key Vault" "az keyvault create --name $KEYVAULT_NAME --resource-group $RESOURCE_GROUP --location $LOCATION --enable-rbac-authorization false -o none"
    Write-OK "$KEYVAULT_NAME"

    # --- Secrets in Key Vault speichern ---
    Write-Step "6" "Secrets im Key Vault speichern"

    # Cosmos DB Connection String abrufen
    Write-Info "Cosmos DB Connection String abrufen..."
    $COSMOS_CONN = Invoke-AzCommand "Cosmos DB Connection String" "az cosmosdb keys list --name $COSMOS_ACCOUNT --resource-group $RESOURCE_GROUP --type connection-strings --query 'connectionStrings[0].connectionString' -o tsv"

    # Blob Storage Connection String abrufen
    Write-Info "Blob Storage Connection String abrufen..."
    $BLOB_CONN = Invoke-AzCommand "Blob Connection String" "az storage account show-connection-string --name $STORAGE_ACCOUNT --resource-group $RESOURCE_GROUP --query connectionString -o tsv"

    # JWT Key automatisch generieren (64 Byte, Base64-kodiert = 88 Zeichen)
    Write-Info "JWT Key generieren..."
    $JWT_KEY_BYTES = New-Object byte[] 64
    $RNG = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    $RNG.GetBytes($JWT_KEY_BYTES)
    $RNG.Dispose()
    $JWT_KEY = [Convert]::ToBase64String($JWT_KEY_BYTES)
    Write-OK "JWT Key generiert (88 Zeichen, kryptografisch sicher)"

    # Secrets im Key Vault speichern
    if (-not $DryRun) {
        az keyvault secret set --vault-name $KEYVAULT_NAME --name "mongodb-connection" --value "$COSMOS_CONN" -o none
        az keyvault secret set --vault-name $KEYVAULT_NAME --name "blob-connection" --value "$BLOB_CONN" -o none
        az keyvault secret set --vault-name $KEYVAULT_NAME --name "jwt-key" --value "$JWT_KEY" -o none
    }
    Write-OK "3 Secrets gespeichert: mongodb-connection, blob-connection, jwt-key"

    # --- Container Apps Environment ---
    Write-Step "7" "Container Apps Environment erstellen"
    Invoke-AzCommand "Container Apps Environment" "az containerapp env create --name $CAE_NAME --resource-group $RESOURCE_GROUP --location $LOCATION -o none"
    Write-OK "$CAE_NAME"

} else {
    Write-Step "SKIP" "Infrastruktur wird uebersprungen (--SkipInfra)"

    # Secrets aus Key Vault laden fuer Container-Erstellung
    Write-Info "Secrets aus Key Vault laden..."
    $COSMOS_CONN = Invoke-AzCommand "Cosmos DB Connection String" "az keyvault secret show --vault-name $KEYVAULT_NAME --name 'mongodb-connection' --query value -o tsv"
    $BLOB_CONN = Invoke-AzCommand "Blob Connection String" "az keyvault secret show --vault-name $KEYVAULT_NAME --name 'blob-connection' --query value -o tsv"
    $JWT_KEY = Invoke-AzCommand "JWT Key" "az keyvault secret show --vault-name $KEYVAULT_NAME --name 'jwt-key' --query value -o tsv"
}

# ============================================================
# DOCKER BUILD & PUSH
# ============================================================
if (-not $SkipBuild) {

    Write-Step "8" "Docker-Images bauen und pushen"

    $ACR_URL = "$ACR_NAME.azurecr.io"

    Invoke-AzCommand "ACR Login" "az acr login --name $ACR_NAME"

    Write-Info "Backend-Image bauen..."
    if (-not $DryRun) {
        docker build -f docker/Dockerfile.backend -t "${ACR_URL}/infoscreen-backend:latest" .
        if ($LASTEXITCODE -ne 0) { throw "Backend Docker Build fehlgeschlagen" }
    }
    Write-OK "Backend-Image gebaut"

    Write-Info "Backend-Image pushen..."
    if (-not $DryRun) {
        docker push "${ACR_URL}/infoscreen-backend:latest"
        if ($LASTEXITCODE -ne 0) { throw "Backend Docker Push fehlgeschlagen" }
    }
    Write-OK "Backend-Image gepusht"

    Write-Info "Frontend-Image bauen..."
    if (-not $DryRun) {
        docker build -f docker/Dockerfile.frontend -t "${ACR_URL}/infoscreen-frontend:latest" .
        if ($LASTEXITCODE -ne 0) { throw "Frontend Docker Build fehlgeschlagen" }
    }
    Write-OK "Frontend-Image gebaut"

    Write-Info "Frontend-Image pushen..."
    if (-not $DryRun) {
        docker push "${ACR_URL}/infoscreen-frontend:latest"
        if ($LASTEXITCODE -ne 0) { throw "Frontend Docker Push fehlgeschlagen" }
    }
    Write-OK "Frontend-Image gepusht"

} else {
    Write-Step "SKIP" "Docker-Build wird uebersprungen (--SkipBuild)"
}

# ============================================================
# CONTAINER APPS DEPLOYEN
# ============================================================
Write-Step "9" "Container Apps deployen"

$ACR_URL = "$ACR_NAME.azurecr.io"

# ACR Credentials
Write-Info "ACR Credentials abrufen..."
$ACR_USER = Invoke-AzCommand "ACR Username" "az acr credential show --name $ACR_NAME --query username -o tsv"
$ACR_PASS = Invoke-AzCommand "ACR Password" "az acr credential show --name $ACR_NAME --query 'passwords[0].value' -o tsv"

# Backend Container App
Write-Info "Backend Container App erstellen..."
if (-not $DryRun) {
    az containerapp create `
        --name $CA_BACKEND `
        --resource-group $RESOURCE_GROUP `
        --environment $CAE_NAME `
        --image "${ACR_URL}/infoscreen-backend:latest" `
        --registry-server $ACR_URL `
        --registry-username $ACR_USER `
        --registry-password $ACR_PASS `
        --target-port 8080 `
        --ingress internal `
        --min-replicas 1 `
        --max-replicas 3 `
        --cpu 0.5 `
        --memory 1.0Gi `
        --env-vars `
            "DATABASE_PROVIDER=MongoDB" `
            "MONGODB_CONNECTION=secretref:mongodb-connection" `
            "MONGODB_DATABASE=$COSMOS_DB_NAME" `
            "AzureBlobStorage__ConnectionString=secretref:blob-connection" `
            "AzureBlobStorage__ContainerName=$BLOB_CONTAINER" `
            "JWT_KEY=secretref:jwt-key" `
            "JWT_ISSUER=$JWT_ISSUER" `
            "ALLOWED_ORIGINS=https://$CA_FRONTEND.*.azurecontainerapps.io" `
        --secrets `
            "mongodb-connection=$COSMOS_CONN" `
            "blob-connection=$BLOB_CONN" `
            "jwt-key=$JWT_KEY" `
        -o none
}
Write-OK "Backend: $CA_BACKEND (intern, Port 8080)"

# Frontend Container App
Write-Info "Frontend Container App erstellen..."
if (-not $DryRun) {
    az containerapp create `
        --name $CA_FRONTEND `
        --resource-group $RESOURCE_GROUP `
        --environment $CAE_NAME `
        --image "${ACR_URL}/infoscreen-frontend:latest" `
        --registry-server $ACR_URL `
        --registry-username $ACR_USER `
        --registry-password $ACR_PASS `
        --target-port 80 `
        --ingress external `
        --min-replicas 1 `
        --max-replicas 3 `
        --cpu 0.25 `
        --memory 0.5Gi `
        -o none
}
Write-OK "Frontend: $CA_FRONTEND (extern, Port 80)"

# ============================================================
# CORS AKTUALISIEREN
# ============================================================
Write-Step "10" "CORS mit finaler URL aktualisieren"

if (-not $DryRun) {
    $FRONTEND_URL = az containerapp show `
        --name $CA_FRONTEND `
        --resource-group $RESOURCE_GROUP `
        --query "properties.configuration.ingress.fqdn" -o tsv

    Write-Info "Frontend URL: https://$FRONTEND_URL"

    az containerapp update `
        --name $CA_BACKEND `
        --resource-group $RESOURCE_GROUP `
        --set-env-vars "ALLOWED_ORIGINS=https://$FRONTEND_URL" `
        -o none

    Write-OK "CORS aktualisiert auf https://$FRONTEND_URL"
} else {
    Write-Info "[DRY-RUN] CORS wird nach Deployment aktualisiert"
}

# ============================================================
# ZUSAMMENFASSUNG
# ============================================================
Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host "  DEPLOYMENT ABGESCHLOSSEN!" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Ressourcen:" -ForegroundColor White
Write-Host "    Resource Group:   $RESOURCE_GROUP" -ForegroundColor Gray
Write-Host "    Cosmos DB:        $COSMOS_ACCOUNT" -ForegroundColor Gray
Write-Host "    Blob Storage:     $STORAGE_ACCOUNT / $BLOB_CONTAINER" -ForegroundColor Gray
Write-Host "    Container Reg:    $ACR_NAME.azurecr.io" -ForegroundColor Gray
Write-Host "    Key Vault:        $KEYVAULT_NAME" -ForegroundColor Gray
Write-Host ""
Write-Host "  Container Apps:" -ForegroundColor White
Write-Host "    Backend:  $CA_BACKEND (intern)" -ForegroundColor Gray
Write-Host "    Frontend: $CA_FRONTEND (extern)" -ForegroundColor Gray

if (-not $DryRun) {
    $FRONTEND_URL = az containerapp show --name $CA_FRONTEND --resource-group $RESOURCE_GROUP --query "properties.configuration.ingress.fqdn" -o tsv
    Write-Host ""
    Write-Host "  App-URL:   https://$FRONTEND_URL" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Standard-Login: admin / admin" -ForegroundColor Yellow
    Write-Host "  (Bitte nach dem ersten Login das Passwort aendern!)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "  Secrets im Key Vault: $KEYVAULT_NAME" -ForegroundColor White
Write-Host "    - mongodb-connection" -ForegroundColor Gray
Write-Host "    - blob-connection" -ForegroundColor Gray
Write-Host "    - jwt-key (automatisch generiert)" -ForegroundColor Gray
Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
