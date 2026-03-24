# InformationScreenSoftware – Projektplan

## 1. Vision & Konzept

Ein **Kiosk-artiges Informationssystem** (vergleichbar mit einem McDonald's-Bestellterminal), das in **Microsoft Edge im Kiosk-Modus** läuft. Statt Bestellungen geht es um **Informationsbeschaffung**: Nutzer navigieren über Kacheln zu Links, Videos, Slides und statischen Inhalten. Admins verwalten alles über ein Web-basiertes Admin-Panel.

---

## 2. Architektur-Übersicht

```
┌─────────────────────────────────────────────────────────┐
│                    Microsoft Edge (Kiosk-Modus)          │
│  ┌───────────────────┐    ┌───────────────────────────┐ │
│  │   Kiosk-Frontend   │    │     Admin-Frontend        │ │
│  │   (React/Vite)     │    │     (React/Vite)          │ │
│  └────────┬──────────┘    └────────────┬──────────────┘ │
│           │                            │                 │
│           └────────────┬───────────────┘                 │
│                        ▼                                 │
│              ┌──────────────────┐                        │
│              │   ASP.NET Core   │                        │
│              │   Web API        │                        │
│              │   (Backend)      │                        │
│              └────────┬─────────┘                        │
│                       ▼                                  │
│              ┌──────────────────┐                        │
│              │   SQLite / SQL   │                        │
│              │   Server DB      │                        │
│              └──────────────────┘                        │
└─────────────────────────────────────────────────────────┘
```

### Technologie-Stack

| Komponente | Technologie | Begründung |
|---|---|---|
| **Backend API** | ASP.NET Core 8 Web API | Robustes .NET-Ökosystem, einfache Auth-Integration |
| **Datenbank** | SQLite (Dev) / SQL Server (Prod) | Leichtgewichtig für Einzelstandorte, skalierbar mit SQL Server |
| **Kiosk-Frontend** | React + TypeScript + Vite | Schnell, modern, SPA ideal für Kiosk |
| **Admin-Frontend** | React + TypeScript + Vite | Gleicher Stack, Code-Sharing möglich |
| **Auth** | Windows Auth / Edge Auth-Cookies | Edge-Cookies werden durchgereicht, kein separater Login nötig |
| **Deployment** | Edge Kiosk-Modus / IIS | Edge `--kiosk` Flag für Vollbild-Lock |

---

## 3. Datenmodell

### 3.1 Entitäten

```
Screen
├── Id (int, PK)
├── Name (string) – z.B. "Empfang", "Kantine", "Werkstatt"
├── Slug (string, unique) – URL-freundlich
├── DefaultContentType (enum: None, Video, Slideshow, Static)
├── DefaultContentData (json) – Video-URL, Slide-URLs, HTML-Content
├── IdleTimeoutSeconds (int) – Zeit bis Default-Content startet
├── IsActive (bool)
├── CreatedAt / UpdatedAt (DateTime)

Tile (Kachel)
├── Id (int, PK)
├── Title (string) – Beschriftung der Kachel
├── Description (string, nullable) – Optionaler Beschreibungstext
├── ImageUrl (string) – Bild der Kachel
├── LinkUrl (string) – Ziel-Link beim Klick
├── LinkTarget (enum: Embedded, NewTab, SameWindow)
├── SortOrder (int) – Reihenfolge
├── IsActive (bool)
├── CreatedAt / UpdatedAt (DateTime)

ScreenTile (Zuordnung: Screen ↔ Tile, Many-to-Many)
├── ScreenId (int, FK)
├── TileId (int, FK)
├── SortOrderOverride (int, nullable) – Screen-spezifische Sortierung

Category (optional, Gruppierung)
├── Id (int, PK)
├── Name (string)
├── IconUrl (string, nullable)

TileCategory (Zuordnung: Tile ↔ Category, Many-to-Many)
├── TileId (int, FK)
├── CategoryId (int, FK)

MediaAsset (Hochgeladene Medien)
├── Id (int, PK)
├── FileName (string)
├── FilePath (string)
├── MimeType (string)
├── FileSizeBytes (long)
├── UploadedAt (DateTime)
```

### 3.2 Kern-Prinzip: Content-Sharing

Ein **Tile** existiert **einmal** und kann **mehreren Screens** zugewiesen werden. Änderungen am Tile sind sofort auf allen zugewiesenen Screens sichtbar. Die Sortierung kann pro Screen individuell überschrieben werden.

---

## 4. Feature-Bereiche

### 4.1 Kiosk-Frontend (Nutzer-Ansicht)

#### Startseite / Kachel-Auswahl
- Grid-Layout mit Kacheln (Bild + Titel + optionaler Beschreibungstext)
- Touch-optimiert, große Klickflächen
- Kategorien als Filter/Tabs (optional)
- Smooth Scroll, keine Browser-Elemente sichtbar

#### Eingebettete Inhalte (iFrame/WebView)
- Kachel-Klick öffnet Link in einem **eingebetteten iFrame** (innerhalb der App)
- **Edge Auth-Cookies** werden automatisch im iFrame mitgegeben (Same-Origin / Cookie-Forwarding)
- Permanenter **"Zurück zur Übersicht"-Button** (schwebt über dem Inhalt)
- Optional: Timeout zurück zur Kachel-Auswahl nach Inaktivität

#### Default-Content / Idle-Modus
- Nach X Sekunden Inaktivität → automatischer Wechsel zu:
  - **Video-Autoplay**: Vollbild-Video (Loop)
  - **Slideshow**: Automatisch durchlaufende Bilder/Slides
  - **Statischer Content**: HTML/Bild-Anzeige
- Jede Berührung/Klick → sofort zurück zur Kachel-Auswahl
- Default-Content ist **pro Screen individuell konfigurierbar**

#### Kiosk-Lockdown
- Edge startet im `--kiosk`-Modus (Vollbild, keine Adressleiste)
- Kein Rechtsklick, kein Kontextmenü
- Tastenkombinationen deaktiviert (F11, Alt+F4, Ctrl+W etc.)
- Touch-only oder Maus-beschränkt
- Optional: Batch-Script / GPO für Edge Kiosk-Setup

### 4.2 Admin-Frontend

#### Dashboard
- Übersicht: Anzahl Screens, Tiles, aktive Inhalte
- Schnellzugriff auf häufige Aktionen

#### Screen-Verwaltung
- CRUD für Screens (Name, Slug, Default-Content)
- Drag & Drop Tile-Zuweisung
- Vorschau-Modus (Live-Preview des Screens)
- Default-Content konfigurieren (Video-Upload, Slide-Upload, HTML-Editor)
- Idle-Timeout pro Screen einstellen

#### Tile-Verwaltung
- CRUD für Tiles (Titel, Beschreibung, Bild, Link)
- Bild-Upload mit Vorschau
- Screen-Zuweisung (Multi-Select: welchen Screens zuweisen?)
- Drag & Drop Sortierung
- Aktiv/Inaktiv-Schalter

#### Media-Verwaltung
- Upload von Bildern und Videos
- Media-Library mit Vorschau
- Verwendungs-Info (wo wird das Bild/Video genutzt?)

#### Benutzer/Auth
- Windows-Authentifizierung (Negotiate/NTLM über Edge)
- Admin-Rolle über Active Directory Gruppe
- Kein separater Login nötig – Edge sendet Credentials automatisch

---

## 5. API-Endpunkte (Backend)

### Kiosk-API (öffentlich / read-only)
```
GET  /api/screens/{slug}              → Screen-Daten + zugewiesene Tiles
GET  /api/screens/{slug}/tiles        → Tiles für einen Screen
GET  /api/screens/{slug}/default      → Default-Content-Konfiguration
GET  /api/media/{id}                  → Media-Datei ausliefern
```

### Admin-API (authentifiziert)
```
# Screens
GET    /api/admin/screens             → Alle Screens
POST   /api/admin/screens             → Screen erstellen
PUT    /api/admin/screens/{id}        → Screen bearbeiten
DELETE /api/admin/screens/{id}        → Screen löschen
PUT    /api/admin/screens/{id}/tiles  → Tile-Zuweisungen aktualisieren

# Tiles
GET    /api/admin/tiles               → Alle Tiles
POST   /api/admin/tiles               → Tile erstellen
PUT    /api/admin/tiles/{id}          → Tile bearbeiten
DELETE /api/admin/tiles/{id}          → Tile löschen

# Media
GET    /api/admin/media               → Alle Medien
POST   /api/admin/media/upload        → Datei hochladen
DELETE /api/admin/media/{id}          → Datei löschen

# Categories
GET    /api/admin/categories          → Alle Kategorien
POST   /api/admin/categories          → Kategorie erstellen
PUT    /api/admin/categories/{id}     → Kategorie bearbeiten
DELETE /api/admin/categories/{id}     → Kategorie löschen
```

---

## 6. Projektstruktur

```
InformationScreenSoftware/
├── README.md
├── PLAN.md
│
├── src/
│   ├── Backend/
│   │   ├── InformationScreen.Api/           # ASP.NET Core Web API
│   │   │   ├── Controllers/
│   │   │   │   ├── ScreensController.cs     # Kiosk-Endpunkte
│   │   │   │   ├── AdminScreensController.cs
│   │   │   │   ├── AdminTilesController.cs
│   │   │   │   ├── AdminMediaController.cs
│   │   │   │   └── AdminCategoriesController.cs
│   │   │   ├── Models/
│   │   │   │   ├── Screen.cs
│   │   │   │   ├── Tile.cs
│   │   │   │   ├── ScreenTile.cs
│   │   │   │   ├── Category.cs
│   │   │   │   └── MediaAsset.cs
│   │   │   ├── Data/
│   │   │   │   ├── AppDbContext.cs
│   │   │   │   └── Migrations/
│   │   │   ├── Services/
│   │   │   │   ├── ScreenService.cs
│   │   │   │   ├── TileService.cs
│   │   │   │   └── MediaService.cs
│   │   │   ├── DTOs/
│   │   │   ├── Program.cs
│   │   │   ├── appsettings.json
│   │   │   └── InformationScreen.Api.csproj
│   │   │
│   │   └── InformationScreen.Api.Tests/     # Unit Tests
│   │
│   └── Frontend/
│       ├── kiosk-app/                        # Kiosk-Frontend (Nutzer)
│       │   ├── src/
│       │   │   ├── components/
│       │   │   │   ├── TileGrid.tsx          # Kachel-Raster
│       │   │   │   ├── TileCard.tsx          # Einzelne Kachel
│       │   │   │   ├── ContentViewer.tsx     # iFrame-Einbettung
│       │   │   │   ├── VideoPlayer.tsx       # Video-Autoplay
│       │   │   │   ├── Slideshow.tsx         # Slide-Rotation
│       │   │   │   ├── IdleOverlay.tsx       # Idle/Default-Content
│       │   │   │   └── BackButton.tsx        # Zurück-Button
│       │   │   ├── hooks/
│       │   │   │   ├── useIdleTimer.ts       # Inaktivitäts-Erkennung
│       │   │   │   └── useScreenData.ts      # API-Daten laden
│       │   │   ├── pages/
│       │   │   │   ├── HomeScreen.tsx        # Kachel-Auswahl
│       │   │   │   └── ContentScreen.tsx     # Eingebetteter Inhalt
│       │   │   ├── App.tsx
│       │   │   └── main.tsx
│       │   ├── package.json
│       │   ├── vite.config.ts
│       │   └── tsconfig.json
│       │
│       └── admin-app/                        # Admin-Frontend
│           ├── src/
│           │   ├── components/
│           │   │   ├── ScreenManager.tsx
│           │   │   ├── TileEditor.tsx
│           │   │   ├── TileAssignment.tsx    # Drag & Drop Zuweisung
│           │   │   ├── MediaUploader.tsx
│           │   │   ├── DefaultContentEditor.tsx
│           │   │   └── ScreenPreview.tsx
│           │   ├── pages/
│           │   │   ├── Dashboard.tsx
│           │   │   ├── ScreensPage.tsx
│           │   │   ├── TilesPage.tsx
│           │   │   ├── MediaPage.tsx
│           │   │   └── CategoriesPage.tsx
│           │   ├── App.tsx
│           │   └── main.tsx
│           ├── package.json
│           ├── vite.config.ts
│           └── tsconfig.json
│
├── scripts/
│   ├── setup-kiosk-edge.ps1                  # Edge Kiosk-Modus Setup
│   └── deploy.ps1                            # Deployment-Script
│
└── docs/
    ├── admin-guide.md                         # Admin-Anleitung
    └── kiosk-setup.md                         # Kiosk-Einrichtung
```

---

## 7. Implementierungs-Phasen

### Phase 1: Fundament (Backend + Basis-Frontend)
1. **ASP.NET Core Projekt aufsetzen** – Projektstruktur, EF Core, SQLite
2. **Datenmodell implementieren** – Entities, DbContext, Migrations
3. **Kiosk-API** – GET-Endpunkte für Screens und Tiles
4. **Kiosk-Frontend Grundgerüst** – React-App, Routing, API-Anbindung
5. **Kachel-Grid** – TileGrid + TileCard Komponenten, responsive Grid

### Phase 2: Content-Viewer + Navigation
6. **Content-Viewer (iFrame)** – Link in eingebettetem iFrame öffnen
7. **Zurück-Button** – Schwebendes Overlay zum Zurückkehren
8. **Idle-Timer + Default-Content** – Inaktivitätserkennung, Video/Slideshow
9. **Kiosk-Lockdown** – Rechtsklick, Tastenkombinationen deaktivieren

### Phase 3: Admin-Panel
10. **Admin-API** – CRUD für Screens, Tiles, Media, Categories
11. **Admin-Frontend Grundgerüst** – React-App, Routing, Dashboard
12. **Screen-Verwaltung** – CRUD-UI, Default-Content-Konfiguration
13. **Tile-Verwaltung** – CRUD-UI, Bild-Upload, Screen-Zuweisung
14. **Media-Verwaltung** – Upload, Library, Vorschau

### Phase 4: Auth + Polish
15. **Windows Auth** – Negotiate-Auth, Admin-Rollen via AD-Gruppen
16. **Edge Cookie-Integration** – Sicherstellen, dass Auth-Cookies im iFrame funktionieren
17. **Drag & Drop** – Sortierung und Zuweisung per Drag & Drop
18. **Screen-Vorschau** – Live-Preview im Admin-Panel

### Phase 5: Deployment + Kiosk-Setup
19. **Edge Kiosk-Script** – PowerShell-Script für Edge `--kiosk` Setup
20. **Deployment-Script** – IIS/Server-Deployment
21. **Dokumentation** – Admin-Guide, Kiosk-Setup-Anleitung
22. **Testing** – E2E-Tests, manuelle Kiosk-Tests

---

## 8. Edge Kiosk-Modus – Technische Details

### Startbefehl
```powershell
# Edge im Kiosk-Modus starten (Vollbild, keine UI-Elemente)
msedge.exe --kiosk "https://server/kiosk/empfang" --edge-kiosk-type=fullscreen
```

### Auth-Cookie-Strategie
- Edge im Kiosk-Modus behält Session-Cookies bei
- Intranet-Seiten in der iFrame werden automatisch mit Windows-Auth-Cookies beliefert
- **Wichtig**: Alle Zielseiten müssen in der gleichen **Trusted Sites Zone** sein
- Backend setzt `X-Frame-Options: SAMEORIGIN` oder passende `Content-Security-Policy`
- Für Cross-Origin iFrames: `SameSite=None; Secure` Cookie-Attribute

### Lockdown im Frontend
```javascript
// Kontextmenü deaktivieren
document.addEventListener('contextmenu', e => e.preventDefault());

// Tastenkombinationen blockieren
document.addEventListener('keydown', e => {
  if (e.key === 'F11' || (e.ctrlKey && e.key === 'w') || e.altKey && e.key === 'F4') {
    e.preventDefault();
  }
});
```

---

## 9. Wichtige Design-Entscheidungen

| Entscheidung | Gewählt | Begründung |
|---|---|---|
| iFrame vs. Redirect | **iFrame** | User bleibt in der App, Zurück-Button immer sichtbar |
| Monorepo vs. Multi-Repo | **Monorepo** | Einfacheres Management, geteilte Typen möglich |
| SQLite vs. SQL Server | **Beides** | SQLite für Dev/kleine Standorte, SQL Server für Prod |
| SPA vs. MPA | **SPA** | Flüssige Navigation, kein Page-Reload |
| Tile-Duplikation vs. Referenz | **Referenz (Many-to-Many)** | Ein Tile, viele Screens – Änderung wirkt überall |

---

## 10. Nächste Schritte

Wenn du bereit bist, beginnen wir mit **Phase 1**:
1. Backend-Projekt mit ASP.NET Core aufsetzen
2. Datenmodell + EF Core Migrations
3. Kiosk-API Endpunkte
4. React Kiosk-Frontend mit Kachel-Grid
