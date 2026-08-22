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
JWT_SECRET="votre-secret-jwt-tres-long"
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
# → admin@raqmi.local / Admin@2025! (à changer à la 1ère connexion)
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
