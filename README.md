Optimisation du drag sur téléphones modestes (testé pour : Samsung A05s)

Cause trouvée : ce n'était pas la logique du drag, mais le coût de rendu autour du ghost.
- Le plateau avait un filter: drop-shadow() : flou GPU recalculé à chaque frame -> remplacé par un box-shadow statique (même rendu).
- Les cellules rejouaient des transitions (background, box-shadow) à chaque changement de case pendant le drag.
- Des animations en boucle tournaient pendant le drag (pièce sélectionnée, charge Pulse prête).
- Le fond avait un filter: blur(2px) permanent ; .screen gardait un transform permanent (animation "both").
- À la prise de pièce : création de l'AudioContext, vibration et son retardaient la première frame.

Changements
- style.css : drop-shadow -> box-shadow ; classe html.is-dragging qui coupe transitions et animations en boucle pendant le drag ; blur(2px) retiré ; screen-in en "backwards".
- game.js : setDragMode() (classe is-dragging) ; pointermove par défaut (au lieu de pointerrawupdate) ; vibration + son après la 1re frame ; AudioContext réveillé à la 1re interaction ; canvas du ghost mis en cache, sans desynchronized.
- Deux réglages en haut de game.js : DRAG_USE_RAW_UPDATES (false) et DRAG_USE_PREDICTION (false) pour tester sur téléphone.

Gameplay, formes, score et autres fonctionnalités inchangés. index.html inchangé.
