# Shopify PRO — Backend Symfony + JWT

Stack : Symfony 7.2 · API Platform 4.1 · MySQL 8 · Lexik JWT · Docker.

---

## 1. Lancer Docker

Depuis la racine du projet (`Shopify_PRO/`) :

```bash
docker compose up -d --build
```

Ça démarre 3 conteneurs :

| Service | Container         | Port host → conteneur | Rôle                |
|---------|-------------------|-----------------------|---------------------|
| `db`    | `shopify_db`      | **3307** → 3306       | MySQL 8             |
| `php`   | `shopify_php`     | —                     | PHP-FPM + Symfony   |
| `nginx` | `shopify_nginx`   | 8080 → 80             | Reverse-proxy HTTP  |

> Note : MySQL est mappé sur **3307** côté host pour éviter le conflit avec
> un MySQL local éventuellement installé sur le port 3306.
> Côté réseau Docker interne, MySQL reste accessible en `db:3306` (c'est ce
> qu'utilise `DATABASE_URL` dans le `.env`).

Vérifier que tout tourne :

```bash
docker ps
```

L'API est accessible sur **http://localhost:8080**.

---

## 2. Initialiser le backend

### 2.1 Installer les dépendances PHP

```bash
docker exec shopify_php composer install
```

### 2.2 Jouer les migrations Doctrine

Crée le schéma `user`, `role`, `coach`, `seance`, `reservation`, etc.

```bash
docker exec shopify_php php bin/console doctrine:migrations:migrate --no-interaction
```

### 2.3 Générer les clés JWT (une fois)

```bash
docker exec shopify_php php bin/console lexik:jwt:generate-keypair --skip-if-exists
```

Les clés sont créées dans `symfony/config/jwt/` (ignorées par git).

---

## 3. Initialiser les rôles en base

`POST /api/users` assigne automatiquement `ROLE_CLIENT` au nouveau user → ce
rôle **doit exister en base** avant le premier register.

```bash
docker exec -i shopify_db mysql -ushopify_user -pshopify_password shopify_db \
  < symfony/sql/init_roles.sql

# Ou depuis l'host avec mysql client (port 3307) :
# mysql -h 127.0.0.1 -P 3307 -ushopify_user -pshopify_password shopify_db \
#   < symfony/sql/init_roles.sql
```

Le script est idempotent (`ON DUPLICATE KEY UPDATE`), tu peux le relancer.

Vérifier :

```bash
docker exec shopify_db mysql -ushopify_user -pshopify_password shopify_db \
  -e "SELECT * FROM role"
```

Tu dois voir `ROLE_ADMIN` et `ROLE_CLIENT`.

---

## 4. Tester l'API avec `api.rest`

Ouvre `symfony/api.rest` dans VS Code (extension **REST Client** requise) et
exécute les requêtes dans l'ordre.

### 4.1 Register — créer un client

Section **1.1** du `.rest` :

```http
POST {{baseUrl}}/api/users
Content-Type: application/ld+json

{
  "firstName": "Jean",
  "lastName":  "Dupont",
  "email":     "jean@test.com",
  "password":  "azerty123"
}
```

→ retourne `201 Created`. Le password est hashé automatiquement et le rôle
`ROLE_CLIENT` est rattaché.

### 4.2 Login — récupérer le JWT

Section **1.3** :

```http
POST {{baseUrl}}/api/login_check
Content-Type: application/json

{
  "email":    "jean@test.com",
  "password": "azerty123"
}
```

→ retourne `{ "token": "eyJ..." }`. Le token est extrait dans la variable
`{{token}}` automatiquement par REST Client.

### 4.3 Appeler une route protégée

```http
GET {{baseUrl}}/api/users/1
Authorization: Bearer {{token}}
```

---

## Endpoints publics vs protégés

| Méthode + Path           | Accès               |
|--------------------------|---------------------|
| `POST /api/login_check`  | public              |
| `POST /api/users`        | public (register)   |
| `GET  /api/coaches`      | public              |
| `GET  /api/seances`      | public              |
| `GET  /api/docs`         | public              |
| tout le reste de `/api`  | JWT requis          |

Configuré dans `symfony/config/packages/security.yaml`.

---

## Promouvoir un user en admin

Une fois un user créé (ex `admin@test.com`), attache-lui `ROLE_ADMIN` :

```bash
docker exec shopify_db mysql -ushopify_user -pshopify_password shopify_db -e \
  "INSERT INTO user_role (user_id, role_id)
   SELECT u.id, r.id FROM user u, role r
   WHERE u.email='admin@test.com' AND r.name='ROLE_ADMIN'"
```
