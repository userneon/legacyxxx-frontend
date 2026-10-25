"""Joins the PNG frames from render-premium-frames.mjs into looping animated WebP frames (256px, like the other frame art).

    python3 scripts/make-premium-frames.py <frames-dir> public/frames [ms-per-frame=80]
"""
import sys
from pathlib import Path

from PIL import Image

src, dst = Path(sys.argv[1]), Path(sys.argv[2])
ms = int(sys.argv[3]) if len(sys.argv) > 3 else 80
for folder in sorted(p for p in src.iterdir() if p.is_dir()):
    frames = [Image.open(f).convert("RGBA").resize((256, 256), Image.LANCZOS) for f in sorted(folder.glob("*.png"))]
    out = dst / f"{folder.name}.webp"
    frames[0].save(out, save_all=True, append_images=frames[1:], duration=ms, loop=0, quality=72, method=4, lossless=False)
    print(out, len(frames), f"{out.stat().st_size // 1024} KB")
