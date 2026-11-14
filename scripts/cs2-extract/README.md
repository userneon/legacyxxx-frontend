# CS2 asset extraction (Advanced studio)

The studio needs the game's own weapon models and paint / sticker textures. A browser cannot read the game's files (`.vmdl_c`, `.vtex_c`), so
`extract.sh` pulls them out with Source2Viewer-CLI. Nothing is made by hand.

1. On a machine with CS2 (a game server has it): download the CLI from https://s2v.app (Linux build), `chmod +x Source2Viewer-CLI`.
2. Find the VPK: `<cs2 install>/game/csgo/pak01_dir.vpk`.
3. `CLI=./Source2Viewer-CLI VPK=/path/pak01_dir.vpk ./extract.sh list`, then open `out/paths.txt` and check the real folders
   (weapon models, `customization` for stickers, charms and paints). If a path differs, change the filters in `extract.sh`.
4. `./extract.sh all` exports every weapon and every paint / sticker in one run (or `models` and `textures` separately). It is run again only after a CS2 update.
5. Upload `out/` to the asset bucket (Cloudflare R2) with long-lived cache headers.

Valve's models and textures stay Valve's: keep the bucket private to the studio's own domain.
