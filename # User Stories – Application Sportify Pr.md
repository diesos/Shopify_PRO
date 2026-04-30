# User Stories – Application Sportify Pro

## 👤 CLIENT

### 🔐 Authentification

**US-C1 – Création de compte**
En tant que client, je veux créer un compte afin d’accéder à l’application.

**Critères d’acceptation :**

* Email unique obligatoire
* Mot de passe sécurisé (minimum 6 caractères)
* Rôle = CLIENT par défaut
* Message d’erreur si email déjà utilisé

---

**US-C2 – Connexion**
En tant que client, je veux me connecter afin d’accéder à mes fonctionnalités.

**Critères :**

* Retourne un token JWT
* Refus si identifiants invalides

---

### 📅 Séances

**US-C3 – Consulter les séances**
En tant que client, je veux voir les séances disponibles afin de choisir.

**Critères :**

* Liste paginée (bonus)
* Affiche : date, coach, places restantes

---

**US-C4 – Réserver une séance**
En tant que client, je veux réserver une séance afin d’y participer.

**Critères :**

* Refus si séance complète
* Refus si conflit horaire
* Réservation liée au client connecté

---

**US-C5 – Annuler une réservation**
En tant que client, je veux annuler ma réservation.

**Critères :**

* Seulement ses propres réservations
* Libère une place

---

## 🏋️ COACH

### 📆 Planning

**US-CO1 – Consulter son planning**
En tant que coach, je veux voir mes séances.

**Critères :**

* Filtré par coach connecté
* Trié par date

---

**US-CO2 – Créer une séance**
En tant que coach, je veux créer une séance.

**Critères :**

* Date obligatoire
* Capacité maximale obligatoire
* Assignée au coach connecté

---

**US-CO3 – Voir les participants**
En tant que coach, je veux voir les clients inscrits.

**Critères :**

* Liste des utilisateurs
* Liée à une séance

---

## 🛠️ ADMIN

### 👥 Utilisateurs

**US-A1 – Lister les utilisateurs**
En tant qu’administrateur, je veux voir tous les utilisateurs.

---

**US-A2 – Modifier un utilisateur**
En tant qu’administrateur, je veux modifier un utilisateur.

**Critères :**

* Modifier le rôle (CLIENT / COACH / ADMIN)

---

**US-A3 – Supprimer un utilisateur**
En tant qu’administrateur, je veux supprimer un utilisateur.

---

### 📊 Supervision

**US-A4 – Voir toutes les séances**
En tant qu’administrateur, je veux superviser les séances.

---

**US-A5 – Supprimer une séance**
En tant qu’administrateur, je veux supprimer une séance.

---

## ⚙️ RÈGLES MÉTIER

### 🔒 Authentification

* Toute action protégée nécessite un JWT valide

---

### 📅 Réservation

**US-R1 – Limite de capacité**

* Une séance ne peut pas dépasser son nombre maximum de participants

**US-R2 – Conflit horaire**

* Un client ne peut pas réserver deux séances au même créneau

**US-R3 – Disponibilité**

* Impossible de réserver une séance complète
