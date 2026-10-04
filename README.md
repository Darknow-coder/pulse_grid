Drag mobile — correctifs v2

1) Placement tolérant
- La position de dépôt est calculée à partir de la position VISUELLE de la pièce (coin haut-gauche du fantôme), arrondie à la case la plus proche.
- Si cette position est invalide, on cherche la meilleure place valide à moins de DRAG_SNAP_RADIUS (1,3 case) et la pièce s'y « colle ».
- La preview et le dépôt utilisent la même fonction : resolveDragPlacement().

2) Preview sans redessiner la grille
- Avant : chaque changement de case modifiait des classes sur 64 cellules (skins/plateaux lourds => repaint du plateau => ghost en retard).
- Maintenant : un petit calque .drag-preview (position: fixed) se déplace avec transform. La grille ne bouge plus pendant le drag.

Réglages en haut de game.js : DRAG_SNAP_RADIUS (tolérance), DRAG_LIFT_PX (pièce au-dessus du doigt, 0 par défaut).
Fichiers modifiés : game.js, style.css. index.html inchangé.
