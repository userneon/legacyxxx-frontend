#!/usr/bin/env python3
"""Create true-WebP Skinchanger mock assets from existing local mock visuals."""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
ASSETS = {
    "shop-item-1.webp": "skinchanger-weapon.webp",
    "shop-item-2.webp": "skinchanger-knife.webp",
    "shop-item-3.webp": "skinchanger-gloves.webp",
    "shop-item-4.webp": "skinchanger-agent.webp",
}


def convert(source_name: str, target_name: str) -> None:
    source = PUBLIC / source_name
    target = PUBLIC / target_name
    with Image.open(source) as image:
        image.convert("RGB").save(target, "WEBP", quality=86, method=6)
    with Image.open(target) as verified:
        if verified.format != "WEBP":
            raise RuntimeError(f"Expected WEBP output for {target}")


def main() -> None:
    for source, target in ASSETS.items():
        convert(source, target)
        print(f"created {target}")


if __name__ == "__main__":
    main()
