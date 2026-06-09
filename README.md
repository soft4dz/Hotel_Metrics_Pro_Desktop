# Hotel Metrics Pro Desktop

Application desktop de pilotage hôtelier et portuaire (module **PortMaster** intégré).

**Phase actuelle : 8 — Sync, mouvements & recouvrement**

## Prérequis

- **Node.js** 20 LTS ou plus récent ([nodejs.org](https://nodejs.org))
- **Windows** 10/11 (cible principale)
- **SQLite natif** : après `npm install`, le script `postinstall` télécharge automatiquement le binaire `better-sqlite3` pour **Electron 36** (aucun Python requis). En cas d’échec : `npm run rebuild:native`

> **Note Electron** : la version est fixée à **36.x** car `better-sqlite3` ne fournit pas encore de prebuild pour Electron 42 sans compiler avec Python + Visual Studio Build Tools.

## Installation

```bash
cd d:\Projects\Hotel_Metrics_Pro_Desktop
npm install
```

## Lancer en développement

### Test rapide (Windows)

Double-cliquez sur **`dev.bat`** à la racine du projet (installe les dépendances si besoin, puis lance l’app).

Ou en PowerShell : `.\dev.ps1`

### Ligne de commande

```bash
npm run dev
```

Cette commande démarre :

1. Le serveur Vite (interface React) sur `http://localhost:5173`
2. La fenêtre **Electron** avec `contextIsolation` et `sandbox` activés

> Ne ouvrez pas uniquement `http://localhost:5173` dans le navigateur : l'API IPC (`window.electronAPI`) n'existe que dans Electron.

## Import base existante (MySQL / phpMyAdmin)

Pour importer `hotel_metrics_pro (25).sql` :

```bat
import.bat
```

Ou avec un autre fichier :

```bat
import.bat "C:\chemin\vers\votre_dump.sql"
```

Ou :

```bash
npm run import:legacy
```

**Données importées :** hôtels (5), utilisateurs (9), rubriques (10), objectifs (120), recettes journalières (901 lignes), journal d'audit (2947).

**Connexion après import** — utilisez vos comptes d'origine, par exemple :

| E-mail | Rôle |
|--------|------|
| `dec@egt-sidifredj.dz` | Administrateur |
| `dg@egt-sidifredj.dz` | PDG |
| `controle@hotelelmanar.dz` | Contrôleur hôtel |

(Mot de passe inchangé — hash bcrypt conservé depuis l'ancienne base.)

---

## Connexion (Phase 2 — sans import)

| Champ | Valeur |
|-------|--------|
| E-mail | `admin@hotelmetrics.local` |
| Mot de passe | `Admin@2026!` |

- Base SQLite : `C:\ProgramData\HotelMetricsPro\data\hotel_metrics_local.db`
- Créée automatiquement au premier lancement (seed admin + rôles + rubriques)
- Après **5** échecs : compte verrouillé **15** minutes
- Connexions journalisées dans `logs_connexions` et `audit_log`

## Structure Phase 1

```
hotel-metrics-pro-desktop/
├── electron/          # Process principal + preload IPC
├── src/             # Interface React
├── assets/          # Icônes et logos
├── server/          # API centrale (phases ultérieures)
├── package.json
├── vite.config.ts
└── README.md
```

## Scripts disponibles

| Commande        | Description                          |
|-----------------|--------------------------------------|
| `npm run dev`   | Développement Electron + Vite        |
| `npm run build` | Build production (renderer + electron) |
| `npm run dist`  | Installateur Windows (Phase 10)      |

## Administration (Phase 3)

Menu **Administration** (compte `ADMIN_DEC`) :

- **Utilisateurs** — liste, création, modification, désactivation
- **Hôtels / unités** — CRUD des établissements
- **Rôles** — consultation des profils et permissions
- **Rubriques** — catégories de recettes
- **Journal d'audit** — traçabilité (menu Système)

## Recettes (Phase 4)

Menu **Exploitation** :

- **Saisie journalière** — grille par rubrique, brouillon / soumission
- **Historique** — filtres, modification avec motif, suppression logique
- **Validation** — valider ou refuser les journées soumises (directeur / admin)
- **Saisie mensuelle** — cumul journalier vs mensuel, écarts, verrouillage du mois

## Objectifs & dashboards (Phase 5)

- **Dashboard global** — KPIs (CA jour/mois, taux objectifs, alertes validation), courbe journalière, barres par hôtel et par catégorie (Recharts)
- **Objectifs** — liste, filtres, saisie / modification des budgets mensuels et indicateurs (chambres, restaurant, etc.)
- Filtres année / mois / hôtel selon le profil (PDG et admin : vue multi-hôtels)

## PortMaster (Phase 6 — fondations sérieuses)

Menu **PortMaster** (rôle `RESPONSABLE_PORT` ou administrateur) :

| Écran | Contenu |
|--------|---------|
| **Dashboard port** | KPIs complets (occupation, contrats, bateaux, CA, créances, validations), alertes, plan d'amarrage |
| **Référentiel port** | Bassins → quais → emplacements, recherche globale |
| **Clients port** | Dossiers physique / morale, statut dossier, créances |
| **Bateaux** | Fiche navire (lien client à venir en profondeur) |
| **Contrats** | Occupation, encaissements, reste à recouvrer |
| **Emplacements** | Vue par zone |

### Feuille de route PortMaster (cahier des charges)

| Blocs | Statut |
|-------|--------|
| 1 Dashboard général | **En place** (KPIs + alertes de base) |
| 2 Référentiel portuaire | **En place** (bassins/quais/emplacements, recherche) |
| 3 Clients | **En place** (CRUD dossier) |
| 4 Bateaux + documents | Partiel (fiche bateau ; documents/alertes expiry : schéma prêt) |
| 5–6 Contrats + workflow validation | Partiel (contrats actifs ; workflow brouillon/validation : schéma prêt) |
| 7 Tarification | Schéma + tarif démo ; UI Phase 7 |
| 8–9 Facturation + paiements liés facture | Schéma ; UI Phase 7 |
| 10 Créances / recouvrement | **En place** (ancienneté, relances) |
| 11 Mouvements bateaux | **En place** (arrivée, départ, changement) |
| 12 Situations irrégulières | Alertes automatiques |
| 13 Module validations | Schéma + compteur dashboard |
| 14–20 Documents, reporting PDF/Excel, sécurité | Phases 7–9 |

Compte démo : `port@hotelmetrics.local` / `Port@2026!`

## Phase 7 — Facturation & rapports

### PortMaster
- **Factures** — création hors contrat, génération depuis contrat, soumission / validation, paiements liés
- **Tarifs** — grilles par longueur, simulation avant contrat
- **Validations** — file d’attente contrats + factures
- **Export PDF** facture (après validation uniquement)

### Rapports
- **Rapports & exports** — Excel : recettes, factures port, créances, contrats

## Phase 8 — Sync & PortMaster avancé

### Synchronisation (admin)
- **Synchronisation** — file d'attente offline, push/pull vers API centrale
- API stub locale : `npm run server:dev` → `http://127.0.0.1:3847`

### PortMaster
- **Mouvements** — arrivée, départ, changement d'emplacement (mise à jour contrat actif)
- **Recouvrement** — créances par ancienneté (0–30 / 31–60 / 60+ j), relances

## Prochaine étape — Phase 9

- Installateur Windows (`npm run dist`), licence
- Documents bateaux (GED), reporting PDF étendu

## Licence

Usage privé / projet métier — voir votre contrat de licence.
