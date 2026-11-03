# 3D weapon models (Skinchanger → Advanced)

The Advanced studio shows a gun in **3D** only when `index.json` lists a model for it; every other gun is shown as its side picture.
Nothing is made up: no entry, no 3D button.

```json
{
  "version": 1,
  "weapons": {
    "7": {
      "model": "ak47.glb",
      "reach": 0.06,
      "slots": [
        { "position": [0.10, 0.02, 0.012], "normal": [0, 0, 1], "up": [0, 1, 0] },
        { "position": [0.20, 0.02, 0.012], "normal": [0, 0, 1], "up": [0, 1, 0] },
        { "position": [0.30, 0.02, 0.012], "normal": [0, 0, 1], "up": [0, 1, 0] },
        { "position": [0.40, 0.02, 0.012], "normal": [0, 0, 1], "up": [0, 1, 0] },
        { "position": [0.50, 0.02, 0.012], "normal": [0, 0, 1], "up": [0, 1, 0] }
      ],
      "charm": { "position": [-0.30, -0.02, 0.0], "normal": [0, 0, 1], "up": [0, 1, 0] },
      "skins": { "180": "ak47-180.webp" }
    }
  }
}
```

* The key of `weapons` is the gun's `weapon_defindex` (7 = AK-47, 9 = AWP, 1 = Desert Eagle ...), the key of `skins` is the skin's `paint_id`.
* `model` is a binary glTF (`.glb`) in this folder: the gun alone, any scale. The camera is fitted to it. Under 2 MB.
* `slots` are the five sticker slots **in the model's own space**: `position` is where the slot's middle is on the surface, `normal` is the way the
  surface faces (out of the gun), `up` is the way "up" points on that slot (the game's +y offset). Dragging a sticker moves it on that plane; one whole unit of
  offset (what the game stores, -1 ... 1) is `reach` long in model units. `charm` is the same for the charm (its z offset goes along `normal`).
* `skins[paint_id]` is the skin's colour map (a `.webp` or `.png` in this folder, 1024 or 2048 px); it goes on the material called `skin` (or on the only material).
  A skin with no entry keeps the model's own materials.
* Where the slots really are comes from the game: open the weapon in the Source 2 Viewer, export the `.vmdl` as glTF and read the sticker attachment
  points (`sticker_0` ... `sticker_4`). Use only what you may use.
