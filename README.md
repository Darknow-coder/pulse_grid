Version : pseudo obligatoire + drag v2

1) Pseudo obligatoire
- Tant qu'aucun pseudo n'est enregistré, la fenêtre "Choisis ton pseudo" s'affiche à chaque lancement (≈1 s après le chargement).
- Elle ne se ferme pas sans valider : pas de bouton "plus tard", clic à côté, touche Échap et bouton retour Android sont ignorés (state.mandatoryModal).
- Si une autre fenêtre est ouverte ou si une partie est en cours, elle attend et réessaie toutes les 2,5 s.
- Règles du pseudo : 3 à 16 caractères, sans < > & " ' ` \. Le pseudo reste modifiable dans l'écran Classement.
- À la validation, la ligne du joueur est créée sur le serveur : le record de la première partie compte.

2) Drag v2 (réappliqué)
- Placement tolérant : DRAG_SNAP_RADIUS (1,3 case) ; la preview et le dépôt utilisent la même fonction resolveDragPlacement().
- Preview en calque séparé (.drag-preview) : la grille n'est plus redessinée pendant le drag.
- DRAG_LIFT_PX (0 par défaut) : décale la pièce au-dessus du doigt.

Fichiers modifiés : game.js, style.css. index.html inchangé.
