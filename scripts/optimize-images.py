"""
Optimise the game's public images: convert used PNG/JFIF art to right-sized WebP, update code references,
and move unused / raw / duplicate source art out of public/ (into art-source/, still in the repo).

Run from the project root:  python -I scripts/optimize-images.py
Re-runnable: already-converted files are skipped.
"""
import pathlib
import re
import shutil

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
SRC = ROOT / "src"
ARCHIVE = ROOT / "art-source"

# (path prefix, max width, max height) — the largest size the art is ever shown at, ×2 for retina.
LIMITS = [
    ("board/ingame_bg_2d", 1920, 1920),
    ("lobby/", 1920, 1920),
    ("board/", 1400, 1400),
    ("sprites/board_centerpiece", 1400, 1400),
    ("sprites/icons_chibi_sheet", 1024, 512),
    ("ui/hud_player_cards", 1200, 1200),
    ("ui/card_", 1100, 1100),
    ("ui/hud_card_", 520, 520),
    ("ui/", 600, 600),
    ("pawns/", 320, 320),
    ("icons/", 256, 256),
    ("buildings/", 256, 256),
]
KEEP_AS_IS = {"favicon-32.png", "apple-touch-icon.png", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "og-image.png"}
IMAGE_EXT = {".png", ".jpg", ".jpeg", ".jfif"}


def code_files():
    for p in list(SRC.rglob("*")) + [ROOT / "index.html"]:
        if p.is_file() and p.suffix in {".ts", ".tsx", ".css", ".html"}:
            yield p


def all_code() -> str:
    return "\n".join(p.read_text(encoding="utf-8", errors="ignore") for p in code_files())


def limit_for(rel: str):
    for prefix, w, h in LIMITS:
        if rel.startswith(prefix):
            return w, h
    return 1600, 1600


def main():
    code = all_code()
    converted, archived = [], []
    for img in sorted(PUBLIC.rglob("*")):
        if not img.is_file() or img.suffix.lower() not in IMAGE_EXT or img.name in KEEP_AS_IS:
            continue
        rel = img.relative_to(PUBLIC).as_posix()
        used = f"/{rel}" in code or f"public/{rel}" in code
        if not used:
            dest = ARCHIVE / rel
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(img), dest)
            archived.append(rel)
            continue
        out = img.with_suffix(".webp")
        im = Image.open(img)
        im = im.convert("RGBA") if im.mode in ("RGBA", "LA", "P") else im.convert("RGB")
        max_w, max_h = limit_for(rel)
        im.thumbnail((max_w, max_h), Image.LANCZOS)
        im.save(out, "WEBP", quality=80, method=6)
        before, after = img.stat().st_size, out.stat().st_size
        dest = ARCHIVE / "originals" / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(img), dest)
        converted.append((rel, before, after))

    # Point the code at the WebP files.
    for p in code_files():
        s = p.read_text(encoding="utf-8")
        new = s
        for rel, _, _ in converted:
            webp = re.sub(r"\.(png|jpe?g|jfif)$", ".webp", rel, flags=re.I)
            new = new.replace(f"/{rel}", f"/{webp}")
        if new != s:
            p.write_text(new, encoding="utf-8")

    tb = sum(b for _, b, _ in converted)
    ta = sum(a for _, _, a in converted)
    for rel, b, a in converted:
        print(f"webp  {b/1024:7.0f} KB -> {a/1024:6.0f} KB  {rel}")
    for rel in archived:
        print(f"moved to art-source/  {rel}")
    print(f"\nConverted {len(converted)} images: {tb/1048576:.1f} MB -> {ta/1048576:.2f} MB; archived {len(archived)} unused files.")


if __name__ == "__main__":
    main()
