/**
 * LEGACY-X neutral visual system: local-only, weapon-first CS2 catalog preview.
 * This module never writes to a network service and is enabled only in mock/dev mode.
 */
import type {
  SkinchangerCatalogItem,
  SkinchangerCatalogFacets,
  SkinchangerCatalogPage,
  SkinchangerCategory,
  SkinchangerFirearmGroup,
  SkinchangerLoadout,
  SkinchangerLoadoutInput,
} from "@/api/skinchanger"

export const isSkinchangerLocalPreview = import.meta.env.VITE_MOCK_PREVIEW === "true" || import.meta.env.VITE_SKINCHANGER_LOCAL_PREVIEW === "true"

const sourceBase = "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en"
const sourceEndpoints = [
  { category: "weapon", path: "base_weapons.json" },
  { category: "weapon_skin", path: "skins_not_grouped.json" },
  { category: "agent", path: "agents.json" },
  { category: "music_kit", path: "music_kits.json" },
  { category: "pin", path: "collectibles.json" },
  { category: "sticker", path: "stickers.json" },
  { category: "charm", path: "keychains.json" },
] as const

type SourceCategory = (typeof sourceEndpoints)[number]["category"]
type SourceRow = {
  id?: string
  name?: string
  image?: string
  image_url?: string
  def_index?: number
  defindex?: number
  paint_index?: number
  paint_id?: number
  model?: string
  model_player?: string
  type?: string
  category?: { name?: string } | string
  weapon?: { name?: string; weapon_id?: number; id?: number }
  rarity?: { name?: string } | string
  team?: { name?: string } | string
  min_float?: number
  max_float?: number
}

const catalogCategories: SkinchangerCategory[] = ["weapon", "weapon_skin", "knife", "glove", "agent", "music_kit", "pin", "sticker", "charm"]
let catalogPromise: Promise<SkinchangerCatalogItem[]> | null = null
const wearSuffix = / \((Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)$/i
const firearmGroups = new Set(["Pistols", "SMGs", "Rifles", "Heavy"])
const tOnlyFirearms = new Set(["AK-47", "Galil AR", "SG 553", "G3SG1", "Glock-18", "Tec-9", "MAC-10", "Sawed-Off"])
const ctOnlyFirearms = new Set(["AUG", "FAMAS", "M4A1-S", "M4A4", "SCAR-20", "USP-S", "P2000", "Five-SeveN", "MP9", "MAG-7"])
const rarityOrder: Record<string, number> = { Covert: 1, Classified: 2, Restricted: 3, "Mil-Spec Grade": 4, "Industrial Grade": 5, "Consumer Grade": 6, Contraband: 7, Extraordinary: 8 }

function rarityRank(item: SkinchangerCatalogItem) {
  const rarity = item.metadata.rarity
  return typeof rarity === "string" ? (rarityOrder[rarity] ?? 99) : 99
}

function baseSkinName(displayName: string) {
  return displayName.replace(/^★\s*/u, "").replace(/^(StatTrak™\s+|Souvenir\s+)/i, "").replace(wearSuffix, "")
}

function baseSkinKey(item: SkinchangerCatalogItem) {
  if (!(["weapon_skin", "knife", "glove"] as SkinchangerCategory[]).includes(item.category)) return item.id
  return `${item.category}:${item.weapon_class ?? ""}:${baseSkinName(item.display_name).toLowerCase()}`
}

function wearRank(item: SkinchangerCatalogItem) {
  const suffix = item.display_name.match(wearSuffix)?.[1]?.toLowerCase()
  const condition = ({ "factory new": 0, "minimal wear": 1, "field-tested": 2, "well-worn": 3, "battle-scarred": 4 })[suffix ?? ""] ?? 5
  const name = item.display_name.replace(/^★\s*/u, "")
  const variant = name.startsWith("Souvenir ") ? 2 : name.startsWith("StatTrak™ ") ? 1 : 0
  return condition * 3 + variant
}

function collapseBaseSkins(items: SkinchangerCatalogItem[]) {
  const groups = new Map<string, SkinchangerCatalogItem[]>()
  for (const item of items) groups.set(baseSkinKey(item), [...(groups.get(baseSkinKey(item)) ?? []), item])
  return Array.from(groups.entries()).map(([key, variants]) => {
    const representative = [...variants].sort((left, right) => wearRank(left) - wearRank(right) || left.display_name.localeCompare(right.display_name))[0]
    const minWear = Math.min(...variants.map((item) => typeof item.metadata.minWear === "number" ? item.metadata.minWear : 0.0001))
    const maxWear = Math.max(...variants.map((item) => typeof item.metadata.maxWear === "number" ? item.metadata.maxWear : 1))
    return { ...representative, display_name: baseSkinName(representative.display_name), metadata: { ...representative.metadata, baseSkinKey: key, minWear, maxWear } }
  })
}

function collapseModelTypes(items: SkinchangerCatalogItem[]) {
  const groups = new Map<string, SkinchangerCatalogItem[]>()
  for (const item of items) {
    const key = item.weapon_class ?? item.weapon_defindex?.toString() ?? item.id
    groups.set(key, [...(groups.get(key) ?? []), item])
  }
  return Array.from(groups.entries()).map(([type, variants]) => {
    const representative = [...variants].sort((left, right) => Number(Boolean(right.metadata.baseModel)) - Number(Boolean(left.metadata.baseModel)) || wearRank(left) - wearRank(right) || left.display_name.localeCompare(right.display_name))[0]
    return { ...representative, display_name: type, metadata: { ...representative.metadata, modelType: true, modelTypeKey: type } }
  })
}

function text(value: unknown): string | null { return typeof value === "string" && value.trim() ? value.trim() : null }
function number(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value)
  if (typeof value === "string" && /^\d+$/.test(value)) return Number.parseInt(value, 10)
  return null
}
function sourceCategoryName(value: SourceRow["category"]) { return typeof value === "object" && value ? text(value.name) : text(value) }
function sourceNamedValue(value: SourceRow["rarity"] | SourceRow["team"]) { return typeof value === "object" && value ? text(value.name) : text(value) }

