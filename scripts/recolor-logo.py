"""Recolor transparent logo to Seră greens (#1f5136 / #6e9f62 / #e7f0e4)."""
from PIL import Image
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = os.path.join(ROOT, "public", "logo-jardin.png")
img = Image.open(src).convert("RGBA")
pixels = img.load()
w, h = img.size

# Target palette (approx luminance → color)
PRIMARY = (31, 81, 54)      # --sera-primary
LEAF = (110, 159, 98)       # --sera-leaf
MINT = (231, 240, 228)      # --sera-mint
BANNER = (214, 230, 210)    # soft fill for the bar

for y in range(h):
    for x in range(w):
        r, g, b, a = pixels[x, y]
        if a < 8:
            continue
        # perceived luminance
        lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255.0
        sat = (max(r, g, b) - min(r, g, b)) / 255.0

        # Very light fills (banner / soft areas)
        if lum > 0.82:
            tr, tg, tb = BANNER
        # Mid sage lines / floristeria arc
        elif lum > 0.55:
            # blend leaf → primary by how dark
            t = (0.82 - lum) / 0.27
            tr = int(LEAF[0] + (PRIMARY[0] - LEAF[0]) * t)
            tg = int(LEAF[1] + (PRIMARY[1] - LEAF[1]) * t)
            tb = int(LEAF[2] + (PRIMARY[2] - LEAF[2]) * t)
        # Dark text / strokes
        else:
            tr, tg, tb = PRIMARY
            # slightly soften very dark pixels toward leaf for line art
            if sat < 0.12 and lum > 0.35:
                tr, tg, tb = LEAF

        # Keep original alpha (edges)
        pixels[x, y] = (tr, tg, tb, a)

img.save(src, "PNG")
print("recolored", src, img.size)

# refresh icon crop
fw, fh = img.size
side = min(fw, fh)
left = (fw - side) // 2
top = max(0, (fh - side) // 2 - side // 10)
icon = img.crop((left, top, left + side, top + side)).resize(
    (192, 192), Image.Resampling.LANCZOS
)
icon_path = os.path.join(ROOT, "public", "logo-jardin-icon.png")
icon.save(icon_path, "PNG")
print("icon", icon_path)
