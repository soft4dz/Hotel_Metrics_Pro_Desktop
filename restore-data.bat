@echo off
chcp 65001 >nul
title Raqmi System — Restauration des donnees

cd /d "%~dp0"

set "BACKUP=C:\ProgramData\HotelMetricsPro\data\backups\hotel_metrics_local_2026-05-26_224649.db"
set "DB=C:\ProgramData\HotelMetricsPro\data\hotel_metrics_local.db"

if not "%~1"=="" set "BACKUP=%~1"

if not exist "%BACKUP%" (
    echo [ERREUR] Sauvegarde introuvable :
    echo   %BACKUP%
    echo.
    echo Sauvegardes disponibles :
    dir /b "C:\ProgramData\HotelMetricsPro\data\backups\hotel_metrics_local_*.db" 2>nul
    pause
    exit /b 1
)

echo.
echo  ============================================
echo   Restauration Raqmi System
echo  ============================================
echo.
echo  Sauvegarde : %BACKUP%
echo  Cible      : %DB%
echo.
echo  IMPORTANT : fermez l'application avant de continuer.
echo.
pause

copy /Y "%DB%" "%DB%.before_restore.bak" >nul
copy /Y "%BACKUP%" "%DB%"

if errorlevel 1 (
    echo [ERREUR] Copie echouee.
    pause
    exit /b 1
)

echo.
echo  Restauration terminee.
echo  Relancez l'application et utilisez les identifiants propres a la base restauree.
echo  Aucun mot de passe universel n'est disponible.
echo.
pause
