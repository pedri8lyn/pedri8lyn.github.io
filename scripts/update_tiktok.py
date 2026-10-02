"""Récupère les dernières vidéos TikTok de @pedri8lyn_ et écrit data/tiktok.json.

Les miniatures TikTok sont des liens signés qui expirent : on les télécharge dans assets/covers/.
Lancé automatiquement par .github/workflows/update-feed.yml (et à la main : python scripts/update_tiktok.py).
"""
import json
import pathlib
import sys
import urllib.request

import yt_dlp

USER = "pedri8lyn_"
LIMIT = 24
ROOT = pathlib.Path(__file__).resolve().parent.parent
COVERS = ROOT / "assets" / "covers"
OUT = ROOT / "data" / "tiktok.json"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36"


def fetch_entries():
    opts = {"extract_flat": True, "playlistend": LIMIT, "quiet": True, "skip_download": True}
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(f"https://www.tiktok.com/@{USER}", download=False)
    return [e for e in info.get("entries") or [] if e and e.get("id")]


def download_cover(entry):
    path = COVERS / f"{entry['id']}.jpg"
    if path.exists():
        return path
    thumbs = entry.get("thumbnails") or []
    url = next((t["url"] for t in thumbs if t.get("id") == "cover"), thumbs[0]["url"] if thumbs else None)
    if not url:
        return None
    try:
        req = urllib.request.Request(url, headers={"User-Agent": UA, "Referer": "https://www.tiktok.com/"})
        with urllib.request.urlopen(req, timeout=20) as r:
            path.write_bytes(r.read())
        return path
    except Exception as exc:  # une miniature manquante ne doit pas bloquer la mise à jour
        print(f"cover {entry['id']}: {exc}", file=sys.stderr)
        return None


def main():
    entries = fetch_entries()
    if not entries:
        sys.exit("Aucune vidéo récupérée — on garde l'ancien fichier.")

    COVERS.mkdir(parents=True, exist_ok=True)
    OUT.parent.mkdir(parents=True, exist_ok=True)

    videos = []
    for e in entries:
        cover = download_cover(e)
        videos.append({
            "id": e["id"],
            "url": e.get("webpage_url") or f"https://www.tiktok.com/@{USER}/video/{e['id']}",
            "description": e.get("description") or e.get("title") or "",
            "timestamp": e.get("timestamp"),
            "duration": e.get("duration"),
            "views": e.get("view_count") or 0,
            "likes": e.get("like_count") or 0,
            "comments": e.get("comment_count") or 0,
            "cover": f"assets/covers/{cover.name}" if cover else None,
        })

    keep = {f"{v['id']}.jpg" for v in videos}
    for f in COVERS.glob("*.jpg"):
        if f.name not in keep:
            f.unlink()

    data = {"user": USER, "name": entries[0].get("channel") or USER, "videos": videos}
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n")
    print(f"{len(videos)} vidéos écrites dans {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
