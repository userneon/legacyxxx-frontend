/** LEGACY-X map visual system: normalize gameplay-server map keys to supplied CS2 artwork without changing card composition. */
const CS2_MAP_ARTWORK: Record<string, string> = {
  de_ancient: "/manus-storage/de_ancient_5c295756.png",
  de_anubis: "/manus-storage/de_anubis_7c7be7cb.png",
  de_cache: "/manus-storage/de_cache_cca711a1.png",
  de_dust2: "/manus-storage/de_dust2_c5ddfc57.jpg",
  de_inferno: "/manus-storage/de_inferno_0621ddee.png",
  de_mirage: "/manus-storage/de_mirage_35cb582f.png",
  de_nuke: "/manus-storage/de_nuke_4cc74e3e.png",
  de_overpass: "/manus-storage/de_overpass_7ac13682.png",
  de_train: "/manus-storage/de_train_66abb588.png",
  de_vertigo: "/manus-storage/de_vertigo_ffa95ee0.png",
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
