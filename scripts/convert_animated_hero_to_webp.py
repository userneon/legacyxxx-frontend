#!/usr/bin/env python3
"""Convert the user-provided local hero GIF to animated WebP without altering frames."""

from __future__ import annotations

from pathlib import Path
from PIL import Image, ImageSequence


PUBLIC_DIR = Path(__file__).resolve().parents[1] / "public"
SOURCE = PUBLIC_DIR / "legacyx-hero-source.gif"
TARGET = PUBLIC_DIR / "legacyx-hero.webp"


def main() -> None:
    with Image.open(SOURCE) as animation:
        frames = []
        durations = []
        default_duration = animation.info.get("duration", 100)
        for frame in ImageSequence.Iterator(animation):
            frames.append(frame.convert("RGB"))
            durations.append(frame.info.get("duration", default_duration))

        if not frames:
            raise RuntimeError("Hero GIF contains no frames")

        frames[0].save(
            TARGET,
            "WEBP",
            save_all=True,
            append_images=frames[1:],
            duration=durations,
            loop=animation.info.get("loop", 0),
            quality=82,
            method=6,
        )

    SOURCE.unlink()
    print(f"Converted {len(frames)} frames to {TARGET.name}")


if __name__ == "__main__":
    main()
