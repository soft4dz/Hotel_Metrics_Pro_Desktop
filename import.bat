@echo off
chcp 65001 >nul
title Raqmi System — Import base legacy

cd /d "%~dp0"

set "SQL_FILE=C:\Users\lenovo\Downloads\hotel_metrics_pro (25).sql"

if exist "%USERPROFILE%\Downloads\hotel_metrics_pro (25).sql" (
  set "SQL_FILE=%USERPROFILE%\Downloads\hotel_metrics_pro (25).sql"
)

if not "%~1"=="" set "SQL_FILE=%~1"

if not exist "%SQL_FILE%" (
    echo [ERREUR] Fichier SQL introuvable :
    echo   %SQL_FILE%
    pause
    exit /b 1
)

echo.
echo  Import des donnees MySQL vers SQLite locale
echo  Fichier : %SQL_FILE%
echo.

call npm run build
if errorlevel 1 (
    echo [ERREUR] Build echoue.
    pause
    exit /b 1
)

call npx electron . --import-legacy="%SQL_FILE%"

echo.
pause
