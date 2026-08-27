@echo off
REM Start the lightweight dev server without installing dependencies
cd /d "%~dp0server"
echo Starting dev server (no npm required)...
rem Start server in a separate window so this script can continue
start "DevServer" cmd /c "node dev-server.js"
timeout /t 1 /nobreak >nul
echo Opening http://localhost:3000 in the default browser...
start "" "http://localhost:3000"
exit /b 0
