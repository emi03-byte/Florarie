from PIL import Image
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = os.path.join(
    os.path.expanduser("~"),
    ".cursor",
    "projects",
    "c-Users-carun-Desktop-FLORARIE",
    "assets",
    "WhatsApp_Image_2026-10-22_at_22.55.48-2367a33e-f6d2-4281-ae4a-a3ccc5a25a3f.jpg",
)
if not os.path.isfile(src):
    src = os.path.join(ROOT, "public", "logo-source.jpg")

img = Image.open(src).convert("RGBA")
pixels = img.load()
w, h = img.size

for y in range(h):
    for x in range(w):
        r, g, b, a = pixels[x, y]
        mx, mn = max(r, g, b), min(r, g, b)
        if r > 235 and g > 235 and b > 235:
            pixels[x, y] = (r, g, b, 0)
        elif r > 215 and g > 215 and b > 215 and (mx - mn) < 22:
            brightness = (r + g + b) / 3
            alpha = int(max(0, min(255, (248 - brightness) * 10)))
            pixels[x, y] = (r, g, b, alpha)

bbox = img.getbbox()
if bbox:
    pad = 16
    l, t, r, b = bbox
    img = img.crop(
        (max(0, l - pad), max(0, t - pad), min(w, r + pad), min(h, b + pad))
    )

out_dir = os.path.join(ROOT, "public")
os.makedirs(out_dir, exist_ok=True)
out = os.path.join(out_dir, "logo-jardin.png")
img.save(out, "PNG")
print("saved", out, img.size)

fw, fh = img.size
side = min(fw, fh)
left = (fw - side) // 2
top = max(0, (fh - side) // 2 - side // 10)
icon = img.crop((left, top, left + side, top + side)).resize(
    (192, 192), Image.Resampling.LANCZOS
)
icon_path = os.path.join(out_dir, "logo-jardin-icon.png")
icon.save(icon_path, "PNG")
print("icon", icon_path)
