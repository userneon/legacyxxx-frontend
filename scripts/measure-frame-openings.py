"""Measures the opening of every avatar frame in public/frames and prints the `opening`, `dx` and `dy` that `FRAMES` in src/lib/cosmetics.ts should hold.

    python3 scripts/measure-frame-openings.py

The opening is the transparent hole in the middle of the art (found by filling out from the centre). `opening` is its width as a share of the
art plus a small tuck (the picture goes a little under the border), `dx` / `dy` how far the hole's middle is from the art's middle, so the picture
sits dead centre in the hole. Frames with a mask, or whose middle is not a closed hole, are listed as "skip".
"""
import collections
import re
from pathlib import Path

from PIL import Image

TUCK = 0.04
ROOT = Path(__file__).resolve().parent.parent


def hole(path):
    image = Image.open(path).convert("RGBA")
    width, height = image.size
    alpha = image.split()[3].load()
    cx, cy = width // 2, height // 2
    if alpha[cx, cy] >= 40:
        return None
    seen = bytearray(width * height)
    queue = collections.deque([(cx, cy)])
    seen[cy * width + cx] = 1
    x0 = x1 = cx
    y0 = y1 = cy
    while queue:
        x, y = queue.popleft()
        x0, x1, y0, y1 = min(x0, x), max(x1, x), min(y0, y), max(y1, y)
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < width and 0 <= ny < height and not seen[ny * width + nx] and alpha[nx, ny] < 40:
                seen[ny * width + nx] = 1
                queue.append((nx, ny))
    return width, height, x0, x1, y0, y1


config = (ROOT / "src/lib/cosmetics.ts").read_text()
for match in re.finditer(r'^\s*"([a-z0-9-]+)": \{ opening: [0-9.]+, dx: -?[0-9.]+, dy: -?[0-9.]+(.*)$', config, re.M):
    frame, rest = match.groups()
    found = None if "mask" in rest else hole(ROOT / f"public/frames/{frame}.webp")
    if not found:
        print(f"{frame:22s} skip")
        continue
    width, height, x0, x1, y0, y1 = found
    w, h = (x1 - x0 + 1) / width, (y1 - y0 + 1) / height
    if w > 0.95 or h > 0.95:
        print(f"{frame:22s} skip (the middle is not a closed hole)")
        continue
    dx, dy = ((x0 + x1) / 2 - (width - 1) / 2) / width, ((y0 + y1) / 2 - (height - 1) / 2) / height
    print(f'{frame:22s} opening: {max(w, h) + TUCK:.2f}, dx: {dx:.3f}, dy: {dy:.3f}')
