# Supprime le dossier dupliqué Hotel_Metrics_Pro_Desktop\Hotel_Metrics_Pro_Desktop
# Erreur Windows 0x80004005 : souvent un fichier verrouillé (Cursor, node, electron).

$ErrorActionPreference = 'Stop'
$nested = Join-Path $PSScriptRoot '..\Hotel_Metrics_Pro_Desktop' | Resolve-Path -ErrorAction SilentlyContinue

if (-not $nested -or -not (Test-Path -LiteralPath $nested)) {
    Write-Host "Le dossier imbrique n'existe pas (deja supprime)." -ForegroundColor Green
    exit 0
}

Write-Host "Cible : $nested"

# Arreter les processus susceptibles de verrouiller des fichiers dans ce dossier
Get-Process -Name node, electron -ErrorAction SilentlyContinue |
    Where-Object { $_.Path -and $_.Path -like "*Hotel_Metrics_Pro_Desktop*" } |
    ForEach-Object {
        Write-Host "Arret processus $($_.ProcessName) (PID $($_.Id))"
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    }

Start-Sleep -Seconds 1

try {
    Remove-Item -LiteralPath $nested -Recurse -Force -ErrorAction Stop
    Write-Host "Dossier supprime avec succes." -ForegroundColor Green
    exit 0
}
catch {
    Write-Host "Suppression directe echouee : $($_.Exception.Message)" -ForegroundColor Yellow
}

# Methode alternative : robocopy (dossier vide -> ecrase le contenu)
$empty = Join-Path $env:TEMP "empty_dir_$(Get-Random)"
New-Item -ItemType Directory -Path $empty -Force | Out-Null
robocopy $empty $nested /MIR /R:1 /W:1 /NFL /NDL /NJH /NJS | Out-Null
Remove-Item -LiteralPath $nested -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $empty -Recurse -Force -ErrorAction SilentlyContinue

if (-not (Test-Path -LiteralPath $nested)) {
    Write-Host "Dossier supprime (methode robocopy)." -ForegroundColor Green
    exit 0
}

Write-Host "Echec. Fermez Cursor et l'Explorateur sur ce dossier, puis relancez ce script." -ForegroundColor Red
exit 1
