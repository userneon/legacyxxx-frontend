/**
 * 3D guns for the Advanced studio. `public/models/weapons/index.json` lists which guns have a glTF model, where their five sticker slots and the charm
 * sit on it, and which skins have a texture (see the README next to it); a gun that is not listed is shown as its side picture.
 */
import { useEffect, useState } from "react"

import type { SlotFrame, Vec3 } from "@/lib/studio-layout"

export interface WeaponModelEntry {
  model: string
  /** Model-space length of one whole unit of sticker offset. */
  reach: number
  slots: SlotFrame[]
  charm: SlotFrame | null
  skins?: Record<string, string>
}
export interface WeaponModelManifest { version: number; weapons: Record<string, WeaponModelEntry> }

export interface WeaponModelChoice {
  modelUrl: string
  /** The skin's colour map, or null when the skin has none (the model then keeps its own materials). */
  textureUrl: string | null
  reach: number
  slots: SlotFrame[]
  charm: SlotFrame | null
}

const BASE = "/models/weapons/"
const SAFE_FILE = /^[A-Za-z0-9._-]{1,80}$/

const vec3 = (value: unknown): Vec3 | null => (Array.isArray(value) && value.length === 3 && value.every((n) => typeof n === "number" && Number.isFinite(n)) ? [value[0], value[1], value[2]] : null)
function frame(value: unknown): SlotFrame | null {
  const entry = value as { position?: unknown; normal?: unknown; up?: unknown } | null
  const position = vec3(entry?.position), normal = vec3(entry?.normal), up = vec3(entry?.up)
  return position && normal && up ? { position, normal, up } : null
}

/** The 3D model of a catalogue gun, or null. File names are checked so a bad manifest can only point inside the folder; a gun without all five slots has no 3D. */
export function weaponModelFor(manifest: WeaponModelManifest | null, item: { weapon_defindex: number | null; paint_id: number | null } | null): WeaponModelChoice | null {
  if (!manifest || !item || item.weapon_defindex === null) return null
  const entry = manifest.weapons?.[String(item.weapon_defindex)]
  if (!entry || !SAFE_FILE.test(entry.model) || !/\.glb$/i.test(entry.model) || !(entry.reach > 0)) return null
  const slots = (Array.isArray(entry.slots) ? entry.slots : []).map(frame)
  if (slots.length !== 5 || slots.some((slot) => slot === null)) return null
  const texture = item.paint_id !== null ? entry.skins?.[String(item.paint_id)] : undefined
  return { modelUrl: BASE + entry.model, textureUrl: texture && SAFE_FILE.test(texture) ? BASE + texture : null, reach: entry.reach, slots: slots as SlotFrame[], charm: frame(entry.charm) }
}

let manifestRequest: Promise<WeaponModelManifest | null> | null = null
function loadManifest() {
  manifestRequest ??= fetch(`${BASE}index.json`, { cache: "no-cache" })
    .then((response) => (response.ok ? (response.json() as Promise<WeaponModelManifest>) : null))
    .then((manifest) => (manifest && typeof manifest === "object" && manifest.weapons && typeof manifest.weapons === "object" ? manifest : null))
    .catch(() => null)
  return manifestRequest
}

/** The list of 3D guns, once it has loaded (null until then, and null when there is none). */
export function useWeaponModels(): WeaponModelManifest | null {
  const [manifest, setManifest] = useState<WeaponModelManifest | null>(null)
  useEffect(() => {
    let cancelled = false
    void loadManifest().then((result) => { if (!cancelled) setManifest(result) })
    return () => { cancelled = true }
  }, [])
  return manifest && Object.keys(manifest.weapons).length > 0 ? manifest : null
}
