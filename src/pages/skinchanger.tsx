import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import {
  ArrowLeft,
  BadgeCheck,
  Crosshair,
  Headphones,
  ImageOff,
  Loader2,
  Medal,
  RotateCcw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sticker,
  Sword,
  Tag,
  Trash2,
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
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
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

const teamChipTone: Record<TeamScope, string> = {
  all: "border-white/12 bg-white/[0.06] text-white/70",
  t: "border-amber-300/25 bg-amber-300/10 text-amber-100",
  ct: "border-sky-300/25 bg-sky-300/10 text-sky-100",
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
  const [pickerOpen, setPickerOpen] = useState(false)
  const [gridQuery, setGridQuery] = useState("")
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
  const { data: catalog, loading: catalogLoading, error: catalogError, refetch: refetchCatalog } =
    useApiQuery((signal) => skinchangerService.getCatalog({ category: effectiveCategory, weaponClass: effectiveWeaponClass, team: category === "agent" ? agentTeam ?? undefined : undefined, query: query || undefined, limit: 36, offset }, { signal }), { queryKey: catalogQueryKey, enabled: pickerOpen })
  const { data: firearmModels, loading: firearmsLoading, error: firearmsError, refetch: refetchFirearms } =
    useApiQuery((signal) => skinchangerService.getCatalog({ category: "weapon", limit: 100, offset: 0 }, { signal }), { queryKey: "grid:firearms" })
  const { data: knifeModels, loading: knivesLoading, error: knivesError, refetch: refetchKnives } =
    useApiQuery((signal) => skinchangerService.getCatalog({ category: "knife", limit: 100, offset: 0 }, { signal }), { queryKey: "grid:knives" })
  const { data: gloveModels, loading: glovesLoading, error: glovesError, refetch: refetchGloves } =
    useApiQuery((signal) => skinchangerService.getCatalog({ category: "glove", limit: 100, offset: 0 }, { signal }), { queryKey: "grid:gloves" })
  const { data: loadoutResponse, refetch: refetchLoadout } =
    useApiQuery((signal) => skinchangerService.getLoadout({ signal }))
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
    if (!selected) return false
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
      toast.success("Saved. Type !rs in game to apply it.")
      refetchLoadout()
      return true
    } catch {
      toast.error("Could not save your choice. Try again.")
      return false
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
   * One page: every slot is a card; a card opens the picker/customize dialog
   * ---------------------------------------------------------------------- */

  type ModelKind = "weapon" | "knife" | "glove"

  /**
   * The saved look a card shows for the team selected at the top. Team-locked firearms always show
   * their own side; a "Both" look counts for either side.
   */
  const gridEntryFor = (item: SkinchangerCatalogItem, kind: ModelKind) => {
    const slotKey = slotKeyForCatalogItem(item, kind)
    const lockedTeam = teamScopeFromMetadata(item)
    const viewTeam: TeamScope = lockedTeam !== "all" ? lockedTeam : teamScope
    const matchesModel = (entry: SkinchangerLoadoutEntry) => entry.slot_key === slotKey
      // Older knife and glove looks were stored under the plain slot key.
      || (kind !== "weapon" && entry.slot === kind && entry.slot_key === kind && entry.skinchanger_catalog_items?.weapon_class === item.weapon_class)
    return loadoutEntries.find((entry) => matchesModel(entry) && entry.team_scope === viewTeam)
      ?? (viewTeam !== "all" ? loadoutEntries.find((entry) => matchesModel(entry) && entry.team_scope === "all") : undefined)
  }

  const collectionForKind = (kind: ModelKind): CollectionId => (kind === "weapon" ? "skins" : kind)

  /** Remembers the page's team so a team-locked model or a single-slot item cannot change it for good. */
  const beginPicker = () => {
    if (gridTeamRef.current === null) gridTeamRef.current = teamScope
    setDefaultChoice(null)
    setWeaponClass("")
    setQuery("")
    setOffset(0)
    setAccessoryPicker(null)
    setEditingStickerSlot(null)
    setPickerOpen(true)
  }

  /** Card body of a firearm, knife or glove: choose a skin for that model. */
  const openModelPicker = (item: SkinchangerCatalogItem, kind: ModelKind) => {
    beginPicker()
    setCollection(collectionForKind(kind))
    setSkinGroup("Rifles")
    setAgentTeam(null)
    setActiveWeapon(item)
    setSelected(null)
  }

  /** Customize button: straight to the options of the saved skin; without one, the picker. */
  const openModelCustomize = (item: SkinchangerCatalogItem, kind: ModelKind, entry: SkinchangerLoadoutEntry | undefined) => {
    if (!entry?.skinchanger_catalog_items) {
      openModelPicker(item, kind)
      return
    }
    beginPicker()
    setCollection(collectionForKind(kind))
    setSkinGroup("Rifles")
    setAgentTeam(null)
    customizeSavedLook(item, entry)
  }

  const agentEntryFor = (team: "t" | "ct") => loadoutEntries.find((entry) => entry.slot === "agent" && entry.team_scope === team)
  const singleEntryFor = (slot: "music_kit" | "pin") => loadoutEntries.find((entry) => entry.slot === slot)

  const openAgentPicker = (team: "t" | "ct") => {
    beginPicker()
    setCollection("skins")
    setSkinGroup("agents")
    setAgentTeam(team)
    setTeamScope(team)
    setActiveWeapon(null)
    setSelected(agentEntryFor(team)?.skinchanger_catalog_items ?? null)
  }

  /** Music kits and pins are one per player, so they always save for both sides. */
  const openSinglePicker = (slot: "music_kit" | "pin") => {
    beginPicker()
    setCollection(slot)
    setSkinGroup("Rifles")
    setAgentTeam(null)
    setTeamScope(singleEntryFor(slot)?.team_scope ?? "all")
    setActiveWeapon(null)
    setSelected(singleEntryFor(slot)?.skinchanger_catalog_items ?? null)
  }

  const closePicker = () => {
    setPickerOpen(false)
    setActiveWeapon(null)
    setSelected(null)
    setAgentTeam(null)
    setCollection("skins")
    setSkinGroup("Rifles")
    setQuery("")
    setOffset(0)
    setAccessoryPicker(null)
    setEditingStickerSlot(null)
    setDefaultChoice(null)
    if (gridTeamRef.current !== null) {
      setTeamScope(gridTeamRef.current)
      gridTeamRef.current = null
    }
  }

  const saveAndClose = async () => {
    if (await equipSelected()) closePicker()
  }

  const gridSearch = gridQuery.trim().toLowerCase()
  const matchesSearch = (name: string) => !gridSearch || name.toLowerCase().includes(gridSearch)
  const modelSections = weaponGridGroups.map((group) => {
    const source = group === "Knives"
      ? (knifeModels?.data ?? []).filter((item) => item.display_name !== "Knife")
      : (firearmModels?.data ?? []).filter((item) => gridGroupForFirearm(item) === group)
    const items = source
      .filter((item) => matchesSearch(item.display_name))
      .sort((a, b) => group === "Knives" ? a.display_name.localeCompare(b.display_name) : firearmOrder(a) - firearmOrder(b))
    return { group, kind: group === "Knives" ? "knife" as const : "weapon" as const, items }
  })
  const gloveItems = (gloveModels?.data ?? []).filter((item) => matchesSearch(item.display_name)).sort((a, b) => a.display_name.localeCompare(b.display_name))
  const showAgents = matchesSearch("agents") || matchesSearch("t agent") || matchesSearch("ct agent")
  const showMusic = matchesSearch("music kit")
  const showPin = matchesSearch("pin")
  const gridLoading = firearmsLoading || knivesLoading || glovesLoading
  const gridError = firearmsError ?? knivesError ?? glovesError

  const isModelBrowse = (category === "weapon" || category === "glove" || category === "knife") && !activeWeapon
  const displayedCatalogItems = catalogItems.filter((item) => !(isModelBrowse && category === "knife" && item.display_name === "Knife"))

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

  const renderTeamSwitch = (compact = false) => {
    // Team-locked models (e.g. AK-47, M4A4) and knife/glove pairs keep their automatic side.
    const teamLocked = Boolean(activeWeapon) && !showTeamSelector
    const shownTeam = teamLocked ? selectedTeamScope : teamScope
    return (
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
                "flex items-center gap-1.5 rounded-md font-semibold transition-colors",
                compact ? "h-7 px-2 text-[11px]" : "h-8 px-3 text-xs",
                isActive ? "bg-secondary text-foreground ring-1 ring-inset ring-white/15" : "text-muted-foreground hover:text-foreground",
                disabled && !isActive && "cursor-not-allowed opacity-35",
                disabled && isActive && "cursor-default",
              )}
            >
              {team.id === "all" ? (
                <span className="flex -space-x-1.5"><img src={teamTIcon} alt="" className="size-4 object-contain" /><img src={teamCtIcon} alt="" className="size-4 object-contain" /></span>
              ) : (
                <img src={team.id === "t" ? teamTIcon : teamCtIcon} alt="" className="size-4 object-contain" />
              )}
              {team.label}
            </button>
          )
        })}
      </div>
    )
  }

  /** A square slot card. Hover blurs the render; Customize and remove sit on top of the card button. */
  const renderCard = ({ id, image, fallback, title, subtitle, savedItem, entry, dimmed, openLabel, onOpen, onCustomize, onRemove }: {
    id: string
    image: string | null
    fallback?: string
    title: string
    subtitle: string
    savedItem: SkinchangerCatalogItem | null
    entry: SkinchangerLoadoutEntry | undefined
    dimmed?: boolean
    openLabel: string
    onOpen: () => void
    onCustomize?: () => void
    onRemove?: () => void
  }) => {
    const rarity = savedItem ? rarityStyle(savedItem) : null
    const teamLabel = entry?.team_scope === "t" ? "T" : entry?.team_scope === "ct" ? "CT" : "Both"
    const src = image ?? fallback ?? null
    return (
      <div
        key={id}
        data-slot-card={id}
        style={rarity ? { backgroundImage: `radial-gradient(ellipse 95% 78% at 0% 100%, ${rarity.glow} 0%, transparent 68%)` } : undefined}
        className={cn(
          "group relative aspect-square overflow-hidden rounded-lg border bg-background/60 transition-[border-color,opacity] duration-150 hover:border-foreground/30",
          savedItem ? "border-border" : "border-border/60",
          dimmed && "opacity-45 hover:opacity-100",
        )}
      >
        {rarity && <span aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100" style={{ backgroundImage: `radial-gradient(ellipse 105% 88% at 0% 100%, ${strongerGlow(rarity.glow)} 0%, transparent 70%)` }} />}
        {entry && savedItem && <span aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ backgroundImage: teamScopeFade(entry.team_scope) }} />}

        <button type="button" onClick={onOpen} aria-label={openLabel} className="absolute inset-0 z-[1] rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-foreground/60" />

        <div className="pointer-events-none relative flex h-full flex-col p-2.5">
          <div className="flex min-h-0 flex-1 items-center justify-center">
            {src ? (
              <OptimizedImage src={src} width={200} height={150} alt="" className={cn("max-h-full w-full object-contain transition-[filter,transform] duration-150 group-hover:scale-[1.03] group-hover:blur-[4px] group-has-[:focus-visible]:blur-[4px]", !savedItem && fallback && !image && "p-4 opacity-80")} />
            ) : (
              <ImageOff className="size-7 text-muted-foreground/50" />
            )}
          </div>
          <p className="mt-1 truncate text-xs font-semibold">{title}</p>
          <p className="truncate text-[10px] text-muted-foreground" style={rarity ? { color: rarity.accent } : undefined}>{subtitle}</p>
        </div>

        {entry && savedItem && (
          <span className={cn("pointer-events-none absolute left-1.5 top-1.5 z-[2] rounded border px-1 py-px text-[9px] font-semibold", teamChipTone[entry.team_scope])}>{teamLabel}</span>
        )}

        <button
          type="button"
          onClick={(event) => { event.stopPropagation(); (onCustomize ?? onOpen)() }}
          aria-label={onCustomize && savedItem ? `Customize ${savedItem.display_name}` : openLabel}
          title={onCustomize && savedItem ? "Customize" : "Choose"}
          className="absolute left-1/2 top-[42%] z-[2] flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white opacity-0 shadow-lg backdrop-blur-sm transition-opacity duration-150 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
        >
          <SlidersHorizontal className="size-4" />
        </button>

        {entry && savedItem && onRemove && (
          <button
            type="button"
            onClick={(event) => { event.stopPropagation(); onRemove() }}
            disabled={saving}
            aria-label={`Remove ${savedItem.display_name}`}
            title="Remove"
            className="absolute right-1.5 top-1.5 z-[2] flex size-7 items-center justify-center rounded-md border border-border bg-background/90 text-muted-foreground opacity-0 shadow-sm backdrop-blur transition-[opacity,color,background-color] duration-150 hover:bg-destructive hover:text-destructive-foreground group-hover:opacity-100 focus-visible:opacity-100 disabled:pointer-events-none [@media(hover:none)]:opacity-100"
          >
            <Trash2 className="size-3.5" />
          </button>
        )}
      </div>
    )
  }

  const renderSection = (title: string, equipped: number, total: number, cards: ReactNode[]) => cards.length === 0 ? null : (
    <section key={title} aria-label={title}>
      <div className="mb-2.5 flex items-baseline justify-between gap-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{title}</h2>
        <span className="text-[10px] tabular-nums text-muted-foreground/70">{equipped}/{total} equipped</span>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-2">{cards}</div>
    </section>
  )

  const modelCard = (item: SkinchangerCatalogItem, kind: ModelKind) => {
    const entry = gridEntryFor(item, kind)
    const savedItem = entry?.skinchanger_catalog_items ?? null
    const lockedTeam = teamScopeFromMetadata(item)
    return renderCard({
      id: `${kind}:${item.id}`,
      image: catalogImageUrl(savedItem ?? item) ?? (kind === "glove" ? defaultGloveVisual : null),
      title: item.display_name,
      subtitle: savedItem ? savedSkinLabel(savedItem) : "Default",
      savedItem,
      entry,
      // A T-only firearm while the switch is on CT (or the reverse) stays visible, but dimmed.
      dimmed: kind === "weapon" && lockedTeam !== "all" && teamScope !== "all" && lockedTeam !== teamScope,
      openLabel: savedItem ? `Change ${item.display_name} skin (${savedSkinLabel(savedItem)})` : `Choose a ${item.display_name} skin`,
      onOpen: () => openModelPicker(item, kind),
      onCustomize: () => openModelCustomize(item, kind, entry),
      onRemove: entry ? () => setDeleteConfirm({ model: item, entry }) : undefined,
    })
  }

  const pickerTitle = activeWeapon
    ? activeWeapon.display_name
    : category === "agent" ? (agentTeam === "ct" ? "CT agent" : "T agent")
      : category === "music_kit" ? "Music kit" : "Pin"
  const pickerHasOptions = Boolean(selected && activeWeapon)
  const equippedIn = (items: SkinchangerCatalogItem[], kind: ModelKind) => items.filter((item) => gridEntryFor(item, kind)?.skinchanger_catalog_items).length

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold tracking-tight">Skinchanger</h1>
        <p className="text-xs text-muted-foreground">
          {loadoutEntries.length === 0 ? "Nothing saved yet — pick any card to choose a look." : `${loadoutEntries.length} item${loadoutEntries.length === 1 ? "" : "s"} saved`}
          {loadoutResponse?.loadout.updated_at ? " · updated " : ""}
          {loadoutResponse?.loadout.updated_at ? <RelativeTime value={loadoutResponse.loadout.updated_at} /> : null}
        </p>
      </header>

      <div className="sticky top-0 z-20 -mx-1 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card/95 px-3 py-2.5 backdrop-blur">
        <label className="relative block min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={gridQuery} onChange={(event) => setGridQuery(event.target.value)} placeholder="Search weapons, knives, gloves..." className="h-9 pl-9 text-xs" />
        </label>
        {renderTeamSwitch()}
      </div>

      {gridError ? (
        <QueryState loading={false} error={{ ...gridError, message: "Could not load the collection. Please try again." }} empty={false} onRetry={() => { refetchFirearms(); refetchKnives(); refetchGloves() }} />
      ) : gridLoading && !firearmModels ? (
        <QueryState loading error={null} empty={false} onRetry={() => undefined} />
      ) : (
        <div className="flex flex-col gap-7">
          {modelSections.map((section) => renderSection(section.group, equippedIn(section.items, section.kind), section.items.length, section.items.map((item) => modelCard(item, section.kind))))}
          {renderSection("Gloves", equippedIn(gloveItems, "glove"), gloveItems.length, gloveItems.map((item) => modelCard(item, "glove")))}
          {showAgents && renderSection("Agents", (["t", "ct"] as const).filter((team) => agentEntryFor(team)).length, 2, (["t", "ct"] as const).map((team) => {
            const entry = agentEntryFor(team)
            const savedItem = entry?.skinchanger_catalog_items ?? null
            return renderCard({
              id: `agent:${team}`,
              image: savedItem ? catalogImageUrl(savedItem) : null,
              fallback: team === "t" ? teamTIcon : teamCtIcon,
              title: team === "t" ? "T agent" : "CT agent",
              subtitle: savedItem ? savedItem.display_name : "Default",
              savedItem,
              entry,
              openLabel: `Choose a ${team === "t" ? "T" : "CT"} agent`,
              onOpen: () => openAgentPicker(team),
              onRemove: entry && savedItem ? () => setDeleteConfirm({ model: savedItem, entry }) : undefined,
            })
          }))}
          {(showMusic || showPin) && renderSection("Music kit & pin", [singleEntryFor("music_kit"), singleEntryFor("pin")].filter(Boolean).length, 2, ([["music_kit", showMusic], ["pin", showPin]] as const).filter(([, visible]) => visible).map(([slot]) => {
            const entry = singleEntryFor(slot)
            const savedItem = entry?.skinchanger_catalog_items ?? null
            return renderCard({
              id: slot,
              image: savedItem ? catalogImageUrl(savedItem) : null,
              fallback: slot === "pin" ? pinsIcon : undefined,
              title: slot === "music_kit" ? "Music kit" : "Pin",
              subtitle: savedItem ? savedItem.display_name : "Default",
              savedItem,
              entry,
              openLabel: slot === "music_kit" ? "Choose a music kit" : "Choose a pin",
              onOpen: () => openSinglePicker(slot),
              onRemove: entry && savedItem ? () => setDeleteConfirm({ model: savedItem, entry }) : undefined,
            })
          }))}
          {modelSections.every((section) => section.items.length === 0) && gloveItems.length === 0 && !showAgents && !showMusic && !showPin && (
            <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">Nothing matches “{gridQuery}”.</p>
          )}
        </div>
      )}

      <Dialog open={pickerOpen} onOpenChange={(open) => { if (!open) closePicker() }}>
        <DialogContent className="glass flex max-h-[92dvh] w-[calc(100%-1.5rem)] max-w-5xl flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl">
          <div className="flex items-center gap-3 border-b border-border px-4 py-3 pr-12">
            {selected && pickerHasOptions && (
              <button type="button" onClick={() => setSelected(null)} className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground lg:hidden" aria-label="Back to the list">
                <ArrowLeft className="size-4" />
              </button>
            )}
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate text-base">{pickerTitle}</DialogTitle>
              <DialogDescription className="truncate text-xs">
                {savedItemForActiveSlot ? `Saved: ${activeWeapon ? savedSkinLabel(savedItemForActiveSlot) : savedItemForActiveSlot.display_name}` : activeWeapon ? "Choose a skin" : "Choose one"}
              </DialogDescription>
            </div>
            {(activeWeapon || category === "music_kit" || category === "pin") && <div className="hidden sm:block">{renderTeamSwitch(true)}</div>}
          </div>

          <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_340px]">
            {/* Catalogue */}
            <div className={cn("flex min-h-0 flex-col", selected && pickerHasOptions && "hidden lg:flex")}>
              <div className="border-b border-border p-3">
                <label className="relative block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input value={query} onChange={(event) => { setQuery(event.target.value); setOffset(0) }} placeholder={`Search ${activeWeapon ? `${activeWeapon.display_name} skins` : category === "agent" ? "agents" : category === "music_kit" ? "music kits" : "pins"}...`} className="h-9 pl-9 text-xs" />
                </label>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-3">
                <QueryState loading={catalogLoading} error={catalogError ? { ...catalogError, message: "Could not load the collection. Please try again." } : null} empty={!catalogLoading && !catalogError && displayedCatalogItems.length === 0} onRetry={refetchCatalog} emptyMessage="Nothing matches this search." />
                {!catalogLoading && !catalogError && displayedCatalogItems.length > 0 && (
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-2">
                    {displayedCatalogItems.map((item) => {
                      const rarity = rarityStyle(item)
                      const isSelected = selected?.id === item.id
                      const isSaved = savedItemForActiveSlot?.id === item.id
                      const image = catalogImageUrl(item)
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => selectSkin(item)}
                          data-catalog-item-id={item.id}
                          style={rarity ? { backgroundImage: `radial-gradient(ellipse 95% 78% at 0% 100%, ${isSelected ? strongerGlow(rarity.glow) : rarity.glow} 0%, transparent 68%)` } : undefined}
                          className={cn(
                            "relative flex flex-col rounded-lg border bg-background/60 p-2 text-left transition-colors hover:border-foreground/30",
                            isSelected ? "border-foreground/70 ring-1 ring-foreground/40" : "border-border/60",
                          )}
                        >
                          {isSaved && <span className="absolute right-1.5 top-1.5 inline-flex items-center gap-1 rounded border border-emerald-300/30 bg-emerald-300/12 px-1 py-px text-[9px] font-semibold uppercase text-emerald-100"><BadgeCheck className="size-3" />Saved</span>}
                          <span className="flex h-20 items-center justify-center">
                            {image ? <OptimizedImage src={image} width={180} height={90} alt="" className="h-full w-full object-contain" /> : <ImageOff className="size-6 text-muted-foreground/50" />}
                          </span>
                          <span className="mt-1.5 line-clamp-2 text-[11px] font-semibold leading-4">{activeWeapon ? savedSkinLabel(item) : item.display_name}</span>
                          {typeof item.metadata.rarity === "string" && <span className="mt-0.5 truncate text-[10px]" style={{ color: rarity?.accent ?? undefined }}>{item.metadata.rarity}</span>}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
              {!catalogLoading && !catalogError && totalCatalogItems > pageSize && (
                <div className="flex items-center justify-between border-t border-border p-3 text-xs text-muted-foreground">
                  <span>{offset + 1}–{Math.min(offset + pageSize, totalCatalogItems)} of {totalCatalogItems.toLocaleString()}</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - pageSize))}>Previous</Button>
                    <Button size="sm" variant="outline" disabled={offset + pageSize >= totalCatalogItems} onClick={() => setOffset(offset + pageSize)}>Next</Button>
                  </div>
                </div>
              )}
            </div>

            {/* Preview, customize and save */}
            <aside className={cn("min-h-0 overflow-y-auto border-t border-border px-4 pt-4 lg:border-l lg:border-t-0", !(selected && pickerHasOptions) && "max-lg:max-h-[40dvh]")}>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{selected ? "Your choice" : "Nothing picked yet"}</p>
              <p className="mb-3 mt-1 truncate text-sm font-semibold">{previewChoice?.display_name || `Pick ${activeWeapon ? `a ${activeWeapon.display_name} skin` : "one from the list"}`}</p>
            <div className="relative flex h-40 items-center justify-center rounded-lg border border-border bg-background">
              {previewChoice && catalogImageUrl(previewChoice) ? <OptimizedImage src={catalogImageUrl(previewChoice) ?? ""} width={320} height={160} priority alt={`${previewChoice.display_name} selected collectible`} data-catalog-item-id={previewChoice.id} className="h-full w-full object-contain p-3" /> : <span className="flex flex-col items-center gap-2 px-6 text-center"><ImageOff className="size-7 text-muted-foreground/50" /><span className="text-[11px] leading-4 text-muted-foreground">Pick one from the list.</span></span>}
              {canCustomizeAccessories && (previewStickerItems.length > 0 || previewCharmItem) && <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2"><div className="flex -space-x-1.5">{previewStickerItems.slice(0, 5).map((item) => catalogImageUrl(item) && <OptimizedImage key={item.id} src={catalogImageUrl(item) ?? ""} width={28} height={28} alt={`${item.display_name} selected sticker`} data-catalog-item-id={item.id} className="size-7 rounded-full border border-background bg-card object-contain p-0.5" />)}</div>{previewCharmItem && catalogImageUrl(previewCharmItem) && <OptimizedImage src={catalogImageUrl(previewCharmItem) ?? ""} width={32} height={32} alt={`${previewCharmItem.display_name} selected charm`} data-catalog-item-id={previewCharmItem.id} className="size-8 rounded-md border border-background bg-card object-contain p-0.5" />}</div>}
            </div>
              {(activeWeapon || category === "music_kit" || category === "pin") && <div className="mt-3 flex items-center justify-between sm:hidden"><span className="text-xs text-muted-foreground">Team</span>{renderTeamSwitch(true)}</div>}
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
              {/* Save stays in reach while the options scroll. */}
              <div className="sticky bottom-0 -mx-4 mt-4 border-t border-border bg-card/95 px-4 py-3 backdrop-blur">
                <Button className="w-full" disabled={!selected || saving || selectedAlreadyEquipped} onClick={() => void saveAndClose()}>
                  {saving ? <Loader2 className="size-4 animate-spin" /> : <BadgeCheck className="size-4" />}
                  {selectedAlreadyEquipped ? "Saved" : "Save"}
                </Button>
              </div>
            </aside>
          </div>
        </DialogContent>
      </Dialog>

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
