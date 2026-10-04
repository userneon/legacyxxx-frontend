/**
 * Which skins have a 3D model, and where the files are.
 *
 * The files live on our own static origin (VITE_SKIN3D_BASE_URL), never on a third-party host. That origin serves a
 * `manifest.json` listing every weapon model and the paint textures that exist for it. A skin gets a 3D view only when
 * the manifest names it; with no base URL or no manifest the picker simply stays 2D.
 *
 *   { "weapons": [ { "key": "weapon_ak47", "classes": ["AK-47"], "model": "models/weapon_ak47.glb",
 *                    "paints": { "1004": "textures/weapon_ak47/1004.png" } } ] }
 *
 * The metal map sits next to each texture as `<name>_metal.<ext>`.
 */
const base = (import.meta.env.VITE_SKIN3D_BASE_URL ?? "").replace(/\/+$/, "")

interface ManifestWeapon { key: string; classes: string[]; model: string; paints: Record<string, string> }
interface Manifest { weapons: ManifestWeapon[] }

export interface Skin3dSource { model: string; texture: string; textureMetal: string }

let manifestPromise: Promise<Manifest | null> | null = null

function loadManifest() {
  if (!base) return Promise.resolve(null)
  manifestPromise ??= fetch(`${base}/manifest.json`)
    .then((response) => (response.ok ? (response.json() as Promise<Manifest>) : null))
    .catch(() => null)
  return manifestPromise
}

/** Resolves the 3D files for a catalog skin, or null when it has none. */
export async function findSkin3d(weaponClass: string | null, paintId: number | null): Promise<Skin3dSource | null> {
  if (!weaponClass || paintId == null) return null
  const manifest = await loadManifest()
  const weapon = manifest?.weapons.find((entry) => entry.classes.includes(weaponClass))
  const texture = weapon?.paints[String(paintId)]
  if (!weapon || !texture) return null
  return {
    model: `${base}/${weapon.model}`,
    texture: `${base}/${texture}`,
    textureMetal: `${base}/${texture.replace(/(\.[a-z0-9]+)$/i, "_metal$1")}`,
  }
}
