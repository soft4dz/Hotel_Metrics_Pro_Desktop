# Hotel Metrics Pro Desktop — lancement mode développement (test)
# Usage : clic droit > Exécuter avec PowerShell
#         ou : .\dev.ps1

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectRoot

Write-Host ""
Write-Host " ============================================" -ForegroundColor Cyan
Write-Host "  Hotel Metrics Pro Desktop — TEST DEV" -ForegroundColor Cyan
Write-Host " ============================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "[ERREUR] Node.js introuvable. Installez Node.js 20 LTS : https://nodejs.org" -ForegroundColor Red
    Read-Host "Appuyez sur Entrée pour quitter"
    exit 1
}

Write-Host "[OK] Node.js :" -NoNewline -ForegroundColor Green
Write-Host " $(node -v)"
Write-Host ""

if (-not (Test-Path "node_modules")) {
    Write-Host "[INFO] Installation des dépendances (première fois)..." -ForegroundColor Yellow
    npm install --ignore-scripts
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    Write-Host ""
}
 
Write-Host "[INFO] Vérification du module SQLite natif..." -ForegroundColor Yellow
npm run rebuild:native
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$env:VITE_AUTO_LOGIN = "true"
$env:HMP_DEV_AUTO_ADMIN = "1"

Write-Host "[INFO] Démarrage Electron + Vite avec auto-connexion admin..." -ForegroundColor Yellow
Write-Host ""
Write-Host "  - Fenetre Electron = application complete"
Write-Host "  - Connexion test  : admin@hotelmetrics.local"
Write-Host "  - Auto-connexion  : admin@hotelmetrics.local"
Write-Host "  - Arrêt           : fermer Electron ou Ctrl+C"
Write-Host ""

npm run dev

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "[ERREUR] npm run dev a échoué (code $LASTEXITCODE)" -ForegroundColor Red
    Read-Host "Appuyez sur Entrée pour quitter"
    exit $LASTEXITCODE
}
