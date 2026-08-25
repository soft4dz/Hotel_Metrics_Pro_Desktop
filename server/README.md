# Raqmi System — API Centrale (NestJS + PostgreSQL)

## Prérequis

- Node.js 20+
- PostgreSQL 15+ installé et démarré

## Démarrage rapide

### 1. Installer les dépendances

```bash
cd server
npm install
```

### 2. Configurer l'environnement

```bash
cp .env.example .env
# Éditer .env avec vos paramètres PostgreSQL
```

`.env` minimal :
```
DATABASE_URL="postgresql://postgres:votre_mdp@localhost:5432/hotel_metrics_pro"
JWT_SECRET="secret-aleatoire-de-32-octets-minimum"
ADMIN_INITIAL_PASSWORD="mot-de-passe-initial-unique"
HMP_LICENSE_KEY_ID="raqmi-root-2026"
HMP_LICENSE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n..."
HMP_LICENSE_PUBLIC_KEYS='{"raqmi-root-2026":"-----BEGIN PUBLIC KEY-----\\n..."}'
```

### 3. Créer la base PostgreSQL

```sql
CREATE DATABASE hotel_metrics_pro;
```

### 4. Migrations + seed

```bash
npx prisma migrate dev --name init
npx prisma generate
npm run db:seed
# → admin@raqmi.local ; le mot de passe provient de ADMIN_INITIAL_PASSWORD
```

### 5. Démarrer

```bash
npm run start:dev        # développement (hot-reload)
npm run build && npm run start:prod   # production
```

API : http://localhost:3001/api/v1
Swagger : http://localhost:3001/api/docs

---

## Migration depuis SQLite

```bash
npx ts-node scripts/migrate-from-sqlite.ts --sqlite ../hotel_metrics.db
```

---

## Dual-write Electron

Ajouter dans `.env` (racine du projet Electron) :

```
CENTRAL_API_URL=http://localhost:3001/api/v1
```

L'app Electron détecte si l'API répond. En cas d'absence, elle reste en mode hors-ligne (SQLite seul).
