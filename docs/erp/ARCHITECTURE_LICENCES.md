# Architecture licences V2 — Raqmi System

## Principe de sécurité

La licence V2 utilise une signature **Ed25519 asymétrique** :

- la clé privée reste uniquement sur le serveur ou le poste éditeur Raqmi ;
- l’ERP embarque seulement une ou plusieurs clés publiques ;
- le client peut vérifier une licence, mais ne peut pas en fabriquer une ;
- aucune clé privée ni secret HMAC n’est livré dans JavaScript ou Electron.

Format compact :

```text
RS2.{payload-base64url}.{signature-ed25519-base64url}
```

Le payload signé contient notamment : `licenseId`, `organizationCode`, `edition`,
`businessSector`, `expiresAt`, `maxActivations`, `mode`, `keyId` et, en mode
offline, le `machineId` autorisé.

Les anciennes clés HMAC `RS-*` ne sont plus acceptées.

## Modes

| Mode | Contrôle |
|---|---|
| `offline` | Licence signée et obligatoirement liée à l’empreinte du poste |
| `remote` | Activation centrale, quota de postes, validation automatique et révocation |

Le mode remote conserve une validation locale pendant sept jours au maximum en
cas de panne réseau. Passé ce délai, ou après une révocation confirmée, l’ERP
passe en lecture seule.

## Gestion des clés

Générer une paire Ed25519 sur un poste éditeur sécurisé :

```bash
npm run setup:license-keys -- raqmi-root-2026
```

Le dossier `.license-keys/` est ignoré par Git. Le fichier privé doit être placé
dans un coffre-fort et injecté uniquement sur le serveur :

```text
HMP_LICENSE_PRIVATE_KEY
HMP_LICENSE_KEY_ID=raqmi-root-2026
```

Le JSON des clés publiques est fourni au build de l’ERP :

```text
HMP_LICENSE_PUBLIC_KEYS={"raqmi-root-2026":"-----BEGIN PUBLIC KEY-----..."}
```

La construction d’un installateur commercial échoue si aucune clé publique
Ed25519 n’est fournie ou si une clé privée est présente dans l’environnement.

## API

| Méthode | Route | Accès |
|---|---|---|
| `POST` | `/licenses/activate` | Public, limité en fréquence |
| `POST` | `/licenses/validate` | Public, limité en fréquence ; aucune clé dans l’URL |
| `POST` | `/licenses/admin/issue` | `GLOBAL_ADMIN` uniquement |
| `GET` | `/licenses/admin/licenses` | `GLOBAL_ADMIN` uniquement |
| `POST` | `/licenses/admin/revoke` | `GLOBAL_ADMIN` uniquement |

Le serveur exige également un `JWT_SECRET` explicite. Le mot de passe initial est
fourni par `ADMIN_INITIAL_PASSWORD` et n’est jamais imprimé dans les journaux.

## Défense côté ERP

- jeton stocké avec `Electron.safeStorage` ;
- signature, organisation, expiration et poste revérifiés à chaque lecture ;
- détection basique d’un retour de l’horloge ;
- synchronisation distante au démarrage puis toutes les douze heures ;
- blocage des canaux IPC des modules hors pack dans le processus principal ;
- politique lecture seule *fail-closed* pour les opérations non reconnues comme lectures.
