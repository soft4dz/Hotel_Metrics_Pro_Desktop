@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul
title Hotel Metrics Pro — Envoi vers GitHub

cd /d "%~dp0"
if errorlevel 1 (
    echo [ERREUR] Impossible d'acceder au dossier du projet.
    pause
    exit /b 1
)

echo.
echo  ============================================
echo   Envoi des modifications vers GitHub
echo   https://github.com/soft4dz/Hotel_Metrics_Pro_Desktop
echo  ============================================
echo.

where git >nul 2>&1
if errorlevel 1 (
    echo [ERREUR] Git n'est pas installe ou pas dans le PATH.
    pause
    exit /b 1
)

for /f "delims=" %%b in ('git rev-parse --abbrev-ref HEAD 2^>nul') do set BRANCH=%%b
if not defined BRANCH set BRANCH=main

git status -sb
echo.

git diff --quiet
set HAS_UNSTAGED=%errorlevel%
git diff --cached --quiet
set HAS_STAGED=%errorlevel%

if %HAS_UNSTAGED%==0 if %HAS_STAGED%==0 (
    echo [INFO] Aucune modification locale a envoyer.
    echo [INFO] Synchronisation distante avant push...
    git pull --ff-only origin %BRANCH% 2>nul
    git push -u origin %BRANCH%
    if errorlevel 1 (
        echo [ERREUR] Push echoue.
        pause
        exit /b 1
    )
    echo [OK] Depot distant a jour.
    pause
    exit /b 0
)

set /p MSG=Message de commit : 
if "!MSG!"=="" set MSG=Mise a jour Hotel Metrics Pro Desktop

git add -A
git commit -m "%MSG%"
if errorlevel 1 (
    echo [ERREUR] Commit echoue.
    pause
    exit /b 1
)

echo [INFO] Recuperation des changements distants avant envoi...
git pull --ff-only origin %BRANCH%
if errorlevel 1 (
    echo [ERREUR] Historique divergent. Lancez sync-github.bat ou resolvez les conflits.
    pause
    exit /b 1
)

git push -u origin %BRANCH%
if errorlevel 1 (
    echo [ERREUR] Push echoue.
    pause
    exit /b 1
)

echo.
echo [OK] Modifications envoyees sur GitHub.
pause
exit /b 0
