# BUDGET

Petite app web (PWA) pour gérer un budget de vacances : on fixe un budget, on
ajoute ses dépenses, et on voit en temps réel ce qu'il reste. Installable sur
l'écran d'accueil iPhone, fonctionne 100 % hors-ligne, données conservées sur
l'appareil (localStorage).

## Mettre en ligne sur GitHub Pages

1. Créer un dépôt **public** nommé `budget` sur github.com.
2. Y déposer tous les fichiers de ce dossier (`index.html`, `styles.css`,
   `app.js`, `sw.js`, `manifest.json`, les `.png`, `.nojekyll` et le dossier
   `.github/`).
3. Dans **Settings → Pages → Build and deployment → Source**, choisir
   **GitHub Actions**.
4. À chaque `push` (ou upload) sur `main`, l'app se redéploie automatiquement sur :
   `https://sandrodelamasure-bit.github.io/budget/`

## Installer sur iPhone

1. Ouvrir le lien ci-dessus dans **Safari**.
2. Bouton **Partager** → **Sur l'écran d'accueil** → **Ajouter**.
3. L'icône BUDGET apparaît ; l'app s'ouvre en plein écran, sans barre Safari,
   et marche ensuite sans connexion.

## Technique

- HTML/CSS/JS vanilla, aucune dépendance, aucun build.
- Service worker (`sw.js`) pour le mode hors-ligne.
- Toutes les données restent sur le téléphone (rien n'est envoyé sur internet).
