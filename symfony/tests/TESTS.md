# Tests fonctionnels — Sportify Pro

**43 tests · 86 assertions · suite verte**

```bash
docker exec -e APP_ENV=test shopify_php php bin/phpunit
```

Tous les tests héritent de `AbstractApiTestCase` qui :
- recrée le schéma à chaque test (`SchemaTool::dropSchema` + `createSchema`)
- seed les rôles `ROLE_ADMIN`, `ROLE_CLIENT`, `ROLE_COACH`
- expose `createUser()`, `createSeance()`, `authenticatedClient()`, `login()`
- force `Accept: application/json` (Hydra désactivé)

---

## AuthApiTest — 10 tests

JWT (Lexik) + register via API Platform.

| Test | Vérifie |
|---|---|
| `testRegisterCreatesClientUser` | `POST /api/users` public → 201, password hashé, `ROLE_CLIENT` auto-assigné |
| `testRegisterRejectsDuplicateEmail` | Contrainte `UniqueEntity` sur `User.email` → 422 |
| `testRegisterRejectsInvalidEmail` | `#[Assert\Email]` → 422 |
| `testRegisterRejectsShortPassword` | `#[Assert\Length(min: 6)]` → 422 |
| `testLoginReturnsJwtToken` | `POST /api/login_check` avec creds valides → 200 + token JWT |
| `testLoginAdminReturnsToken` | Login d'un user `ROLE_ADMIN` → 200 + token |
| `testLoginRejectsWrongPassword` | Mauvais mdp → 401 |
| `testLoginRejectsUnknownEmail` | Email inexistant → 401 |
| `testProtectedRouteRejectsRequestWithoutToken` | Route `/api/*` sans Bearer → 401 |
| `testProtectedRouteAcceptsValidToken` | Route `/api/*` avec Bearer valide → 200 |

---

## UserApiTest — 7 tests

CRUD User + matrice de droits (ADMIN vs CLIENT).

| Test | Vérifie |
|---|---|
| `testListUsersRequiresAuth` | `GET /api/users` sans token → 401 |
| `testListUsersAsAdmin` | Admin peut lister tous les users |
| `testListUsersAsClientIsForbidden` | Client → 403 (admin only) |
| `testGetUserById` | Authentifié peut récupérer un user par id |
| `testPatchUser` | `PATCH /api/users/{id}` avec `merge-patch+json` → 200 |
| `testDeleteUserAsAdmin` | Admin peut supprimer un user → 204, vraiment effacé en BDD |
| `testDeleteUserAsClientIsForbidden` | Client → 403 |

---

## CoachApiTest — 6 tests

CRUD Coach. Lecture publique, écriture admin.

| Test | Vérifie |
|---|---|
| `testListCoachesIsPublic` | `GET /api/coaches` sans token → 200 |
| `testCreateCoachRequiresAuth` | `POST` sans token → 401 |
| `testCreateCoachAsAdmin` | Admin → 201, payload renvoyé |
| `testCreateCoachAsClientIsForbidden` | Client → 403 (admin only) |
| `testCreateCoachRejectsDuplicateEmail` | 2ᵉ POST même email → 422 (`UniqueEntity`) |
| `testGetCoachById` | `GET /api/coaches/{id}` public → 200 |

---

## SeanceApiTest — 6 tests

CRUD Séance. Lecture publique, écriture ADMIN ou COACH.

| Test | Vérifie |
|---|---|
| `testListSeancesIsPublic` | `GET /api/seances` sans token → 200 |
| `testCreateSeanceRequiresAuth` | `POST` sans token → 401 |
| `testCreateSeanceAsAdmin` | Admin → 201 |
| `testCreateSeanceAsCoach` | Coach → 201 (matche le sujet : "aux coachs de gérer leur planning") |
| `testCreateSeanceAsClientIsForbidden` | Client → 403 |
| `testGetSeanceById` | `GET /api/seances/{id}` public → 200 |

---

## ReservationApiTest — 10 tests

Cœur de l'éval : règles métier + sécurité par ownership.

### Règles métier (sujet PDF Dossier 1)

| Test | Règle vérifiée |
|---|---|
| `testCreateReservationFailsWhenSeanceFull` | *"Une réservation ne peut être faite que si des places sont disponibles"* + *"max participants"* → 422 |
| `testCreateReservationFailsOnTimeConflict` | *"Un client ne peut pas réserver deux séances au même créneau"* (overlap 09:30 dans 09:00-10:00) → 422 |
| `testCreateReservationSucceedsOnAdjacentSeances` | Borne stricte : 09:00-10:00 puis 10:00-11:00 doit passer (`<` et `>`, pas `≤`/`≥`) → 201 |
| `testTimeConflictRuleIsPerUser` | La règle est par user, pas globale : Paul a une résa, Jean peut quand même réserver le même créneau → 201 |

### Authentification & sécurité

| Test | Vérifie |
|---|---|
| `testListReservationsRequiresAuth` | `GET` sans token → 401 |
| `testListReservationsAsClient` | Client authentifié → 200 |
| `testCreateReservationRequiresAuth` | `POST` sans token → 401 |
| `testCreateReservationAsClient` | Client authentifié + payload IRI valide → 201 |
| `testDeleteReservation` | Le propriétaire peut annuler sa résa → 204 |
| `testDeleteReservationByOtherClientIsForbidden` | Un autre client tente le DELETE → 403 (security expression `object.getUser() == user`) |

---

## RoleApiTest — 4 tests

CRUD Role réservé admin.

| Test | Vérifie |
|---|---|
| `testListRolesRequiresAuth` | Sans token → 401 |
| `testListRolesAsAdmin` | Admin peut lister → 200 |
| `testCreateRole` | Admin peut créer → 201 |
| `testAssignRoleToUserViaPatch` | `PATCH /api/users/{id}` avec `userRoles: ["/api/roles/X"]` → user gagne le rôle |

---

## Couverture par exigence du sujet

| Exigence (PDF) | Couvert par |
|---|---|
| Authentification JWT | `AuthApiTest` (10) |
| CRUD complet | `User`, `Coach`, `Seance`, `Role`, `Reservation` Api Tests |
| "Max participants par séance" | `testCreateReservationFailsWhenSeanceFull` |
| "Pas 2 réservations au même créneau" | `testCreateReservationFailsOnTimeConflict` + 2 edge cases |
| "Places disponibles requises" | `testCreateReservationFailsWhenSeanceFull` |
| "Utilisateurs authentifiés" | `testProtectedRouteRejectsRequestWithoutToken` + tous les `*RequiresAuth` |
| Gestion des accès (ADMIN/COACH/CLIENT) | Tous les `*AsAdmin`, `*AsCoach`, `*IsForbidden` |
