#!/usr/bin/env bash
# Pulls the weapon models and paint textures out of a CS2 install, with Source2Viewer-CLI (https://s2v.app, MIT).
# Run it ON a machine that has CS2 (a game server has it): nothing is converted by hand.
#
#   CLI=./Source2Viewer-CLI VPK=/path/to/game/csgo/pak01_dir.vpk ./extract.sh list
#   CLI=... VPK=... ./extract.sh models
#   CLI=... VPK=... ./extract.sh textures
#
# `list` first: it writes out/paths.txt so the real paths can be checked before anything is exported (CS2 paths change between updates).
set -euo pipefail

CLI="${CLI:-./Source2Viewer-CLI}"
VPK="${VPK:?set VPK to the pak01_dir.vpk of the CS2 install}"
OUT="${OUT:-out}"
mkdir -p "$OUT"

case "${1:-}" in
  list)
    # Every weapon model, sticker, charm and paint file the game has.
    "$CLI" -i "$VPK" --vpk_list | grep -E '^(weapons/models/|materials/models/weapons/customization/|models/weapons/)' > "$OUT/paths.txt" || true
    echo "$(wc -l < "$OUT/paths.txt") paths in $OUT/paths.txt"
    ;;
  models)
    # Models become .glb with their materials (the browser cannot read .vmdl_c).
    "$CLI" -i "$VPK" -f "weapons/models/*" -e vmdl_c --gltf_export_format glb --gltf_export_materials --gltf_textures_adapt -o "$OUT/models"
    ;;
  textures)
    # Paint kits, stickers and scratch maps (.vtex_c) become images.
    "$CLI" -i "$VPK" -f "materials/models/weapons/customization/*" -e vtex_c -d -o "$OUT/textures"
    ;;
  *)
    echo "usage: $0 list | models | textures" >&2
    exit 1
    ;;
esac
