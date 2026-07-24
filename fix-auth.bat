@echo off
chcp 65001 >nul
title Raqmi System — Recuperation de compte

cd /d "%~dp0"

echo.
echo  Recuperation securisee d'un compte local
echo  ========================================
echo.
echo  L'application doit etre completement fermee.
echo  Un mot de passe temporaire aleatoire sera genere.
echo  Il ne sera pas affiche dans cette console.
echo.

set /p HMP_RECOVERY_EMAIL=Adresse e-mail du compte a recuperer : 
if "%HMP_RECOVERY_EMAIL%"=="" goto err

call npx --yes electron scripts/reset-user-password.mjs "%HMP_RECOVERY_EMAIL%"
if errorlevel 1 goto err

echo.
echo  ============================================
echo   Reinitialisation terminee
echo  ============================================
echo.
echo  Consultez le fichier PASSWORD_RESET_*.txt cree a cote de la base.
echo  Le changement du mot de passe sera obligatoire a la connexion.
echo  Supprimez le fichier apres transmission securisee.
echo.
pause
exit /b 0

:err
echo.
echo [ERREUR] Recuperation echouee.
pause
exit /b 1
