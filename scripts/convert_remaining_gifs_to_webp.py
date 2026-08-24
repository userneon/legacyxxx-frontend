#!/usr/bin/env python3
"""Convert remaining project-hosted GIF files to animated WebP and remove originals."""

from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageSequence


PUBLIC_DIR = Path(__file__).resolve().parents[1] / "public"


def convert(source: Path) -> None:
    target = source.with_suffix(".webp")
    with Image.open(source) as animation:
        default_duration = animation.info.get("duration", 100)
        frames = [frame.convert("RGB") for frame in ImageSequence.Iterator(animation)]
        durations = [frame.info.get("duration", default_duration) for frame in ImageSequence.Iterator(animation)]
        if not frames:
            raise RuntimeError(f"{source.name} contains no frames")
        frames[0].save(target, "WEBP", save_all=True, append_images=frames[1:], duration=durations, loop=animation.info.get("loop", 0), quality=82, method=6)
    source.unlink()
    print(f"{source.name} -> {target.name} ({len(frames)} frames)")


def main() -> None:
    sources = sorted(PUBLIC_DIR.rglob("*.gif"))
    for source in sources:
        convert(source)
    print(f"Converted {len(sources)} remaining GIF asset(s).")


if __name__ == "__main__":
    main()
