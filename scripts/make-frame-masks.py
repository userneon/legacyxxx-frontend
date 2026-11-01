"""Writes public/frames/<id>-mask.webp for every avatar frame whose middle is a closed hole, and prints the `mask: true, box: [...]` for it.

    python3 scripts/make-frame-masks.py          # writes the masks and prints the new FRAMES lines
    python3 scripts/make-frame-masks.py --check  # only lists what it would do

Why: FramedAvatar fits a framed player's picture to the opening's bounding box and cuts it to the opening's own shape (the mask), so the whole
avatar is seen inside the frame and the art's border sits over its edge, never over its middle. The hole is found by filling out from the middle
of the art (alpha under 40), then grown by 2 px so no gap shows between the picture and the art. Frames whose middle is not a closed hole are listed as
"skip" and keep the older square `opening`. Needs ImageMagick (`convert`). The founder and booster masks were made by hand and are left alone.
"""
import collections
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
N = 256
GROW = 2


def raw_alpha(path):
    return subprocess.run(["convert", str(path), "-resize", f"{N}x{N}!", "-alpha", "extract", "-depth", "8", "gray:-"], capture_output=True, check=True).stdout


def hole(path):
    alpha = raw_alpha(path)
    if len(alpha) != N * N or alpha[(N // 2) * N + N // 2] >= 40:
        return None
    seen = bytearray(N * N)
    queue = collections.deque([(N // 2, N // 2)])
    seen[(N // 2) * N + N // 2] = 1
    while queue:
        x, y = queue.popleft()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < N and 0 <= ny < N and not seen[ny * N + nx] and alpha[ny * N + nx] < 40:
                seen[ny * N + nx] = 1
                queue.append((nx, ny))
    if seen[0] or seen[N - 1] or seen[(N - 1) * N] or seen[N * N - 1]:
        return None  # connected to the outside: not a closed hole
    return seen


def write_mask(seen, path):
    data = bytes(255 if value else 0 for value in seen)
    # the hole as a grey picture, grown a little and softened
    gray = subprocess.run(["convert", "-size", f"{N}x{N}", "-depth", "8", "gray:-", "-morphology", "Dilate", f"Disk:{GROW}", "-blur", "0x0.6", "-level", "30%,70%", "png:-"], input=data, capture_output=True, check=True).stdout
    # white picture with the hole as its opacity
    subprocess.run(["convert", "png:-", "(", "+clone", "-alpha", "off", "-fill", "white", "-colorize", "100", ")", "-swap", "0,1", "-compose", "CopyOpacity", "-composite", "-define", "webp:lossless=true", str(path)], input=gray, check=True)


def bbox(path):
    out = subprocess.run(["convert", str(path), "-alpha", "extract", "-threshold", "40%", "-format", "%@", "info:"], capture_output=True, check=True, text=True).stdout
    width, height, x, y = (int(v) for v in re.match(r"(\d+)x(\d+)\+(\d+)\+(\d+)", out).groups())
    return [round(x / N, 3), round(y / N, 3), round(width / N, 3), round(height / N, 3)]


config = (ROOT / "src/lib/cosmetics.ts").read_text()
for match in re.finditer(r'^  "([a-z0-9-]+)": \{ opening: [0-9.]+, dx: -?[0-9.]+, dy: -?[0-9.]+(.*)$', config, re.M):
    frame, rest = match.groups()
    if "mask" in rest:
        continue
    seen = hole(ROOT / f"public/frames/{frame}.webp")
    if seen is None:
        print(f"{frame:24s} skip")
        continue
    target = ROOT / f"public/frames/{frame}-mask.webp"
    if "--check" not in sys.argv:
        write_mask(seen, target)
        print(f'{frame:24s} mask: true, box: {bbox(target)}')
    else:
        print(f"{frame:24s} would get a mask")
