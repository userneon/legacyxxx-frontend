/**
 * 3D guns for the Advanced studio (owner request 2026-11-04: "put the 3D weapons from Weapon Paints in"). The models and the skins' texture maps are the
 * Weapon Paints site's by LielXD (MIT, https://github.com/LielXD/CS2-WeaponPaints-Website; the same ones skullboypl's
 * https://github.com/skullboypl/cs2-weapon-paint-website uses): glTF guns in `[models]/<weapon_name>.glb` and, per skin, a colour map and a metal map in
 * `[textures]/<weapon_name>/<paint>.png`. Their source asks that the files are streamed from it, not copied, so they are fetched from there when a gun is
 * opened, and only `public/models/wp3d-available.json` (which guns and skins exist, a few KB) lives here. Counter-Strike's models and textures are Valve's.
 */
import { useEffect, useState } from "react"

import { STICKER_SLOT_PROJECTORS, type SlotProjector } from "@/lib/sticker-slots"

export const WP3D_BASE = "https://raw.githubusercontent.com/LielXD/CS2-WeaponPaints-Website/refs/heads/main/src"
export const WP3D_HOST = "https://raw.githubusercontent.com"

export interface WeaponModelManifest {
  models: string[]
  /** Skins with a texture, by gun: paint ids. */
  paints: Record<string, string[]>
  /** The few textures that are `webp` instead of `png`: gun → paint id → format. */
  formats?: Record<string, Record<string, string>>
}

export interface WeaponModelChoice {
  /** The gun's name at the source, e.g. `weapon_ak47`. */
  key: string
  modelUrl: string
  /** The skin's colour map and metal map, or null when the skin has no texture (the model then keeps its own materials). */
  textureUrls: [string, string | null] | null
  /** The five sticker slots. */
  projectors: readonly SlotProjector[]
}

/** The game's item definition index of each gun, and its name at the source. Guns only. */
export const WEAPON_KEYS: Record<number, string> = {
  1: "weapon_deagle", 2: "weapon_elite", 3: "weapon_fiveseven", 4: "weapon_glock", 7: "weapon_ak47", 8: "weapon_aug", 9: "weapon_awp", 10: "weapon_famas",
  11: "weapon_g3sg1", 13: "weapon_galilar", 14: "weapon_m249", 16: "weapon_m4a1", 17: "weapon_mac10", 19: "weapon_p90", 23: "weapon_mp5sd", 24: "weapon_ump45",
  25: "weapon_xm1014", 26: "weapon_bizon", 27: "weapon_mag7", 28: "weapon_negev", 29: "weapon_sawedoff", 30: "weapon_tec9", 32: "weapon_hkp2000", 33: "weapon_mp7",
  34: "weapon_mp9", 35: "weapon_nova", 36: "weapon_p250", 38: "weapon_scar20", 39: "weapon_sg556", 40: "weapon_ssg08", 60: "weapon_m4a1_silencer",
  61: "weapon_usp_silencer", 63: "weapon_cz75a", 64: "weapon_revolver",
}

/** Used when the source has no slot positions for a gun: five slots along the side. */
const GENERIC_PROJECTORS: readonly SlotProjector[] = [[-0.3, 0.1, 1], [-0.15, 0.1, 1], [0, 0.1, 1], [0.15, 0.1, 1], [0.3, 0.1, 1]]

/** The 3D model of a catalogue gun, or null when the source has none. */
export function weaponModelFor(manifest: WeaponModelManifest | null, item: { weapon_defindex: number | null; paint_id: number | null } | null): WeaponModelChoice | null {
  if (!manifest || !item || item.weapon_defindex === null) return null
  const key = WEAPON_KEYS[item.weapon_defindex]
  if (!key || !manifest.models.includes(key)) return null
  const paint = item.paint_id !== null && item.paint_id > 0 ? String(item.paint_id) : null
  let textureUrls: WeaponModelChoice["textureUrls"] = null
  if (paint && manifest.paints[key]?.includes(paint)) {
    const ext = manifest.formats?.[key]?.[paint] === "webp" ? "webp" : "png"
    textureUrls = [`${WP3D_BASE}/%5Btextures%5D/${key}/${paint}.${ext}`, `${WP3D_BASE}/%5Btextures%5D/${key}/${paint}_metal.${ext}`]
  }
  return { key, modelUrl: `${WP3D_BASE}/%5Bmodels%5D/${key}.glb`, textureUrls, projectors: STICKER_SLOT_PROJECTORS[key] ?? GENERIC_PROJECTORS }
}

let manifestRequest: Promise<WeaponModelManifest | null> | null = null
function loadManifest() {
  manifestRequest ??= fetch("/models/wp3d-available.json", { cache: "no-cache" })
    .then((response) => (response.ok ? (response.json() as Promise<WeaponModelManifest>) : null))
    .then((manifest) => (manifest && Array.isArray(manifest.models) && manifest.paints && typeof manifest.paints === "object" ? manifest : null))
    .catch(() => null)
  return manifestRequest
}

/** Which guns have a 3D model, once the list has loaded (null until then, and null when it cannot be read). */
export function useWeaponModels(): WeaponModelManifest | null {
  const [manifest, setManifest] = useState<WeaponModelManifest | null>(null)
  useEffect(() => {
    let cancelled = false
    void loadManifest().then((result) => { if (!cancelled) setManifest(result) })
    return () => { cancelled = true }
  }, [])
  return manifest
}
