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

La boutique propose maintenant des collections plus distinctes (Prism Shift, Solaris, Gridline, Void, Nova, Magnétisme), des cartes avec rareté, usage et statut d'équipement, ainsi que des packs mieux équilibrés.

Les packs avantageux sont des packs mystère : leur contenu n'est pas affiché avant l'achat. Après l'achat, une ouverture cinématique révèle chaque bonus un par un avant de fermer la fenêtre.

Les bonus disponibles sont plus lisibles et plus stratégiques : Éclateur, Recomposition, Surcharge Pulse, Scanner Tactique et Lame de Ligne. Le Scanner révèle un coup fort ; la Lame ouvre une ligne horizontale ciblée sans modifier le score ni le système de combos. Les anciens inventaires restent compatibles et index.html reste inchangé.


---

## Refonte de la boutique cosmétique (v2)

Problème de départ : les skins ne changeaient pas les pièces (couleurs fixées par forme dans `PIECE_COLORS`), les aperçus étaient 6 carrés colorés ou un symbole texte, et les articles verrouillés étaient grisés.

**Skins = vraies matières de blocs (en jeu ET dans la main)** : Aurora (classique), Ember (lave), Pixel Arcade (8 bits, nouveau), Cobalt (cristal), Lime Shift (gelée), Ultraviolet (néon), Prism Shift (gemme à facettes), Solaris (or brossé rivé). Chaque skin a sa palette de 6 couleurs + un style de bloc en CSS pur (`[data-skin="…"]`, aucun filter ni animation, donc sans coût pendant le drag).

**Plateaux texturés** : Verre fumé, Carbone (tressage), Synthwave (nouveau, soleil couchant), Nébuleuse (étoiles), Gridline (grille néon), Void (vortex). Ils restent translucides pour que les indices de pose (vert/rouge) restent lisibles.

**Aperçu en jeu** : toucher une carte ouvre une fenêtre avec un vrai mini-plateau (ligne qui se dissout + l'impulsion jouée en boucle) et les pièces dans la main, avec le cosmétique appliqué par-dessus l'équipement actuel. Achat/équipement directement depuis cette fenêtre.

**Onglet Thèmes (nouveau, ouvert par défaut)** : 6 collections assorties (skin + plateau + impulsion), −25 % sur ce qu'il reste à acheter, achat et équipement en un tap.

**Conversion** : plus de grisé sur les articles verrouillés, rareté colorée (reflet animé sur les Mythiques), prix visible, barre « il te manque ◆ X ».

Compatibilité : les ids existants sont conservés, les sauvegardes restent valides. Nouveaux ids : `pixel` (skin), `sunset` (plateau). `index.html` : seul ajout, l'onglet « Thèmes ».

Où retoucher : `CATALOG` / `SHOP_META` / `THEMES` (game.js, prix et raretés), blocs `/* 1. STYLES DE BLOCS */` et `/* 2. TEXTURES DE PLATEAU */` (style.css).
