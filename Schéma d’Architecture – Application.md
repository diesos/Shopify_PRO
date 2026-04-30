# 🏗️ Schéma d’Architecture – Application Sportify Pro (3-Tiers)

## 📌 Vue d’ensemble

L’application repose sur une architecture **3 tiers** permettant une séparation claire des responsabilités :

* **Frontend (Présentation)**
* **Backend API (Logique métier)**
* **Base de données (Persistance)**

---

## 🧱 Architecture globale

```
[ Navigateur / Frontend ]
            │
            │ HTTP (JSON / REST)
            ▼
[ API Backend - Symfony + API Platform ]
            │
            │ Doctrine ORM
            ▼
[ Base de données relationnelle (MySQL/PostgreSQL) ]
```

---

## 🎨 1. Couche Présentation (Frontend)

### 📌 Rôle

Interface utilisateur accessible via navigateur.

### ⚙️ Technologies possibles

* HTML / CSS / JavaScript
* React (optionnel)
* Vue.js (optionnel)

### 🔑 Responsabilités

* Authentification (formulaire login/register)
* Affichage des séances
* Réservation / annulation
* Appels API (fetch / axios)

---

## ⚙️ 2. Couche Backend (API)

### 📌 Rôle

Exposition des services via API REST sécurisée.

### ⚙️ Technologies

* PHP 8.x
* Symfony
* API Platform
* JWT (authentification)

### 🔑 Responsabilités

* Gestion des routes API (`/api/...`)
* Authentification (JWT)
* Logique métier :

  * Vérification capacité séance
  * Gestion conflits horaires
* Gestion des rôles (ADMIN, COACH, CLIENT)
* Validation des données

---

## 🗄️ 3. Couche Données (Database)

### 📌 Rôle

Stockage persistant des données.

### ⚙️ Technologies

* MySQL ou PostgreSQL
* Doctrine ORM

### 🔑 Entités principales

* Utilisateur
* Rôle
* Coach
* Séance
* Réservation

### 🔒 Contraintes

* Intégrité référentielle (FK)
* Email unique
* Relations normalisées

---

## 🔐 Sécurité

* Authentification via JWT
* Accès protégé par rôles :

  * ADMIN
  * COACH
  * CLIENT
* Vérification des permissions côté backend

---

## 🔄 Flux de données (exemple réservation)

1. Le client envoie une requête POST `/api/reservations`
2. L’API vérifie :

   * Authentification (JWT)
   * Places disponibles
   * Conflit horaire
3. Si OK :

   * Enregistrement en base
4. Réponse JSON au frontend

---

## 🐳 Déploiement (Docker recommandé)

### Services :

* `nginx` ou `apache`
* `php` (Symfony)
* `database` (MySQL/PostgreSQL)

### Avantages :

* Environnement reproductible
* Isolation des services
* Facilité de déploiement

---

## 📦 Organisation du projet (backend)

```
/src
  /Entity
  /Repository
  /Controller
  /Security
/config
/migrations
/tests
```

---

## ✅ Bonnes pratiques respectées

* Séparation des responsabilités
* API REST stateless
* Architecture scalable
* Code maintenable
* Sécurité intégrée

---

## 🚀 Conclusion

Cette architecture 3-tiers permet :

* Une application **modulaire**
* Une **évolutivité** facilitée
* Une **sécurité renforcée**
* Une **maintenabilité optimale**

Elle répond parfaitement aux exigences du projet CDA.
