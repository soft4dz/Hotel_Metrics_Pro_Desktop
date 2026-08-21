# Déploiement sync cloud — cPanel (soft4dz.com)

Ce guide installe la **base MySQL centrale** et l’**API PHP** compatible avec l’application desktop Hotel Metrics Pro.

## 1. Créer la base MySQL dans cPanel

1. Connexion : `https://soft4dz.com:2083/`
2. **Bases de données MySQL** → **Créer une base**
   - Nom suggéré : `hmp_sync` → cPanel créera `softdzco_hmp_sync`
3. **Utilisateur MySQL** → créer `hmp_user` → `softdzco_hmp_user`
   - Mot de passe : **générez un mot de passe fort** (20+ caractères)
4. **Ajouter l’utilisateur à la base** → tous les privilèges
5. **phpMyAdmin** → sélectionner `softdzco_hmp_sync` → **Importer**
   - Fichier : `server/deploy/mysql/001_central_schema.sql`

Pour une installation existante créée avant ce correctif P0, importer une seule fois
`server/deploy/mysql/002_sync_tenant_isolation.sql` au lieu de réimporter le schéma initial.
Les données déjà présentes reçoivent le code d'organisation `LEGACY` : utilisez ce code dans
`organization_keys` lors de la première remise en service, puis planifiez son renommage si nécessaire.

## 2. Déployer l’API PHP

1. **Gestionnaire de fichiers** cPanel → `public_html/`
2. Créer le dossier `hmp-api/`
3. Uploader le contenu de `server/deploy/php/` :
   - `index.php`
   - `lib/bootstrap.php`
   - `.htaccess`
4. Copier `config.sample.php` → `config.php`
5. Éditer `config.php` :

```php
'db' => [
    'host' => 'localhost',
    'name' => 'softdzco_hmp_sync',
    'user' => 'softdzco_hmp_user',
    'pass' => 'VOTRE_MOT_DE_PASSE_MYSQL',
],
'organization_keys' => [
    'MON_ORGANISATION' => 'VOTRE_CLE_API_SECRETE_MINIMUM_32_CARACTERES',
],
```

6. Générer une clé API (PowerShell) :

```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])
```

## 3. Tester l’API

```bash
curl https://soft4dz.com/hmp-api/api/health
```

Réponse attendue :

```json
{"ok":true,"service":"hotel-metrics-api","version":"0.8.0"}
```

Test push (remplacer `VOTRE_CLE`) :

```bash
curl -X POST https://soft4dz.com/hmp-api/api/sync/push \
  -H "Content-Type: application/json" \
  -H "X-HMP-API-Key: VOTRE_CLE" \
  -d "{\"deviceId\":\"00000000-0000-4000-8000-000000000001\",\"items\":[]}"
```

## 4. Configurer l’application desktop

1. Menu **Système → Synchronisation**
2. URL API : `https://soft4dz.com/hmp-api`
3. Variable d’environnement côté poste (avant lancement) :

```bat
set HMP_SYNC_API_KEY=VOTRE_CLE_API_SECRETE
npm run dev
```

Ou ajouter dans `.env.production` (si utilisé au build).

> L’URL distante **doit être en HTTPS** (validation anti-SSRF dans l’app).

## 5. Sécurité

- Ne partagez **jamais** les identifiants cPanel dans un chat ou un dépôt Git
- Changez le mot de passe cPanel si exposé
- `config.php` ne doit pas être public (reste côté serveur)
- Utilisez une clé API longue et unique par organisation (32 caractères minimum)
- Ne réutilisez jamais une clé entre deux clients : elle définit leur cloisonnement de données

## Dépannage

| Problème | Solution |
|----------|----------|
| 404 sur `/api/health` | Vérifier `.htaccess` et `RewriteBase /hmp-api/` |
| 500 config.php manquant | Copier et renseigner `config.sample.php` |
| 401 Unauthorized | La clé doit exister dans `organization_keys` et correspondre à `HMP_SYNC_API_KEY` |
| Connexion MySQL refusée | Vérifier préfixe `softdzco_` sur base et utilisateur |
