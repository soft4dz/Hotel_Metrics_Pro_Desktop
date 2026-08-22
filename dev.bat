@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul
title Raqmi System - Mode developpement

cd /d "%~dp0"
if errorlevel 1 (
    echo [ERREUR] Impossible d'acceder au dossier du projet.
    pause
    exit /b 1
)

REM Synchronisation automatique avec GitHub si le depot est configure
where git >nul 2>&1
if not errorlevel 1 (
    git rev-parse --is-inside-work-tree >nul 2>&1
    if not errorlevel 1 (
        for /f "delims=" %%b in ('git rev-parse --abbrev-ref HEAD 2^>nul') do set HMP_BRANCH=%%b
        if defined HMP_BRANCH (
            git fetch origin >nul 2>&1
            git rev-parse "origin/!HMP_BRANCH!" >nul 2>&1
            if not errorlevel 1 (
                git merge-base --is-ancestor HEAD "origin/!HMP_BRANCH!" >nul 2>&1
                if errorlevel 1 (
                    git status --porcelain | findstr /r "." >nul 2>&1
                    if errorlevel 1 (
                        echo [INFO] Mises a jour GitHub detectees — synchronisation...
                        git pull --ff-only origin !HMP_BRANCH! >nul 2>&1
                        if not errorlevel 1 echo [OK] Projet synchronise avec GitHub.
                    )
                )
            )
        )
    )
)

echo.
echo  ============================================
echo   Raqmi System — TEST DEV
echo  ============================================
echo.

where node >nul 2>&1
if errorlevel 1 (
    echo [ERREUR] Node.js n'est pas installé ou pas dans le PATH.
    echo          Installez Node.js 20 LTS : https://nodejs.org
    pause
    exit /b 1
)

echo [OK] Node.js detecte :
node -v
echo.

if not exist "node_modules\" (
    echo [INFO] Premiere execution — installation des dependances...
    echo.
    call npm install --ignore-scripts
    if errorlevel 1 (
        echo [ERREUR] npm install a echoue.
        pause
        exit /b 1
    )
    echo.
)

echo [INFO] Verification du module SQLite natif ^(better-sqlite3^)...
call npm run rebuild:native
if errorlevel 1 (
    echo.
    echo [ERREUR] better-sqlite3 non compile pour Electron.
    echo          Fermez l'application Electron si elle tourne, puis relancez dev.bat.
    echo          Ou : set FORCE_REBUILD_NATIVE=1 ^&^& npm run rebuild:native
    pause
    exit /b 1
)
echo.

if defined ELECTRON_RUN_AS_NODE (
    echo [INFO] ELECTRON_RUN_AS_NODE detecte — sera ignore pour Electron ^(API cassee sinon^).
    set ELECTRON_RUN_AS_NODE=
)

echo [INFO] Liberation du port Vite 5173 si necessaire...
node scripts/free-dev-port.mjs
if errorlevel 1 (
    echo [ERREUR] Le port 5173 est toujours occupe.
    echo          Fermez la fenetre Electron / l'ancien terminal dev, puis relancez.
    pause
    exit /b 1
)
echo.

set VITE_AUTO_LOGIN=true
set HMP_DEV_AUTO_ADMIN=1

echo [INFO] Demarrage Electron + Vite ^(npm run dev^)...
echo.
echo  - Fenetre Electron : application complete
echo  - Ne pas utiliser seulement le navigateur Chrome
echo  - Auto-connexion dev : admin@raqmi.local ^(desactiver : set VITE_AUTO_LOGIN=false^)
echo  - Connexion manuelle : dec@egt-sidifredj.dz  ou  admin@raqmi.local / Admin@2026!
echo  - Si echec connexion : fermez l'app puis lancez fix-auth.bat
echo.
echo  Arret : fermez la fenetre Electron ou Ctrl+C ici
echo  DevTools (optionnel) : set HMP_DEVTOOLS=1 puis relancer dev.bat
echo  Les messages "Autofill" / "language-mismatch" = bruit Chromium, sans impact.
echo.

call npm run dev

if errorlevel 1 goto :dev_failed

echo.
echo [INFO] Application fermee.
pause
exit /b 0

:dev_failed
echo.
echo [ERREUR] Le mode dev s'est arrete avec une erreur.
echo          Si "Port 5173 is already in use" : relancez dev.bat ^(libere le port automatiquement^).
pause
exit /b 1
