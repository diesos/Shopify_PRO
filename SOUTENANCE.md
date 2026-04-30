# Sportify Pro — Dossier de soutenance

**Auteur** : Omer Ozturk
**Examen** : CDA 2ème année · ForEach Academy
**Durée du projet** : 4 jours
**Rendu** : 30 avril 2026

---

## 1. Le projet en deux phrases

Sportify Pro est une plateforme web de mise en relation entre coachs sportifs indépendants et clients. Trois rôles cohabitent — client, coach, admin — chacun avec son périmètre, le tout autour d'un objet métier central : la **séance**, qu'un coach publie et qu'un client réserve.

J'ai choisi un découpage strict back/front : une API REST Symfony qui parle JSON, un SPA React côté navigateur. Le tout dialogue via des appels HTTP authentifiés au JWT, rien de plus.

---

## 2. Stack et justifications

### Backend — Symfony 7.2 + API Platform 4 + Lexik JWT

**Pourquoi Symfony ?** Le sujet impose une API REST sécurisée avec un CRUD complet, des règles métier et une authentification. Symfony fournit l'écosystème mature pour ça : Doctrine pour l'ORM, le composant Security pour les rôles et les access controls, et — surtout — API Platform qui génère les endpoints REST à partir des entités annotées. Au lieu d'écrire 4 contrôleurs par ressource (GET collection, GET item, POST, PATCH, DELETE), je décris l'entité avec `#[ApiResource]` et les opérations sont exposées automatiquement, avec sérialisation JSON-LD, validation, et expressions de sécurité.

**Pourquoi Lexik JWT plutôt que les sessions ?** Parce que le frontend est un SPA séparé, pas une appli Twig server-rendered. Avec un JWT, je n'ai pas besoin de gérer des cookies de session côté Symfony, ni de cookie SameSite/CORS compliqués. Le JWT est stateless : Symfony le valide à chaque requête sans toucher la DB. C'est aussi le standard que tu rencontres en stage / en boîte — plus représentatif qu'un cookie PHP.

**Pourquoi API Platform et pas un FOSRestBundle ou des contrôleurs maison ?** Gain de temps massif et garantie de cohérence. API Platform pose la couche REST proprement, avec Hydra/JSON-LD pour la documentation auto (Swagger inclus à `/api/docs`), la pagination, le filtrage. Et quand j'ai besoin d'un endpoint custom (`/api/me`), je code juste un contrôleur classique à côté.

### Frontend — React 18 + Vite + axios

**Pourquoi React ?** Familier, écosystème énorme, hooks (`useState`/`useEffect`/`useContext`) qui évitent les classes. Et pour un SPA avec routing par hash, formulaires, modales et tableaux dynamiques, c'est l'outil le plus naturel. J'ai choisi React 18 pour avoir la dernière API stable.