function canonicalTeam(raw: SourceRow, weaponClass: string | null) {
  const normalized = sourceNamedValue(raw.team)?.toLowerCase()
  if (normalized === "ct" || normalized?.includes("counter")) return "Counter-Terrorist"
  if (normalized === "t" || normalized?.includes("terrorist")) return "Terrorist"
  if (tOnlyFirearms.has(weaponClass ?? "")) return "Terrorist"
  if (ctOnlyFirearms.has(weaponClass ?? "")) return "Counter-Terrorist"
  return null
}

function classify(row: SourceRow, sourceCategory: SourceCategory): SkinchangerCategory | null {
  const name = (text(row.name) ?? "").toLowerCase()
  const weaponName = (text(row.weapon?.name) ?? "").toLowerCase()
  const type = (text(row.type) ?? "").toLowerCase()
  const sourceGroup = sourceCategoryName(row.category)
  if (sourceCategory === "weapon") {
    if (sourceGroup === "Knives") return "knife"
    return firearmGroups.has(sourceGroup ?? "") ? "weapon" : null
  }
  if (sourceCategory === "weapon_skin") {
    if (/knife|bayonet|karambit|m9|butterfly|talon|stiletto|ursus|navaja|falchion|bowie|daggers|kukri/.test(weaponName)) return "knife"
    if (/glove|hand wrap|bloodhound|driver|moto|sport|specialist|hydra|broken fang/.test(weaponName)) return "glove"
  }
  if (sourceCategory === "pin" && !/pin|collectible|medal/.test(`${name} ${type}`)) return null
  return sourceCategory
}

function normalize(row: SourceRow, sourceCategory: SourceCategory): SkinchangerCatalogItem | null {
  const category = classify(row, sourceCategory)
  const sourceId = text(row.id)
  const displayName = text(row.name)
  if (!category || !sourceId || !displayName) return null
  const weaponClass = sourceCategory === "weapon" ? displayName : text(row.weapon?.name) ?? sourceCategoryName(row.category)
  return {
    id: `preview-${sourceId}`,
    external_key: `cs2:${category}:${sourceId.toLowerCase()}`,
    category,
    weapon_class: weaponClass,
    display_name: displayName,
    weapon_defindex: number(row.weapon?.weapon_id) ?? number(row.weapon?.id) ?? number(row.def_index) ?? number(row.defindex),
    paint_id: number(row.paint_index) ?? number(row.paint_id),
    model: text(row.model_player) ?? text(row.model),
    image_key: sourceId,
    image_url: text(row.image) ?? text(row.image_url),
    metadata: { previewOnly: true, catalogSource: "bymykel-csgo-api", sourceId, weaponGroup: sourceCategoryName(row.category), baseModel: sourceCategory === "weapon" && category === "knife", rarity: sourceNamedValue(row.rarity), team: canonicalTeam(row, weaponClass), minWear: row.min_float ?? null, maxWear: row.max_float ?? null },
  }
}

async function fetchRows(endpoint: (typeof sourceEndpoints)[number]) {
  const response = await fetch(`${sourceBase}/${endpoint.path}`, { cache: "force-cache" })
  if (!response.ok) throw new Error(`Catalog source is unavailable (${response.status}).`)
  const rows: unknown = await response.json()
  return Array.isArray(rows) ? rows as SourceRow[] : []
}

