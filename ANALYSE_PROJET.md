# Analyse du projet Hotel Metrics Pro Desktop

## Vue d'ensemble

**Hotel Metrics Pro Desktop** est une application desktop métier de pilotage hôtelier et portuaire (module PortMaster), développée en **Electron + React + TypeScript** avec une base de données **SQLite** embarquée. Le projet est ambitieux — il couvre non seulement la gestion hôtelière classique (recettes, objectifs, dashboard), mais aussi un écosystème complet : RH avancé, facturation, trésorerie, hébergement, tarifs, GED, maintenance, stocks, achats, commercial, parking, plage, et anomalies.

> **Phase actuelle** : 8 (Sync, mouvements & recouvrement) | **Version** : 0.8.0

---

## Points forts

### 1. Architecture globale solide
- **Electron + Vite + React** : stack moderne, bon choix pour une app desktop cross-platform
- **TypeScript** sur toute la codebase (~358 fichiers TS répartis entre `src/` et `electron/`)
- **SQLite + better-sqlite3** : excellent choix pour une app desktop offline-first, WAL activé, transactions sécurisées
- **Migrations SQL versionnées** : 30 fichiers de migration, système robuste (`schema_migrations`)
- **Sécurité** : `contextIsolation`, `sandbox`, `nodeIntegration: false`, bcrypt, sessions, verrouillage après 5 échecs, audit log

### 2. Organisation du code
- Séparation claire entre **renderer** (`src/`) et **main process** (`electron/`)
- Architecture par **modules fonctionnels** dans `src/pages/`, `electron/services/`, `electron/ipc/`
- Système de **permissions RBAC** bien structuré (`permissions.ts`, `authBootstrap.ts`)
- **Protocole custom `hmp-logo`** pour servir les logos avec cache-control
- **Système de thèmes** (Tailwind + CSS variables) avec couleurs personnalisables

### 3. Fonctionnalités métier riches
- **PortMaster** : référentiel portuaire (bassins/quais/emplacements), contrats, mouvements bateaux, recouvrement, tarification
- **RH** : très complet — employés, contrats, pointages, absences, plannings, paie (moteur DZ + Dlg), conformité légale, registres, formations, entretiens, GED RH, ruptures de contrat, IA decisionnelle
- **Trésorerie & Facturation** : encaissements, journal de caisse, factures, paiements, workflows de validation
- **Hébergement** : types de chambres, chambres, réservations, KPIs d'occupation
- **Export** : Excel (exceljs), PDF (pdf-lib), rapports dashboard

### 4. DX (Developer Experience)
- Scripts utilitaires de debug (`scripts/` : vérification DB, reset mots de passe, inspect, test auth)
- Dev mode avec auto-login possible (`VITE_AUTO_LOGIN`)
- Import legacy depuis MySQL/sql dump
- Tests configurés avec Vitest + Testing Library (mais peu utilisés — voir ci-dessous)

---

## Risques et faiblesses identifiés

### 1. 🔴 Déduplication massive IPC (critique)
**Le fichier `preload.ts` (~550 lignes) et `ipcClient.ts` (~480 lignes) sont quasi identiques** — ils déclarent tous deux la même interface `IpcApi`. C'est une source majeure de bugs et de dette technique :
- Toute modification d'API doit être faite **deux fois**
- Risque de divergence entre les deux
- **Recommandation** : générer `ipcClient.ts` automatiquement depuis `preload.ts`, ou utiliser une factory / proxy dynamique

```ts
// Exemple de solution
const createIpcProxy = (namespace: string) => new Proxy({}, {
  get: (_, method: string) => (...args: any[]) => 
    ipcRenderer.invoke(`${namespace}:${method}`, ...args)
});
```

### 2. 🟠 Taille du main process (critique à moyen terme)
`electron/main.ts` enregistre **~40 handlers IPC** manuellement. Le fichier `rh.ipc.ts` fait **21KB** (465 lignes). La main process est en train de devenir un monolithe.
- Risque de couplage fort
- Démarrage plus lent
- Difficulté à tester unitairement

### 3. 🟠 Très peu de tests (5 fichiers de test visibles)
Pour ~358 fichiers TS, seulement **5 fichiers de test** sont présents :
- `KpiCard.test.tsx`
- `useEnabledModules.test.ts`
- `sidebarModules.test.ts`
- `SidebarNav.test.tsx`
- `algerieGeo.test.ts`

Le module RH (le plus complexe) n'a **aucun test** visible. La couverture de test est quasi nulle.

### 4. 🟠 Double stack backend non synchronisé
Le projet a :
- **Electron main** : SQLite + services métier + IPC (fonctionnel, riche)
- **NestJS server** (`server/`) : PostgreSQL + Prisma + Swagger (plus léger, moins avancé)

Les deux implémentations risquent de diverger. Le modèle de données SQLite (migrations) vs Prisma (schema) n'est pas visiblement synchronisé.

### 5. 🟡 Modules "placeholder"
Plusieurs modules nouveaux ont des pages placeholder (`ModulePlaceholderPage`) :
- Anomalies, Décisions, Réclamations, Parking, Plage, Stocks, Achats, Maintenance, Commercial, GED

Ces modules ont des **services IPC et DB** mais des **UI minimales** — probablement en cours de développement.

### 6. 🟡 Pas de lazy loading systématique
Seul `DashboardGlobalPage` est lazy-loaded dans `AppRoutes.tsx`. Les autres pages sont importées statiquement, ce qui alourdit le bundle initial.

### 7. 🟡 Pas de validation côté renderer
Les IPC handlers reçoivent des `unknown` inputs sans validation de schéma (Zod, Joi, etc.). C'est une faille de sécurité potentielle — le renderer pourrait envoyer des payloads malformés.

