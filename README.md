# Sportify Pro

Plateforme de coaching sportif. Backend Symfony + API Platform + JWT, frontend React + Vite.

```
Shopify_PRO/
├── symfony/        # API REST (Symfony 7.2 · API Platform 4 · Lexik JWT · MySQL)
├── front-end/      # SPA React 18 + Vite
├── docker/         # Dockerfile PHP + nginx.conf
├── docker-compose.yml
├── README.md       # ce fichier
└── SOUTENANCE.md   # dossier de soutenance (choix techniques + justifications)
```

---

## Bootstrap complet — du clone au login

À faire dans cet ordre, depuis la racine `Shopify_PRO/`.

### 1 · Lancer Docker (backend + DB)

```bash
docker compose up --build -d
```

Ça démarre 3 conteneurs :

| Service | Container       | Port host → conteneur | Rôle               |
|---------|-----------------|-----------------------|--------------------|
| `db`    | `shopify_db`    | **3307** → 3306       | MySQL 8            |
| `php`   | `shopify_php`   | —                     | PHP-FPM + Symfony  |
| `nginx` | `shopify_nginx` | **8080** → 80         | Reverse-proxy HTTP |

> MySQL est mappé sur le port **3307** côté host pour ne pas heurter un MySQL local sur 3306.
> En interne, MySQL reste joignable en `db:3306` (c'est ce qu'utilise `DATABASE_URL`).

### 2 · Attendre que MySQL soit prêt

```bash
sleep 20
```

Pas de healthcheck dans le compose, donc on laisse 20 secondes au container MySQL pour finir son init avant de jouer les migrations.

### 3 · Installer les deps PHP et jouer les migrations

```bash
docker exec shopify_php composer install
docker exec shopify_php php bin/console doctrine:migrations:migrate --no-interaction
```

Crée le schéma : `user`, `role`, `coach`, `seance`, `reservation`, `user_role`.

### 3 bis · Initialiser les secrets JWT (passphrase + clés RSA)

```bash
docker exec shopify_php php bin/console app:init-jwt
```

En une seule commande :

- Génère une **passphrase aléatoire** (64 chars hex) et l'écrit dans `symfony/.env.local` (non versionné, créé si absent).
- Génère les **clés RSA** `config/jwt/private.pem` et `config/jwt/public.pem` chiffrées avec cette passphrase.

Idempotent : si une passphrase existe déjà dans `.env.local`, elle est réutilisée. Pour tout regénérer (et invalider les JWT en circulation) :

```bash
docker exec shopify_php php bin/console app:init-jwt --force
```

> Le `.env.local` et les fichiers `.pem` sont dans le `.gitignore` — chaque clone du repo doit relancer cette commande.

### 4 · Initialiser les rôles applicatifs

`POST /api/users` rattache automatiquement `ROLE_CLIENT` au nouveau compte → ce rôle **doit exister en base avant le premier register**.

```bash
docker exec -i shopify_db mysql -ushopify_user -pshopify_password shopify_db < symfony/sql/init_roles.sql
```

Insère `ROLE_ADMIN`, `ROLE_COACH`, `ROLE_CLIENT`. Idempotent (`ON DUPLICATE KEY UPDATE`), tu peux le relancer.

### 5 · Seed des données de démo

```bash
docker exec shopify_php php bin/console app:seed-dummy
```

Insère :

- **1 admin**
- **5 coachs** (entité `Coach` + `User` miroir avec `ROLE_COACH` → permet la connexion via Lexik)
- **5 clients**
- **5 séances** (1 par coach, dates échelonnées sur la semaine à venir)
- **5 réservations** (chaque client est inscrit à une séance différente)

La commande est idempotente (vérifie chaque email avant insert). Pour repartir d'une base propre :

```bash
docker exec shopify_php php bin/console app:seed-dummy --fresh
```

### 6 · Lancer le frontend

```bash
cd front-end
npm install
npm run dev
```

