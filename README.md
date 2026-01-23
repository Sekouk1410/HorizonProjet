# HorizonProjet

Application Angular 21 de gestion de projets avec tâches (Kanban), jalons et vue Gantt.

## Prérequis
- Node.js 18+ et npm
- Angular CLI 21 global (optionnel): `npm i -g @angular/cli`

## Installation

npm install


## Configuration
- Firebase Auth: les identifiants sont attendus dans `src/app/shared/firebase-config.ts` (déjà référencé par le code). Renseignez vos clés si nécessaire.
- Environnements: vérifiez `src/environments/environment*.ts` (URLs d’API, flags prod).

## Lancer en local
npm run api pour lancer le serveur json-server
ng serve pour lancer le serveur angular

Ouvrez http://localhost:4200

## Fonctionnalités principales

### Authentification
- Connexion / Inscription via Firebase Auth.

### Projets
- Détails d’un projet: description, dates, statut, membres, statistiques.
- Gestion des membres: ajout/retrait; le manager est le créateur du projet.

### Tâches (Kanban)
- Colonnes: À faire, En progression, Terminées (drag & drop entre colonnes).
- Priorité: Basse, Moyenne, Haute.
- Tri dans “À faire” et “En progression”: priorité (Haute → Basse).
- Création/édition:
  - Assignation obligatoire à un membre du projet; si aucun membre, le bouton “Enregistrer” est désactivé.
  - La liste des assignés ne montre que les membres du projet.

### Jalons
- Liste des jalons avec statut (terminé/à faire).
- Ajout d’un jalon avec date non passée.

### Vue Gantt
- Basée sur `vis-timeline`.
- Affiche: tâches (barres) et jalons (points) avec légende et marqueur.
- Zoom/pan: boutons Jour/Semaine/Mois.
- Export PDF.


