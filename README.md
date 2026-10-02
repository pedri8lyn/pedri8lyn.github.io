# pedri8lyn_ — site des edits Pedri

Site : https://pedri8lyn.github.io

- **TikTok** : les vidéos se mettent à jour toutes seules toutes les 4 heures (`.github/workflows/update-feed.yml` lance `scripts/update_tiktok.py`, qui écrit `data/tiktok.json` et télécharge les miniatures dans `assets/covers/`). On peut aussi lancer la mise à jour à la main depuis l'onglet **Actions** du dépôt → « Mise à jour des vidéos TikTok » → **Run workflow**.
- **Instagram** : Instagram bloque la récupération automatique. Colle les liens des reels dans `data/instagram.json` (champ `posts`, le plus récent en premier). Chaque reel est intégré directement sur le site.

Tester en local : `python3 -m http.server` puis ouvrir http://localhost:8000.

Photo de Pedri : Bryan Berlin, CC BY-SA 4.0, via Wikimedia Commons (détourée).
