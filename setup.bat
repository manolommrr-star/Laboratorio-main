@echo off
title Setup Laboratorio - Instalador de Node.js
setlocal EnableExtensions
cd /d "%~dp0"

echo.
echo ==============================================
echo    SETUP - Sistema de Laboratorio
echo    Revisa e instala Node.js automaticamente
echo ==============================================
echo.

REM 1) Node ya instalado en el sistema?
where node >nul 2>nul
if %errorlevel% EQU 0 (
    echo [OK] Node.js ya esta instalado.
    echo [OK] Version: 
    node --version
    echo.
    echo Ya puedes iniciar la aplicacion con: start-dev.bat
    echo.
    pause
    exit /b 0
)

echo [..] No se encontro Node.js. Se instalara una version portable.
echo [..] No se requieren permisos de administrador.
echo.

REM 2) Ejecutar el instalador PowerShell (descarga + extrae + agrega al PATH)
echo.
echo [..] Descargando e instalando Node.js (puede tardar unos segundos)...
echo.
set "NODE_BIN="
for /f "delims=" %%B in ('powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-node.ps1" -AddToPath') do set "NODE_BIN=%%B"

if not defined NODE_BIN (
    echo.
    echo  [ERROR] No se pudo instalar Node.js.
    echo  [ERROR] Revisa tu conexion a internet.
    echo  [ERROR] O instala Node manualmente desde: https://nodejs.org
    echo.
    pause
    exit /b 1
)

echo.
echo  [OK] Node.js instalado en:
echo       %NODE_BIN%
echo.

REM 3) Verificar
echo  [OK] node:  "%NODE_BIN%\node.exe" --version
"%NODE_BIN%\node.exe" --version
if exist "%NODE_BIN%\npm.cmd" (
    echo  [OK] npm:   "%NODE_BIN%\npm.cmd" --version
    call "%NODE_BIN%\npm.cmd" --version
)

echo.
echo  Node.js agregado al PATH de usuario. Abre una terminal NUEVA y posiblemente
echo  reinicia. Despues puedes iniciar la app con:  start-dev.bat
echo.
pause
exit /b 0