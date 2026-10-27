"""Turns the PNG frames from render-premium-frames.mjs into frame art (256px, like the other frame art).

Since 2026-10-27 (owner request: "do not animate the frames, add a glow") each frame is ONE still picture, the frame numbered
STILL; the glow around it is drawn by the site (`frameAccent` in src/lib/cosmetics.ts). Pass `--animated` to write the looping
animated WebP instead.

    python3 scripts/make-premium-frames.py <frames-dir> public/frames [ms-per-frame=80] [--animated]
"""
import sys
from pathlib import Path

from PIL import Image

src, dst = Path(sys.argv[1]), Path(sys.argv[2])
args = [a for a in sys.argv[3:] if not a.startswith("--")]
ms = int(args[0]) if args else 80
animated = "--animated" in sys.argv
STILL = 8
for folder in sorted(p for p in src.iterdir() if p.is_dir()):
    frames = [Image.open(f).convert("RGBA").resize((256, 256), Image.LANCZOS) for f in sorted(folder.glob("*.png"))]
    out = dst / f"{folder.name}.webp"
    if not animated:
        frames[min(STILL, len(frames) - 1)].save(out, quality=92, method=6)
        print(out, "still", f"{out.stat().st_size // 1024} KB")
        continue
    frames[0].save(out, save_all=True, append_images=frames[1:], duration=ms, loop=0, quality=72, method=4, lossless=False)
    print(out, len(frames), f"{out.stat().st_size // 1024} KB")
