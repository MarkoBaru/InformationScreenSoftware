@echo off
chcp 65001 >nul
title InformationScreen Software

echo ============================================
echo   InformationScreen Software - Start
echo ============================================
echo.

:: Alte Prozesse auf unseren Ports beenden
echo Pruefe auf bereits laufende Instanzen...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr "LISTENING" ^| findstr ":5001 :5173 :5174"') do (
    if %%a NEQ 0 (
        taskkill /PID %%a /F >nul 2>&1
    )
)
echo Alte Prozesse bereinigt.
echo.

:: Backend Dependencies
echo [1/3] Backend vorbereiten...
cd /d "%~dp0src\Backend\InformationScreen.Api"
dotnet restore --verbosity quiet
if errorlevel 1 (
    echo FEHLER: dotnet restore fehlgeschlagen.
    pause
    exit /b 1
)

:: Kiosk Frontend Dependencies
echo [2/3] Kiosk-App Packages pruefen...
cd /d "%~dp0src\Frontend\kiosk-app"
if not exist "node_modules\" (
    echo    npm install laeuft...
    call npm install --silent
)

:: Admin Frontend Dependencies
echo [3/3] Admin-App Packages pruefen...
cd /d "%~dp0src\Frontend\admin-app"
if not exist "node_modules\" (
    echo    npm install laeuft...
    call npm install --silent
)

echo.
echo Alle Packages sind installiert. Starte Services...
echo.

:: Backend starten (eigenes Fenster)
echo Starte Backend auf http://localhost:5001 ...
start "Backend API" cmd /c "cd /d "%~dp0src\Backend\InformationScreen.Api" && dotnet run"

:: Kurz warten damit Backend hochfaehrt
timeout /t 3 /nobreak >nul

:: Kiosk-App starten (eigenes Fenster)
echo Starte Kiosk-App auf http://localhost:5173 ...
start "Kiosk App" cmd /c "cd /d "%~dp0src\Frontend\kiosk-app" && npm run dev"

:: Admin-App starten (eigenes Fenster)
echo Starte Admin-App auf http://localhost:5174 ...
start "Admin App" cmd /c "cd /d "%~dp0src\Frontend\admin-app" && npm run dev"

echo.
echo ============================================
echo   Alles gestartet!
echo.
echo   Backend API:  http://localhost:5001
echo   Swagger:      http://localhost:5001/swagger
echo   Kiosk:        http://localhost:5173/kiosk/{slug}
echo   Admin:        http://localhost:5174/admin
echo.
echo   Dieses Fenster kann geschlossen werden.
echo   Die Services laufen in eigenen Fenstern.
echo ============================================
pause
