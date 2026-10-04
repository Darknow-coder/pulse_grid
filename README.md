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


---

## Mode SHAPES (v3)

Deux modes : **CLASSIC** (inchangé : 8×8, mêmes règles/score/pièces) et **SHAPES** (plateaux qui changent de géométrie : Carré → Rectangle → Triangle → Losange → Cercle).

**Architecture** (game.js, bloc « SHAPES ») : un plateau = un objet de `SHAPE_BOARDS` (rows, cols, `cell(r,c)` = quelles cases existent, `lines` = ce qui remplace la « ligne complète » : rows / cols / diag / anti / custom avec `min`, `weight`, `special`, `pool` = pièces et poids, `starter`, `mastery`, `reward`). `buildGeometry()` en déduit masque, lignes et index case→lignes ; `geo` est la géométrie active (Classic = 8×8, 16 lignes). Les cases hors forme n'existent pas pour le moteur (`canPlace`, génération, indices, fin de partie). Le DOM garde une grille rectangulaire (cases `void` invisibles) : **le drag n'a pas été modifié**.

**Ajouter une forme** : ajouter un objet dans `SHAPE_BOARDS` (+ éventuellement des pièces dans `EXTRA_SHAPES` / `PIECE_COLORS`). Écrans, déblocage et sauvegarde s'adaptent seuls.

**Progression** : un plateau est maîtrisé (100 %) quand ses objectifs sont remplis : lignes cumulées, meilleur combo, score en une partie, + un objectif propre à la forme (lignes longues, diagonales, bords du losange, noyau/anneau). Maîtriser un plateau donne pièces + XP et débloque le suivant (transition animée).

**Sauvegarde** : `profile.shapes` (séparé de `profile.best` / `profile.stats`). Anciennes sauvegardes : valeurs par défaut créées automatiquement. Les missions, XP, monnaie et inventaire restent communs.

Fichiers modifiés : game.js, style.css, index.html (carte SHAPES, HUD, écran Shapes).


---

## v4 — thème clair, audio, nouveautés

- **Thème clair** (défaut) : fonds éclaircis (bleu ardoise), plateau Nuit profonde éclairci, cartes et modales plus lumineuses. Bouton **FOND** (accueil) pour revenir à l'ancien thème sombre (`html[data-ui="dark"]`). Bloc « THÈME CLAIR » en fin de style.css.
- **Audio refait** : enveloppes douces, timbres de cloche, réverbération générée, compresseur anti-saturation, panoramique stéréo, plafond de voix (36). Gammes pentatoniques (arpèges montants selon le nombre de lignes, combos qui montent). Nouveau son d'erreur pour une pose refusée. Les sons sont planifiés sur l'horloge audio (plus de setTimeout).
- **Musique d'ambiance générative** (le bouton Musique est enfin actif) : nappes + notes pentatoniques, sans fichier audio. Coupée pendant un drag et quand l'onglet est caché. Le volume règle effets et musique.
- **Reprendre la partie** : la partie en cours est sauvegardée à chaque coup (Classic ou Shapes) ; bouton « Reprendre » sur l'accueil.
- **Bonus quotidien** : série de connexion (30 → 160 ◆ sur 7 jours).
- **Plateau vide** : +500 points bonus quand le plateau est entièrement vidé.
- **Réglage Vibration** ON/OFF.
- Anciennes sauvegardes compatibles (ui, haptics, daily, run créés par défaut).


---

## v4.1 — Paramètres

Nouvel écran **Paramètres** (roue ⚙ en haut de l'accueil) :
- **Audio** : effets, musique, volume, bouton « Tester le son » (les réglages audio de l'accueil y ont été déplacés ; les icônes rapides du haut restent).
- **Affichage** : fond clair/sombre, *réduire les animations* (`html[data-motion="reduced"]`), astuce en jeu on/off.
- **Jeu** : vibrations.
- **Sauvegarde & données** : exporter (fichier .json), copier dans le presse-papiers, importer (validation + valeurs par défaut pour les champs manquants ; une sauvegarde invalide ne change rien).
- **Réinitialisation** avec confirmation : Classic seul, Shapes seul, ou tout.
Nouveaux champs de sauvegarde : `reduceMotion`, `showTip` (défauts créés automatiquement).


---

## v5.0 — Vrai jeu mobile

- **PWA installable** : `manifest.webmanifest`, `sw.js` (hors-ligne, mises à jour silencieuses), icônes (`icons/`), balises iOS/Android. Bouton « Installer l'application » dans les Paramètres. Voir `PUBLIER.md`.
- **Comportements d'app** : pause automatique en arrière-plan, écran maintenu allumé en partie, bouton retour Android géré (ferme / pause / remonte sans quitter), pas de zoom ni de menu contextuel, zones sûres (encoche).
- **Tutoriel** au premier lancement (4 écrans, rejouable depuis les Paramètres).
- **23 trophées** avec récompenses en pièces automatiques, écran Trophées, compteur sur l'accueil.
- **Partage du score** (feuille de partage native, sinon copie).
- Anciennes sauvegardes compatibles : `tutorialDone`, `achievements`, `perfectClears` créés par défaut ; un joueur existant ne revoit pas le tutoriel.


---

## v5.1 — Finitions

- Jeu d'icônes SVG cohérent (sprite en tête de `index.html`, classe `.ico`) à la place des emojis et glyphes ; plus aucun emoji dans l'interface.
- Textes d'interface plus sobres (titres et sous-titres neutres, moins de ton publicitaire).
- Écran « Confidentialité et crédits » + `privacy.html` (URL exigée par les stores).
- Garde-fous : une erreur isolée affiche un message discret au lieu de figer l'écran ; l'écran de chargement se retire seul au bout de 6 s.
- Le réglage système « réduire les animations » est respecté ; focus clavier visible ; cibles tactiles ≥ 44 px ; chiffres tabulaires.
- Service worker en `pulse-grid-5.1.0` (inclut `privacy.html`).


---

## v5.2 — Corrections et confort de jeu

- **Correction** : les sons de la cinématique d'ouverture des packs (`playTone`) avaient été perdus lors de la refonte audio ; ils sont restaurés.
- **Continuer après blocage** : quand plus aucun fragment ne rentre, une offre propose de continuer pour 150 PulseCoins (une fois par partie, à partir du 6e coup). Environ 20 % des cases sont libérées (lignes les plus remplies), de nouveaux fragments sont donnés, score et progression conservés. Fermer l'offre sans choisir termine la partie. Coût : `REVIVE_COST` dans game.js.
- **Équilibrage du losange** (simulations par bot) : pièces plus petites, lignes de 3 cases ou plus, objectif de maîtrise réduit (40 lignes, score 2 600). Il ne bloque plus brutalement après le triangle.
- Service worker en `pulse-grid-5.2.0`.
