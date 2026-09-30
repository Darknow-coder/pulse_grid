# Pulse Grid

Première version jouable d'un puzzle mobile casual en HTML, CSS et JavaScript, sans dépendance externe.

## Fichiers

- `index.html` : structure des écrans et de l'interface.
- `style.css` : direction artistique mobile, responsive et animations.
- `game.js` : gameplay, progression, boutique, missions et sauvegarde.

## Lancer le jeu

Le jeu ne nécessite aucune installation. Double-clique sur `index.html` pour l'ouvrir dans un navigateur moderne.

Pour un aperçu plus proche d'un vrai déploiement mobile, tu peux aussi lancer un serveur local très simple depuis ce dossier :

```bash
python3 -m http.server 8000
```

Puis ouvre `http://localhost:8000` sur l'ordinateur, ou l'adresse IP locale depuis ton téléphone connecté au même Wi-Fi.

## Fonctionnalités incluses

- Grille 8 × 8 et fragments de formes variées.
- Placement par glisser-déposer tactile ou par sélection puis toucher de la grille.
- Suppression des lignes et colonnes, score, combos, animations, particules et vibration quand disponible.
- Charge Pulse progressive : une surcharge déclenche une Pulse Burst avec bonus de score et de particules.
- Prévisualisation des cases proches d'une ligne complète et placement tactile centré plus naturel.
- Génération pondérée des fragments pour limiter les situations injustes.
- Fin de partie, meilleur score et bouton rejouer.
- Niveau, XP, récompense de niveau et statistiques cumulées.
- PulseCoins gagnés en fin de partie et via les missions.
- Boutique virtuelle avec skins de fragments, plateaux et effets de destruction.
- Atelier pour équiper les éléments débloqués.
- Missions quotidiennes renouvelées selon la date locale.
- Sauvegarde automatique avec `localStorage`.
- Feedback audio léger, désactivable depuis l'accueil.

## Prochaines améliorations utiles

1. Ajouter plusieurs modes de jeu (zen, chrono, défis à obstacles).
2. Ajouter une vraie rotation ou une mécanique spéciale de fragment.
3. Ajouter un écran de réglages, des sons plus riches et une musique optionnelle.
4. Transformer le projet en PWA installable avec manifeste et cache hors-ligne.
5. Ajouter un tutoriel de première ouverture et des tests sur plusieurs téléphones.
