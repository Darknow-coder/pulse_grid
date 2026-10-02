Optimisation mobile du drag

- Le ghost de déplacement est maintenant un canvas unique, dessiné une seule fois au début du drag.
- Le mouvement utilise uniquement transform: translate3d() et will-change: transform.
- pointermove/pointerrawupdate effectue une seule mise à jour visuelle avec le dernier événement coalescé disponible.
- La preview de grille reste séparée et ne bloque pas le mouvement du ghost.
- Aucun smoothing/interpolation n'est ajouté.

Fichiers modifiés : game(20261002-215407).js et style(20261002-215407).css.
index HTML inchangé.
