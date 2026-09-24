import deAncient from "@/assets/maps/de_ancient.webp"
import deAnubis from "@/assets/maps/de_anubis.webp"
import deCache from "@/assets/maps/de_cache.webp"
import deDust2 from "@/assets/maps/de_dust2.webp"
import deInferno from "@/assets/maps/de_inferno.webp"
import deMirage from "@/assets/maps/de_mirage.webp"
import deNuke from "@/assets/maps/de_nuke.webp"
import deOverpass from "@/assets/maps/de_overpass.webp"
import deTrain from "@/assets/maps/de_train.webp"
import deVertigo from "@/assets/maps/de_vertigo.webp"

/**
 * LEGACY-X map visual system: normalize gameplay-server map keys to supplied CS2 artwork without changing card composition.
 * * Artwork is bundled from src/assets (hashed by Vite) so it ships with every build.
 */
const CS2_MAP_ARTWORK: Record<string, string> = {
  de_ancient: deAncient,
  de_anubis: deAnubis,
  de_cache: deCache,
  de_dust2: deDust2,
  de_inferno: deInferno,
  de_mirage: deMirage,
  de_nuke: deNuke,
  de_overpass: deOverpass,
  de_train: deTrain,
  de_vertigo: deVertigo,
}

const CS2_MAP_LABELS: Record<string, string> = {
  de_ancient: "Ancient",
  de_anubis: "Anubis",
  de_cache: "Cache",
  de_dust2: "Dust II",
  de_inferno: "Inferno",
  de_mirage: "Mirage",
  de_nuke: "Nuke",
  de_overpass: "Overpass",
  de_train: "Train",
  de_vertigo: "Vertigo",
}

export function normalizeCs2MapKey(mapName: string | null | undefined): string | null {
  const normalized = String(mapName ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")

  if (!normalized) return null
  const compact = normalized.replace(/_/g, "")
  if (compact === "dedust2" || compact === "dust2" || compact === "dustii") return "de_dust2"
  if (compact.startsWith("de")) {
    const candidate = `de_${compact.slice(2)}`
    return candidate in CS2_MAP_ARTWORK ? candidate : normalized
  }
  const candidate = `de_${compact}`
  return candidate in CS2_MAP_ARTWORK ? candidate : normalized
}

export function cs2MapArtwork(mapName: string | null | undefined): string | null {
  const key = normalizeCs2MapKey(mapName)
  return key ? CS2_MAP_ARTWORK[key] ?? null : null
}

export function cs2MapLabel(mapName: string | null | undefined): string {
  const key = normalizeCs2MapKey(mapName)
  if (key && CS2_MAP_LABELS[key]) return CS2_MAP_LABELS[key]
  return String(mapName ?? "Unknown").replace(/^de_/i, "") || "Unknown"
}
