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
- Plateau plus contrasté et fragments avec une palette de couleurs variée.
- Début de partie guidé par des fragments simples avant de revenir à la génération pondérée.
- Charge Pulse progressive : une surcharge déclenche une Pulse Burst avec bonus de score et de particules.
- Prévisualisation des cases proches d'une ligne complète et placement tactile centré plus naturel.
- Génération pondérée et consciente de la grille : opportunités de lignes proches favorisées, hasard conservé et fragments impossibles écartés autant que possible.
- Nouvelles formes occasionnelles 2 × 3 et 3 × 3, utiles pour les gros nettoyages mais risquées dans les espaces serrés.
- Drag-and-drop optimisé avec métriques de plateau mises en cache et calculs de déplacement regroupés par `requestAnimationFrame`.
- Placement logique immédiat : la pièce suivante est disponible sans attendre la fin des effets de destruction.
- Hiérarchie de vibrations et d'impacts courts pour la prise, le placement, les lignes, les multi-lignes, les combos et les records.
- Scoring renforcé pour les gros fragments, les multi-lignes et les combos.
- Particules volontairement limitées pour préserver la fluidité sur les téléphones Android moyens.
- Fin de partie, meilleur score et bouton rejouer.
- Niveau, XP, récompense de niveau et statistiques cumulées.
- Route de progression verticale avec milestones, récompenses récupérables et déblocages reliés à la collection.
- PulseCoins gagnés en fin de partie et via les missions.
- Boutique virtuelle avec skins de fragments, plateaux, effets de destruction et bonus consommables.
- Packs de bonus achetables avec des PulseCoins.
- Bonus utilisables en partie : Marteau, Recomposition et Noyau Pulse.
- Inventaire de bonus sauvegardé localement.
- Atelier pour équiper les éléments débloqués.
- Missions quotidiennes renouvelées selon la date locale.
- Sauvegarde automatique avec `localStorage`.
- Feedback audio court par action, vibration mobile facultative, réglages effets/musique/volume sauvegardés localement.
- Feedback visuel animé pour les gros coups, avec messages gradués et voix.

## Prochaines améliorations utiles

1. Ajouter plusieurs modes de jeu (zen, chrono, défis à obstacles).
2. Ajouter une vraie rotation ou une mécanique spéciale de fragment.
3. Ajouter un écran de réglages, des sons plus riches et une musique optionnelle.
4. Transformer le projet en PWA installable avec manifeste et cache hors-ligne.
5. Ajouter un tutoriel de première ouverture et des tests sur plusieurs téléphones.
