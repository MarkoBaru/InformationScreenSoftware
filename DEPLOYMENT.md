# InformationScreen – Azure Deployment Anleitung

## Übersicht

Die App besteht aus 3 Containern:
- **backend** – ASP.NET Core 8.0 API
- **frontend** – Nginx mit Admin-App (/) und Kiosk-App (/kiosk/)
- **mongodb** – Nur lokal; in Azure ersetzt durch Cosmos DB DocumentDB

---

## Voraussetzungen

- [Azure CLI](https://learn.microsoft.com/de-de/cli/azure/install-azure-cli-windows) installiert
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installiert
- Azure-Abo aktiv (Subscription: `ABB-APP-NMG-PROD-APM0012632-01`)

```powershell
# Azure CLI anmelden
az login

# Richtige Subscription auswählen
az account set --subscription "ABB-APP-NMG-PROD-APM0012632-01"
```

---

## Schritt 1: Azure-Ressourcen erstellen

### 1.1 Ressourcengruppe

```powershell
$RESOURCE_GROUP = "CHCMC-Production"
$LOCATION = "westeurope"

az group create --name $RESOURCE_GROUP --location $LOCATION
```

### 1.2 Cosmos DB (DocumentDB mit MongoDB-Kompatibilität)

> Das ist die Datenbank, die du im Azure Portal unter "Azure DocumentDB (with MongoDB compatibility)" erstellen kannst – oder per CLI:

```powershell
$COSMOS_ACCOUNT = "cosmos-chcmc-infoscreen"   # muss global einzigartig sein

az cosmosdb create `
  --name $COSMOS_ACCOUNT `
  --resource-group $RESOURCE_GROUP `
  --kind MongoDB `
  --server-version 4.2 `
  --default-consistency-level Session `
  --locations regionName=$LOCATION failoverPriority=0

# Connection String abrufen:
az cosmosdb keys list `
  --name $COSMOS_ACCOUNT `
  --resource-group $RESOURCE_GROUP `
  --type connection-strings `
  --query "connectionStrings[0].connectionString" -o tsv
```

> **Notiere den Connection String!** Du brauchst ihn gleich für die `.env`.

### 1.3 Azure Blob Storage (für Medien-Uploads)

```powershell
$STORAGE_ACCOUNT = "stchcmcinfoscreenmedia"   # muss global einzigartig sein, nur Kleinbuchstaben/Zahlen

az storage account create `
  --name $STORAGE_ACCOUNT `
  --resource-group $RESOURCE_GROUP `
  --location $LOCATION `
  --sku Standard_LRS

# Container erstellen
az storage container create `
  --name media `
  --account-name $STORAGE_ACCOUNT `
  --public-access blob

# Connection String abrufen:
az storage account show-connection-string `
  --name $STORAGE_ACCOUNT `
  --resource-group $RESOURCE_GROUP `
  --query connectionString -o tsv
```

> **Notiere auch diesen Connection String!**

### 1.4 Azure Container Registry (für Docker-Images)

```powershell
$ACR_NAME = "acrchcmcinfoscreen"   # muss global einzigartig sein

az acr create `
  --name $ACR_NAME `
  --resource-group $RESOURCE_GROUP `
  --sku Basic `
  --admin-enabled true

# Login-Daten abrufen:
az acr credential show --name $ACR_NAME
```

---

## Schritt 2: .env konfigurieren

Trage die Connection Strings aus Schritt 1 in deine `.env` ein:

```env
DATABASE_PROVIDER=MongoDB
MONGODB_CONNECTION=mongodb://cosmos-chcmc-infoscreen:DEIN_KEY@cosmos-chcmc-infoscreen.mongo.cosmos.azure.com:10255/?ssl=true&retrywrites=false&maxIdleTimeMS=120000&appName=@cosmos-chcmc-infoscreen@
MONGODB_DATABASE=informationscreen
AZURE_BLOB_CONNECTION=DefaultEndpointsProtocol=https;AccountName=stchcmcinfoscreenmedia;AccountKey=DEIN_KEY;EndpointSuffix=core.windows.net
AZURE_BLOB_CONTAINER=media
ALLOWED_ORIGINS=https://deine-app-url.azurewebsites.net
JWT_KEY=DEIN_SICHERER_ZUFAELLIGER_KEY_MIN_32_ZEICHEN
JWT_ISSUER=InformationScreen
APP_PORT=80
```

> **⚠️ Sicherheitshinweis:** Verwende für `JWT_KEY` in Produktion einen langen, zufälligen String (z.B. mit `openssl rand -base64 48` generiert). Der Standard-Key aus dem Repository ist **nicht sicher** für Produktion!

---

## Schritt 3: Lokal mit Docker testen (optional)

Vor dem Azure-Deployment kannst du lokal alles testen:

```powershell
# Im Projektverzeichnis:
docker-compose up --build
```

Öffne dann:
- Admin: http://localhost
- Kiosk: http://localhost/kiosk/

> Das nutzt einen lokalen MongoDB-Container. Zum Stoppen: `docker-compose down`

> **Standard-Login:** Beim ersten Start wird automatisch ein Admin-Benutzer erstellt: `admin` / `admin`. Bitte nach dem ersten Login das Passwort ändern!

---

## Schritt 4: Docker-Images bauen & pushen

```powershell
$ACR_NAME = "acrchcmcinfoscreen"
$ACR_URL = "$ACR_NAME.azurecr.io"

# Bei ACR anmelden
az acr login --name $ACR_NAME

# Backend-Image bauen und pushen
docker build -f docker/Dockerfile.backend -t "${ACR_URL}/infoscreen-backend:latest" .
docker push "${ACR_URL}/infoscreen-backend:latest"

# Frontend-Image bauen und pushen
docker build -f docker/Dockerfile.frontend -t "${ACR_URL}/infoscreen-frontend:latest" .
docker push "${ACR_URL}/infoscreen-frontend:latest"
```

---

## Schritt 5: Azure Container App erstellen

### Option A: Azure Container Apps (empfohlen)

```powershell
# Container Apps Umgebung erstellen
az containerapp env create `
  --name "cae-infoscreen" `
  --resource-group $RESOURCE_GROUP `
  --location $LOCATION

# Backend deployen
az containerapp create `
  --name "ca-infoscreen-backend" `
  --resource-group $RESOURCE_GROUP `
  --environment "cae-infoscreen" `
  --image "${ACR_URL}/infoscreen-backend:latest" `
  --registry-server $ACR_URL `
  --registry-username $(az acr credential show --name $ACR_NAME --query username -o tsv) `
  --registry-password $(az acr credential show --name $ACR_NAME --query "passwords[0].value" -o tsv) `
  --target-port 8080 `
  --ingress internal `
  --min-replicas 1 `
  --max-replicas 3 `
  --env-vars `
    "DATABASE_PROVIDER=MongoDB" `
    "MONGODB_CONNECTION=secretref:mongodb-connection" `
    "MONGODB_DATABASE=informationscreen" `
    "AzureBlobStorage__ConnectionString=secretref:blob-connection" `
    "AzureBlobStorage__ContainerName=media" `
    "ALLOWED_ORIGINS=https://ca-infoscreen-frontend.*.azurecontainerapps.io" `
    "JWT_KEY=secretref:jwt-key" `
    "JWT_ISSUER=InformationScreen" `
  --secrets `
    "mongodb-connection=DEIN_COSMOS_CONNECTION_STRING" `
    "blob-connection=DEIN_BLOB_CONNECTION_STRING" `
    "jwt-key=DEIN_SICHERER_ZUFAELLIGER_KEY_MIN_32_ZEICHEN"

# Frontend deployen
az containerapp create `
  --name "ca-infoscreen-frontend" `
  --resource-group $RESOURCE_GROUP `
  --environment "cae-infoscreen" `
  --image "${ACR_URL}/infoscreen-frontend:latest" `
  --registry-server $ACR_URL `
  --registry-username $(az acr credential show --name $ACR_NAME --query username -o tsv) `
  --registry-password $(az acr credential show --name $ACR_NAME --query "passwords[0].value" -o tsv) `
  --target-port 80 `
  --ingress external `
  --min-replicas 1 `
  --max-replicas 3

# URL abrufen:
az containerapp show `
  --name "ca-infoscreen-frontend" `
  --resource-group $RESOURCE_GROUP `
  --query "properties.configuration.ingress.fqdn" -o tsv
```

### Option B: Azure App Service (einfacher, weniger Konfiguration)

```powershell
# App Service Plan erstellen
az appservice plan create `
  --name "asp-infoscreen" `
  --resource-group $RESOURCE_GROUP `
  --sku B1 `
  --is-linux

# Multi-Container App (docker-compose) deployen
az webapp create `
  --name "app-infoscreen" `
  --resource-group $RESOURCE_GROUP `
  --plan "asp-infoscreen" `
  --multicontainer-config-type compose `
  --multicontainer-config-file docker-compose.azure.yml

# Umgebungsvariablen setzen
az webapp config appsettings set `
  --name "app-infoscreen" `
  --resource-group $RESOURCE_GROUP `
  --settings `
    DATABASE_PROVIDER=MongoDB `
    MONGODB_CONNECTION="DEIN_COSMOS_CONNECTION_STRING" `
    MONGODB_DATABASE=informationscreen `
    AZURE_BLOB_CONNECTION="DEIN_BLOB_CONNECTION_STRING" `
    AZURE_BLOB_CONTAINER=media `
    JWT_KEY="DEIN_SICHERER_ZUFAELLIGER_KEY_MIN_32_ZEICHEN" `
    JWT_ISSUER=InformationScreen
```

---

## Schritt 6: CORS aktualisieren

Sobald du die finale URL hast (z.B. `https://ca-infoscreen-frontend.westeurope.azurecontainerapps.io`), setze sie in der Backend-Konfiguration:

```powershell
# Bei Container Apps:
az containerapp update `
  --name "ca-infoscreen-backend" `
  --resource-group $RESOURCE_GROUP `
  --set-env-vars "ALLOWED_ORIGINS=https://deine-finale-url.azurecontainerapps.io"
```

---

## Zusammenfassung: Was muss manuell erstellt werden?

| Ressource | Erstellen? | Warum? |
|---|---|---|
| Ressourcengruppe | ✅ Ja, manuell | Logischer Container für alle Ressourcen |
| Cosmos DB (DocumentDB) | ✅ Ja, manuell | Datenbank – wird NICHT automatisch erstellt |
| Blob Storage | ✅ Ja, manuell | Datei-Speicher für Videos/Bilder/PDFs |
| Container Registry | ✅ Ja, manuell | Speichert die Docker-Images |
| Container App / App Service | ✅ Ja, manuell | Hostet und führt die Container aus |
| Datenbank-Collections | ❌ Automatisch | Der Code erstellt sie bei erster Nutzung |
| Blob-Container "media" | ❌ Automatisch | Der Code erstellt ihn bei erster Nutzung |

---

## Kosten-Schätzung (ca.)

| Ressource | SKU | ca. Kosten/Monat |
|---|---|---|
| Cosmos DB (DocumentDB) | Serverless | 0-5€ (bei wenig Traffic) |
| Blob Storage | Standard LRS | <1€ |
| Container Registry | Basic | ~5€ |
| Container Apps | Consumption | 0-10€ (bei wenig Traffic) |
| **Gesamt** | | **~10-20€/Monat** |

> Tipp: Cosmos DB Serverless ist am günstigsten für niedrigen Traffic. Falls du es im Portal erstellst, wähle bei "Capacity mode" → **Serverless**.

---

## Schnell-Referenz: Alle Befehle in Reihenfolge

```powershell
# === Variablen ===
$RESOURCE_GROUP = "CHCMC-Production"
$LOCATION = "westeurope"
$COSMOS_ACCOUNT = "cosmos-chcmc-infoscreen"
$STORAGE_ACCOUNT = "stchcmcinfoscreenmedia"
$ACR_NAME = "acrchcmcinfoscreen"

# === 1. Subscription & Ressourcengruppe ===
az login
az account set --subscription "ABB-APP-NMG-PROD-APM0012632-01"
az group create --name $RESOURCE_GROUP --location $LOCATION

az cosmosdb create --name $COSMOS_ACCOUNT --resource-group $RESOURCE_GROUP --kind MongoDB --server-version 4.2 --default-consistency-level Session --locations regionName=$LOCATION failoverPriority=0

az storage account create --name $STORAGE_ACCOUNT --resource-group $RESOURCE_GROUP --location $LOCATION --sku Standard_LRS
az storage container create --name media --account-name $STORAGE_ACCOUNT --public-access blob

az acr create --name $ACR_NAME --resource-group $RESOURCE_GROUP --sku Basic --admin-enabled true

# === 2. Connection Strings abrufen ===
az cosmosdb keys list --name $COSMOS_ACCOUNT --resource-group $RESOURCE_GROUP --type connection-strings --query "connectionStrings[0].connectionString" -o tsv
az storage account show-connection-string --name $STORAGE_ACCOUNT --resource-group $RESOURCE_GROUP --query connectionString -o tsv

# === 3. Docker-Images bauen & pushen ===
az acr login --name $ACR_NAME
docker build -f docker/Dockerfile.backend -t "${ACR_NAME}.azurecr.io/infoscreen-backend:latest" .
docker push "${ACR_NAME}.azurecr.io/infoscreen-backend:latest"
docker build -f docker/Dockerfile.frontend -t "${ACR_NAME}.azurecr.io/infoscreen-frontend:latest" .
docker push "${ACR_NAME}.azurecr.io/infoscreen-frontend:latest"

# === 4. Container Apps deployen (siehe Schritt 5A oben) ===
```
