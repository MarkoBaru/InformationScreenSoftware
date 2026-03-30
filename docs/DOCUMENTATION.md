# InformationScreen Software — Projektdokumentation

> **Version:** 1.0.0  
> **Datum:** 30. März 2026  
> **Autor:** Marko Barutcu  
> **Repository:** https://github.com/MarkoBaru/InformationScreenSoftware

---

## Inhaltsverzeichnis

1. [Projektübersicht](#1-projektübersicht)
2. [Systemarchitektur](#2-systemarchitektur)
3. [Technologie-Stack](#3-technologie-stack)
4. [Bibliotheken und Abhängigkeiten](#4-bibliotheken-und-abhängigkeiten)
5. [Sicherheitsanalyse](#5-sicherheitsanalyse)
6. [Deployment](#6-deployment)
7. [Projektstruktur](#7-projektstruktur)
8. [Datenmodell](#8-datenmodell)
9. [API-Endpunkte](#9-api-endpunkte)
10. [Diagramme](#10-diagramme)

---

## 1. Projektübersicht

### 1.1 Zweck

Die **InformationScreen Software** ist ein Kiosk-Informationsterminal-System für den Einsatz in Unternehmensumgebungen. Es ermöglicht die zentrale Verwaltung und Anzeige von Informationsinhalten auf Touchscreen-Terminals.

### 1.2 Funktionsumfang

| Funktion | Beschreibung |
|---|---|
| **Bildschirmverwaltung** | Mehrere Kiosk-Bildschirme mit individueller Konfiguration |
| **Kachelverwaltung** | Inhalts-Kacheln mit verschiedenen Content-Typen (Links, Bilder, Videos, PDFs, Beiträge, Schichtpläne, RTSP-Streams) |
| **Kategorien** | Kacheln können in Kategorien organisiert werden |
| **Medienverwaltung** | Upload und Verwaltung von Bildern, Videos und Dokumenten |
| **Benutzerverwaltung** | Rollenbasierte Zugriffskontrolle (Admin / Editor) |
| **Idle-Modus** | Automatischer Ruhemodus mit Slideshow/Content-Rotation bei Inaktivität |
| **RTSP-Streaming** | Live-Kamera-Streams via RTSPtoWeb-Integration |
| **Einstellungen** | Konfigurierbare Systemeinstellungen (z.B. RTSPtoWeb-URL) |

### 1.3 Benutzerrollen

| Rolle | Rechte |
|---|---|
| **Admin** | Voller Zugriff: Bildschirme, Kacheln, Kategorien, Medien, Benutzer, Einstellungen |
| **Editor** | Verwaltung von Bildschirmen, Kacheln, Kategorien und Medien |
| **Kiosk (anonym)** | Nur-Lese-Zugriff auf zugewiesene Bildschirminhalte |

---

## 2. Systemarchitektur

Das System besteht aus folgenden Hauptkomponenten:

- **Backend (ASP.NET Core 8.0):** REST-API mit JWT-Authentifizierung
- **Admin-App (React 18):** Webbasierte Administrationsoberfläche (SPA)
- **Kiosk-App (React 18):** Vollbild-Anzeige für Touchscreen-Terminals (SPA)
- **Nginx Reverse Proxy:** Statisches Frontend-Hosting + API-Proxy
- **MongoDB / Cosmos DB:** Persistente Datenspeicherung (Inhalte)
- **SQLite:** Authentifizierung und Einstellungen
- **Azure Blob Storage:** Mediendateien (Bilder, Videos, PDFs)
- **RTSPtoWeb:** RTSP-zu-WebSocket-Konverter für Live-Streams

<!-- DIAGRAMM EINFÜGEN: Context-Diagramm (context-diagram.drawio → JPG exportieren) -->

---

## 3. Technologie-Stack

### 3.1 Backend

| Technologie | Version | Zweck |
|---|---|---|
| .NET | 8.0 (LTS) | Runtime |
| ASP.NET Core | 8.0.14 | Web-Framework |
| Entity Framework Core | 8.0.14 | ORM (SQLite) |
| MongoDB.Driver | 2.28.0 | MongoDB/Cosmos DB Zugriff |
| JWT Bearer | 8.0.14 | Authentifizierung |
| Azure.Storage.Blobs | 12.21.2 | Blob Storage SDK |
| Swashbuckle | 6.9.0 | Swagger/OpenAPI |

### 3.2 Frontend (Admin-App & Kiosk-App)

| Technologie | Version | Zweck |
|---|---|---|
| React | 18.3.1 | UI-Framework |
| React Router DOM | 6.30.3 | Client-Side Routing |
| TypeScript | 5.9.3 | Typsicheres JavaScript |
| Vite | 6.4.1 | Build-Tool und Dev-Server |

### 3.3 Infrastruktur

| Technologie | Version | Zweck |
|---|---|---|
| Docker | Multi-Stage | Containerisierung |
| Nginx | Alpine | Reverse Proxy + Static Hosting |
| MongoDB | 7 | Datenbank (lokal) |
| Azure Cosmos DB | MongoDB API | Datenbank (Cloud) |
| Azure Container Apps | — | Container-Hosting |
| Azure Blob Storage | — | Medienspeicher |
| Azure Key Vault | — | Secret Management |
| RTSPtoWeb | latest | RTSP-Stream-Konverter |

---

## 4. Bibliotheken und Abhängigkeiten

### 4.1 Backend — NuGet-Pakete

| Paket | Verwendet | Aktuellste | Status | Hinweis |
|---|---|---|---|---|
| Swashbuckle.AspNetCore | 6.9.0 | 10.1.7 | ⚠️ Major-Update | Nur Dev/Swagger, kein Sicherheitsrisiko |
| Microsoft.EntityFrameworkCore.Sqlite | 8.0.14 | 10.0.5 | ✅ Aktuell für .NET 8 | 10.x erfordert .NET 10 |
| Microsoft.EntityFrameworkCore.Design | 8.0.14 | 10.0.5 | ✅ Aktuell für .NET 8 | 10.x erfordert .NET 10 |
| MongoDB.Driver | 2.28.0 | 3.7.1 | ⚠️ Major-Update | Breaking Changes in v3; v2.28 ist letzte v2 |
| Azure.Storage.Blobs | 12.21.2 | 12.27.0 | ⚠️ Minor-Update | Update empfohlen |
| Microsoft.AspNetCore.Authentication.JwtBearer | 8.0.14 | 10.0.5 | ✅ Aktuell für .NET 8 | 10.x erfordert .NET 10 |

### 4.2 Frontend — npm-Pakete (Admin-App & Kiosk-App identisch)

| Paket | Verwendet | Aktuellste | Status | Hinweis |
|---|---|---|---|---|
| react | 18.3.1 | 19.2.4 | ⚠️ Major-Update | React 19 hat Breaking Changes |
| react-dom | 18.3.1 | 19.2.4 | ⚠️ Major-Update | Analog zu React |
| react-router-dom | 6.30.3 | 7.13.2 | ⚠️ Major-Update | v7 erfordert React Router Upgrade |
| @vitejs/plugin-react | 4.7.0 | 6.0.1 | ⚠️ Major-Update | Analog zu Vite |
| typescript | 5.9.3 | 6.0.2 | ⚠️ Major-Update | TS 6 ist neu |
| vite | 6.4.1 | 8.0.3 | ⚠️ Major-Update | Vite 8 ist neu |

### 4.3 Docker-Images

| Image | Tag | Zweck |
|---|---|---|
| mcr.microsoft.com/dotnet/aspnet | 8.0 | Backend Runtime |
| mcr.microsoft.com/dotnet/sdk | 8.0 | Backend Build |
| node | 20-alpine | Frontend Build |
| nginx | alpine | Frontend Runtime + Reverse Proxy |
| mongo | 7 | Datenbank (lokal) |
| ghcr.io/deepch/rtsptoweb | latest | RTSP-Stream-Konverter |

---

## 5. Sicherheitsanalyse

### 5.1 Vulnerability Scan — Ergebnis (30.03.2026)

| Prüfung | Ergebnis |
|---|---|
| `npm audit` (admin-app) | **0 Schwachstellen** ✅ |
| `npm audit` (kiosk-app) | **0 Schwachstellen** ✅ |
| `dotnet list package --vulnerable` (Backend) | **0 Schwachstellen** ✅ |

### 5.2 Sicherheitsmassnahmen

| Massnahme | Implementierung |
|---|---|
| **Authentifizierung** | JWT Bearer Tokens mit kryptografisch sicherem 512-Bit-Schlüssel |
| **Autorisierung** | Rollenbasiert (Admin, Editor) über `[Authorize(Roles = "...")]` |
| **Passwort-Hashing** | BCrypt (via `AuthService`) |
| **CORS** | Explizite Origin-Whitelist in Produktion |
| **Secret Management** | Azure Key Vault mit Managed Identity (keine Klartext-Secrets) |
| **HTTPS** | Erzwungen über Azure Container Apps Ingress |
| **Input Validation** | EF Core parameterisierte Queries (SQL Injection geschützt) |
| **File Upload** | MIME-Type-Validierung bei Medien-Uploads |
| **Container Security** | Non-root Nginx, schlanke Alpine-Images |

### 5.3 Update-Empfehlungen

| Priorität | Aktion | Begründung |
|---|---|---|
| **Mittel** | `Azure.Storage.Blobs` auf 12.27.0 updaten | Minor-Update, keine Breaking Changes |
| **Niedrig** | Swashbuckle auf 10.x evaluieren | Nur Swagger UI, kein Produktionsrisiko |
| **Geplant** | Migration auf .NET 10 LTS | Wenn .NET 10 als LTS verfügbar (Nov 2025+) |
| **Geplant** | React 19 + Router v7 Migration | Major-Upgrade, benötigt Testaufwand |
| **Geplant** | MongoDB.Driver v3 Migration | Breaking API-Änderungen, separates Projekt |

> **Fazit:** Alle verwendeten Bibliotheken sind **sicher** (0 bekannte Schwachstellen). Die Versionen sind **aktuell innerhalb ihrer Major-Version** (.NET 8 LTS, React 18). Major-Updates (React 19, .NET 10, MongoDB.Driver 3) sind verfügbar, erfordern aber jeweils Migrationsarbeit und sind nicht sicherheitsrelevant.

---

## 6. Deployment

### 6.1 Lokale Entwicklung

```bash
# Starten via Docker Compose
docker compose up --build -d

# Zugriff
# Admin:  http://localhost
# Kiosk:  http://localhost/kiosk
# API:    http://localhost/api
```

### 6.2 Azure-Deployment (Erstinstallation)

```powershell
# Vollständiges Deployment (Infrastruktur + Build + Deploy)
.\azure-deploy.ps1

# Nur Build + Deploy (Infrastruktur existiert bereits)
.\azure-deploy.ps1 -SkipInfra
```

### 6.3 Azure-Update (Laufende Updates)

```powershell
# Sicheres Update (kein JWT-Reset, keine Daten-Löschung)
.\azure-update.ps1

# Nur Frontend aktualisieren
.\azure-update.ps1 -FrontendOnly

# Nur Backend aktualisieren
.\azure-update.ps1 -BackendOnly

# Testlauf (keine Änderungen)
.\azure-update.ps1 -DryRun
```

### 6.4 Azure-Ressourcen

| Ressource | Name | Region |
|---|---|---|
| Resource Group | CHCMC-Production | Switzerland North |
| Cosmos DB (MongoDB API) | cosmos-chcmc-infoscreen | Switzerland North |
| Blob Storage | stchcmcinfoscreenmedia | Switzerland North |
| Container Registry | acrchcmcinfoscreen | Switzerland North |
| Key Vault | kv-chcmc-infoscreen | Switzerland North |
| Container Apps Environment | cae-chcmc-production | Switzerland North |
| Container App (Backend) | ca-infoscreen-backend | intern |
| Container App (Frontend) | ca-infoscreen-frontend | extern |
| Container App (RTSPtoWeb) | ca-infoscreen-rtsptoweb | intern |

---

## 7. Projektstruktur

```
InformationScreenSoftware/
├── azure-deploy.ps1                    # Azure Full-Deployment Script
├── azure-update.ps1                    # Azure Safe-Update Script
├── docker-compose.yml                  # Lokale Entwicklungsumgebung
├── .env                                # Umgebungsvariablen (lokal)
│
├── docker/
│   ├── Dockerfile.backend              # ASP.NET Core Multi-Stage Build
│   ├── Dockerfile.frontend             # Node Build + Nginx Runtime
│   ├── Dockerfile.rtsptoweb            # RTSPtoWeb Wrapper
│   ├── nginx.conf                      # Nginx Reverse Proxy Config (Template)
│   └── rtsptoweb-config.json           # RTSPtoWeb Konfiguration
│
├── src/
│   ├── Backend/
│   │   └── InformationScreen.Api/
│   │       ├── Controllers/
│   │       │   ├── AuthController.cs           # Login, Register, Profil
│   │       │   ├── ScreensController.cs        # Kiosk: Bildschirm-Daten lesen
│   │       │   ├── MediaController.cs          # Kiosk: Medien abrufen
│   │       │   ├── SettingsController.cs       # Einstellungen (GET/PUT)
│   │       │   ├── AdminScreensController.cs   # Admin: Bildschirm-CRUD
│   │       │   ├── AdminTilesController.cs     # Admin: Kachel-CRUD
│   │       │   ├── AdminCategoriesController.cs# Admin: Kategorien-CRUD
│   │       │   └── AdminMediaController.cs     # Admin: Medien-Upload/CRUD
│   │       ├── Data/
│   │       │   └── AppDbContext.cs              # EF Core Context (SQLite)
│   │       ├── Models/
│   │       │   ├── AppUser.cs                  # Benutzer-Entity
│   │       │   ├── AppSetting.cs               # Einstellungen Key/Value
│   │       │   ├── Screen.cs                   # Bildschirm-Entity
│   │       │   ├── Tile.cs                     # Kachel-Entity + Enums
│   │       │   ├── ScreenTile.cs               # N:M Zuordnung
│   │       │   ├── Category.cs                 # Kategorie-Entity
│   │       │   └── MediaAsset.cs               # Medien-Entity
│   │       ├── Services/
│   │       │   ├── AuthService.cs              # Authentifizierung + JWT
│   │       │   ├── ScreenService.cs            # SQLite Screen-Service
│   │       │   ├── TileService.cs              # SQLite Tile-Service
│   │       │   ├── MediaService.cs             # SQLite Media-Service
│   │       │   ├── CategoryService.cs          # SQLite Category-Service
│   │       │   ├── Interfaces/                 # Service-Interfaces
│   │       │   └── Mongo/                      # MongoDB-Implementierungen
│   │       ├── Migrations/                     # EF Core Migrationen
│   │       └── Program.cs                      # Startup + DI Konfiguration
│   │
│   └── Frontend/
│       ├── admin-app/                          # Admin-Oberfläche (React SPA)
│       │   └── src/
│       │       ├── App.tsx                     # Routing + Auth Guard
│       │       ├── api.ts                      # API-Client Funktionen
│       │       ├── components/
│       │       │   ├── Layout.tsx              # Sidebar + Navigation
│       │       │   └── RichTextEditor.tsx      # WYSIWYG Editor
│       │       └── pages/
│       │           ├── LoginPage.tsx           # Login-Formular
│       │           ├── ScreensPage.tsx         # Bildschirm-Liste
│       │           ├── ScreenEditPage.tsx      # Bildschirm-Editor
│       │           ├── TilesPage.tsx           # Kachel-Liste
│       │           ├── TileEditPage.tsx        # Kachel-Editor
│       │           ├── CategoriesPage.tsx      # Kategorien-Verwaltung
│       │           ├── MediaPage.tsx           # Medien-Verwaltung
│       │           ├── UsersPage.tsx           # Benutzer-Verwaltung
│       │           └── SettingsPage.tsx        # System-Einstellungen
│       │
│       └── kiosk-app/                          # Kiosk-Anzeige (React SPA)
│           └── src/
│               ├── App.tsx                     # Kiosk-Routing
│               ├── api.ts                      # API-Client
│               ├── components/
│               │   ├── TileGrid.tsx            # Kachel-Raster
│               │   ├── TileCard.tsx            # Einzelne Kachel
│               │   ├── ContentViewer.tsx       # Inhaltsanzeige (alle Typen)
│               │   ├── VideoPlayer.tsx         # Video-Wiedergabe
│               │   ├── StreamPlayer.tsx        # RTSP-Stream via MSE
│               │   ├── IdleOverlay.tsx         # Ruhemodus-Overlay
│               │   └── Slideshow.tsx           # Bild-Slideshow
│               └── hooks/                      # React Custom Hooks
```

---

## 8. Datenmodell

### 8.1 MongoDB / Cosmos DB (Inhalte — Persistent)

| Collection | Felder | Beschreibung |
|---|---|---|
| **screens** | Id, Name, Slug, IsActive, IdleTimeoutSeconds, DefaultContentType, DefaultContentData, CreatedAt, UpdatedAt | Kiosk-Bildschirme |
| **tiles** | Id, Title, Description, ImageUrl, LinkUrl, ContentType, LinkTarget, ArticleBody, SortOrder, IsActive, CategoryId, CreatedAt, UpdatedAt | Inhalts-Kacheln |
| **screen_tiles** | ScreenId, TileId, SortOrderOverride | N:M Zuordnung |
| **categories** | Id, Name, IconUrl, CreatedAt | Kachel-Kategorien |
| **media_assets** | Id, FileName, FilePath, MimeType, FileSizeBytes, UploadedAt | Hochgeladene Medien |

### 8.2 SQLite (Auth & Einstellungen)

| Tabelle | Felder | Beschreibung |
|---|---|---|
| **Users** | Id, Username, PasswordHash, DisplayName, Role, IsActive, CreatedAt | Benutzerkonten |
| **Settings** | Id, Key (unique), Value | Systemeinstellungen |

### 8.3 ContentType Enum

| Wert | Bezeichnung | Inhaltstyp |
|---|---|---|
| `Link` | Link | Externe URL (iFrame) |
| `FullscreenImage` | Bild | Vollbild-Bildanzeige |
| `Video` | Video | Video-Wiedergabe |
| `Pdf` | PDF | PDF-Dokument |
| `Article` | Beitrag | Rich-Text-Artikel |
| `Schichtplan` | Schichtplan | Monatsbasierter Schichtplan |
| `Stream` | Stream | RTSP-Live-Stream |

---

## 9. API-Endpunkte

### 9.1 Authentifizierung

| Methode | Endpunkt | Auth | Beschreibung |
|---|---|---|---|
| POST | `/api/auth/login` | — | Login (gibt JWT Token zurück) |
| POST | `/api/auth/register` | Admin | Neuen Benutzer anlegen |
| GET | `/api/auth/me` | Ja | Eigenes Profil abrufen |

### 9.2 Kiosk (Nur-Lese)

| Methode | Endpunkt | Auth | Beschreibung |
|---|---|---|---|
| GET | `/api/screens` | — | Alle aktiven Bildschirme |
| GET | `/api/screens/{slug}` | — | Bildschirm mit Kacheln laden |
| GET | `/api/media/{id}` | — | Mediendatei abrufen |
| GET | `/api/settings` | — | Systemeinstellungen lesen |

### 9.3 Admin-Verwaltung

| Methode | Endpunkt | Auth | Beschreibung |
|---|---|---|---|
| GET/POST | `/api/admin/screens` | Editor+ | Bildschirme auflisten/erstellen |
| GET/PUT/DELETE | `/api/admin/screens/{id}` | Editor+ | Bildschirm bearbeiten/löschen |
| GET/POST | `/api/admin/tiles` | Editor+ | Kacheln auflisten/erstellen |
| GET/PUT/DELETE | `/api/admin/tiles/{id}` | Editor+ | Kachel bearbeiten/löschen |
| GET/POST | `/api/admin/categories` | Editor+ | Kategorien auflisten/erstellen |
| PUT/DELETE | `/api/admin/categories/{id}` | Editor+ | Kategorie bearbeiten/löschen |
| GET/POST | `/api/admin/media` | Editor+ | Medien auflisten/hochladen |
| DELETE | `/api/admin/media/{id}` | Editor+ | Medium löschen |
| PUT | `/api/settings` | Admin | Einstellungen aktualisieren |

---

## 10. Diagramme

Die folgenden Diagramme liegen als Draw.io XML-Dateien im Ordner `docs/diagrams/` vor. Zum Einbinden in die Dokumentation:

1. Datei in [draw.io](https://app.diagrams.net) öffnen
2. Als JPG exportieren (Datei → Exportieren als → JPEG)
3. An der markierten Stelle im Dokument einfügen

### 10.1 Context-Diagramm (UML)

**Datei:** `docs/diagrams/context-diagram.drawio`

Zeigt das System im Kontext seiner Akteure und externen Systeme.

<!-- HIER EINFÜGEN: context-diagram.jpg -->

### 10.2 BPMN-Prozessdiagramm

**Datei:** `docs/diagrams/bpmn-process.drawio`

Zeigt den Hauptprozess: Von der Inhaltserstellung im Admin bis zur Anzeige am Kiosk.

<!-- HIER EINFÜGEN: bpmn-process.jpg -->

### 10.3 Komponentendiagramm (UML)

**Datei:** `docs/diagrams/component-diagram.drawio`

Zeigt die interne Struktur des Systems mit allen Komponenten und deren Abhängigkeiten.

<!-- HIER EINFÜGEN: component-diagram.jpg -->

---

## Anhang

### A. Standard-Login

| Benutzername | Passwort | Rolle |
|---|---|---|
| admin | admin | Admin |

> ⚠️ Das Standard-Passwort muss nach dem ersten Login geändert werden.

### B. Umgebungsvariablen

| Variable | Beschreibung | Standard |
|---|---|---|
| `DATABASE_PROVIDER` | `Sqlite` oder `MongoDB` | `MongoDB` (Azure) |
| `MONGODB_CONNECTION` | MongoDB/Cosmos DB Connection String | — |
| `MONGODB_DATABASE` | Datenbankname | `informationscreen` |
| `JWT_KEY` | JWT-Signaturschlüssel (min. 32 Zeichen) | — |
| `JWT_ISSUER` | JWT Issuer | `InformationScreen` |
| `ALLOWED_ORIGINS` | Erlaubte CORS-Origins (kommagetrennt) | — |
| `AzureBlobStorage__ConnectionString` | Azure Blob Storage Connection String | — |
| `AzureBlobStorage__ContainerName` | Blob Container Name | `media` |
| `BACKEND_URL` | Backend URL für Nginx Proxy | `http://backend:8080` |
| `RTSPTOWEB_URL` | RTSPtoWeb URL für Nginx Proxy | `http://rtsptoweb:8083` |