### 8. 🟡 Pas de gestion de cycle de vie mémoire
Le `queryClient` de React Query est créé globalement mais jamais invalidé explicitement. Les stores Zustand persistés (`hmp-auth`) peuvent accumuler des données.

### 9. 🟡 Dependances potentiellement obsolètes ou en retard
- **Electron 36** (fixé intentionnellement car `better-sqlite3` n'a pas de prebuild pour Electron 42) — c'est un risque de sécurité à moyen terme
- **Tailwind CSS 3.4** (v4 est sortie)
- **React 18** (v19 disponible, mais le passage est moins urgent)

### 10. 🟡 Pas de CI/CD
Aucun fichier GitHub Actions, GitLab CI, ou Azure DevOps visible. Le build et la distribution sont manuels (`npm run dist`).

---

## Opportunités d'amélioration (priorisées)

### 🔴 Haute priorité (immédiat)

| # | Action | Impact |
|---|--------|--------|
| 1 | **Dédupliquer l'IPC** : générer `ipcClient.ts` automatiquement ou utiliser un proxy | Réduit la dette technique, élimine les erreurs de synchronisation |
| 2 | **Ajouter la validation Zod** sur tous les IPC handlers (renderer → main) | Sécurité, types runtime, meilleurs messages d'erreur |
| 3 | **Commencer les tests unitaires** sur le module RH (le plus critique) | Qualité, régression, confiance pour les releases |
| 4 | **Lazy load toutes les pages lourdes** (RH, PortMaster, Facturation) | Temps de démarrage réduit, meilleure UX |

### 🟠 Moyenne priorité (Phase 9)

| # | Action | Impact |
|---|--------|--------|
| 5 | **Extraire le registre IPC** : créer un `IpcRegistry` dynamique qui scanne les fichiers `*.ipc.ts` | Main.ts plus léger, découverte automatique |
| 6 | **Synchroniser Prisma schema** avec le schéma SQLite (ou abandonner NestJS si non utilisé) | Évite la divergence backend |
| 7 | **Ajouter un Error Boundary par module** (pas juste global) | UX meilleure en cas de crash d'un module |
| 8 | **Mettre en place un système de feature flags** pour les modules en développement | Permet de livrer sans exposer les placeholders |
| 9 | **Système de logging structuré côté renderer** (pas juste console) | Debug en production, support client |

### 🟡 Basse priorité (Phase 10+)

| # | Action | Impact |
|---|--------|--------|
| 10 | **Migrer à Electron 42+** quand better-sqlite3 aura les prebuilds | Sécurité, performances |
| 11 | **CI/CD GitHub Actions** : build, test, sign Windows, release auto | Livraison professionnelle |
| 12 | **React Query devtools** en mode dev | Debug data fetching |
| 13 | **Virtualisation des listes** (react-window) pour les grands tableaux | Performance sur les gros volumes |
| 14 | **Système de plugins** pour les modules métier (Parking, Plage, etc.) | Architecture extensible, temps de chargement |
| 15 | **Internationalisation (i18n)** si expansion hors Algérie | Marché |

---

## Recommandations stratégiques

### Court terme (avant la Phase 9 — Installateur)
1. **Ne pas ajouter de nouveaux modules** avant de stabiliser l'existant. Le scope est déjà énorme.
2. **Consolider la couverture de test** : viser 30% sur les services critiques (auth, recettes, paie RH).
3. **Auditer la sécurité** : validation des inputs, injection SQL (même si prepared statements sont probablement utilisés), gestion des fichiers uploadés.
4. **Simplifier le preload** : c'est le goulot d'étranglement actuel du développement.

### Moyen terme (Phase 10+)
1. **Extraire le "core business"** dans une librairie partagée (`packages/core`) pour pouvoir la réutiliser entre Electron et NestJS.
2. **Mettre en place un pattern CQRS** ou "Command/Query" pour les services, car certains fichiers (`rh-paie-dlg.service.ts`, `rh-employe.service.ts`) dépassent les 500-600 lignes.
3. **Envisager Tauri** comme alternative à Electron (plus léger, plus sécurisé) pour une v2.0, mais **pas avant la v1.0 stable**.

---

## Score global

| Critère | Note | Commentaire |
|---------|------|-------------|
| Architecture | 7/10 | Bonne séparation, mais main.ts trop lourd |
| Code Quality | 6/10 | TypeScript, mais duplication IPC et peu de tests |
| Sécurité | 7/10 | Bonnes pratiques Electron, mais manque validation runtime |
| Fonctionnalités | 9/10 | Écosystème très complet, couverture métier exceptionnelle |
| Maintenabilité | 5/10 | Dette technique accumulée (duplication, taille des fichiers) |
| Performance | 6/10 | Pas de lazy loading systématique, pas de virtualisation |
| DX | 7/10 | Bon tooling, mais manque CI/CD et tests |
| **Global** | **6.7/10** | **Projet ambitieux et fonctionnel, mais besoin de consolidation technique avant la v1.0** |

---

## Conclusion

**Hotel Metrics Pro Desktop est un projet métier très impressionnant** par la richesse fonctionnelle et la couverture sectorielle (hôtel + port + RH + finance). Cependant, il a atteint un point où **la dette technique commence à freiner la vélocité** :
- La duplication IPC est le problème #1 à résoudre
- Le manque de tests est un risque pour la stabilité des releases
- La taille du main process nécessite un refactoring

**Mon conseil principal** : **ralentir l'ajout de features** pour consacrer la Phase 9 à la consolidation technique (tests, refacto IPC, validation). L'installateur Windows sera plus crédible si le code est testé et stable.
