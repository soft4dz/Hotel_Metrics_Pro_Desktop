# Serveur API central (sync)

## Développement local (stub Node)

```bash
npm run server:dev
```

Par défaut : **http://127.0.0.1:3847**

| Route | Méthode | Description |
|-------|---------|-------------|
| `/api/health` | GET | Santé API |
| `/api/sync/push` | POST | Réception file offline |
| `/api/sync/pull` | GET | Modifications distantes |

Variable d'environnement : `HMP_API_PORT` (port alternatif).

## Production cloud (cPanel / MySQL)

Voir **`server/deploy/README-CLOUD.md`** — schéma MySQL + API PHP pour `https://votre-domaine/hmp-api`.

### Instance déployée (soft4dz.com)

| Élément | Valeur |
|---------|--------|
| URL API | `https://soft4dz.com/hmp-api` |
| Base MySQL | `softdzco_hmp_sync` |
| Utilisateur MySQL | `softdzco_hmp_user` |
| Test santé | `GET https://soft4dz.com/hmp-api/api/health` |

Les identifiants MySQL et la clé API ont été transmis séparément — ne pas les committer.