async function loadPreviewItems() {
  const sets = await Promise.all(sourceEndpoints.map(async (endpoint) => ({ endpoint, rows: await fetchRows(endpoint) })))
  return sets.flatMap(({ endpoint, rows }) => rows.map((row) => normalize(row, endpoint.category)).filter((item): item is SkinchangerCatalogItem => Boolean(item)))
}

function getPreviewItems() {
  catalogPromise ??= loadPreviewItems()
  return catalogPromise
}

let previewVersion = 1
let previewEntries: SkinchangerLoadout["skinchanger_loadout_entries"] = []

export async function getSkinchangerPreviewCatalog(filters: { category: SkinchangerCategory; weaponClass?: string; weaponGroup?: SkinchangerFirearmGroup; team?: "t" | "ct"; query?: string; limit?: number; offset?: number }): Promise<SkinchangerCatalogPage> {
  const previewItems = await getPreviewItems()
  const query = filters.query?.trim().toLowerCase()
  const sourceTeam = filters.team === "t" ? "Terrorist" : filters.team === "ct" ? "Counter-Terrorist" : null
  const filteredItems = previewItems.filter((item) => item.category === filters.category && (!filters.weaponClass || item.weapon_class === filters.weaponClass) && (!filters.weaponClass || !item.metadata.baseModel) && (!filters.weaponGroup || (filters.weaponGroup === "Mid Tier" ? ["SMGs", "Heavy"].includes(String(item.metadata.weaponGroup ?? "")) : item.metadata.weaponGroup === filters.weaponGroup)) && (!sourceTeam || item.metadata.team === sourceTeam) && (!query || item.display_name.toLowerCase().includes(query) || item.weapon_class?.toLowerCase().includes(query)))
  const filtered = (["glove", "knife"] as SkinchangerCategory[]).includes(filters.category) && !filters.weaponClass ? collapseModelTypes(filteredItems) : collapseBaseSkins(filteredItems)
  const offset = filters.offset ?? 0
  const limit = filters.limit ?? 36
  const data = filtered.sort((left, right) => rarityRank(left) - rarityRank(right) || left.display_name.localeCompare(right.display_name))
  return { data: data.slice(offset, offset + limit), pagination: { total: data.length, offset, limit } }
}

export async function getSkinchangerPreviewFacets(category?: SkinchangerCategory): Promise<SkinchangerCatalogFacets> {
  const previewItems = await getPreviewItems()
  const browseItems = collapseBaseSkins(previewItems)
  const weaponClasses = Array.from(new Set(browseItems.map((item) => item.weapon_class).filter((value): value is string => Boolean(value))))
  return {
    categories: catalogCategories.map((itemCategory) => ({ category: itemCategory, count: (["glove", "knife"] as SkinchangerCategory[]).includes(itemCategory) ? new Set(previewItems.filter((item) => item.category === itemCategory).map((item) => item.weapon_class ?? item.weapon_defindex ?? item.id)).size : browseItems.filter((item) => item.category === itemCategory).length })),
    weaponClasses: weaponClasses.filter((weaponClass) => !category || browseItems.some((item) => item.category === category && item.weapon_class === weaponClass)).map((weaponClass) => ({ weaponClass, count: browseItems.filter((item) => item.category === category && item.weapon_class === weaponClass).length })),
  }
}

export function getSkinchangerPreviewLoadout(): SkinchangerLoadout {
  return { version: previewVersion, updated_at: previewEntries.length ? new Date().toISOString() : null, skinchanger_loadout_entries: previewEntries }
}

export async function saveSkinchangerPreviewLoadout(input: SkinchangerLoadoutInput) {
  const catalogItems = await getPreviewItems()
  const catalogById = new Map(catalogItems.map((item) => [item.id, item]))
  previewVersion += 1
  previewEntries = input.entries.map((entry) => {
    const catalogItem = catalogById.get(entry.catalogItemId) ?? null
    const team = typeof catalogItem?.metadata.team === "string" ? catalogItem.metadata.team.toLowerCase() : ""
    const forcedTeamScope = team.includes("counter") && !team.includes("terrorist") ? "ct" : team.includes("terrorist") && !team.includes("counter") ? "t" : entry.teamScope
    return {
      catalog_item_id: entry.catalogItemId,
      slot: entry.slot,
      slot_key: entry.slotKey,
      team_scope: forcedTeamScope,
      options: entry.options,
      skinchanger_catalog_items: catalogItem,
      resolved_accessories: [
        ...(entry.options.stickers ?? []).map((sticker) => catalogById.get(sticker.catalogItemId)).filter((item): item is SkinchangerCatalogItem => Boolean(item)),
        ...(entry.options.charm ? [catalogById.get(entry.options.charm.catalogItemId)].filter((item): item is SkinchangerCatalogItem => Boolean(item)) : []),
      ],
    }
  })
  return { version: previewVersion, entryCount: previewEntries.length }
}