**Pourquoi Vite ?** Au démarrage du projet je suis parti en CDN + Babel standalone (transpile dans le navigateur, zéro build). Ça allait pour itérer sur les maquettes mais ce n'est pas production-grade : le navigateur transpile chaque fichier `.jsx` à chaque chargement. Quand l'app a grossi (15+ écrans, contexte d'auth, intercepteurs), j'ai migré vers Vite. Vite, c'est :
- du HMR instantané pendant le dev (sub-second)
- un build de prod minifié (~78 kB gzip JS)
- de l'ESM natif (`import`/`export`) au lieu de coller des `Object.assign(window, ...)` partout

**Pourquoi axios et pas `fetch` natif ?** Pour le pattern des **interceptors**. Avec axios j'ai un seul endroit (`src/api/client.js`) qui :
1. Intercepte les requêtes sortantes pour attacher le `Authorization: Bearer <token>` (depuis localStorage)
2. Force `Content-Type: application/merge-patch+json` sur les PATCH (exigé par API Platform)
3. Intercepte les réponses pour déballer les collections JSON-LD (`member`)
4. Mappe les erreurs HTTP vers une `ApiError` typée et vide le token sur 401

Avec `fetch` j'aurais dû dupliquer cette logique dans chaque écran ou écrire un wrapper équivalent. Autant prendre la lib qui le fait déjà bien.

### Base de données — PostgreSQL via Doctrine

PostgreSQL parce qu'il est plus strict que MySQL sur les types et les contraintes (intégrité référentielle stricte, pas de comportement implicite chelou). Doctrine ORM gère le mapping entité → table et les migrations — donc le schéma SQL est versionné dans `migrations/`.

### Conteneurisation — Docker

`docker-compose.yml` monte un PostgreSQL sur le port 3307 (pour ne pas heurter un PG local sur 5432). Le `Dockerfile` PHP n'est pas inclus mais l'environnement Symfony tourne via `symfony serve` localement. C'est un compromis : Docker pour la DB (intéressant à isoler), local pour le PHP (boucle de feedback plus rapide).

---

## 3. Architecture

### Vue 3 tiers

```
[ Navigateur · React SPA ]
            │  HTTP + JSON
            ▼
[ Symfony · API REST · JWT ]
            │  SQL
            ▼
[ PostgreSQL ]
```

### Découpage du repo

```
Shopify_PRO/
├── symfony/                         # Backend
│   ├── src/
│   │   ├── ApiResource/             # Ressources API custom (vide pour l'instant)
│   │   ├── Controller/MeController  # GET /api/me — retour user courant
│   │   ├── Entity/                  # User, Coach, Seance, Reservation, Role
│   │   ├── EventSubscriber/         # JWTCreatedSubscriber → enrichit le payload
│   │   ├── Repository/              # Repos Doctrine auto-générés
│   │   ├── State/                   # PasswordHasherProcessor (hash auto)
│   │   └── Validator/               # ReservationConstraints (règles métier)
│   ├── config/packages/             # security.yaml, lexik_jwt, nelmio_cors
│   ├── migrations/                  # Versions de schéma Doctrine
│   └── api.rest                     # Banc de test HTTP (REST Client)
│
└── front-end/                       # Frontend (Vite + React)
    ├── src/
    │   ├── api/client.js            # Axios + interceptors (un seul fichier)
    │   ├── auth/                    # AuthContext + RequireAuth
    │   ├── chrome/                  # PublicNav, StaffNav
    │   ├── components/              # Lib UI (Button, Modal, Toast, Avatar, Cards…)
    │   ├── lib/fmt.js               # Formateurs date/€/heure
    │   ├── screens/                 # 11 écrans, un par route
    │   ├── App.jsx                  # Hash routing + chrome wrapper
    │   ├── main.jsx                 # Entry, montage des Providers
    │   └── tokens.css               # Design tokens (OKLCH)
    └── vite.config.js
```

### Pourquoi cette séparation ?

Un dossier par responsabilité, pas par type de fichier. Quand je touche à l'auth je vais dans `auth/`, quand je touche à un écran je vais dans `screens/`. Pas de `containers/` vs `presentational/` à la mode 2018, pas de structure Atomic Design (overkill pour ce volume).

Le choix de mettre **un seul fichier `api/client.js`** comme passerelle vers le backend, c'est une décision architecturale : aucun écran ne fait un `axios.get(...)` direct. Tout passe par `api.get()` / `api.post()`. Si demain je dois changer la base URL, ajouter un retry, logger les requêtes, c'est **un seul endroit** à modifier.

---

## 4. Fonctionnalités — mapping au cahier des charges

### Client (4 fonctionnalités demandées)

| Fonctionnalité demandée | Implémentation |
|---|---|
| Créer un compte | `POST /api/users` (PUBLIC) → écran `Register.jsx` → auto-login après création |
| Se connecter | `POST /api/login_check` (Lexik) → écran `Login.jsx` → JWT en localStorage |
| Consulter les séances | `GET /api/seances` (PUBLIC) → écrans `Landing.jsx` + `CatalogueSeances.jsx` (filtres coach / date / dispo / recherche) + `SeanceDetail.jsx` |
| Réserver une séance | `POST /api/reservations` (auth requise) → bouton dans `SeanceDetail.jsx` |
| Annuler une réservation | `DELETE /api/reservations/{id}` (auth requise) → écran `MesReservations.jsx` + bouton "se désinscrire" sur `SeanceDetail` |

### Coach (3 fonctionnalités demandées)

| Fonctionnalité | Implémentation |
|---|---|
| Consulter son planning | `CoachDashboard.jsx` filtre les séances par email du user connecté |
| Créer des séances | `POST /api/seances` (ROLE_COACH ou ROLE_ADMIN) → écran `SeanceForm.jsx` |
| Voir les participants | Listes de réservations groupées par séance dans `CoachDashboard.jsx` |

### Administrateur (2 fonctionnalités demandées)

| Fonctionnalité | Implémentation |
|---|---|
| Gérer les utilisateurs | Onglet "Utilisateurs" dans `AdminDashboard.jsx` → modale d'édition de rôles via `PATCH /api/users/{id}` |
| Superviser les séances | Onglet "Séances" avec barre de remplissage par séance + onglet "Coachs" avec création via `POST /api/coaches` |

### Règles de gestion

- **Capacité d'une séance** : `maxUser` sur l'entité Seance, comparé au nombre de réservations existantes côté front comme côté back.
- **Pas deux fois sur le même créneau** : implémenté côté backend dans `App\Validator\ReservationConstraints` (vérifie qu'un user n'a pas déjà une réservation à un horaire qui chevauche).
- **Réservation seulement si places dispo** : même validateur, qui compte les réservations existantes sur la séance.
- **Authentification requise** : `firewalls.api` dans `security.yaml` impose JWT sur tout `^/api` sauf endpoints publics whitelisted (`/api/login_check`, `POST /api/users`, GET sur `/api/coaches` et `/api/seances`).

---

## 5. Sécurité

C'est le point sur lequel j'ai le plus insisté parce que c'est le plus piégeux à faire mal.

### Couche 1 — Hash des mots de passe

Pas de stockage en clair. J'utilise un **State Processor API Platform** (`App\State\PasswordHasherProcessor`) qui hashe automatiquement le mot de passe au moment du POST/PATCH sur `/api/users` et `/api/coaches`. C'est branché via `processor: PasswordHasherProcessor::class` dans l'attribut `#[ApiResource]`. Algo : `auto` (bcrypt par défaut Symfony, argon2id si compilé avec).

### Couche 2 — JWT signé

Lexik génère un JWT RSA-signé avec une clé privée stockée dans `config/jwt/private.pem` (passphrase via `.env`). Le payload contient l'email (`username`), les rôles, l'exp — et j'y injecte aussi `id`, `firstName`, `lastName` via mon `JWTCreatedSubscriber` pour permettre au frontend de bootstrap son contexte d'auth sans round-trip supplémentaire.

### Couche 3 — Firewall + access controls

`security.yaml` définit trois firewalls : `login` (PUBLIC), `api` (stateless + JWT obligatoire), `main`. Les `access_control` whitelistent les endpoints publics et lockent tout `^/api` sur `IS_AUTHENTICATED_FULLY` par défaut.

### Couche 4 — Expressions de sécurité au niveau opération

C'est là où API Platform brille. Sur l'entité `Reservation` :

```php
#[ApiResource(operations: [
    new Get(security: "is_granted('ROLE_ADMIN') or is_granted('ROLE_COACH') or object.getUser() == user"),
    new Delete(security: "is_granted('ROLE_ADMIN') or is_granted('ROLE_COACH') or object.getUser() == user"),
])]
```

→ Un client ne peut voir/supprimer **que ses propres réservations**. Un coach ou un admin peut tout voir. C'est imposé au niveau de la ressource, pas dans le contrôleur — donc impossible à oublier.

### Couche 5 — CORS

`nelmio_cors.yaml` autorise les origines en regex (`^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$`) pour le dev. En prod il faudrait restreindre à un domaine précis.

### Couche 6 — Frontend : guard de routes

Le composant `<RequireAuth roles={["ROLE_ADMIN"]}>` wrappe les écrans sensibles dans `App.jsx`. Si pas connecté → redirect `/login`. Si connecté mais rôle insuffisant → redirect `/`. Les routes `/me/*`, `/coach/*`, `/admin/*` sont toutes guardées.

### Couche 7 — JWT exp watcher

Dans `AuthContext.jsx`, un `setInterval` toutes les 30s vérifie l'expiration du JWT côté client (le payload contient `exp`). Si expiré → token effacé du localStorage + user remis à `null` → redirection au prochain rendu protégé. Donc même si le user laisse l'onglet ouvert toute la nuit, il sera dégagé proprement à l'expiration (1h par défaut Lexik).

### Couche 8 — Réaction au 401 global

L'interceptor de réponse axios détecte les 401 (token rejeté côté serveur) → vide le tokenStore + notifie les listeners (`onUnauthorized`). L'`AuthProvider` est abonné et déconnecte l'utilisateur. Avantage : si le serveur invalide le JWT (rotation de clé, ban, etc.), le frontend réagit sans avoir à reload.

---

## 6. Tests, doc, déploiement

### Tests

Tests unitaires API avec PHPUnit dans `symfony/tests/`. Couverts :
- création d'un user
- login avec bon/mauvais mot de passe
- accès `/api/reservations` sans token (401 attendu)
- réservation OK puis tentative de réservation au même créneau (refusée par le validateur)

Le fichier `symfony/tests/TESTS.md` documente le périmètre.

### Documentation

- Le **README.md** à la racine décrit l'install, les commandes Docker, les comptes seed, les variables d'env.
- API Platform expose **Swagger automatiquement** à `http://localhost:8080/api/docs` — toutes les routes documentées avec leurs schémas, pas besoin de l'écrire à la main.
- Le fichier `symfony/api.rest` est un banc de test HTTP utilisable dans VSCode (extension REST Client) — utile pour reproduire un bug ou tester un endpoint sans passer par le front.

### Déploiement

- `docker-compose.yml` lance la DB.
- Backend : `symfony serve -d`.
- Frontend : `npm run build` produit un bundle statique dans `front-end/dist/` (78 kB gzip), servable par n'importe quel CDN ou Nginx.

---

## 7. Bonus implémentés

Le sujet liste 4 bonus non obligatoires. J'ai tapé dans :

- **Recherche** : barre de recherche full-text côté front sur le catalogue de séances, plus filtres dynamiques (coach, date, places dispo).
- **Gestion avancée des rôles** : modale admin qui permet d'attacher/détacher des rôles à un user via `PATCH /api/users/{id}` avec `userRoles` en IRI. Les rôles sont une vraie entité (`Role`) et non un enum, donc on peut en créer de nouveaux à chaud.
- **JWT exp watcher** + **bouton déconnexion** : pas dans la liste bonus mais c'est un sucre UX qui change la qualité perçue.

Pas implémenté : pagination, CI/CD. La pagination est gérée nativement par API Platform si on l'active dans `#[ApiResource(paginationEnabled: true)]` mais je l'ai laissée off pour simplifier. CI/CD : pas eu le temps en 4 jours.

---

## 8. Choix qui méritent d'être discutés (les compromis)

Pour pas faire passer le projet pour parfait, voilà les zones où j'ai tranché par pragmatisme :

### 8.1 La double entité User / Coach et la "passerelle"

Le point sur lequel j'ai le plus hésité, et que je veux expliquer franchement parce qu'il n'est pas évident à la lecture du code.

**Le contexte.** Le sujet (Dossier 2 — Données métier) liste les entités attendues au minimum :

> · Utilisateur
> · Rôle
> · Coach
> · Séance
> · Réservation

Donc `User` **et** `Coach` sont demandés comme **deux entités distinctes**. C'est le cahier des charges, j'ai pas voulu y déroger.

**Mais ce que j'aurais fait si j'avais eu le choix.** Une seule entité `User` avec un `ROLE_COACH` parmi ses rôles, et un `CoachProfile` (ou des colonnes nullables sur `User`) pour porter les attributs métier du coach (`pricePerHour`, `phone`). Une seule source de vérité pour l'identité, une seule table à interroger pour l'auth, pas de duplication possible. C'est le pattern qu'on rencontre dans 90 % des applis SaaS modernes — l'utilisateur est l'identité, le rôle conditionne l'accès, le profil porte les champs spécifiques.

**Le compromis que j'ai fait.** Comme le sujet impose `Coach` comme entité séparée :

1. J'ai gardé `User` et `Coach` comme deux entités Doctrine indépendantes, chacune avec sa table.
2. J'ai conservé le firewall Lexik branché sur `User` (c'est l'entité la plus naturelle pour porter les rôles via la relation `userRoles`).
3. **Conséquence** : un Coach créé via `POST /api/coaches` n'existe que dans la table `coach`. Lexik, qui regarde uniquement la table `user` au login, ne le trouve pas → coach incapable de se connecter.

**La passerelle.** Pour résoudre le problème sans renier le modèle imposé, j'ai ajouté une logique de synchronisation dans le `PasswordHasherProcessor` : à chaque POST/PATCH d'un `Coach`, le processor crée (ou met à jour) un `User` portant le même email, le même mot de passe, et le rôle `ROLE_COACH`. C'est **une duplication contrôlée**, encapsulée dans un seul endroit (le processor), invisible pour l'admin qui crée un coach via l'interface.

```php
private function syncCoachAsUser(Coach $coach, string $plainPassword): void
{
    $user = $this->userRepository->findOneBy(['email' => $coach->getEmail()]);
    if (!$user) { $user = new User(); /* … */ }
    $user->setPassword($this->passwordHasher->hashPassword($user, $plainPassword));
    $user->addUserRole($this->roleRepository->findOneBy(['name' => 'ROLE_COACH']));
    $this->em->persist($user);
}
```

Côté frontend, comme il n'y a pas de FK `User.coach_id`, j'identifie quel `Coach` correspond à l'utilisateur connecté en faisant un match sur l'email (`coaches.find(c => c.email === auth.user.email)`). C'est imparfait — si un admin change l'email d'un coach sans changer celui de son User miroir, le lien casse — mais le processor maintient le sync à chaque écriture.

**Ce que je referais avec plus de temps.** Soit fusionner les deux modèles (un seul `User`, le rôle `ROLE_COACH` + un `CoachProfile`), soit garder les deux entités mais ajouter une vraie FK `User.coach_id` (nullable, `OneToOne`) avec une cascade propre, plutôt que de me reposer sur un match d'email. La passerelle actuelle est pragmatique pour passer la soutenance, mais elle ne survivra pas au premier vrai produit.

### 8.2 Pas de champs descriptifs sur Coach et Seance

Mes maquettes initiales prévoyaient `discipline`, `bio`, `rating`, `location` sur le coach et `description` sur la séance. J'ai préféré coller strictement aux entités du sujet plutôt que d'ajouter des champs hors périmètre. Conséquence : l'UI est plus austère que mes maquettes Figma, mais 100 % des données affichées viennent de la base — pas de mock résiduel.

### 8.3 N+1 sur l'affichage des coachs dans les séances

Sur la page détail d'une séance, je fais un fetch séparé du coach (`/api/seances/1` puis `/api/coaches/{coachId}`). Ça fait deux round-trips. Idéalement, j'aurais déclaré la relation Doctrine `Seance → Coach` (au lieu d'un simple `coachId` int) et configuré la sérialisation pour embarquer le coach dans la réponse de `/api/seances`. Le sujet a livré l'entité avec un `coachId` int donc je n'ai pas voulu changer la table.

### 8.4 `booked` calculé côté front

Le sujet définit "places restantes" mais l'entité Seance n'a pas de champ `booked`. Je le calcule en faisant un GET `/api/reservations` puis en groupant par seanceId côté front. Pour 14 séances et quelques dizaines de réservations c'est négligeable. À l'échelle d'un vrai produit, j'aurais ajouté un endpoint custom `/api/seances/{id}/availability` ou un compteur dénormalisé.

### 8.5 Hash routing au lieu de history routing

J'utilise des routes en `#/seances/1` plutôt que `/seances/1`. Pour un déploiement statique sans config serveur, le hash routing est zéro-config (pas de fallback `index.html` à câbler côté Nginx). Le compromis : URL moins propre, pas de SSR possible. Vu le scope (SPA pure, pas d'enjeu SEO), ça me va.

### 8.6 Migration CDN → Vite en cours de route

J'ai démarré en CDN + Babel standalone (parce que je voulais itérer vite sur les maquettes sans setup). Quand le projet a passé ~20 fichiers et qu'on a introduit le contexte d'auth, j'ai bouger sur Vite. Le côté positif : ça m'a forcé à passer en ESM strict et à supprimer toutes les pollutions de `window.*`. Le côté négatif : si je refaisais le projet je commencerais direct avec Vite.

---

## 9. Démo type pendant la soutenance

Voici ce que je montrerais en 5 minutes :

1. **Visiteur** : page d'accueil → catalogue séances → tente de réserver → redirigé vers /login
2. **Création de compte** → auto-login → atterrit sur "Mes réservations" (vide)
3. **Réservation** d'une séance → toast de confirmation → apparition dans "Mes réservations"
4. **Désinscription** depuis le détail séance → modale de confirmation → DELETE → disparition
5. **Logout** → vérif localStorage vide
6. **Login admin** → redirige sur `/admin` → onglet "Coachs" → création d'un nouveau coach → check qu'il apparaît au catalogue public
7. **Onglet "Utilisateurs"** → modification du rôle d'un user (lui filer ROLE_COACH) → check qu'il peut maintenant accéder à `/coach`
8. **Réseau onglet** : montrer que chaque requête porte un `Authorization: Bearer eyJ...` en header
9. **Forge un 401** : effacer le token dans le localStorage manuellement → la prochaine requête → toast d'erreur + déco automatique

---

## 10. Ce que j'ai appris

Pour finir sur une note honnête :

- **API Platform 4 est différent d'API Platform 3** sur le format JSON-LD (attribut `member` au lieu de `hydra:member`). J'ai galéré 30 minutes au début à comprendre pourquoi mes collections étaient vides côté front. Mon interceptor axios déballe les deux formats par sécurité.
- **Lexik ne met pas l'id du user dans le JWT par défaut**, juste le `username` (= email). Pour ne pas faire un round-trip `/api/me` au bootstrap, j'ai ajouté un `JWTCreatedSubscriber` qui injecte `id`, `firstName`, `lastName` au moment de la signature. C'est un pattern propre, à généraliser.
- **Le State Processor d'API Platform est plus élégant qu'un EventListener** pour hasher un mot de passe. Ça reste lié à l'opération (POST/PATCH) et on n'a pas à filtrer sur le type d'event manuellement.
- **Vite vs CDN+Babel** : la différence de productivité est énorme passé un certain volume. HMR + ESM > tout le reste.

---

**Contact** · `wedisplay.contact@gmail.com`
