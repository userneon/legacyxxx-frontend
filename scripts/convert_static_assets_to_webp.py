#!/usr/bin/env python3
"""Convert project-hosted PNG/JPEG public assets to WebP and remove originals."""

from __future__ import annotations

from pathlib import Path
from PIL import Image


PUBLIC_DIR = Path(__file__).resolve().parents[1] / "public"
ELIGIBLE_SUFFIXES = {".png", ".jpg", ".jpeg"}


def main() -> None:
    converted = 0
    for source in sorted(PUBLIC_DIR.rglob("*")):
        if not source.is_file() or source.suffix.lower() not in ELIGIBLE_SUFFIXES:
            continue

        target = source.with_suffix(".webp")
        with Image.open(source) as image:
            if image.mode not in {"RGB", "RGBA"}:
                image = image.convert("RGBA" if "A" in image.getbands() else "RGB")
            image.save(target, "WEBP", quality=88, method=6)

        source.unlink()
        converted += 1
        print(f"{source.relative_to(PUBLIC_DIR)} -> {target.relative_to(PUBLIC_DIR)}")

    print(f"Converted {converted} asset(s) to WebP.")


if __name__ == "__main__":
    main()
