# InformationScreen Software

Kiosk-basiertes Informationssystem – vergleichbar mit McDonald's-Bestellterminals, aber für Informationszugang. Admins verwalten Kacheln mit Bildern, Texten und Links; Endnutzer interagieren über Touchscreens im Vollbildmodus.

## Features

- **Kachel-System**: Bild + Titel + Beschreibung + Link pro Kachel
- **Multi-Screen**: Mehrere Bildschirme mit individueller Kachel-Zuordnung
- **Idle-Modus**: Video-Autoplay, Slideshow oder statischer Content bei Inaktivität
- **Kiosk-Lockdown**: Kein Verlassen der App (Tastaturkürzel blockiert, kein Rechtsklick)
- **Admin-Panel**: Vollständige Verwaltung von Screens, Kacheln, Medien und Kategorien
- **Edge Auth-Cookies**: Authentifizierung über bestehende Browser-Cookies

## Tech-Stack

| Komponente | Technologie |
|---|---|
| Backend | ASP.NET Core 8, Entity Framework Core 8, SQLite |
| Kiosk-Frontend | React 18, TypeScript, Vite 6 |
| Admin-Frontend | React 18, TypeScript, Vite 6 |
| Kiosk-Browser | Microsoft Edge (Kiosk-Modus) |

## Projektstruktur

```
src/
├── Backend/InformationScreen.Api/   # ASP.NET Core Web API
├── Frontend/kiosk-app/              # React Kiosk-Oberfläche
└── Frontend/admin-app/              # React Admin-Panel
scripts/
├── setup-kiosk-edge.ps1             # Edge Kiosk-Modus starten
└── deploy.ps1                       # Build & Deploy
```

## Schnellstart

### Voraussetzungen
- .NET 8 SDK
- Node.js 18+
- Microsoft Edge

### Backend starten
```powershell
cd src/Backend/InformationScreen.Api
dotnet run
# API läuft auf http://localhost:5001
# Swagger: http://localhost:5001/swagger
```

### Kiosk-Frontend starten (Entwicklung)
```powershell
cd src/Frontend/kiosk-app
npm install
npm run dev
# http://localhost:5173/kiosk/{screen-slug}
```

### Admin-Frontend starten (Entwicklung)
```powershell
cd src/Frontend/admin-app
npm install
npm run dev
# http://localhost:5174/admin
```

### Kiosk-Modus (Edge Vollbild)
```powershell
.\scripts\setup-kiosk-edge.ps1 -Slug "lobby"
```

### Deployment
```powershell
.\scripts\deploy.ps1
```

## API-Endpunkte

### Öffentlich (Kiosk)
| Methode | Pfad | Beschreibung |
|---|---|---|
| GET | `/api/screens/{slug}` | Screen-Daten mit Kacheln laden |
| GET | `/api/media/{id}` | Medien-Datei abrufen |

### Admin
| Methode | Pfad | Beschreibung |
|---|---|---|
| GET/POST | `/api/admin/screens` | Screens auflisten / erstellen |
| GET/PUT/DELETE | `/api/admin/screens/{id}` | Screen bearbeiten / löschen |
| PUT | `/api/admin/screens/{id}/tiles` | Kachel-Zuordnung aktualisieren |
| GET/POST | `/api/admin/tiles` | Kacheln auflisten / erstellen |
| GET/PUT/DELETE | `/api/admin/tiles/{id}` | Kachel bearbeiten / löschen |
| GET/POST | `/api/admin/media` | Medien auflisten / hochladen |
| DELETE | `/api/admin/media/{id}` | Medium löschen |
| GET/POST | `/api/admin/categories` | Kategorien auflisten / erstellen |
| GET/PUT/DELETE | `/api/admin/categories/{id}` | Kategorie bearbeiten / löschen |

## Lizenz

Interne Nutzung.
