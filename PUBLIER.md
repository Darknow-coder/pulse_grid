# Publier Pulse Grid comme vrai jeu mobile

Le jeu est une **PWA** : installable, plein écran, 100 % jouable hors ligne (service worker), icônes incluses.

## 1. Mettre en ligne (obligatoire : HTTPS)
Envoie **tous** les fichiers du dossier (index.html, style.css, game.js, sw.js, manifest.webmanifest, dossier icons/) sur un hébergement statique HTTPS :
Netlify (glisser-déposer le dossier), Cloudflare Pages, GitHub Pages ou Vercel — tous gratuits.
Le service worker ne fonctionne qu'en HTTPS (ou sur localhost).

## 2. Installer sur téléphone
- **Android (Chrome)** : bouton « Installer l'application » dans Paramètres (ou menu ⋮).
- **iPhone (Safari)** : Partager → « Sur l'écran d'accueil ».

## 3. Mises à jour
À chaque modification, change `VERSION` en haut de `sw.js` (ex. `pulse-grid-5.0.1`). Les joueurs reçoivent la nouvelle version au lancement suivant.

## 4. Play Store / App Store (optionnel)
- **Google Play** : https://www.pwabuilder.com — entre l'URL de ton jeu, génère le paquet Android (TWA), puis publie via la Play Console (25 $ une fois).
- **App Store / les deux** : encapsule avec **Capacitor** (`npm i @capacitor/core @capacitor/cli`, `npx cap init`, copie les fichiers dans `www/`, `npx cap add ios android`). Compte Apple Developer : 99 $/an.
- Prépare : politique de confidentialité (le jeu ne collecte aucune donnée, tout reste dans le stockage local), captures d'écran, description.

## 5. Sauvegarde
Les données sont dans le stockage local de l'appareil. Paramètres → Exporter permet de les sauvegarder / transférer.
