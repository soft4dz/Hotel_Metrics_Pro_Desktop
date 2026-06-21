# Hotel Metrics Pro Desktop

Application desktop **offline-first** de pilotage hôtelier multi-établissements (Algérie), avec module marina **PortMaster** et suite **RH algérienne** (paie DZ, conformité, registres légaux).

**Version : 0.8.0** · **Stack :** Electron 36 + React 18 + SQLite + TypeScript

---

## Prérequis

- **Node.js** 20 LTS ou plus récent
- **Windows** 10/11 (cible principale)
- **SQLite natif** : `npm install` exécute `postinstall` (prebuild `better-sqlite3` pour Electron 36). En cas d'échec : `npm run rebuild:native`

> Electron est fixé en **36.x** (prebuild natif sans compilation locale).

---

## Installation et lancement

```bash
git clone https://github.com/soft4dz/Hotel_Metrics_Pro_Desktop.git
cd Hotel_Metrics_Pro_Desktop
npm install
npm run dev
```

**Windows rapide :** double-clic sur `dev.bat` ou `.\dev.ps1`

L'app démarre :
1. Vite (UI) sur `http://localhost:5173`
2. Fenêtre Electron (`contextIsolation` + `sandbox`)

> Ne pas utiliser uniquement le navigateur : `window.electronAPI` n'existe que dans Electron.

### Connexion par défaut (base neuve)

| E-mail | Mot de passe |
|--------|--------------|
| `admin@hotelmetrics.local` | `Admin@2026!` |

**Base SQLite :** `%AppData%\hotel-metrics-pro-desktop\data\hotel_metrics_local.db`  
Verrouillage après 5 échecs (15 min). Connexions journalisées.

### Auto-login développement (optionnel)

| Variable | Effet |
|----------|--------|
| `VITE_AUTO_LOGIN=true` | Connexion admin automatique côté UI (dev uniquement) |
| `HMP_DEV_AUTO_ADMIN=1` | Session IPC admin sans login (main process) |
| `HMP_DEV_AUTO_ADMIN=0` | Désactive le bypass IPC même en dev |

---

## Modules métier (~30)

| Domaine | Exemples |
|---------|----------|
| **Pilotage** | Dashboard global, objectifs, rapports, modules hub |
| **Finance** | Recettes, trésorerie, facturation, clients, tarifs |
| **Exploitation** | Hébergement/PMS, stocks, achats, maintenance, parking, plage |
| **Qualité** | Anomalies, réclamations, décisions, audit |
| **RH** | Employés, paie DZ, planning, conformité, registres légaux |
| **PortMaster** | Marina : bateaux, contrats, factures, mouvements, recouvrement |
| **Système** | Utilisateurs, hôtels, sync, sauvegarde, paramètres |

Catalogue complet : `/modules` ou `src/modules/moduleCatalog.ts`.

Les modules peuvent être **activés/désactivés** (`modules_config`). Les routes métier vérifient l'activation avant accès.

---

## Module RH

Navigation hub : `/rh/:hub/:sub`

| Hub | Contenu |
|-----|---------|
| Pilotage | Dashboard, IA, prévisions |
| Collaborateurs | Annuaire, wizard employé, fiche 360, contrats |
| Temps | Planning, pointages, absences |
| Paie & légal DZ | Pré-paie, registres, conformité |
| Talents | Recrutement, formations |
| Validations | Workflow N+1 |
| Mon espace | Self-service employé |

Compte démo RH : voir seed ou documentation admin.

---

## PortMaster

Menu `/portmaster/*` — dashboard, référentiel portuaire, clients, bateaux, contrats, factures, tarifs, validations, mouvements, recouvrement.

Compte démo : `port@hotelmetrics.local` / `Port@2026!`

---

## Import base legacy (MySQL / phpMyAdmin)

```bat
import.bat "C:\chemin\vers\dump.sql"
```

ou `npm run import:legacy`

---

## Scripts npm

| Commande | Description |
|----------|-------------|
| `npm run dev` | Développement Electron + Vite |
| `npm test` | Tests Vitest |
| `npm run test:smoke` | Smoke test des routes |
| `npm run build` | Build production |
| `npm run dist` | Installateur Windows (NSIS) |
| `npm run seed:demo` | Seed démo tous modules |
| `npm run server:dev` | API NestJS optionnelle (:3001) |
| `npm run test:rh-paie` | Test moteur paie algérienne |

---

## Architecture

```
electron/          Process principal, IPC (~38 domaines), services (~73), SQLite
src/               Interface React (HashRouter, TanStack Query, Zustand)
server/            API NestJS + PostgreSQL (sync partielle : clients, facturation, trésorerie)
docs/              Guides utilisateurs (11 profils), procédures prod
```

- **Offline-first** : SQLite = source de vérité locale
- **RBAC** multi-hôtel avec permissions granulaires
- **Dual-write** optionnel vers API centrale (retry automatique)
- **Sync** file d'attente (`sync_queue`) + page `/system/sync`

---

## Tests et CI

- **Vitest** : routes smoke, sidebar, validation IPC, géo Algérie, modules
- **GitHub Actions** (`.github/workflows/ci.yml`) : Windows, `npm test` + `npm run build` sur chaque push `main`

---

## Documentation

| Fichier | Contenu |
|---------|---------|
| `docs/guides-utilisateurs/` | Guide par profil (super-admin, PDG, RH, réception…) |
| `docs/STABILISATION_PRODUCTION.md` | Checklist mise en production |
| `docs/PROCEDURE_SAUVEGARDE_RESTAURATION.md` | Backup / restore |
| `README_ADMIN_MODULE_V1.md` | Module administration |

---

## Packaging Windows (Phase 10)

```bash
npm run dist
```

Sortie : dossier `release/` (installateur NSIS x64). Configuration : `electron-builder.yml`.

---

## Feuille de route

| Phase | Statut |
|-------|--------|
| 1–5 Auth, admin, recettes, dashboards | ✅ |
| 6–8 PortMaster, facturation, sync | ✅ |
| 9 Stabilisation prod, GED, docs | 🔄 En cours |
| 10 Installateur, licence | 📋 Prévu |

---

## Licence

Usage privé / projet métier — voir votre contrat de licence.