Vite démarre le serveur de dev sur **http://localhost:5173**. Le frontend tape directement sur **http://localhost:8080** (l'API Symfony) — l'URL est codée en dur dans `front-end/src/api/client.js` (`API_BASE`).

CORS est déjà autorisé sur les origines `localhost:*` côté Symfony (`nelmio_cors.yaml`).

---

## Comptes de démo

**Le mot de passe de tous les comptes seedés est `azerty123`.**

| Rôle           | Email                     | Mot de passe   |
|----------------|---------------------------|----------------|
| `ROLE_ADMIN`   | `admin@sportify.fr`       | `azerty123`    |
| `ROLE_COACH`   | `camille@coach.fr`        | `azerty123`    |
| `ROLE_CLIENT`  | `lea@client.fr`           | `azerty123`    |

**Autres coachs** : `theo@coach.fr` · `ines@coach.fr` · `hugo@coach.fr` · `sarah@coach.fr`
**Autres clients** : `antoine@client.fr` · `marie@client.fr` · `yanis@client.fr` · `elodie@client.fr`

Quand tu te connectes :

- L'admin est redirigé vers `/admin` (gestion users / coachs / séances + édition de rôles)
- Le coach est redirigé vers `/coach` (planning, création de séance)
- Le client est redirigé vers `/me/reservations` (ses réservations à venir + historique)

---

## Tests automatisés

Les tests PHPUnit couvrent les endpoints critiques : auth (register, login, mauvais mot de passe), CRUD réservation, validations métier (créneaux qui se chevauchent, capacité dépassée).

Lancer la suite complète avec sortie colorée (vert si OK, rouge si fail) :

```bash
docker exec shopify_php php bin/phpunit --colors=always --testdox
```

Options utiles :

```bash
# Filtrer une seule classe de test
docker exec shopify_php php bin/phpunit --colors=always --filter ReservationTest

# Verbose : affiche chaque assertion
docker exec shopify_php php bin/phpunit --colors=always --testdox --debug

# Avec reporting de couverture (nécessite xdebug)
docker exec shopify_php php bin/phpunit --colors=always --coverage-text
```

Le périmètre des tests est documenté dans `symfony/tests/TESTS.md`.

---

## Endpoints publics vs protégés

| Méthode + Path           | Accès                |
|--------------------------|----------------------|
| `POST /api/login_check`  | public               |
| `POST /api/users`        | public (register)    |
| `GET  /api/coaches`      | public               |
| `GET  /api/seances`      | public               |
| `GET  /api/docs`         | public (Swagger UI)  |
| `GET  /api/me`           | JWT requis           |
| tout le reste de `/api`  | JWT requis           |
| écritures sur `/api/coaches`, `/api/users` | `ROLE_ADMIN`        |
| écritures sur `/api/seances`               | `ROLE_ADMIN` ou `ROLE_COACH` |

Configuré dans `symfony/config/packages/security.yaml`.

---

## Tester l'API à la main

`symfony/api.rest` est un fichier prêt à l'emploi pour l'extension **REST Client** de VS Code. Il enchaîne register → login → appels protégés en récupérant automatiquement le JWT.

L'interface Swagger générée par API Platform est accessible sur **http://localhost:8080/api/docs**.

---

## Promouvoir un compte existant en admin (sans passer par le seed)

```bash
docker exec shopify_db mysql -ushopify_user -pshopify_password shopify_db -e \
  "INSERT INTO user_role (user_id, role_id)
   SELECT u.id, r.id FROM user u, role r
   WHERE u.email='ton@email.fr' AND r.name='ROLE_ADMIN'"
```

---

## Stack

- **Backend** : Symfony 7.2 · API Platform 4.1 · Doctrine ORM 3 · MySQL 8 · Lexik JWT 3.2 · Nelmio CORS · PHP 8.2+
- **Frontend** : React 18 · Vite 5 · axios 1.7 · ESM natif, pas de Babel runtime
- **Conteneurisation** : Docker Compose (DB + PHP-FPM + Nginx)
- **Tests** : PHPUnit
