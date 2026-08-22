@echo off
setlocal EnableDelayedExpansion
chcp 65001 >nul
title Raqmi System — Synchronisation GitHub

cd /d "%~dp0"
if errorlevel 1 (
    echo [ERREUR] Impossible d'acceder au dossier du projet.
    pause
    exit /b 1
)

echo.
echo  ============================================
echo   Synchronisation avec GitHub
echo   https://github.com/soft4dz/Hotel_Metrics_Pro_Desktop
echo  ============================================
echo.

where git >nul 2>&1
if errorlevel 1 (
    echo [ERREUR] Git n'est pas installe ou pas dans le PATH.
    echo          Installez Git : https://git-scm.com/download/win
    pause
    exit /b 1
)

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
    echo [ERREUR] Ce dossier n'est pas un depot Git.
    pause
    exit /b 1
)

for /f "delims=" %%b in ('git rev-parse --abbrev-ref HEAD 2^>nul') do set BRANCH=%%b
if not defined BRANCH set BRANCH=main

echo [INFO] Branche locale : %BRANCH%
echo [INFO] Recuperation des modifications distantes...
echo.

git fetch origin
if errorlevel 1 (
    echo [ERREUR] Impossible de contacter GitHub ^(fetch^).
    echo          Verifiez votre connexion et vos identifiants Git.
    pause
    exit /b 1
)

git rev-parse "origin/%BRANCH%" >nul 2>&1
if errorlevel 1 (
    echo [INFO] Aucune branche distante origin/%BRANCH% — rien a synchroniser.
    pause
    exit /b 0
)

git merge-base --is-ancestor HEAD "origin/%BRANCH%" 2>nul
if not errorlevel 1 (
    git rev-parse HEAD > "%TEMP%\hmp_local_head.txt"
    git rev-parse "origin/%BRANCH%" > "%TEMP%\hmp_remote_head.txt"
    fc /b "%TEMP%\hmp_local_head.txt" "%TEMP%\hmp_remote_head.txt" >nul 2>&1
    if not errorlevel 1 (
        echo [OK] Projet deja a jour avec GitHub.
        del "%TEMP%\hmp_local_head.txt" "%TEMP%\hmp_remote_head.txt" 2>nul
        pause
        exit /b 0
    )
    del "%TEMP%\hmp_local_head.txt" "%TEMP%\hmp_remote_head.txt" 2>nul
)

git status --porcelain | findstr /r "." >nul 2>&1
if not errorlevel 1 (
    echo [ATTENTION] Vous avez des modifications locales non commitees.
    echo             La synchronisation peut creer des conflits.
    echo.
    git status -sb
    echo.
    set /p CONFIRM=Continuer quand meme ? (O/N) :
    if /i not "!CONFIRM!"=="O" (
        echo [INFO] Synchronisation annulee.
        pause
        exit /b 0
    )
)

echo [INFO] Application des modifications GitHub ^(git pull^)...
git pull --ff-only origin %BRANCH%
if errorlevel 1 (
    echo.
    echo [ERREUR] Pull echoue. Conflits ou historique divergent ?
    echo          Commitez ou stashez vos changements locaux, puis relancez.
    pause
    exit /b 1
)

echo.
echo [OK] Projet synchronise avec GitHub.
pause
exit /b 0
