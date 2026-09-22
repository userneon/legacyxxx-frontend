import { useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowLeft,
  BadgeCheck,
  Box,
  Crosshair,
  Headphones,
  ImageOff,
  Loader2,
  Medal,
  RotateCcw,
  Search,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Sticker,
  Sword,
  Tag,
  Trash2,
  UserRound,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { skinchangerService, type SkinchangerAppearanceOptions, type SkinchangerCatalogItem, type SkinchangerCategory, type SkinchangerFirearmGroup, type SkinchangerLoadoutEntry, type SkinchangerSlot, type TeamScope } from "@/api"
import type { ApiError } from "@/api/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { QueryState } from "@/components/query-state"
import { OptimizedImage } from "@/components/optimized-image"
import { RelativeTime } from "@/components/relative-time"
import { useApiQuery } from "@/hooks/use-api-query"
import { cn } from "@/lib/utils"
import knifeIcon from "@/assets/skinchanger/knife.png"
import glovesIcon from "@/assets/skinchanger/gloves.png"
import pinsIcon from "@/assets/skinchanger/pins.png"
import teamTIcon from "@/assets/skinchanger/team-t.webp"
import teamCtIcon from "@/assets/skinchanger/team-ct.webp"

/** LEGACY-X neutral visual system: filename-matched collection icons, ordered Skins sub-groups, and lower-left rarity glow. */
type CollectionId = "skins" | Exclude<SkinchangerCategory, "weapon" | "agent">
type CollectionMeta = { id: CollectionId; category: SkinchangerCategory; label: string; slot: SkinchangerSlot; icon: typeof Crosshair; iconAsset?: string; invertIcon?: boolean; firearmGroup?: SkinchangerFirearmGroup }

const assetUrls = {
  knife: knifeIcon,
  gloves: glovesIcon,
  pins: pinsIcon,
} as const

function collectionAsset(name: keyof typeof assetUrls) {
  return assetUrls[name]
}

const categories: CollectionMeta[] = [
  { id: "skins", category: "weapon", label: "Skins", slot: "weapon", icon: Crosshair },
  { id: "knife", category: "knife", label: "Knives", slot: "knife", icon: Sword, iconAsset: collectionAsset("knife"), invertIcon: true },
  { id: "glove", category: "glove", label: "Gloves", slot: "glove", icon: ShieldCheck, iconAsset: collectionAsset("gloves"), invertIcon: true },
  { id: "music_kit", category: "music_kit", label: "Music", slot: "music_kit", icon: Headphones },
  { id: "pin", category: "pin", label: "Pins", slot: "pin", icon: Medal, iconAsset: collectionAsset("pins") },
]

/** Top-level browse tabs. Firearms and knives share one category grid; the rest keep their own views. */
type BrowseTab = "weapons" | "glove" | "agents" | "music_kit" | "pin"
const browseTabs: Array<{ id: BrowseTab; label: string; icon: typeof Crosshair; iconAsset?: string; invertIcon?: boolean; countCategory?: SkinchangerCategory }> = [
  { id: "weapons", label: "Weapons", icon: Crosshair },
  { id: "glove", label: "Gloves", icon: ShieldCheck, iconAsset: collectionAsset("gloves"), invertIcon: true, countCategory: "glove" },
  { id: "agents", label: "Agents", icon: UserRound, countCategory: "agent" },
  { id: "music_kit", label: "Music", icon: Headphones, countCategory: "music_kit" },
  { id: "pin", label: "Pins", icon: Medal, iconAsset: collectionAsset("pins"), countCategory: "pin" },
]

type WeaponGridGroup = "Pistols" | "SMGs" | "Rifles" | "Sniper Rifles" | "Heavy" | "Knives"
const weaponGridGroups: WeaponGridGroup[] = ["Pistols", "SMGs", "Rifles", "Sniper Rifles", "Heavy", "Knives"]

/** weapon_class values exactly as stored in skinchanger_catalog_items (category "weapon"). */
const firearmGridGroup: Record<string, Exclude<WeaponGridGroup, "Knives">> = {
  "Glock-18": "Pistols", "USP-S": "Pistols", "P2000": "Pistols", "P250": "Pistols", "Desert Eagle": "Pistols",
  "Dual Berettas": "Pistols", "Five-SeveN": "Pistols", "Tec-9": "Pistols", "CZ75-Auto": "Pistols", "R8 Revolver": "Pistols",
  "MAC-10": "SMGs", "MP9": "SMGs", "MP7": "SMGs", "MP5-SD": "SMGs", "UMP-45": "SMGs", "P90": "SMGs", "PP-Bizon": "SMGs",
  "AK-47": "Rifles", "M4A4": "Rifles", "M4A1-S": "Rifles", "FAMAS": "Rifles", "Galil AR": "Rifles", "AUG": "Rifles", "SG 553": "Rifles",
  "AWP": "Sniper Rifles", "SSG 08": "Sniper Rifles", "SCAR-20": "Sniper Rifles", "G3SG1": "Sniper Rifles",
  "Nova": "Heavy", "XM1014": "Heavy", "MAG-7": "Heavy", "Sawed-Off": "Heavy", "Negev": "Heavy", "M249": "Heavy",
}

const firearmClassOrder = Object.keys(firearmGridGroup)

/** Buy-menu order inside a section; unknown firearms go last. */
function firearmOrder(item: SkinchangerCatalogItem) {
  const index = firearmClassOrder.indexOf(item.weapon_class ?? item.display_name)
  return index === -1 ? firearmClassOrder.length : index
}

/** Falls back to the catalogue's own weaponGroup so a firearm added later still lands in a section. */
function gridGroupForFirearm(item: SkinchangerCatalogItem): Exclude<WeaponGridGroup, "Knives"> {
  const mapped = firearmGridGroup[item.weapon_class ?? item.display_name]
  if (mapped) return mapped
  const group = item.metadata.weaponGroup
  return group === "Pistols" || group === "SMGs" || group === "Heavy" ? group : "Rifles"
}

const rarityStyles: Record<string, { rank: number; glow: string; accent: string }> = {
  Covert: { rank: 1, glow: "rgba(239, 68, 68, 0.30)", accent: "#fb7185" },
  Classified: { rank: 2, glow: "rgba(244, 114, 182, 0.28)", accent: "#f472b6" },
  Restricted: { rank: 3, glow: "rgba(168, 85, 247, 0.27)", accent: "#c084fc" },
  "Mil-Spec Grade": { rank: 4, glow: "rgba(59, 130, 246, 0.27)", accent: "#60a5fa" },
  "Industrial Grade": { rank: 5, glow: "rgba(56, 189, 248, 0.24)", accent: "#7dd3fc" },
  "Consumer Grade": { rank: 6, glow: "rgba(226, 232, 240, 0.20)", accent: "#e2e8f0" },
  Contraband: { rank: 7, glow: "rgba(249, 115, 22, 0.28)", accent: "#fb923c" },
  Extraordinary: { rank: 8, glow: "rgba(234, 179, 8, 0.28)", accent: "#facc15" },
}

function rarityStyle(item: SkinchangerCatalogItem) {
  const rarity = item.metadata.rarity
  return typeof rarity === "string" ? rarityStyles[rarity] ?? null : null
}

const teamOptions: Array<{ id: TeamScope; label: string }> = [
  { id: "all", label: "Both" },
  { id: "t", label: "T" },
  { id: "ct", label: "CT" },
]

const agentTeamOptions: Array<{ id: "t" | "ct"; label: string; title: string; description: string; icon: string }> = [
  { id: "t", label: "T", title: "T agents", description: "Browse Terrorist agent skins", icon: teamTIcon },
  { id: "ct", label: "CT", title: "CT agents", description: "Browse Counter-Terrorist agent skins", icon: teamCtIcon },
]
const tOnlyFirearms = new Set(["AK-47", "Galil AR", "SG 553", "G3SG1", "Glock-18", "Tec-9", "MAC-10", "Sawed-Off"])
const ctOnlyFirearms = new Set(["AUG", "FAMAS", "M4A1-S", "M4A4", "SCAR-20", "USP-S", "P2000", "Five-SeveN", "MP9", "MAG-7"])
const defaultGloveVisual = "https://raw.githubusercontent.com/ByMykel/counter-strike-image-tracker/main/static/panorama/images/econ/weapons/base_weapons/ct_gloves_png.png"
const defaultKnifeVisual = "https://raw.githubusercontent.com/ByMykel/counter-strike-image-tracker/main/static/panorama/images/econ/weapons/base_weapons/weapon_knife_png.png"
const wearSuffix = / \((Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)$/i

function defaultModelItem(category: "knife" | "glove"): SkinchangerCatalogItem {
  return {
    id: `builtin-default-${category}`,
    external_key: `builtin:default-${category}`,
    category,
    weapon_class: category === "knife" ? "Default Knife" : "Default Gloves",
    display_name: category === "knife" ? "Default Knife" : "Default Gloves",
    weapon_defindex: null,
    paint_id: null,
    model: null,
    image_key: null,
    image_url: category === "knife" ? defaultKnifeVisual : defaultGloveVisual,
    metadata: { builtinDefault: true },
  }
}

function categoryMeta(collection: CollectionId) {
  return categories.find((item) => item.id === collection) ?? categories[0]
}

function catalogImageUrl(item: SkinchangerCatalogItem) {
  if (!item.image_url) return null
  const separator = item.image_url.includes("?") ? "&" : "?"
  return `${item.image_url}${separator}catalog_item_id=${encodeURIComponent(item.id)}`
}

function teamScopeFromMetadata(item: SkinchangerCatalogItem | null) {
  const team = typeof item?.metadata.team === "string" ? item.metadata.team.toLowerCase() : ""
  if (team.includes("counter") && !team.includes("terrorist")) return "ct" as const
  if (team.includes("terrorist") && !team.includes("counter")) return "t" as const
  const firearmName = item?.weapon_class ?? item?.display_name ?? ""
  if (ctOnlyFirearms.has(firearmName)) return "ct" as const
  if (tOnlyFirearms.has(firearmName)) return "t" as const
  return "all" as const
}

function teamScopeFade(scope: TeamScope) {
  if (scope === "t") return "radial-gradient(ellipse 92% 86% at 100% 0%, rgba(245, 158, 11, 0.31) 0%, rgba(234, 88, 12, 0.16) 35%, transparent 72%)"
  if (scope === "ct") return "radial-gradient(ellipse 92% 86% at 100% 0%, rgba(56, 189, 248, 0.30) 0%, rgba(37, 99, 235, 0.15) 37%, transparent 72%)"
  return "radial-gradient(ellipse 76% 80% at 100% 0%, rgba(56, 189, 248, 0.24) 0%, transparent 70%), radial-gradient(ellipse 76% 80% at 84% 0%, rgba(245, 158, 11, 0.24) 0%, transparent 70%)"
}

function strongerGlow(glow: string) {
  return glow.replace(/0\.\d+\)$/, "0.50)")
}

function metadataNumber(item: SkinchangerCatalogItem | null, key: string, fallback: number) {
  const value = item?.metadata[key]
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

function normalizeAppearanceOptions(options: SkinchangerAppearanceOptions) {
  return JSON.stringify({
    ...options,
    stickers: [...(options.stickers ?? [])].sort((a, b) => a.slot - b.slot),
  })
}

const wearTiers: Array<{ label: string; short: string; from: number; to: number }> = [
  { label: "Factory New", short: "FN", from: 0, to: 0.07 },
  { label: "Minimal Wear", short: "MW", from: 0.07, to: 0.15 },
  { label: "Field-Tested", short: "FT", from: 0.15, to: 0.38 },
  { label: "Well-Worn", short: "WW", from: 0.38, to: 0.45 },
  { label: "Battle-Scarred", short: "BS", from: 0.45, to: 1 },
]

function wearName(wear: number) {
  if (wear <= 0.07) return "Factory New"
  if (wear <= 0.15) return "Minimal Wear"
  if (wear <= 0.38) return "Field-Tested"
  if (wear <= 0.45) return "Well-Worn"
  return "Battle-Scarred"
}

function slotKeyForCatalogItem(item: SkinchangerCatalogItem, category: SkinchangerCategory) {
  const modelKey = String(item.weapon_defindex ?? item.weapon_class ?? item.id).toLowerCase().replace(/[^a-z0-9_-]+/g, "-")
  if ((["glove", "knife"] as SkinchangerCategory[]).includes(category)) return `${category}:${modelKey}`
  return `weapon:${modelKey}`
}

function savedSkinLabel(item: SkinchangerCatalogItem) {
  const [, skin = item.display_name] = item.display_name.split("|")
  return skin.trim().replace(wearSuffix, "")
}

function appearanceSummary(options: SkinchangerAppearanceOptions | undefined) {
  const details = [wearName(options?.wear ?? 0.0001)]
  const stickerCount = options?.stickers?.length ?? 0
  if (stickerCount) details.push(`${stickerCount} sticker${stickerCount === 1 ? "" : "s"}`)
  if (options?.charm) details.push("Charm")
  return details.join(" · ")
}

const slotLabels: Record<SkinchangerSlot, string> = {
  weapon: "Weapons",
  knife: "Knife",
  glove: "Gloves",
  agent: "Agent",
  music_kit: "Music kit",
  pin: "Pin",
}

const slotOrder: SkinchangerSlot[] = ["weapon", "knife", "glove", "agent", "music_kit", "pin"]

const teamChipTone: Record<TeamScope, string> = {
  all: "border-white/12 bg-white/[0.06] text-white/70",
  t: "border-amber-300/25 bg-amber-300/10 text-amber-100",
  ct: "border-sky-300/25 bg-sky-300/10 text-sky-100",
}

/**
 * Rebuilds the base model a saved entry belongs to. The slot key already encodes that model, so the
 * reconstructed item produces exactly the same key and editing replaces the entry instead of adding one.
 */
function modelFromEntry(entry: SkinchangerLoadoutEntry): SkinchangerCatalogItem | null {
  const skin = entry.skinchanger_catalog_items
  if (!skin) return null
  const key = entry.slot_key.includes(":") ? entry.slot_key.slice(entry.slot_key.indexOf(":") + 1) : entry.slot_key
  const numericKey = /^\d+$/.test(key) ? Number(key) : null
  return {
    ...skin,
    id: `model:${entry.slot_key}`,
    display_name: skin.weapon_class ?? skin.display_name,
    category: entry.slot === "weapon" ? "weapon" : (entry.slot as SkinchangerCategory),
    weapon_defindex: numericKey,
    weapon_class: numericKey === null ? key : skin.weapon_class,
    metadata: { ...skin.metadata, rarity: undefined },
  }
}

function collectionForSlot(slot: SkinchangerSlot): CollectionId {
  if (slot === "knife") return "knife"
  if (slot === "glove") return "glove"
  if (slot === "music_kit") return "music_kit"
  if (slot === "pin") return "pin"
  return "skins"
}

export function SkinchangerPage() {
  const [collection, setCollection] = useState<CollectionId>("skins")
  const [skinGroup, setSkinGroup] = useState<SkinchangerFirearmGroup | "agents">("Rifles")
  const [query, setQuery] = useState("")
  const [weaponClass, setWeaponClass] = useState("")
  const [offset, setOffset] = useState(0)
  const [activeWeapon, setActiveWeapon] = useState<SkinchangerCatalogItem | null>(null)
  const [selected, setSelected] = useState<SkinchangerCatalogItem | null>(null)
  const [agentTeam, setAgentTeam] = useState<"t" | "ct" | null>(null)
  const [teamScope, setTeamScope] = useState<TeamScope>("all")
  const [defaultChoice, setDefaultChoice] = useState<"knife" | "glove" | null>(null)
  const [customOptions, setCustomOptions] = useState<SkinchangerAppearanceOptions>({ wear: 0.0001, seed: 0, statTrak: false, stickers: [] })
  const [selectedAccessories, setSelectedAccessories] = useState<Record<string, SkinchangerCatalogItem>>({})
  const [accessoryPicker, setAccessoryPicker] = useState<"sticker" | "charm" | null>(null)
  const [accessoryQuery, setAccessoryQuery] = useState("")
  const [editingStickerSlot, setEditingStickerSlot] = useState<number | null>(null)
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ model: SkinchangerCatalogItem; entry: SkinchangerLoadoutEntry } | null>(null)
  const [saving, setSaving] = useState(false)
  const [applying, setApplying] = useState(false)
  const [optimisticLoadoutEntries, setOptimisticLoadoutEntries] = useState<SkinchangerLoadoutEntry[] | null>(null)
  const [optimisticLoadoutVersion, setOptimisticLoadoutVersion] = useState<number | null>(null)
  // Opening a team-locked model moves the switch to that side; going back to the grid restores it.
  const gridTeamRef = useRef<TeamScope | null>(null)

  const activeCategory = categoryMeta(collection)
  const category: SkinchangerCategory = collection === "skins" && skinGroup === "agents" ? "agent" : activeCategory.category
  const activeSlot: SkinchangerSlot = category === "agent" ? "agent" : activeCategory.slot
  const effectiveCategory: SkinchangerCategory = activeWeapon ? (["glove", "knife"] as SkinchangerCategory[]).includes(category) ? category : "weapon_skin" : category
  const effectiveWeaponClass = activeWeapon?.weapon_class ?? (weaponClass || undefined)
  const catalogQueryKey = `${collection}:${skinGroup}:${effectiveCategory}:${effectiveWeaponClass ?? ""}:${category === "agent" ? agentTeam ?? "" : ""}:${query}:${offset}`
  // Firearms and knives are browsed as one category grid; every other view keeps the paged catalogue.
  const isGridView = !activeWeapon && (collection === "skins" || collection === "knife") && skinGroup !== "agents"
  const activeTab: BrowseTab = collection === "skins" || collection === "knife" ? (skinGroup === "agents" ? "agents" : "weapons") : collection as BrowseTab
  const { data: catalog, loading: catalogLoading, error: catalogError, refetch: refetchCatalog } =
    useApiQuery((signal) => skinchangerService.getCatalog({ category: effectiveCategory, weaponClass: effectiveWeaponClass, team: category === "agent" ? agentTeam ?? undefined : undefined, query: query || undefined, limit: 36, offset }, { signal }), { queryKey: catalogQueryKey, enabled: !isGridView })
  const { data: firearmModels, loading: firearmsLoading, error: firearmsError, refetch: refetchFirearms } =
    useApiQuery((signal) => skinchangerService.getCatalog({ category: "weapon", limit: 100, offset: 0 }, { signal }), { queryKey: "grid:firearms", enabled: isGridView })
  const { data: knifeModels, loading: knivesLoading, error: knivesError, refetch: refetchKnives } =
    useApiQuery((signal) => skinchangerService.getCatalog({ category: "knife", limit: 100, offset: 0 }, { signal }), { queryKey: "grid:knives", enabled: isGridView })
  const { data: facets } = useApiQuery((signal) => skinchangerService.getCatalogFacets(effectiveCategory, { signal }), { queryKey: effectiveCategory })
  const { data: loadoutResponse, refetch: refetchLoadout } =
    useApiQuery((signal) => skinchangerService.getLoadout({ signal }))
  // The loadout is only worth anything once it reaches the server the player is on.
  const { data: activeServer } = useApiQuery((signal) => skinchangerService.getActiveServer({ signal }))
  const { data: jobStatus, refetch: refetchJobs } = useApiQuery((signal) => skinchangerService.getStatus({ signal }))
  const { data: stickerCatalog, loading: stickersLoading, error: stickerCatalogError, refetch: refetchStickers } = useApiQuery(
    (signal) => skinchangerService.getCatalog({ category: "sticker", query: accessoryQuery || undefined, limit: 18, offset: 0 }, { signal }),
    { enabled: Boolean(selected && accessoryPicker === "sticker"), queryKey: `sticker:${accessoryQuery.trim()}` },
  )
  const { data: charmCatalog, loading: charmsLoading, error: charmCatalogError, refetch: refetchCharms } = useApiQuery(
    (signal) => skinchangerService.getCatalog({ category: "charm", query: accessoryQuery || undefined, limit: 18, offset: 0 }, { signal }),
    { enabled: Boolean(selected && accessoryPicker === "charm"), queryKey: `charm:${accessoryQuery.trim()}` },
  )

  const catalogItems = catalog?.data ?? []
  const totalCatalogItems = catalog?.pagination.total ?? 0
  const pageSize = catalog?.pagination.limit ?? 36
  const categoryCounts = new Map((facets?.categories ?? []).map((entry) => [entry.category, entry.count]))
  const remoteLoadoutEntries = loadoutResponse?.loadout.skinchanger_loadout_entries ?? []
  const loadoutEntries = optimisticLoadoutEntries ?? remoteLoadoutEntries
  const loadoutVersion = optimisticLoadoutVersion ?? loadoutResponse?.loadout.version ?? 0
  const catalogTeamScope = activeWeapon ? teamScopeFromMetadata(activeWeapon) : "all"
  const selectedTeamScope: TeamScope = category === "agent" && agentTeam ? agentTeam : catalogTeamScope !== "all" ? catalogTeamScope : teamScope
  const selectedSlotKey = activeWeapon ? slotKeyForCatalogItem(activeWeapon, category) : activeSlot
  const hasOtherEquippedKnifeOrGloveLook = Boolean(
    activeWeapon
    && (category === "knife" || category === "glove")
    && loadoutEntries.some((entry) => entry.slot === category && entry.slot_key !== selectedSlotKey),
  )
  const automaticOppositeTeamScope = activeWeapon && (category === "knife" || category === "glove")
    ? (() => {
        const otherLook = loadoutEntries.find((entry) => entry.slot === category && entry.slot_key !== selectedSlotKey && (entry.team_scope === "t" || entry.team_scope === "ct"))
        return otherLook?.team_scope === "t" ? "ct" as const : otherLook?.team_scope === "ct" ? "t" as const : null
      })()
    : null
  const automaticOppositeTeamForModel = (model: SkinchangerCatalogItem): Exclude<TeamScope, "all"> | null => {
    if (category !== "knife" && category !== "glove") return null
    const modelSlotKey = slotKeyForCatalogItem(model, category)
    const otherLook = loadoutEntries.find((entry) => entry.slot === category && entry.slot_key !== modelSlotKey && (entry.team_scope === "t" || entry.team_scope === "ct"))
    return otherLook?.team_scope === "t" ? "ct" : otherLook?.team_scope === "ct" ? "t" : null
  }
  const showTeamSelector = Boolean(activeWeapon) && category !== "agent" && catalogTeamScope === "all" && !automaticOppositeTeamScope
  const minWear = Math.max(0, Math.min(1, metadataNumber(selected, "minWear", 0.0001)))
  const maxWear = Math.max(minWear, Math.min(1, metadataNumber(selected, "maxWear", 1)))
  const defaultWear = Math.max(minWear, Math.min(maxWear, 0.0001))
  const savedEntryForActiveSlot = loadoutEntries.find((entry) => entry.slot_key === selectedSlotKey && entry.team_scope === selectedTeamScope)
    ?? ((category === "knife" || category === "glove")
      ? loadoutEntries.find((entry) => entry.slot_key === category && entry.slot === category && entry.team_scope === selectedTeamScope && entry.skinchanger_catalog_items?.weapon_class === activeWeapon?.weapon_class)
      : undefined)
  const savedItemForActiveSlot = savedEntryForActiveSlot?.skinchanger_catalog_items ?? null
  const previewChoice = selected ?? savedItemForActiveSlot ?? (defaultChoice === category ? defaultModelItem(defaultChoice) : null)
  const canCustomizeAccessories = Boolean(activeWeapon && category === "weapon")
  const selectedCharmItem = customOptions.charm ? selectedAccessories[customOptions.charm.catalogItemId] ?? null : null
  const savedAccessories = savedEntryForActiveSlot?.resolved_accessories ?? []
  const previewAccessoryById = new Map([...savedAccessories, ...Object.values(selectedAccessories)].map((item) => [item.id, item]))
  const previewOptions = selected ? customOptions : savedEntryForActiveSlot?.options
  const previewStickerItems = (previewOptions?.stickers ?? []).map((sticker) => previewAccessoryById.get(sticker.catalogItemId)).filter((item): item is SkinchangerCatalogItem => Boolean(item))
  const previewCharmItem = previewOptions?.charm ? previewAccessoryById.get(previewOptions.charm.catalogItemId) ?? null : null
  const accessoryCatalog = accessoryPicker === "sticker" ? stickerCatalog : charmCatalog
  const accessoriesLoading = accessoryPicker === "sticker" ? stickersLoading : charmsLoading
  const accessoryCatalogError = accessoryPicker === "sticker" ? stickerCatalogError : charmCatalogError
  const refetchAccessoryCatalog = accessoryPicker === "sticker" ? refetchStickers : refetchCharms

  useEffect(() => {
    if (loadoutResponse && optimisticLoadoutVersion !== null && loadoutResponse.loadout.version >= optimisticLoadoutVersion) {
      setOptimisticLoadoutEntries(null)
      setOptimisticLoadoutVersion(null)
    }
  }, [loadoutResponse?.loadout.version, optimisticLoadoutVersion])

  useEffect(() => {
    if (!selected) {
      setAccessoryPicker(null)
      setEditingStickerSlot(null)
      return
    }
    const savedOptions = loadoutEntries.find((entry) => entry.catalog_item_id === selected.id && entry.slot_key === selectedSlotKey && entry.team_scope === selectedTeamScope)?.options
    setCustomOptions({
      wear: savedOptions?.wear ?? Math.max(0, Math.min(1, metadataNumber(selected, "minWear", 0.0001))),
      seed: savedOptions?.seed ?? 0,
      statTrak: savedOptions?.statTrak ?? false,
      nameTag: savedOptions?.nameTag,
      stickers: savedOptions?.stickers ?? [],
      charm: savedOptions?.charm,
    })
    setAccessoryPicker(null)
    setEditingStickerSlot(null)
  }, [loadoutEntries, selected, selectedSlotKey, selectedTeamScope])

  useEffect(() => {
    if (catalogTeamScope !== "all" && teamScope !== catalogTeamScope) setTeamScope(catalogTeamScope)
  }, [catalogTeamScope, teamScope])

  useEffect(() => {
    if (automaticOppositeTeamScope && teamScope !== automaticOppositeTeamScope) {
      setTeamScope(automaticOppositeTeamScope)
      return
    }
    if (hasOtherEquippedKnifeOrGloveLook && teamScope === "all") setTeamScope("ct")
  }, [automaticOppositeTeamScope, hasOtherEquippedKnifeOrGloveLook, teamScope])

  const selectedAlreadyEquipped = useMemo(
    () => selected ? loadoutEntries.some((entry) => entry.catalog_item_id === selected.id && entry.slot_key === selectedSlotKey && entry.team_scope === selectedTeamScope && normalizeAppearanceOptions(entry.options) === normalizeAppearanceOptions(customOptions)) : false,
    [customOptions, loadoutEntries, selected, selectedSlotKey, selectedTeamScope],
  )

  const canUseLegacyLoadoutFallback = (error: unknown) => {
    const apiError = error as Partial<ApiError>
    return apiError.status === 404 || apiError.status === 405
  }

  const saveEntryWithCompatibility = async (entry: { catalogItemId: string; slot: SkinchangerSlot; slotKey: string; teamScope: TeamScope; options: SkinchangerAppearanceOptions }) => {
    try {
      return await skinchangerService.saveLoadoutEntry({ expectedVersion: loadoutVersion, entry })
    } catch (error) {
      if (!canUseLegacyLoadoutFallback(error)) throw error
      const entries = loadoutEntries
        .filter((current) => !(current.slot_key === entry.slotKey && current.team_scope === entry.teamScope))
        .map((current) => ({ catalogItemId: current.catalog_item_id, slot: current.slot, slotKey: current.slot_key, teamScope: current.team_scope, options: current.options }))
      entries.push(entry)
      const result = await skinchangerService.saveLoadout({ entries })
      return { version: result.version }
    }
  }

  const removeEntryWithCompatibility = async (entry: Pick<SkinchangerLoadoutEntry, "slot_key" | "team_scope">, expectedVersion: number) => {
    try {
      return await skinchangerService.removeLoadoutEntry({ expectedVersion, slotKey: entry.slot_key, teamScope: entry.team_scope })
    } catch (error) {
      if (!canUseLegacyLoadoutFallback(error)) throw error
      const retainedEntries = loadoutEntries
        .filter((current) => !(current.slot_key === entry.slot_key && current.team_scope === entry.team_scope))
        .map((current) => ({ catalogItemId: current.catalog_item_id, slot: current.slot, slotKey: current.slot_key, teamScope: current.team_scope, options: current.options }))
      if (retainedEntries.length === loadoutEntries.length) throw error
      const result = await skinchangerService.saveLoadout({ entries: retainedEntries })
      return { version: result.version, removed: true }
    }
  }

  const equipSelected = async () => {
    if (!selected) return
    setSaving(true)
    try {
      const result = await saveEntryWithCompatibility({ catalogItemId: selected.id, slot: activeSlot, slotKey: selectedSlotKey, teamScope: selectedTeamScope, options: customOptions })
      const savedOptions: SkinchangerAppearanceOptions = {
        ...customOptions,
        stickers: [...(customOptions.stickers ?? [])],
        charm: customOptions.charm ? { ...customOptions.charm } : undefined,
      }
      const savedEntry: SkinchangerLoadoutEntry = {
        catalog_item_id: selected.id,
        slot: activeSlot,
        slot_key: selectedSlotKey,
        team_scope: selectedTeamScope,
        options: savedOptions,
        skinchanger_catalog_items: selected,
        resolved_accessories: Object.values(selectedAccessories),
      }
      const sharedLook = (activeSlot === "knife" || activeSlot === "glove") && selectedTeamScope !== "all"
        ? loadoutEntries.find((entry) => entry.slot === activeSlot && entry.team_scope === "all")
        : undefined
      const reassignSharedLook = sharedLook && sharedLook.catalog_item_id !== selected.id
        ? { ...sharedLook, team_scope: selectedTeamScope === "t" ? "ct" as const : "t" as const }
        : undefined
      setOptimisticLoadoutEntries([
        ...loadoutEntries.filter((entry) => {
          if (entry.slot_key === selectedSlotKey && entry.team_scope === selectedTeamScope) return false
          if (sharedLook && entry.slot_key === sharedLook.slot_key && entry.team_scope === "all") return false
          return true
        }),
        ...(reassignSharedLook ? [reassignSharedLook] : []),
        savedEntry,
      ])
      setOptimisticLoadoutVersion(result.version)
      toast.success("Your choice is ready for your next LEGACY-X game.")
      refetchLoadout()
    } catch {
      toast.error("Could not save your choice. Try again.")
    } finally {
      setSaving(false)
    }
  }

  const equipDefaultModel = async (defaultCategory: "knife" | "glove") => {
    setSaving(true)
    try {
      const entriesToRemove = loadoutEntries.filter((entry) => entry.slot === defaultCategory && entry.team_scope === selectedTeamScope)
      let expectedVersion = loadoutVersion
      for (const entry of entriesToRemove) {
        const result = await removeEntryWithCompatibility(entry, expectedVersion)
        expectedVersion = result.version
      }
      setOptimisticLoadoutEntries(loadoutEntries.filter((entry) => !(entry.slot === defaultCategory && entry.team_scope === selectedTeamScope)))
      setOptimisticLoadoutVersion(entriesToRemove.length ? expectedVersion : loadoutVersion)
      setDefaultChoice(defaultCategory)
      setSelected(null)
      toast.success(`${defaultCategory === "knife" ? "Default knife" : "Default gloves"} selected.`)
      refetchLoadout()
    } catch {
      toast.error("Could not select the default item. Try again.")
    } finally {
      setSaving(false)
    }
  }

  const deleteSavedLook = async () => {
    if (!deleteConfirm) return
    const { entry, model } = deleteConfirm
    setSaving(true)
    try {
      const result = await removeEntryWithCompatibility(entry, loadoutVersion)
      setOptimisticLoadoutEntries(loadoutEntries.filter((current) => !(current.slot_key === entry.slot_key && current.team_scope === entry.team_scope)))
      setOptimisticLoadoutVersion(result.version)
      if (activeWeapon?.weapon_class === model.weapon_class) {
        setSelected(null)
        setAccessoryPicker(null)
        setEditingStickerSlot(null)
      }
      setDeleteConfirm(null)
      toast.success(`${model.display_name} look removed.`)
      refetchLoadout()
    } catch {
      toast.error("Could not remove this look. Try again.")
    } finally {
      setSaving(false)
    }
  }

  const applyToServer = async () => {
    const serverId = activeServer?.session?.server_id
    if (!serverId || applying) return
    setApplying(true)
    try {
      await skinchangerService.queueApply(serverId)
      toast.success("Sent to your server. It applies on your next respawn.")
      refetchJobs()
    } catch {
      toast.error("Could not send your loadout to the server. Try again.")
    } finally {
      setApplying(false)
    }
  }

  /** Opens a saved look in the browser panel, ready to edit. */
  const openSavedEntry = (entry: SkinchangerLoadoutEntry) => {
    const savedItem = entry.skinchanger_catalog_items
    if (!savedItem) return
    setCollection(collectionForSlot(entry.slot))
    setQuery("")
    setWeaponClass("")
    setOffset(0)
    setDefaultChoice(null)
    setAccessoryPicker(null)
    setEditingStickerSlot(null)

    if (entry.slot === "agent") {
      setSkinGroup("agents")
      setAgentTeam(entry.team_scope === "ct" ? "ct" : "t")
      setActiveWeapon(null)
      setSelected(savedItem)
      setTeamScope(entry.team_scope)
      return
    }

    const model = modelFromEntry(entry)
    if (!model) return
    if (entry.slot === "weapon") setSkinGroup((savedItem.metadata.weaponGroup as SkinchangerFirearmGroup | undefined) ?? "Rifles")
    setAgentTeam(null)
    customizeSavedLook(model, entry)
  }

  const selectSkin = (item: SkinchangerCatalogItem) => {
    setSelected(item)
    setAccessoryPicker(null)
    setEditingStickerSlot(null)
  }

  const customizeSavedLook = (item: SkinchangerCatalogItem, entry: typeof loadoutEntries[number]) => {
    const savedItem = entry.skinchanger_catalog_items
    if (!savedItem) return
    setDefaultChoice(null)
    setActiveWeapon(item)
    setSelected(savedItem)
    setTeamScope(entry.team_scope)
    setCustomOptions({
      wear: entry.options.wear ?? Math.max(0, Math.min(1, metadataNumber(savedItem, "minWear", 0.0001))),
      seed: entry.options.seed ?? 0,
      statTrak: entry.options.statTrak ?? false,
      nameTag: entry.options.nameTag,
      stickers: entry.options.stickers ?? [],
      charm: entry.options.charm,
    })
    setSelectedAccessories(Object.fromEntries((entry.resolved_accessories ?? []).map((accessory) => [accessory.id, accessory])))
    setAccessoryPicker(null)
    setEditingStickerSlot(null)
    setWeaponClass("")
    setOffset(0)
  }

  /* -------------------------------------------------------------------------
   * Category grid (firearms + knives)
   * ---------------------------------------------------------------------- */

  /**
   * The saved look a grid card shows for the team selected at the top. Team-locked firearms always
   * show their own team; a "Both" look counts for either side.
   */
  const gridEntryFor = (item: SkinchangerCatalogItem, gridCategory: "weapon" | "knife") => {
    const slotKey = slotKeyForCatalogItem(item, gridCategory)
    const lockedTeam = teamScopeFromMetadata(item)
    const viewTeam: TeamScope = lockedTeam !== "all" ? lockedTeam : teamScope
    const matchesModel = (entry: SkinchangerLoadoutEntry) => entry.slot_key === slotKey
      // Older knife looks were stored under the plain "knife" slot key.
      || (gridCategory === "knife" && entry.slot === "knife" && entry.slot_key === "knife" && entry.skinchanger_catalog_items?.weapon_class === item.weapon_class)
    return loadoutEntries.find((entry) => matchesModel(entry) && entry.team_scope === viewTeam)
      ?? (viewTeam !== "all" ? loadoutEntries.find((entry) => matchesModel(entry) && entry.team_scope === "all") : undefined)
  }

  /** Card body: open the skin picker for this model, keeping the team chosen at the top. */
  const openGridPicker = (item: SkinchangerCatalogItem, gridCategory: "weapon" | "knife") => {
    gridTeamRef.current = teamScope
    setCollection(gridCategory === "knife" ? "knife" : "skins")
    setDefaultChoice(null)
    setActiveWeapon(item)
    setSelected(null)
    setWeaponClass("")
    setQuery("")
    setOffset(0)
  }

  /** Customize icon: edit the saved skin's wear, stickers, charm, StatTrak and name tag. */
  const customizeGridItem = (item: SkinchangerCatalogItem, gridCategory: "weapon" | "knife", entry: SkinchangerLoadoutEntry | undefined) => {
    if (!entry?.skinchanger_catalog_items) {
      openGridPicker(item, gridCategory)
      return
    }
    gridTeamRef.current = teamScope
    setCollection(gridCategory === "knife" ? "knife" : "skins")
    setQuery("")
    customizeSavedLook(item, entry)
  }

  const gridSearch = query.trim().toLowerCase()
  const gridSections = weaponGridGroups.map((group) => {
    const source = group === "Knives"
      ? (knifeModels?.data ?? []).filter((item) => item.display_name !== "Knife")
      : (firearmModels?.data ?? []).filter((item) => gridGroupForFirearm(item) === group)
    const items = source
      .filter((item) => !gridSearch || item.display_name.toLowerCase().includes(gridSearch))
      .sort((a, b) => group === "Knives" ? a.display_name.localeCompare(b.display_name) : firearmOrder(a) - firearmOrder(b))
    return { group, gridCategory: group === "Knives" ? "knife" as const : "weapon" as const, items }
  }).filter((section) => section.items.length > 0)
  const gridLoading = firearmsLoading || knivesLoading
  const gridError = firearmsError ?? knivesError

  const isModelBrowse = (category === "weapon" || category === "glove" || category === "knife") && !activeWeapon
  const isAgentTeamBrowse = category === "agent" && !agentTeam
  const defaultModelCard = category === "knife" || category === "glove" ? defaultModelItem(category) : null
  const displayedCatalogItems = [
    ...(isModelBrowse && defaultModelCard ? [defaultModelCard] : []),
    ...catalogItems.filter((item) => !(isModelBrowse && category === "knife" && item.display_name === "Knife")),
  ]

  const openStickerPicker = (slot: number) => {
    if (!canCustomizeAccessories) return
    setEditingStickerSlot(slot)
    setAccessoryPicker("sticker")
    setAccessoryQuery("")
  }

  const chooseAccessory = (item: SkinchangerCatalogItem) => {
    if (!canCustomizeAccessories) return
    const resolvedId = item.weapon_defindex ?? undefined
    setSelectedAccessories((current) => ({ ...current, [item.id]: item }))
    if (accessoryPicker === "sticker" && editingStickerSlot !== null) {
      setCustomOptions((current) => ({
        ...current,
        stickers: [...(current.stickers ?? []).filter((sticker) => sticker.slot !== editingStickerSlot), {
          catalogItemId: item.id,
          id: resolvedId,
          slot: editingStickerSlot,
          schema: 1,
          wear: 0,
          scale: 1,
          rotation: 0,
        }].sort((a, b) => a.slot - b.slot),
      }))
    }
    if (accessoryPicker === "charm") {
      setCustomOptions((current) => ({
        ...current,
        charm: { catalogItemId: item.id, id: resolvedId, offsetX: 0, offsetY: 0, offsetZ: 0, seed: 0 },
      }))
    }
    setAccessoryPicker(null)
    setEditingStickerSlot(null)
  }

  const session = activeServer?.session ?? null
  const latestJob = jobStatus?.jobs?.[0] ?? null
  const jobTone = latestJob?.status === "applied"
    ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-100"
    : latestJob?.status === "failed"
      ? "border-red-300/25 bg-red-300/10 text-red-100"
      : "border-white/12 bg-white/[0.05] text-white/70"

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6">
      <header className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight">Skinchanger</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {loadoutEntries.length === 0 ? "Nothing saved yet" : `${loadoutEntries.length} item${loadoutEntries.length === 1 ? "" : "s"} saved`}
            {loadoutResponse?.loadout.updated_at ? " · updated " : ""}
            {loadoutResponse?.loadout.updated_at ? <RelativeTime value={loadoutResponse.loadout.updated_at} /> : null}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
            <span className={cn("size-2 shrink-0 rounded-full", session ? "bg-emerald-300" : "bg-white/25")} />
            <div className="min-w-0">
              <p className="truncate text-xs font-medium">{session ? session.server_id : "Not on a LEGACY-X server"}</p>
              <p className="truncate text-[10px] text-muted-foreground">{session ? `Playing as ${session.player_name}` : "Join a server to apply your loadout"}</p>
            </div>
          </div>
          {latestJob && (
            <span className={cn("inline-flex h-7 shrink-0 items-center rounded-md border px-2 text-[10px] font-semibold uppercase tracking-wide", jobTone)}>
              {latestJob.status}
            </span>
          )}
          <Button onClick={() => void applyToServer()} disabled={!session || applying || loadoutEntries.length === 0} className="shrink-0">
            {applying ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Apply to server
          </Button>
        </div>
      </header>

      {(activeTab === "weapons" || activeTab === "glove") && (() => {
        // One team switch for the whole page. Team-locked models (e.g. AK-47, M4A4) and knife/glove
        // pairs keep the existing automatic rules; the switch then shows the side that will be used.
        const teamLocked = Boolean(activeWeapon) && !showTeamSelector
        const shownTeam = teamLocked ? selectedTeamScope : teamScope
        const hint = teamLocked && activeWeapon
          ? `${activeWeapon.display_name} saves for ${selectedTeamScope === "t" ? "T" : selectedTeamScope === "ct" ? "CT" : "both sides"}`
          : isGridView ? "Cards show the look saved for this side" : "This look saves for the selected side"
        return (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Team</p>
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{hint}</p>
            </div>
            <div role="radiogroup" aria-label="Team" className="flex rounded-lg border border-border bg-background p-1">
              {teamOptions.map((team) => {
                const isActive = shownTeam === team.id
                const isUnavailableBoth = team.id === "all" && hasOtherEquippedKnifeOrGloveLook
                const disabled = teamLocked || isUnavailableBoth
                return (
                  <button
                    key={team.id}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    disabled={disabled}
                    onClick={() => setTeamScope(team.id)}
                    title={isUnavailableBoth ? "Another knife/glove look already uses Both. Choose T or CT." : teamLocked ? "This model's side is fixed" : undefined}
                    style={isActive ? { backgroundImage: teamScopeFade(team.id) } : undefined}
                    className={cn(
                      "flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition-colors",
                      isActive ? "bg-secondary text-foreground ring-1 ring-inset ring-white/15" : "text-muted-foreground hover:text-foreground",
                      disabled && !isActive && "cursor-not-allowed opacity-35",
                      disabled && isActive && "cursor-default",
                    )}
                  >
                    {team.id === "all" ? (
                      <span className="flex -space-x-1.5">
                        <img src={teamTIcon} alt="" className="size-4 object-contain" />
                        <img src={teamCtIcon} alt="" className="size-4 object-contain" />
                      </span>
                    ) : (
                      <img src={team.id === "t" ? teamTIcon : teamCtIcon} alt="" className="size-4 object-contain" />
                    )}
                    {team.label}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })()}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-w-0 rounded-xl border border-border bg-card">
          <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 gap-1 overflow-x-auto pb-1 sm:pb-0">
              {browseTabs.map((item) => {
                const Icon = item.icon
                const isActive = activeTab === item.id
                const iconTone = item.invertIcon
                  ? (isActive ? "brightness-0" : "brightness-0 invert")
                  : (isActive ? "brightness-0" : "")
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCollection(item.id === "weapons" || item.id === "agents" ? "skins" : item.id)
                      setSkinGroup(item.id === "agents" ? "agents" : "Rifles")
                      setWeaponClass("")
                      setAgentTeam(null)
                      setTeamScope("all")
                      setOffset(0)
                      setActiveWeapon(null)
                      setSelected(null)
                      setQuery("")
                    }}
                    className={cn(
                      "flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition-colors",
                      isActive ? "bg-foreground text-background" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                    )}
                  >
                    {item.iconAsset ? <OptimizedImage src={item.iconAsset} width={14} height={14} alt="" priority className={cn("size-3.5 object-contain", iconTone)} /> : <Icon className="size-3.5" />} {item.label} {item.countCategory && <span className="text-[10px] opacity-65">{categoryCounts.get(item.countCategory) ?? "—"}</span>}
                  </button>
                )
              })}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              {activeWeapon && (
                <button onClick={() => { if (collection === "knife") setCollection("skins"); if (gridTeamRef.current) { setTeamScope(gridTeamRef.current); gridTeamRef.current = null } setActiveWeapon(null); setSelected(null); setQuery(""); setOffset(0) }} className="flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-secondary"><ArrowLeft className="size-3.5" /> {activeWeapon.display_name}</button>
              )}
              {category === "agent" && agentTeam && (
                <button onClick={() => { setAgentTeam(null); setTeamScope("all"); setSelected(null); setQuery(""); setOffset(0) }} className="flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground hover:bg-secondary"><ArrowLeft className="size-3.5" /> {agentTeam === "t" ? "T agents" : "CT agents"}</button>
              )}
              {!isAgentTeamBrowse && <label className="relative block sm:w-56">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(event) => { setQuery(event.target.value); setOffset(0) }} placeholder={`Search ${activeWeapon ? `${activeWeapon.display_name} skins` : isGridView ? "weapons" : category === "agent" ? "agents" : activeCategory.label.toLowerCase()}...`} className="h-9 pl-9 text-xs" />
              </label>}
            </div>
          </div>

          {activeWeapon && (
            <div className="flex items-center gap-3 border-b border-border bg-secondary/20 px-4 py-3">
              {(category === "glove" ? `${defaultGloveVisual}?catalog_item_id=${encodeURIComponent(activeWeapon.id)}` : catalogImageUrl(activeWeapon)) && <OptimizedImage src={category === "glove" ? `${defaultGloveVisual}?catalog_item_id=${encodeURIComponent(activeWeapon.id)}` : catalogImageUrl(activeWeapon) ?? ""} width={40} height={40} priority alt={`${activeWeapon.display_name} base weapon`} data-catalog-item-id={activeWeapon.id} className="size-10 object-contain" />}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{activeWeapon.display_name}</p>
                <p className="text-xs text-muted-foreground">{savedItemForActiveSlot ? `Saved: ${savedSkinLabel(savedItemForActiveSlot)}` : "Choose a skin below"}</p>
              </div>
            </div>
          )}
          {isGridView ? (
            gridError || (gridLoading && gridSections.length === 0) || gridSections.length === 0 ? (
              <QueryState
                loading={gridLoading}
                error={gridError ? { ...gridError, message: "Could not load weapons. Please try again." } : null}
                empty={!gridLoading && !gridError && gridSections.length === 0}
                onRetry={() => { refetchFirearms(); refetchKnives() }}
                emptyMessage={gridSearch ? "No weapons match this search." : "No weapons available."}
              />
            ) : (
              <div className="flex flex-col gap-6 p-4">
                {gridSections.map((section) => {
                  const equippedCount = section.items.filter((item) => gridEntryFor(item, section.gridCategory)?.skinchanger_catalog_items).length
                  return (
                    <section key={section.group} aria-label={section.group}>
                      <div className="mb-2.5 flex items-baseline justify-between gap-2">
                        <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{section.group}</h3>
                        <span className="text-[10px] tabular-nums text-muted-foreground/70">{equippedCount}/{section.items.length} equipped</span>
                      </div>
                      <div className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-2">
                        {section.items.map((item) => {
                          const entry = gridEntryFor(item, section.gridCategory)
                          const savedItem = entry?.skinchanger_catalog_items ?? null
                          const rarity = savedItem ? rarityStyle(savedItem) : null
                          const image = catalogImageUrl(savedItem ?? item)
                          const lockedTeam = teamScopeFromMetadata(item)
                          // A T-only rifle while the switch is on CT (or the reverse) is shown, but dimmed.
                          const offSide = section.gridCategory === "weapon" && lockedTeam !== "all" && teamScope !== "all" && lockedTeam !== teamScope
                          const teamLabel = entry?.team_scope === "t" ? "T" : entry?.team_scope === "ct" ? "CT" : "Both"
                          return (
                            <div
                              key={item.id}
                              data-catalog-item-id={item.id}
                              style={rarity ? { backgroundImage: `radial-gradient(ellipse 95% 78% at 0% 100%, ${rarity.glow} 0%, transparent 68%)` } : undefined}
                              className={cn(
                                "group relative aspect-square overflow-hidden rounded-lg border bg-background/60 transition-[border-color,opacity] duration-150 hover:border-foreground/30",
                                savedItem ? "border-border" : "border-border/60",
                                offSide && "opacity-45 hover:opacity-100",
                              )}
                            >
                              {rarity && <span aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100" style={{ backgroundImage: `radial-gradient(ellipse 105% 88% at 0% 100%, ${strongerGlow(rarity.glow)} 0%, transparent 70%)` }} />}
                              {entry && <span aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ backgroundImage: teamScopeFade(entry.team_scope) }} />}

                              {/* Card body: opens the skin picker for this model. */}
                              <button
                                type="button"
                                onClick={() => openGridPicker(item, section.gridCategory)}
                                aria-label={savedItem ? `Change ${item.display_name} skin (${savedSkinLabel(savedItem)})` : `Choose a ${item.display_name} skin`}
                                className="absolute inset-0 z-[1] rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-foreground/60"
                              />

                              <div className="pointer-events-none relative flex h-full flex-col p-2.5">
                                <div className="flex min-h-0 flex-1 items-center justify-center">
                                  {image ? (
                                    <OptimizedImage
                                      src={image}
                                      width={200}
                                      height={150}
                                      alt=""
                                      data-catalog-item-id={(savedItem ?? item).id}
                                      className="max-h-full w-full object-contain transition-[filter,transform] duration-150 group-hover:scale-[1.03] group-hover:blur-[4px] group-has-[:focus-visible]:blur-[4px]"
                                    />
                                  ) : (
                                    <ImageOff className="size-7 text-muted-foreground/50" />
                                  )}
                                </div>
                                <p className="mt-1 truncate text-xs font-semibold">{item.display_name}</p>
                                <p className="truncate text-[10px] text-muted-foreground" style={rarity ? { color: rarity.accent } : undefined}>
                                  {savedItem ? savedSkinLabel(savedItem) : "Default"}
                                </p>
                              </div>

                              {entry && savedItem && (
                                <span className={cn("pointer-events-none absolute left-1.5 top-1.5 z-[2] rounded border px-1 py-px text-[9px] font-semibold", teamChipTone[entry.team_scope])}>{teamLabel}</span>
                              )}

                              {/* Customize: edits the equipped skin; without one it simply opens the picker. */}
                              <button
                                type="button"
                                onClick={(event) => { event.stopPropagation(); customizeGridItem(item, section.gridCategory, entry) }}
                                aria-label={savedItem ? `Customize ${savedItem.display_name}` : `Choose a ${item.display_name} skin`}
                                title={savedItem ? "Customize" : "Choose a skin"}
                                className="absolute left-1/2 top-[42%] z-[2] flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white opacity-0 shadow-lg backdrop-blur-sm transition-opacity duration-150 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
                              >
                                <SlidersHorizontal className="size-4" />
                              </button>

                              {entry && savedItem && (
                                <button
                                  type="button"
                                  onClick={(event) => { event.stopPropagation(); setDeleteConfirm({ model: item, entry }) }}
                                  disabled={saving}
                                  aria-label={`Remove ${savedItem.display_name}`}
                                  title="Remove saved look"
                                  className="absolute right-1.5 top-1.5 z-[2] flex size-7 items-center justify-center rounded-md border border-border bg-background/90 text-muted-foreground opacity-0 shadow-sm backdrop-blur transition-[opacity,color,background-color] duration-150 hover:bg-destructive hover:text-destructive-foreground group-hover:opacity-100 focus-visible:opacity-100 disabled:pointer-events-none [@media(hover:none)]:opacity-100"
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </section>
                  )
                })}
              </div>
            )
          ) : isAgentTeamBrowse ? (
            <div className="grid grid-cols-2 gap-px bg-background">
              {agentTeamOptions.map((team) => (
                <button key={team.id} onClick={() => { setAgentTeam(team.id); setTeamScope(team.id); setSelected(null); setQuery(""); setOffset(0) }} className="group relative min-h-56 overflow-hidden bg-card p-5 text-left transition-colors hover:bg-secondary/50">
                  <div className={cn("pointer-events-none absolute inset-y-0 left-0 w-4/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100", team.id === "t" ? "bg-[radial-gradient(ellipse_at_left,rgba(251,191,36,0.22),transparent_68%)]" : "bg-[radial-gradient(ellipse_at_left,rgba(56,189,248,0.22),transparent_68%)]")} />
                    <div className="relative">
                    <div className="flex size-14 items-center justify-center rounded-lg border border-border bg-background p-2.5 group-hover:bg-secondary"><OptimizedImage src={team.icon} width={56} height={56} priority alt={`${team.label} team icon`} className="size-full object-contain" /></div>
                    <p className="mt-8 text-lg font-semibold">{team.title}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{team.description}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : <>
          <QueryState loading={catalogLoading} error={catalogError ? { ...catalogError, message: "Could not load the collection. Please try again." } : null} empty={!catalogLoading && !catalogError && catalogItems.length === 0} onRetry={refetchCatalog} emptyMessage={activeWeapon ? "No skins match this search." : "No items match this search."} />
          {!catalogLoading && !catalogError && catalogItems.length > 0 && (
            <div className="grid grid-cols-2 gap-px bg-background sm:grid-cols-3 lg:grid-cols-4">
              {displayedCatalogItems.map((item, index) => (
                (() => {
                  const isDefaultModel = Boolean(item.metadata.builtinDefault)
                  const modelSlotKey = slotKeyForCatalogItem(item, category)
                  const canonicalCardTeamScope = teamScopeFromMetadata(item)
                  const savedEntryForCard = isModelBrowse
                    ? loadoutEntries.find((entry) => entry.slot_key === modelSlotKey && entry.skinchanger_catalog_items?.weapon_class === item.weapon_class && (canonicalCardTeamScope === "all" || entry.team_scope === canonicalCardTeamScope))
                      ?? loadoutEntries.find((entry) => (category === "knife" || category === "glove") && entry.slot_key === category && entry.skinchanger_catalog_items?.weapon_class === item.weapon_class && (canonicalCardTeamScope === "all" || entry.team_scope === canonicalCardTeamScope))
                      ?? loadoutEntries.find((entry) => entry.slot_key === modelSlotKey && entry.skinchanger_catalog_items?.weapon_class === item.weapon_class)
                    : null
                  const savedCardItem = savedEntryForCard?.skinchanger_catalog_items ?? null
                  const itemImageUrl = catalogImageUrl(savedCardItem ?? item)
                  const hideUnsavedGloveFade = category === "glove" && isModelBrowse && !savedCardItem
                  const rarity = hideUnsavedGloveFade ? null : rarityStyle(savedCardItem ?? item)
                  const isSelectedSkin = selected?.id === item.id
                  const cardTeamScope = isModelBrowse
                    ? savedEntryForCard?.team_scope ?? (isDefaultModel && defaultChoice === category ? teamScope : null)
                    : null
                  const cardKicker = isModelBrowse
                    ? (item.metadata.weaponGroup as string | undefined) ?? item.weapon_class ?? activeCategory.label
                    : item.weapon_class ?? activeCategory.label
                  const cardTitle = isModelBrowse ? item.display_name : savedSkinLabel(item)
                  const cardRarityName = typeof (savedCardItem ?? item).metadata.rarity === "string" ? (savedCardItem ?? item).metadata.rarity as string : null
                  const cardTeamLabel = savedEntryForCard?.team_scope === "t" ? "T" : savedEntryForCard?.team_scope === "ct" ? "CT" : null
                  return (
                <div
                  key={item.id}
                  data-catalog-item-id={item.id}
                  style={rarity ? { backgroundImage: `radial-gradient(ellipse 95% 78% at 0% 100%, ${isSelectedSkin ? strongerGlow(rarity.glow) : rarity.glow} 0%, transparent 68%)` } : undefined}
                  className={cn(
                    "group relative min-h-48 overflow-hidden bg-card p-3 text-left transition-colors hover:bg-card",
                    isSelectedSkin && "ring-1 ring-inset ring-foreground/70",
                  )}
                >
                  {rarity && <span aria-hidden="true" className={cn("pointer-events-none absolute inset-0 transition-opacity duration-200", isSelectedSkin ? "opacity-100" : "opacity-0 group-hover:opacity-100")} style={{ backgroundImage: `radial-gradient(ellipse 105% 88% at 0% 100%, ${strongerGlow(rarity.glow)} 0%, transparent 70%)` }} />}
                  {isModelBrowse && cardTeamScope && <span aria-hidden="true" className="pointer-events-none absolute inset-0 z-[1]" style={{ backgroundImage: teamScopeFade(cardTeamScope) }} />}
                  {isModelBrowse && savedEntryForCard && (
                    <span className="pointer-events-none absolute right-2 top-2 z-[3] inline-flex items-center gap-1 rounded-md border border-emerald-300/30 bg-emerald-300/12 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-100">
                      <BadgeCheck className="size-3" />
                      {cardTeamLabel ?? "Both"}
                    </span>
                  )}
                  {isModelBrowse && savedEntryForCard && savedCardItem && (
                    <button
                      type="button"
                      aria-label={`Remove ${item.display_name} saved look`}
                      title="Remove saved look"
                      disabled={saving}
                      onClick={() => setDeleteConfirm({ model: item, entry: savedEntryForCard })}
                      className="absolute left-2 top-2 z-[3] flex size-8 scale-95 items-center justify-center rounded-md border border-border bg-background/90 text-muted-foreground opacity-0 shadow-sm backdrop-blur transition-[opacity,transform,color,background-color] duration-200 hover:bg-destructive hover:text-destructive-foreground focus:scale-100 focus:opacity-100 group-hover:scale-100 group-hover:opacity-100 disabled:pointer-events-none"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => isDefaultModel && (category === "knife" || category === "glove") ? void equipDefaultModel(category) : isModelBrowse ? (savedEntryForCard && savedCardItem ? customizeSavedLook(item, savedEntryForCard) : (setDefaultChoice(null), setTeamScope(automaticOppositeTeamForModel(item) ?? "all"), setActiveWeapon(item), setSelected(null), setWeaponClass(""), setOffset(0))) : selectSkin(item)}
                    title={isDefaultModel ? `Use ${item.display_name}` : isModelBrowse ? savedCardItem ? `Customize ${savedCardItem.display_name}` : `Browse ${item.display_name} skins` : `Choose ${item.display_name}`}
                    className="relative z-[2] block min-h-[11.25rem] w-full text-left"
                  >
                    <div className="flex h-28 items-center justify-center">
                      {itemImageUrl ? (
                        <OptimizedImage src={itemImageUrl} width={240} height={112} priority={index < 4} alt={`${item.display_name} collectible preview`} data-catalog-item-id={item.id} className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105" />
                      ) : (
                        <ImageOff className="size-8 text-muted-foreground/60" />
                      )}
                    </div>
                    <p className="mt-3 truncate text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{cardKicker}</p>
                    <p className="mt-0.5 line-clamp-2 text-sm font-semibold leading-5">{cardTitle}</p>
                    {cardRarityName && (
                      <p className="mt-1.5 flex items-center gap-1.5 truncate text-[10px] font-medium" style={{ color: rarity?.accent ?? undefined }}>
                        <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: rarity?.accent ?? "currentColor" }} />
                        {cardRarityName}
                      </p>
                    )}
                    {savedEntryForCard && savedCardItem && (
                      <p className="mt-1 truncate text-[10px] text-muted-foreground">{savedSkinLabel(savedCardItem)} · {appearanceSummary(savedEntryForCard.options)}</p>
                    )}
                  </button>
                </div>
                  )
                })()
              ))}
            </div>
          )}
          {!catalogLoading && !catalogError && totalCatalogItems > pageSize && (
            <div className="flex items-center justify-between border-t border-border p-3 text-xs text-muted-foreground">
              <span>{offset + 1}–{Math.min(offset + pageSize, totalCatalogItems)} of {totalCatalogItems.toLocaleString()}</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - pageSize))}>Previous</Button>
                <Button size="sm" variant="outline" disabled={offset + pageSize >= totalCatalogItems} onClick={() => setOffset(offset + pageSize)}>Next</Button>
              </div>
            </div>
          )}
          </>}
        </section>

          {/* On a phone the editor jumps above the catalog once something is selected, so Save is in reach. */}
          <aside className={cn("flex flex-col gap-4 self-start xl:order-none xl:sticky xl:top-6", selected && "order-first")}>
          <section className="rounded-xl border border-border bg-card p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Your choice</p>
                <p className="mt-1 text-sm font-semibold">{previewChoice?.display_name || (activeWeapon ? `Pick a ${activeWeapon.display_name} skin` : "Nothing selected")}</p>
              </div>
              <Box className="size-4 text-muted-foreground" />
            </div>
            <div className="relative flex h-40 items-center justify-center rounded-lg border border-border bg-background">
              {previewChoice && catalogImageUrl(previewChoice) ? <OptimizedImage src={catalogImageUrl(previewChoice) ?? ""} width={320} height={160} priority alt={`${previewChoice.display_name} selected collectible`} data-catalog-item-id={previewChoice.id} className="h-full w-full object-contain p-3" /> : <span className="flex flex-col items-center gap-2 px-6 text-center"><ImageOff className="size-7 text-muted-foreground/50" /><span className="text-[11px] leading-4 text-muted-foreground">Open a weapon, choose a skin, then save the look.</span></span>}
              {canCustomizeAccessories && (previewStickerItems.length > 0 || previewCharmItem) && <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2"><div className="flex -space-x-1.5">{previewStickerItems.slice(0, 5).map((item) => catalogImageUrl(item) && <OptimizedImage key={item.id} src={catalogImageUrl(item) ?? ""} width={28} height={28} alt={`${item.display_name} selected sticker`} data-catalog-item-id={item.id} className="size-7 rounded-full border border-background bg-card object-contain p-0.5" />)}</div>{previewCharmItem && catalogImageUrl(previewCharmItem) && <OptimizedImage src={catalogImageUrl(previewCharmItem) ?? ""} width={32} height={32} alt={`${previewCharmItem.display_name} selected charm`} data-catalog-item-id={previewCharmItem.id} className="size-8 rounded-md border border-background bg-card object-contain p-0.5" />}</div>}
            </div>
            {selected && activeWeapon && (
              <div className="mt-3 grid grid-rows-[1fr] overflow-hidden">
              <div className="min-h-0 overflow-hidden">
              <div className="space-y-4 border-t border-border pt-4">
                <div>
                  <div className="mb-2 flex items-center justify-between"><span className="text-xs font-medium">Wear</span><span className="text-xs text-muted-foreground">{wearName(customOptions.wear ?? defaultWear)} · {(customOptions.wear ?? defaultWear).toFixed(4)}</span></div>
                  <div className="mb-2 grid grid-cols-5 gap-1">
                    {wearTiers.map((tier) => {
                      const available = tier.from < maxWear && tier.to > minWear
                      const target = Math.min(maxWear, Math.max(minWear, tier.from === 0 ? 0.0001 : tier.from + 0.002))
                      const isActive = wearName(customOptions.wear ?? defaultWear) === tier.label
                      return (
                        <button
                          key={tier.short}
                          type="button"
                          disabled={!available}
                          title={available ? tier.label : `${tier.label} is not available for this skin`}
                          onClick={() => setCustomOptions((current) => ({ ...current, wear: target }))}
                          className={cn(
                            "h-7 rounded-md border text-[10px] font-semibold transition-colors",
                            isActive ? "border-foreground bg-foreground text-background" : "border-border bg-background text-muted-foreground hover:text-foreground",
                            !available && "cursor-not-allowed opacity-30",
                          )}
                        >
                          {tier.short}
                        </button>
                      )
                    })}
                  </div>
                  <input aria-label="Skin wear" type="range" min={minWear} max={maxWear} step="0.0001" value={customOptions.wear ?? defaultWear} onChange={(event) => setCustomOptions((current) => ({ ...current, wear: Number(event.target.value) }))} className="h-2 w-full cursor-pointer accent-foreground" />
                  <div className="mt-1 flex justify-between text-[10px] text-muted-foreground"><span>Clean</span><span>Worn</span></div>
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between"><span className="text-xs font-medium">Pattern seed</span><span className="text-xs text-muted-foreground">{customOptions.seed ?? 0}</span></div>
                  <Input aria-label="Skin pattern seed" type="number" min={0} max={1000} step={1} value={customOptions.seed ?? 0} onChange={(event) => {
                    const seed = Math.max(0, Math.min(1000, Math.round(Number(event.target.value) || 0)))
                    setCustomOptions((current) => ({ ...current, seed }))
                  }} className="h-9 text-xs" />
                  <p className="mt-1 text-[10px] text-muted-foreground">0–1000</p>
                </div>
                {canCustomizeAccessories && <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium">StatTrak™</p>
                    <p className="text-[10px] text-muted-foreground">Counts your kills in game</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={Boolean(customOptions.statTrak)}
                    aria-label="StatTrak"
                    onClick={() => setCustomOptions((current) => ({ ...current, statTrak: !current.statTrak }))}
                    className={cn("relative h-5 w-9 shrink-0 rounded-full border transition-colors", customOptions.statTrak ? "border-foreground bg-foreground" : "border-border bg-secondary")}
                  >
                    <span className={cn("absolute top-0.5 size-3.5 rounded-full transition-[left] duration-200", customOptions.statTrak ? "left-[1.1rem] bg-background" : "left-0.5 bg-muted-foreground")} />
                  </button>
                </div>}
                {canCustomizeAccessories && <div>
                  <div className="mb-2 flex items-center justify-between"><span className="text-xs font-medium">Name tag</span>{customOptions.nameTag && <button onClick={() => setCustomOptions((current) => ({ ...current, nameTag: undefined }))} className="text-[10px] text-muted-foreground hover:text-foreground">Clear</button>}</div>
                  <Input aria-label="Name tag" value={customOptions.nameTag ?? ""} maxLength={20} placeholder="Custom name (optional)" onChange={(event) => setCustomOptions((current) => ({ ...current, nameTag: event.target.value || undefined }))} className="h-9 text-xs" />
                </div>}
                {canCustomizeAccessories && <div>
                  <div className="mb-2 flex items-center justify-between"><span className="text-xs font-medium">Sticker slots</span><span className="text-[10px] text-muted-foreground">Up to 5</span></div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {Array.from({ length: 5 }, (_, slot) => {
                      const sticker = customOptions.stickers?.find((entry) => entry.slot === slot)
                      const stickerItem = sticker ? selectedAccessories[sticker.catalogItemId] : null
                      return <button key={slot} onClick={() => openStickerPicker(slot)} className={cn("relative flex h-10 items-center justify-center rounded-md border text-[10px] transition-colors", sticker ? "border-foreground bg-secondary text-foreground" : "border-border bg-background text-muted-foreground hover:bg-secondary")} title={sticker ? `Change sticker slot ${slot + 1}` : `Add sticker to slot ${slot + 1}`}>{stickerItem && catalogImageUrl(stickerItem) ? <img src={catalogImageUrl(stickerItem) ?? undefined} alt={`${stickerItem.display_name} in slot ${slot + 1}`} data-catalog-item-id={stickerItem.id} className="size-7 object-contain" /> : <><Sticker className="size-3.5" /><span className="ml-1">{slot + 1}</span></>}{sticker && <span className="absolute -right-1 -top-1 size-2 rounded-full bg-foreground" />}</button>
                    })}
                  </div>
                </div>}
                {canCustomizeAccessories && <div>
                  <div className="mb-2 flex items-center justify-between"><span className="text-xs font-medium">Charm</span>{customOptions.charm && <button onClick={() => setCustomOptions((current) => ({ ...current, charm: undefined }))} className="text-[10px] text-muted-foreground hover:text-foreground">Remove</button>}</div>
                  <button onClick={() => { setAccessoryPicker("charm"); setAccessoryQuery("") }} className={cn("flex h-10 w-full items-center justify-center gap-2 rounded-md border text-xs transition-colors", customOptions.charm ? "border-foreground bg-secondary text-foreground" : "border-border bg-background text-muted-foreground hover:bg-secondary")}>{selectedCharmItem && catalogImageUrl(selectedCharmItem) ? <img src={catalogImageUrl(selectedCharmItem) ?? undefined} alt={`${selectedCharmItem.display_name} selected charm`} data-catalog-item-id={selectedCharmItem.id} className="size-6 object-contain" /> : <Tag className="size-3.5" />} {customOptions.charm ? "Change charm" : "Choose charm"}</button>
                </div>}
                <button onClick={() => setResetConfirmOpen(true)} className="flex w-full items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground"><RotateCcw className="size-3.5" /> Reset customization</button>
                {canCustomizeAccessories && accessoryPicker && (
                  <div className="rounded-lg border border-border bg-background p-2">
                    <div className="mb-2 flex items-center justify-between gap-2"><p className="text-xs font-medium">{accessoryPicker === "sticker" ? `Sticker slot ${(editingStickerSlot ?? 0) + 1}` : "Choose charm"}</p><button onClick={() => { setAccessoryPicker(null); setEditingStickerSlot(null) }} className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"><X className="size-3.5" /></button></div>
                    <Input value={accessoryQuery} onChange={(event) => setAccessoryQuery(event.target.value)} placeholder={`Search ${accessoryPicker}s...`} className="h-8 text-xs" />
                    <div className="mt-2 grid max-h-52 grid-cols-3 gap-1 overflow-y-auto pr-1">
                      {accessoriesLoading ? <div className="col-span-3 flex h-20 items-center justify-center"><Loader2 className="size-4 animate-spin text-muted-foreground" /></div> : accessoryCatalogError ? <div className="col-span-3 flex h-20 flex-col items-center justify-center gap-2 text-center"><span className="text-[10px] text-muted-foreground">Could not load {accessoryPicker}s.</span><button type="button" onClick={refetchAccessoryCatalog} className="text-[10px] font-medium text-foreground underline underline-offset-2">Try again</button></div> : (accessoryCatalog?.data ?? []).map((item) => <button key={item.id} onClick={() => chooseAccessory(item)} data-catalog-item-id={item.id} className="group rounded-md border border-border bg-card p-1.5 text-left hover:bg-secondary"><div className="flex h-12 items-center justify-center">{catalogImageUrl(item) ? <img src={catalogImageUrl(item) ?? undefined} alt={item.display_name} data-catalog-item-id={item.id} className="h-full w-full object-contain" loading="lazy" /> : <ImageOff className="size-4 text-muted-foreground" />}</div><p className="mt-1 line-clamp-2 text-[10px] font-medium leading-3">{item.display_name}</p></button>)}
                    </div>
                  </div>
                )}
              </div>
              </div>
              </div>
            )}
            <Button className="mt-4 w-full" disabled={!selected || saving || selectedAlreadyEquipped} onClick={equipSelected}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <BadgeCheck className="size-4" />}
              {selectedAlreadyEquipped ? "Selected" : activeWeapon ? "Save this look" : "Use this item"}
            </Button>
          </section>

          <section className="rounded-xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Your loadout</p>
              <span className="text-[11px] tabular-nums text-muted-foreground">{loadoutEntries.length}</span>
            </div>
            {loadoutEntries.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs leading-5 text-muted-foreground">
                Nothing saved yet. Pick a weapon, choose a skin, then save the look.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {slotOrder.map((slot) => {
                  const slotEntries = loadoutEntries.filter((entry) => entry.slot === slot)
                  if (slotEntries.length === 0) return null
                  return (
                    <div key={slot}>
                      <p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{slotLabels[slot]}</p>
                      <ul className="flex flex-col gap-1">
                        {slotEntries.map((entry) => {
                          const savedItem = entry.skinchanger_catalog_items
                          if (!savedItem) return null
                          const image = catalogImageUrl(savedItem)
                          const teamText = entry.team_scope === "t" ? "T" : entry.team_scope === "ct" ? "CT" : "Both"
                          const model = modelFromEntry(entry)
                          return (
                            <li key={`${entry.slot_key}:${entry.team_scope}`} className="group flex items-center gap-2 rounded-lg border border-border bg-background/60 p-1.5 transition-colors hover:border-foreground/25">
                              <button
                                type="button"
                                onClick={() => openSavedEntry(entry)}
                                className="flex min-w-0 flex-1 items-center gap-2 text-left"
                                title={`Edit ${savedItem.display_name}`}
                              >
                                <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-card">
                                  {image ? <img src={image} alt="" data-catalog-item-id={savedItem.id} className="size-full object-contain p-0.5" /> : <ImageOff className="size-3.5 text-muted-foreground" />}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-xs font-semibold">{savedItem.weapon_class ?? savedItem.display_name}</span>
                                  <span className="block truncate text-[10px] text-muted-foreground">{savedSkinLabel(savedItem)} · {appearanceSummary(entry.options)}</span>
                                </span>
                              </button>
                              <span className={cn("shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold", teamChipTone[entry.team_scope])}>{teamText}</span>
                              {model && (
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirm({ model, entry })}
                                  disabled={saving}
                                  aria-label={`Remove ${savedItem.display_name}`}
                                  title="Remove"
                                  className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-destructive hover:text-destructive-foreground focus-visible:opacity-100 group-hover:opacity-100 disabled:pointer-events-none"
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              )}
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

        </aside>
      </div>
      <AlertDialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Reset customization?</AlertDialogTitle>
            <AlertDialogDescription>This removes the wear, stickers, and charm currently set for this skin. You can customize it again before saving.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep changes</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setCustomOptions({ wear: defaultWear, seed: 0, statTrak: false, stickers: [] }); setSelectedAccessories({}); setResetConfirmOpen(false) }}>Reset</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={Boolean(deleteConfirm)} onOpenChange={(open) => { if (!open && !saving) setDeleteConfirm(null) }}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove saved look?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {deleteConfirm?.model.display_name ?? "this saved look"} and its saved wear, stickers, and charm. You can choose it again at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Keep it</AlertDialogCancel>
            <AlertDialogAction disabled={saving} onClick={() => void deleteSavedLook()}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />} Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
