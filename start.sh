#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "============================================"
echo "  InformationScreen Software - Start"
echo "============================================"
echo ""

# Backend Dependencies
echo "[1/3] Backend vorbereiten..."
cd "$SCRIPT_DIR/src/Backend/InformationScreen.Api"
dotnet restore --verbosity quiet

# Kiosk Frontend Dependencies
echo "[2/3] Kiosk-App Packages prüfen..."
cd "$SCRIPT_DIR/src/Frontend/kiosk-app"
if [ ! -d "node_modules" ]; then
    echo "   npm install läuft..."
    npm install --silent
fi

# Admin Frontend Dependencies
echo "[3/3] Admin-App Packages prüfen..."
cd "$SCRIPT_DIR/src/Frontend/admin-app"
if [ ! -d "node_modules" ]; then
    echo "   npm install läuft..."
    npm install --silent
fi

echo ""
echo "Alle Packages sind installiert. Starte Services..."
echo ""

cleanup() {
    echo ""
    echo "Beende alle Services..."
    kill $PID_BACKEND $PID_KIOSK $PID_ADMIN 2>/dev/null
    exit 0
}
trap cleanup SIGINT SIGTERM

# Backend starten
echo "Starte Backend auf http://localhost:5001 ..."
cd "$SCRIPT_DIR/src/Backend/InformationScreen.Api"
dotnet run &
PID_BACKEND=$!

sleep 3

# Kiosk-App starten
echo "Starte Kiosk-App auf http://localhost:5173 ..."
cd "$SCRIPT_DIR/src/Frontend/kiosk-app"
npm run dev &
PID_KIOSK=$!

# Admin-App starten
echo "Starte Admin-App auf http://localhost:5174 ..."
cd "$SCRIPT_DIR/src/Frontend/admin-app"
npm run dev &
PID_ADMIN=$!

echo ""
echo "============================================"
echo "  Alles gestartet!"
echo ""
echo "  Backend API:  http://localhost:5001"
echo "  Swagger:      http://localhost:5001/swagger"
echo "  Kiosk:        http://localhost:5173/kiosk/{slug}"
echo "  Admin:        http://localhost:5174/admin"
echo ""
echo "  Ctrl+C zum Beenden aller Services."
echo "============================================"

wait
