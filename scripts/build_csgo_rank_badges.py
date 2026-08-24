from pathlib import Path

from PIL import Image


SOURCE = Path("/home/ubuntu/upload/search_images/7V3vWatGoQnT.jpg")
DESTINATION = Path("/home/ubuntu/legacyxxx-frontend-mock-git-preview/public/ranks")

# Source sheet is a 3 × 6 layout. Each crop preserves the complete emblem tile,
# allowing the React badge component to use clean object-contain rendering.
BADGES = {
    "global-elite": (467, 455, 700, 546),
    "legendary-eagle": (467, 273, 700, 364),
    "master-guardian": (234, 364, 467, 455),
}


def main() -> None:
    DESTINATION.mkdir(parents=True, exist_ok=True)
    source = Image.open(SOURCE).convert("RGB")

    for name, box in BADGES.items():
        badge = source.crop(box)
        badge.save(DESTINATION / f"{name}.webp", "WEBP", quality=94, method=6)


if __name__ == "__main__":
    main()
