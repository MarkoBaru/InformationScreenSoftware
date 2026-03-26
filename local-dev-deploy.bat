@echo off
echo ============================================
echo  InformationScreen - Lokaler Docker Test
echo ============================================
echo.

:: Alte Container stoppen und entfernen
echo [1/3] Alte Container stoppen...
docker-compose down 2>nul

:: Images bauen
echo.
echo [2/3] Docker-Images bauen (dauert beim ersten Mal laenger)...
docker-compose build --no-cache
if %ERRORLEVEL% neq 0 (
    echo.
    echo FEHLER: Docker Build fehlgeschlagen!
    pause
    exit /b 1
)

:: Container starten
echo.
echo [3/3] Container starten...
docker-compose up -d
if %ERRORLEVEL% neq 0 (
    echo.
    echo FEHLER: Container konnten nicht gestartet werden!
    pause
    exit /b 1
)

echo.
echo ============================================
echo  Erfolgreich gestartet!
echo ============================================
echo.
echo  Admin-App:  http://localhost
echo  Kiosk-App:  http://localhost/kiosk/
echo  Backend:    http://localhost/api/admin/screens
echo.
echo  Standard-Login: admin / admin
echo.
echo  Logs anzeigen:   docker-compose logs -f
echo  Stoppen:         docker-compose down
echo ============================================
pause
