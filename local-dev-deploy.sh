#!/bin/bash
set -e

echo "============================================"
echo " InformationScreen - Lokaler Docker Test"
echo "============================================"
echo ""

# Alte Container stoppen
echo "[1/3] Alte Container stoppen..."
docker-compose down 2>/dev/null || true

# Images bauen
echo ""
echo "[2/3] Docker-Images bauen (dauert beim ersten Mal laenger)..."
docker-compose build --no-cache

# Container starten
echo ""
echo "[3/3] Container starten..."
docker-compose up -d

echo ""
echo "============================================"
echo " Erfolgreich gestartet!"
echo "============================================"
echo ""
echo " Admin-App:  http://localhost"
echo " Kiosk-App:  http://localhost/kiosk/"
echo " Backend:    http://localhost/api/admin/screens"
echo ""
echo " Standard-Login: admin / admin"
echo ""
echo " Logs anzeigen:   docker-compose logs -f"
echo " Stoppen:         docker-compose down"
echo "============================================"
