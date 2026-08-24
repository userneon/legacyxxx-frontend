from pathlib import Path

from PIL import Image


SOURCE = Path("/home/ubuntu/upload/steam-icon-14871.png")
TARGET = Path(__file__).resolve().parents[1] / "public" / "steam-login-user-logo.webp"


def main() -> None:
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(SOURCE) as source:
        image = source.convert("RGBA")
        image.save(TARGET, "WEBP", lossless=True, method=6)


if __name__ == "__main__":
    main()
