# GeoTopo Pro — Guide de déploiement Cloudflare

## Prérequis
- Compte Cloudflare (gratuit)
- Node.js 18+
- npm install -g wrangler

---

## Étape 1 — Setup Cloudflare

```bash
# Login
wrangler login

# Créer la base D1
wrangler d1 create geotopo-pro-db
# → Copiez le database_id dans wrangler.toml

# Créer le bucket R2
wrangler r2 bucket create geotopo-pro-storage

# Appliquer les migrations
npm run db:init
```

---

## Étape 2 — Secrets

```bash
# JWT secret (générer une chaîne aléatoire longue)
wrangler secret put JWT_SECRET
# Entrez: une_chaine_aleatoire_longue_et_secrete_min_32_chars

# (Optionnel) Clé API email
wrangler secret put RESEND_API_KEY
```

---

## Étape 3 — Déploiement

```bash
npm install
npm run deploy
```

URL: `https://geotopo-pro.YOUR_SUBDOMAIN.workers.dev`

---

## Étape 4 — Domaine personnalisé (optionnel)

Dans Cloudflare Dashboard → Workers → geotopo-pro → Custom Domains  
Ajouter: `app.marocgeopro.ma`

---

## Structure des fichiers

```
geotopo-pro/
├── worker/
│   └── index.js          # Cloudflare Worker (API + auth)
├── migrations/
│   └── 0001_init.sql     # Schema D1
├── public/
│   ├── index.html        # App principale
│   ├── app.js            # GIS core (inchangé)
│   └── auth-client.js    # Auth + projets client
├── wrangler.toml         # Config Cloudflare
└── package.json
```

---

## API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/register | Inscription |
| POST | /api/auth/login | Connexion |
| POST | /api/auth/logout | Déconnexion |
| GET  | /api/auth/me | Profil utilisateur |
| POST | /api/auth/reset-request | Demande reset mdp |
| POST | /api/auth/reset-confirm | Confirmer reset |

### Projects
| Method | Path | Description |
|--------|------|-------------|
| GET    | /api/projects | Liste des projets |
| POST   | /api/projects | Créer un projet |
| GET    | /api/projects/:id | Détail + layers |
| PUT    | /api/projects/:id | Modifier |
| DELETE | /api/projects/:id | Supprimer |

### Layers
| Method | Path | Description |
|--------|------|-------------|
| GET    | /api/projects/:id/layers | Liste des couches |
| POST   | /api/projects/:id/layers | Sauvegarder couche |
| DELETE | /api/layers/:id | Supprimer couche |

### Files (R2)
| Method | Path | Description |
|--------|------|-------------|
| POST   | /api/files/upload | Upload fichier |
| GET    | /api/files/:key | Télécharger |

---

## Sécurité

- ✅ PBKDF2 100k iterations (password hashing)
- ✅ JWT HS256 + session DB validation
- ✅ Token expiry (30 jours)
- ✅ Reset token expiry (1 heure)
- ✅ Email enumeration protection
- ✅ Input validation (email, password, name)
- ✅ CORS headers
- ✅ File size limit (10MB)
- ✅ File type whitelist
- ✅ User isolation (R2 keys include userId)
- ✅ Session invalidation on password reset

---

## Variables d'environnement

| Variable | Description | Requis |
|----------|-------------|--------|
| JWT_SECRET | Secret pour signer les JWT | ✅ |
| DB | Binding D1 (auto) | ✅ |
| STORAGE | Binding R2 (auto) | ✅ |
| APP_URL | URL de l'app | optionnel |
| RESEND_API_KEY | Clé API email | optionnel |
