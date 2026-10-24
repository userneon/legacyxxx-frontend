"""Turns the frames recorded by record-clan-effects.mjs (.fx-frames/<effect>/*.png) into public/clan-fx/<effect>.gif: grey, about 40 grey levels, forward then back."""
import glob, os
from PIL import Image

root = os.path.join(os.path.dirname(__file__), "..")
for folder in sorted(glob.glob(os.path.join(root, ".fx-frames", "*"))):
    effect = os.path.basename(folder)
    frames = [Image.open(path).convert("L").point(lambda value: min(255, value // 6 * 6 + 3)) for path in sorted(glob.glob(os.path.join(folder, "*.png")))]
    if not frames:
        continue
    loop = frames + frames[-2:0:-1]
    target = os.path.join(root, "public", "clan-fx", f"{effect}.gif")
    loop[0].save(target, save_all=True, append_images=loop[1:], duration=90, loop=0, optimize=True)
    print(effect, round(os.path.getsize(target) / 1024), "KB", len(loop), "frames")
