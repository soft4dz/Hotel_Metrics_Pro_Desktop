@echo off
chcp 65001 >nul
title Raqmi System — Reparation connexion

cd /d "%~dp0"

echo.
echo  Reparation des comptes de connexion...
echo.

call npx --yes electron scripts/reset-user-password.mjs dec@egt-sidifredj.dz "Admin@2026!"
if errorlevel 1 goto err

call npx --yes electron scripts/reset-user-password.mjs admin@raqmi.local "Admin@2026!"
if errorlevel 1 goto err

echo.
echo  ============================================
echo   Comptes repares
echo  ============================================
echo.
echo   E-mail     : dec@egt-sidifredj.dz
echo              admin@raqmi.local
echo   Mot de passe : Admin@2026!
echo.
echo   IMPORTANT : fermez Raqmi System puis relancez dev.bat
echo.
pause
exit /b 0

:err
echo [ERREUR] Reparation echouee.
pause
exit /b 1
