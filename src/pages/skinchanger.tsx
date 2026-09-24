import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react"
import {
  ArrowLeft,
  BadgeCheck,
  ImageOff,
  Loader2,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sticker,
  Tag,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import { useSearchParams } from "react-router-dom"

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
import { CardGridSkeleton } from "@/components/skeletons"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { OptimizedImage } from "@/components/optimized-image"
import { useApiQuery } from "@/hooks/use-api-query"
import { cn } from "@/lib/utils"
import { rarityStyles } from "@/lib/cs2-rarity"
import pinsIcon from "@/assets/skinchanger/pins.png"
import defaultAgentT from "@/assets/skinchanger/default-agent-t.webp"
import defaultAgentCt from "@/assets/skinchanger/default-agent-ct.webp"
import defaultMusicKit from "@/assets/skinchanger/default-music-kit.webp"
import teamTIcon from "@/assets/skinchanger/team-t.webp"
import teamCtIcon from "@/assets/skinchanger/team-ct.webp"

/** LEGACY-X neutral visual system: filename-matched collection icons, ordered Skins sub-groups, and lower-left rarity glow. */
type CollectionId = "skins" | Exclude<SkinchangerCategory, "weapon" | "agent">
type CollectionMeta = { id: CollectionId; category: SkinchangerCategory; label: string; slot: SkinchangerSlot; firearmGroup?: SkinchangerFirearmGroup }


const categories: CollectionMeta[] = [
  { id: "skins", category: "weapon", label: "Skins", slot: "weapon" },
  { id: "knife", category: "knife", label: "Knives", slot: "knife" },
  { id: "glove", category: "glove", label: "Gloves", slot: "glove" },
  { id: "music_kit", category: "music_kit", label: "Music", slot: "music_kit" },
  { id: "pin", category: "pin", label: "Pins", slot: "pin" },
]

type WeaponGridGroup = "Pistols" | "SMGs" | "Rifles" | "Sniper Rifles" | "Heavy"
const weaponGridGroups: WeaponGridGroup[] = ["Pistols", "SMGs", "Rifles", "Sniper Rifles", "Heavy"]

/** weapon_class values exactly as stored in skinchanger_catalog_items (category "weapon"). */
const firearmGridGroup: Record<string, WeaponGridGroup> = {
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
function gridGroupForFirearm(item: SkinchangerCatalogItem): WeaponGridGroup {
  const mapped = firearmGridGroup[item.weapon_class ?? item.display_name]
  if (mapped) return mapped
  const group = item.metadata.weaponGroup
  return group === "Pistols" || group === "SMGs" || group === "Heavy" ? group : "Rifles"
}

function rarityStyle(item: SkinchangerCatalogItem) {
  const rarity = item.metadata.rarity
  return typeof rarity === "string" ? rarityStyles[rarity] ?? null : null
}

const teamOptions: Array<{ id: "t" | "ct"; label: string }> = [
  { id: "t", label: "TERRORIST" },
  { id: "ct", label: "COUNTER-TERRORIST" },
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

/** Wear bands, coloured like a meter from clean (green) to worn (red). */
const wearTiers: Array<{ label: string; short: string; from: number; to: number; color: string }> = [
  { label: "Factory New", short: "FN", from: 0, to: 0.07, color: "var(--wear-fn)" },
  { label: "Minimal Wear", short: "MW", from: 0.07, to: 0.15, color: "var(--wear-mw)" },
  { label: "Field-Tested", short: "FT", from: 0.15, to: 0.38, color: "var(--wear-ft)" },
  { label: "Well-Worn", short: "WW", from: 0.38, to: 0.45, color: "var(--wear-ww)" },
  { label: "Battle-Scarred", short: "BS", from: 0.45, to: 1, color: "var(--wear-bs)" },
]

/** Slider track: each band's colour over the part of the skin's float range it covers. */
function wearTrack(minWear: number, maxWear: number) {
  const span = Math.max(0.0001, maxWear - minWear)
  const stops = wearTiers
    .filter((tier) => tier.to > minWear && tier.from < maxWear)
    .map((tier) => {
      const start = ((Math.max(tier.from, minWear) - minWear) / span) * 100
      const end = ((Math.min(tier.to, maxWear) - minWear) / span) * 100
      return `${tier.color} ${start.toFixed(2)}% ${end.toFixed(2)}%`
    })
  return `linear-gradient(90deg, ${stops.join(", ")})`
}

const wearColor = (wear: number) => (wearTiers.find((tier) => wear < tier.to) ?? wearTiers[wearTiers.length - 1]!).color

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

/** Fade for a card's look when it changes (team switch, new save); keyed elements replay it. */
const swapIn = "animate-in fade-in-0 [animation-duration:350ms] ease-out motion-reduce:animate-none"

function savedSkinLabel(item: SkinchangerCatalogItem) {
  const [, skin = item.display_name] = item.display_name.split("|")
  return skin.trim().replace(wearSuffix, "")
}

/** Motion always runs in full on Legacy-X (no reduced-motion mode). */
function motionReduced() {
  return false
}

const DROP_IN: Keyframe[] = [
  { opacity: 0, transform: "translateY(-14px) scale(0.985)" },
  { opacity: 1, transform: "translateY(0) scale(1)" },
]

/**
 * Tiles of a catalogue grid drop in from above, row by row (left to right inside a row), so a new
 * list flows down instead of appearing at once. Returns a cleanup that cancels the run.
 */
function cascadeTiles(root: HTMLElement | null, selector: string) {
  if (!root || motionReduced()) return () => undefined
  const origin = root.getBoundingClientRect()
  const animations = Array.from(root.querySelectorAll<HTMLElement>(selector)).map((tile) => {
    const box = tile.getBoundingClientRect()
    const row = Math.max(0, Math.round((box.top - origin.top) / Math.max(1, box.height)))
    const column = Math.max(0, Math.round((box.left - origin.left) / Math.max(1, box.width)))
    const delay = Math.min(560, row * 60 + column * 28)
    return tile.animate(DROP_IN, { duration: 380, delay, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "backwards" })
  })
  return () => animations.forEach((animation) => animation.cancel())
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
  const [searchParams, setSearchParams] = useSearchParams()
  const [teamScope, setTeamScope] = useState<TeamScope>(() => (searchParams.get("team") === "ct" ? "ct" : "t"))
  const [defaultChoice, setDefaultChoice] = useState<"knife" | "glove" | null>(null)
  const [customOptions, setCustomOptions] = useState<SkinchangerAppearanceOptions>({ wear: 0.0001, seed: 0, statTrak: false, stickers: [] })
  const [selectedAccessories, setSelectedAccessories] = useState<Record<string, SkinchangerCatalogItem>>({})
  const [accessoryPicker, setAccessoryPicker] = useState<"sticker" | "charm" | null>(null)
  const [accessoryQuery, setAccessoryQuery] = useState("")
  const [editingStickerSlot, setEditingStickerSlot] = useState<number | null>(null)
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  // Knife and glove dialogs are opened per team (T knife, CT gloves...) and always save for that team.
  const [slotTeam, setSlotTeam] = useState<"t" | "ct" | null>(null)
  const [rarityFilter, setRarityFilter] = useState<string | null>(null)
  // "Also use for the other team" in the picker: saves one look for both teams.
  const [alsoOtherTeam, setAlsoOtherTeam] = useState(false)
  const [optimisticLoadoutEntries, setOptimisticLoadoutEntries] = useState<SkinchangerLoadoutEntry[] | null>(null)
  const [optimisticLoadoutVersion, setOptimisticLoadoutVersion] = useState<number | null>(null)
  // Opening a team-locked model moves the switch to that side; going back to the grid restores it.
  const gridTeamRef = useRef<TeamScope | null>(null)
  // The dialog's content is reset only after its close animation, so it never flashes empty while fading.
  const closeTimerRef = useRef<number | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

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
    (signal) => skinchangerService.getCatalog({ category: "sticker", query: accessoryQuery || undefined, limit: 60, offset: 0 }, { signal }),
    { enabled: Boolean(selected && accessoryPicker === "sticker"), queryKey: `sticker:${accessoryQuery.trim()}` },
  )
  const { data: charmCatalog, loading: charmsLoading, error: charmCatalogError, refetch: refetchCharms } = useApiQuery(
    (signal) => skinchangerService.getCatalog({ category: "charm", query: accessoryQuery || undefined, limit: 60, offset: 0 }, { signal }),
    { enabled: Boolean(selected && accessoryPicker === "charm"), queryKey: `charm:${accessoryQuery.trim()}` },
  )

  const catalogItems = catalog?.data ?? []
  const totalCatalogItems = catalog?.pagination.total ?? 0
  const pageSize = catalog?.pagination.limit ?? 36
  const remoteLoadoutEntries = loadoutResponse?.loadout.skinchanger_loadout_entries ?? []
  const loadoutEntries = optimisticLoadoutEntries ?? remoteLoadoutEntries
  const loadoutVersion = optimisticLoadoutVersion ?? loadoutResponse?.loadout.version ?? 0
  const catalogTeamScope = activeWeapon ? teamScopeFromMetadata(activeWeapon) : "all"
  const selectedTeamScope: TeamScope = slotTeam ?? (category === "agent" && agentTeam ? agentTeam : catalogTeamScope !== "all" ? catalogTeamScope : teamScope)
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
  // Per-team knife, glove, music kit and pin: a "Both" look also counts as the T and the CT one.
  const fallsBackToBoth = selectedTeamScope !== "all"
  const savedEntryForActiveSlot = loadoutEntries.find((entry) => entry.slot_key === selectedSlotKey && entry.team_scope === selectedTeamScope)
    ?? ((category === "knife" || category === "glove")
      ? loadoutEntries.find((entry) => entry.slot_key === category && entry.slot === category && entry.team_scope === selectedTeamScope && entry.skinchanger_catalog_items?.weapon_class === activeWeapon?.weapon_class)
      : undefined)
    ?? (fallsBackToBoth ? loadoutEntries.find((entry) => entry.slot_key === selectedSlotKey && entry.team_scope === "all") : undefined)
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
    const matchesSelected = (entry: SkinchangerLoadoutEntry) => entry.catalog_item_id === selected.id && entry.slot_key === selectedSlotKey
    const savedOptions = (loadoutEntries.find((entry) => matchesSelected(entry) && entry.team_scope === selectedTeamScope)
      ?? (fallsBackToBoth ? loadoutEntries.find((entry) => matchesSelected(entry) && entry.team_scope === "all") : undefined))?.options
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
  }, [loadoutEntries, selected, selectedSlotKey, selectedTeamScope, fallsBackToBoth])

  useEffect(() => {
    if (catalogTeamScope !== "all" && teamScope !== catalogTeamScope) setTeamScope(catalogTeamScope)
  }, [catalogTeamScope, teamScope])

  useEffect(() => {
    if (slotTeam) return
    if (automaticOppositeTeamScope && teamScope !== automaticOppositeTeamScope) {
      setTeamScope(automaticOppositeTeamScope)
      return
    }
    if (hasOtherEquippedKnifeOrGloveLook && teamScope === "all") setTeamScope("ct")
  }, [automaticOppositeTeamScope, hasOtherEquippedKnifeOrGloveLook, teamScope, slotTeam])

  // Anything but agents and team-locked firearms can be given to both teams at once.
  const canUseForBothTeams = category !== "agent" && catalogTeamScope === "all" && selectedTeamScope !== "all"
  const saveScope: TeamScope = alsoOtherTeam && canUseForBothTeams ? "all" : selectedTeamScope
  const otherTeamName = selectedTeamScope === "ct" ? "T" : "CT"

  const selectedAlreadyEquipped = useMemo(
    () => selected ? loadoutEntries.some((entry) => entry.catalog_item_id === selected.id && entry.slot_key === selectedSlotKey && (entry.team_scope === saveScope || (saveScope !== "all" && fallsBackToBoth && entry.team_scope === "all")) && normalizeAppearanceOptions(entry.options) === normalizeAppearanceOptions(customOptions)) : false,
    [customOptions, loadoutEntries, selected, selectedSlotKey, saveScope, fallsBackToBoth],
  )

  const canUseLegacyLoadoutFallback = (error: unknown) => {
    const apiError = error as Partial<ApiError>
    return apiError.status === 404 || apiError.status === 405
  }

  const saveEntryWithCompatibility = async (entry: { catalogItemId: string; slot: SkinchangerSlot; slotKey: string; teamScope: TeamScope; options: SkinchangerAppearanceOptions }, expectedVersion = loadoutVersion, replaced: SkinchangerLoadoutEntry[] = []) => {
    try {
      return await skinchangerService.saveLoadoutEntry({ expectedVersion, entry })
    } catch (error) {
      if (!canUseLegacyLoadoutFallback(error)) throw error
      const entries = loadoutEntries
        .filter((current) => !(current.slot_key === entry.slotKey && current.team_scope === entry.teamScope) && !replaced.includes(current))
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

  /**
   * Optimistic save: the card shows the new look at once; on error the grid reverts to the previous
   * loadout and an error is shown.
   */
  const equipSelected = async () => {
    if (!selected) return false
    // The server keeps one knife and one glove per team, so that team's previous one is removed first;
    // a look for both teams replaces every knife/glove. Any other look for both teams replaces its T and
    // CT versions, so the same skin really shows on both sides.
    const isSameEntry = (entry: SkinchangerLoadoutEntry) => entry.slot_key === selectedSlotKey && entry.catalog_item_id === selected.id && entry.team_scope === saveScope
    const replaced = (activeSlot === "knife" || activeSlot === "glove")
      ? loadoutEntries.filter((entry) => entry.slot === activeSlot && (saveScope === "all" || entry.team_scope === saveScope) && !isSameEntry(entry))
      : saveScope === "all"
        ? loadoutEntries.filter((entry) => entry.slot_key === selectedSlotKey && entry.team_scope !== "all")
        : []
    const savedOptions: SkinchangerAppearanceOptions = {
      ...customOptions,
      stickers: [...(customOptions.stickers ?? [])],
      charm: customOptions.charm ? { ...customOptions.charm } : undefined,
    }
    const savedEntry: SkinchangerLoadoutEntry = {
      catalog_item_id: selected.id,
      slot: activeSlot,
      slot_key: selectedSlotKey,
      team_scope: saveScope,
      options: savedOptions,
      skinchanger_catalog_items: selected,
      resolved_accessories: Object.values(selectedAccessories),
    }
    const sharedLook = (activeSlot === "knife" || activeSlot === "glove") && saveScope !== "all"
      ? loadoutEntries.find((entry) => entry.slot === activeSlot && entry.team_scope === "all")
      : undefined
    const reassignSharedLook = sharedLook && sharedLook.catalog_item_id !== selected.id
      ? { ...sharedLook, team_scope: saveScope === "t" ? "ct" as const : "t" as const }
      : undefined
    const previousEntries = optimisticLoadoutEntries
    const previousVersion = optimisticLoadoutVersion
    setOptimisticLoadoutEntries([
      ...loadoutEntries.filter((entry) => {
        if (entry.slot_key === selectedSlotKey && entry.team_scope === saveScope) return false
        if (replaced.includes(entry)) return false
        if (sharedLook && entry.slot_key === sharedLook.slot_key && entry.team_scope === "all") return false
        return true
      }),
      ...(reassignSharedLook ? [reassignSharedLook] : []),
      savedEntry,
    ])
    setSaving(true)
    try {
      let expectedVersion = loadoutVersion
      for (const entry of replaced) {
        const removed = await removeEntryWithCompatibility(entry, expectedVersion)
        expectedVersion = removed.version
      }
      const result = await saveEntryWithCompatibility({ catalogItemId: selected.id, slot: activeSlot, slotKey: selectedSlotKey, teamScope: saveScope, options: savedOptions }, expectedVersion, replaced)
      setOptimisticLoadoutVersion(result.version)
      toast.success("Saved. Type !rs in game to apply it.", { id: "skinchanger-save" })
      refetchLoadout()
      return true
    } catch {
      setOptimisticLoadoutEntries(previousEntries)
      setOptimisticLoadoutVersion(previousVersion)
      toast.error(`Could not save ${selected.display_name}. Your previous look is back.`, { id: "skinchanger-save" })
      refetchLoadout()
      return false
    } finally {
      setSaving(false)
    }
  }

  /** Optimistic removal with a 5s "Undo" that saves the same look back. */
  const removeLook = async (model: SkinchangerCatalogItem, entry: SkinchangerLoadoutEntry) => {
    const before = loadoutEntries
    const beforeEntries = optimisticLoadoutEntries
    setOptimisticLoadoutEntries(before.filter((current) => !(current.slot_key === entry.slot_key && current.team_scope === entry.team_scope)))
    setSaving(true)
    try {
      const result = await removeEntryWithCompatibility(entry, loadoutVersion)
      setOptimisticLoadoutVersion(result.version)
      refetchLoadout()
      toast(`${model.display_name} look removed.`, {
        id: "skinchanger-remove",
        duration: 5000,
        action: {
          label: "Undo",
          onClick: () => {
            setOptimisticLoadoutEntries(before)
            void saveEntryWithCompatibility({ catalogItemId: entry.catalog_item_id, slot: entry.slot, slotKey: entry.slot_key, teamScope: entry.team_scope, options: entry.options }, result.version)
              .then((restored) => { setOptimisticLoadoutVersion(restored.version); refetchLoadout() })
              .catch(() => { setOptimisticLoadoutEntries(null); setOptimisticLoadoutVersion(null); toast.error("Could not restore that look.", { id: "skinchanger-remove" }); refetchLoadout() })
          },
        },
      })
    } catch {
      setOptimisticLoadoutEntries(beforeEntries)
      toast.error(`Could not remove ${model.display_name}. Try again.`, { id: "skinchanger-remove" })
      refetchLoadout()
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
  const gridEntryFor = (item: SkinchangerCatalogItem, kind: ModelKind, team: TeamScope = teamScope) => {
    const slotKey = slotKeyForCatalogItem(item, kind)
    const lockedTeam = teamScopeFromMetadata(item)
    const viewTeam: TeamScope = lockedTeam !== "all" ? lockedTeam : team
    const matchesModel = (entry: SkinchangerLoadoutEntry) => entry.slot_key === slotKey
      // Older knife and glove looks were stored under the plain slot key.
      || (kind !== "weapon" && entry.slot === kind && entry.slot_key === kind && entry.skinchanger_catalog_items?.weapon_class === item.weapon_class)
    return loadoutEntries.find((entry) => matchesModel(entry) && entry.team_scope === viewTeam)
      ?? (viewTeam !== "all" ? loadoutEntries.find((entry) => matchesModel(entry) && entry.team_scope === "all") : undefined)
  }

  const collectionForKind = (kind: ModelKind): CollectionId => (kind === "weapon" ? "skins" : kind)

  /** Remembers the page's team so a team-locked model or a single-slot item cannot change it for good. */
  const beginPicker = () => {
    if (closeTimerRef.current !== null) { window.clearTimeout(closeTimerRef.current); closeTimerRef.current = null }
    if (gridTeamRef.current === null) gridTeamRef.current = teamScope
    setAlsoOtherTeam(false)
    setDefaultChoice(null)
    setWeaponClass("")
    setQuery("")
    setOffset(0)
    setAccessoryPicker(null)
    setEditingStickerSlot(null)
    setPickerOpen(true)
  }

  /** Card body of a firearm, knife or glove: choose a skin for that model. */
  const openModelPicker = (item: SkinchangerCatalogItem, kind: ModelKind, team?: TeamScope) => {
    beginPicker()
    if (team) setTeamScope(team)
    setCollection(collectionForKind(kind))
    setSkinGroup("Rifles")
    setAgentTeam(null)
    setActiveWeapon(item)
    setSelected(null)
  }

  /** Customize button: straight to the options of the saved skin; without one, the picker. */
  const openModelCustomize = (item: SkinchangerCatalogItem, kind: ModelKind, entry: SkinchangerLoadoutEntry | undefined, team?: TeamScope) => {
    if (!entry?.skinchanger_catalog_items) {
      openModelPicker(item, kind, team)
      return
    }
    beginPicker()
    setCollection(collectionForKind(kind))
    setSkinGroup("Rifles")
    setAgentTeam(null)
    customizeSavedLook(item, entry)
    // A "Both" look opened from the T or CT face is saved for that face.
    if (team) setTeamScope(team)
  }

  const agentEntryFor = (team: "t" | "ct") => loadoutEntries.find((entry) => entry.slot === "agent" && entry.team_scope === team)
  type SingleSlot = "music_kit" | "pin"
  const singleEntryFor = (slot: SingleSlot, team: "t" | "ct") =>
    loadoutEntries.find((entry) => entry.slot === slot && entry.team_scope === team)
    ?? loadoutEntries.find((entry) => entry.slot === slot && entry.team_scope === "all")

  const openAgentPicker = (team: "t" | "ct") => {
    beginPicker()
    setCollection("skins")
    setSkinGroup("agents")
    setAgentTeam(team)
    setTeamScope(team)
    setActiveWeapon(null)
    setSelected(agentEntryFor(team)?.skinchanger_catalog_items ?? null)
  }

  /** Music kit and pin halves: the dialog saves for that half's team. */
  const openSinglePicker = (slot: SingleSlot, team: "t" | "ct") => {
    beginPicker()
    setCollection(slot)
    setSkinGroup("Rifles")
    setAgentTeam(null)
    setTeamScope(team)
    setActiveWeapon(null)
    setSelected(singleEntryFor(slot, team)?.skinchanger_catalog_items ?? null)
  }

  type SlotKind = "knife" | "glove"
  const knifeList = (knifeModels?.data ?? []).filter((item) => item.display_name !== "Knife").sort((a, b) => a.display_name.localeCompare(b.display_name))
  const gloveList = [...(gloveModels?.data ?? [])].sort((a, b) => a.display_name.localeCompare(b.display_name))
  const modelsForSlot = (kind: SlotKind) => (kind === "knife" ? knifeList : gloveList)

  /** The knife or glove a team uses; a "Both" look counts for either team. */
  const slotEntryFor = (kind: SlotKind, team: "t" | "ct") =>
    loadoutEntries.find((entry) => entry.slot === kind && entry.team_scope === team)
    ?? loadoutEntries.find((entry) => entry.slot === kind && entry.team_scope === "all")

  const modelForEntry = (kind: SlotKind, entry: SkinchangerLoadoutEntry | undefined) =>
    entry?.skinchanger_catalog_items
      ? modelsForSlot(kind).find((model) => model.weapon_class === entry.skinchanger_catalog_items?.weapon_class) ?? null
      : null

  /** T/CT knife and glove cards: the dialog opens on the saved model, or the first one. */
  const openSlotPicker = (kind: SlotKind, team: "t" | "ct", customize: boolean) => {
    const entry = slotEntryFor(kind, team)
    const model = modelForEntry(kind, entry) ?? modelsForSlot(kind)[0] ?? null
    beginPicker()
    setCollection(kind)
    setSkinGroup("Rifles")
    setAgentTeam(null)
    setSlotTeam(team)
    if (customize && model && entry?.skinchanger_catalog_items) {
      customizeSavedLook(model, entry)
      return
    }
    setActiveWeapon(model)
    setSelected(null)
  }

  const switchSlotModel = (model: SkinchangerCatalogItem) => {
    setActiveWeapon(model)
    setSelected(null)
    setQuery("")
    setOffset(0)
    setAccessoryPicker(null)
    setEditingStickerSlot(null)
  }

  const closePicker = () => {
    setPickerOpen(false)
    if (gridTeamRef.current !== null) {
      setTeamScope(gridTeamRef.current)
      gridTeamRef.current = null
    }
    if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current)
    closeTimerRef.current = window.setTimeout(resetPicker, 180)
  }

  function resetPicker() {
    closeTimerRef.current = null
    setSlotTeam(null)
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
    setRarityFilter(null)
  }

  useEffect(() => () => { if (closeTimerRef.current !== null) window.clearTimeout(closeTimerRef.current) }, [])

  // The grid's team lives in the URL (?team=ct), so reload and back/forward keep it.
  useEffect(() => {
    if (pickerOpen) return
    const wanted = teamScope === "ct" ? "ct" : null
    if ((searchParams.get("team") ?? null) === wanted) return
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      if (wanted) next.set("team", wanted)
      else next.delete("team")
      return next
    }, { replace: true })
  }, [pickerOpen, teamScope, searchParams, setSearchParams])

  /** Closes at once; the card already shows the new look while the save runs. */
  const saveAndClose = () => {
    void equipSelected()
    closePicker()
  }

  const showsForTeam = (item: SkinchangerCatalogItem) => {
    const locked = teamScopeFromMetadata(item)
    return locked === "all" || locked === teamScope
  }
  const modelSections = weaponGridGroups.map((group) => {
    const items = (firearmModels?.data ?? [])
      .filter((item) => gridGroupForFirearm(item) === group && showsForTeam(item))
      .sort((a, b) => firearmOrder(a) - firearmOrder(b))
    return { group, kind: "weapon" as const, items }
  })
  const sectionItems = (group: WeaponGridGroup) => modelSections.find((section) => section.group === group)?.items ?? []
  const showKnives = knifeList.length > 0
  const showGloves = gloveList.length > 0
  const defaultKnifeImage = (() => { const item = (knifeModels?.data ?? []).find((model) => model.display_name === "Knife"); return item ? catalogImageUrl(item) : null })()
  const gridLoading = firearmsLoading || knivesLoading || glovesLoading
  const gridError = firearmsError ?? knivesError ?? glovesError

  const isModelBrowse = (category === "weapon" || category === "glove" || category === "knife") && !activeWeapon
  const browsableCatalogItems = catalogItems.filter((item) => !(isModelBrowse && category === "knife" && item.display_name === "Knife"))
  /** Rarity pills, in the catalogue's own order, for the skins this page holds. */
  const rarityFilters = [
    { id: null, label: "All" },
    ...[...new Set(browsableCatalogItems.map((item) => (typeof item.metadata.rarity === "string" ? item.metadata.rarity : "")).filter(Boolean))]
      .sort((a, b) => (rarityStyles[a]?.rank ?? 99) - (rarityStyles[b]?.rank ?? 99))
      .map((rarity) => ({ id: rarity, label: rarity.replace(/ Grade$/, "") })),
  ]
  const displayedCatalogItems = rarityFilter
    ? browsableCatalogItems.filter((item) => item.metadata.rarity === rarityFilter)
    : browsableCatalogItems

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

  const accessoryOpen = Boolean(canCustomizeAccessories && accessoryPicker)
  const closeAccessoryPicker = () => { setAccessoryPicker(null); setEditingStickerSlot(null) }
  /** Sticker / charm picker: takes over the catalogue on the left while a slot or the charm is being chosen. */
  const renderAccessoryBrowser = () => {
    const items = accessoryCatalog?.data ?? []
    const currentId = accessoryPicker === "sticker"
      ? customOptions.stickers?.find((sticker) => sticker.slot === editingStickerSlot)?.catalogItemId
      : customOptions.charm?.catalogItemId
    const noun = accessoryPicker === "sticker" ? "stickers" : "charms"
    return (
      <div key={`${accessoryPicker}:${editingStickerSlot ?? ""}`} className="flex min-h-0 flex-1 flex-col animate-in fade-in-0 duration-200 motion-reduce:animate-none">
        <div className="flex items-center gap-2 border-b border-[var(--line-soft)] p-3">
          <button type="button" onClick={closeAccessoryPicker} aria-label={`Back to ${activeWeapon?.display_name ?? "skins"}`} className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-[var(--line)] text-[var(--text-muted)] transition-colors hover:border-[var(--line-strong)] hover:text-[var(--text)]">
            <ArrowLeft className="size-4" />
          </button>
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-semibold text-[var(--text)]">{accessoryPicker === "sticker" ? `Sticker · slot ${(editingStickerSlot ?? 0) + 1}` : "Charm"}</span>
            <span className="truncate text-[11px] text-[var(--text-dim)]">For {activeWeapon?.display_name ?? "this weapon"}</span>
          </span>
          <label className="relative ml-auto w-56 max-w-[45%]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--text-dim)]" />
            <Input autoFocus value={accessoryQuery} onChange={(event) => setAccessoryQuery(event.target.value)} placeholder={`Search ${noun}`} className="h-9 rounded-[10px] border-[var(--line)] bg-[var(--card-surface)] pl-9 text-xs" />
          </label>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {accessoriesLoading && items.length === 0 ? (
            <CardGridSkeleton count={12} className="grid-cols-[repeat(auto-fill,minmax(7rem,1fr))]" />
          ) : accessoryCatalogError ? (
            <p className="flex items-center justify-center gap-3 py-10 text-[13px] text-[var(--text-dim)]">
              Could not load {noun}.
              <button type="button" onClick={refetchAccessoryCatalog} className="inline-flex items-center gap-1.5 text-[var(--text-2)] hover:text-[var(--text)]"><RotateCcw className="size-3.5" />Retry</button>
            </p>
          ) : items.length === 0 ? (
            <p className="py-10 text-center text-[13px] text-[var(--text-dim)]">Nothing matches this search.</p>
          ) : (
            <div ref={accessoryGridRef} className="grid grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-2">
              {items.map((item) => {
                const image = catalogImageUrl(item)
                const isCurrent = item.id === currentId
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => chooseAccessory(item)}
                    data-catalog-item-id={item.id}
                    className={cn(
                      "relative flex flex-col overflow-hidden rounded-lg border bg-[var(--card-surface)] p-2 text-left transition-colors duration-150",
                      isCurrent ? "border-[var(--accent-solid)]" : "border-[var(--line-soft)] hover:border-[var(--line-strong)]",
                    )}
                  >
                    <span className="flex h-16 items-center justify-center">
                      {image ? <OptimizedImage src={image} width={120} height={64} alt="" className="h-full w-full object-contain" /> : <ImageOff className="size-5 text-[var(--text-faint)]" />}
                    </span>
                    <span className="mt-1.5 line-clamp-2 text-[11px] font-semibold leading-4 text-[var(--text)]">{item.display_name}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Team-locked models (e.g. AK-47, M4A4) keep their automatic side while a dialog is open.
  const teamLocked = Boolean(activeWeapon) && !showTeamSelector
  const shownTeam: "t" | "ct" = (teamLocked ? selectedTeamScope : teamScope) === "ct" ? "ct" : "t"
  const teamTabs = useRef<Partial<Record<"t" | "ct", HTMLButtonElement | null>>>({})
  const [teamPill, setTeamPill] = useState<{ left: number; width: number } | null>(null)

  // The pill follows the selected tab, so the colour travels instead of jumping.
  useLayoutEffect(() => {
    const move = () => {
      const tab = teamTabs.current[shownTeam]
      if (tab) setTeamPill({ left: tab.offsetLeft, width: tab.offsetWidth })
    }
    move()
    window.addEventListener("resize", move)
    return () => window.removeEventListener("resize", move)
  }, [shownTeam])

  const renderTeamSwitch = () => (
    <div role="tablist" aria-label="Team" className="relative flex gap-0.5 rounded-[10px] border border-[var(--line)] bg-[var(--card-surface)] p-[3px]">
      {teamPill && (
        <span
          aria-hidden="true"
          style={{ left: teamPill.left, width: teamPill.width }}
          className={cn(
            "pointer-events-none absolute inset-y-[3px] rounded-[7px]",
            // The thumb takes the side's colour (muted yellow T, sky-blue CT) as a light tint, so the label and art stay readable.
            "border transition-[left,width,background-color,border-color] duration-200 ease-[var(--ease-out)] motion-reduce:transition-none",
            shownTeam === "t" ? "border-[var(--team-t)]/55 bg-[var(--team-t)]/20" : "border-[var(--team-ct)]/55 bg-[var(--team-ct)]/20",
          )}
        />
      )}
      {teamOptions.map((team) => {
        const isActive = shownTeam === team.id
        return (
          <button
            key={team.id}
            ref={(node) => { teamTabs.current[team.id] = node }}
            type="button"
            role="tab"
            aria-selected={isActive}
            disabled={teamLocked}
            onClick={() => setTeamScope(team.id)}
            className={cn(
              "relative z-[1] flex h-8 items-center gap-2 rounded-[7px] px-[18px] text-[13px] font-semibold",
              "transition-colors duration-200 ease-[var(--ease-out)] motion-reduce:transition-none",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60",
              isActive
                ? team.id === "t" ? "text-[var(--team-t)]" : "text-[var(--team-ct)]"
                : "text-[var(--text-muted)] hover:text-[var(--text)]",
              teamLocked && !isActive && "cursor-not-allowed opacity-35",
            )}
          >
            <img
              src={team.id === "t" ? teamTIcon : teamCtIcon}
              alt=""
              className={cn(
                "size-4 object-contain transition-opacity duration-200 motion-reduce:transition-none",
                isActive ? "opacity-100" : "opacity-60",
              )}
            />
            {team.label}
          </button>
        )
      })}
    </div>
  )

  /** An inventory slot card. Hover blurs the render; Customize and remove sit on top of the card button. */
  const renderCard = ({ id, image, fallback, title, savedItem, entry, openLabel, tall, onOpen, onCustomize, onRemove }: {
    id: string
    image: string | null
    fallback?: string
    title: string
    subtitle: string
    savedItem: SkinchangerCatalogItem | null
    entry: SkinchangerLoadoutEntry | undefined
    openLabel: string
    /** Agents are portraits, so their card is given more room. */
    tall?: boolean
    onOpen: () => void
    onCustomize?: () => void
    onRemove?: () => void
  }) => {
    const rarity = savedItem ? rarityStyle(savedItem) : null
    const src = image ?? fallback ?? null
    return (
      <div
        key={id}
        data-slot-card={id}
        className={cn(
          "group relative overflow-hidden rounded-lg border border-[var(--line-soft)] bg-[var(--card-surface)]",
          "transition-colors duration-300 ease-out hover:border-[var(--line-strong)]",
          tall ? "h-44" : "h-24",
        )}
      >
        <span aria-hidden="true" className="pointer-events-none absolute left-0 top-0 size-[18px] bg-[var(--line)] [clip-path:polygon(0_0,100%_0,0_100%)]" />

        <button type="button" onClick={onOpen} aria-label={openLabel} className="absolute inset-0 z-[1] rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-solid)]/60" />

        {/* Keyed by the look, so switching team fades the new skin in instead of swapping it. */}
        <span className={cn(
          "pointer-events-none absolute inset-0 flex items-center justify-center px-6 pb-6",
          "transition-[filter,opacity] duration-150 ease-[var(--ease-out)] motion-reduce:transition-none motion-reduce:!blur-none",
          "group-hover:opacity-55 group-hover:blur-[4px] group-has-[:focus-visible]:opacity-55 group-has-[:focus-visible]:blur-[4px]",
          tall ? "pt-5" : "pt-3",
        )}>
          {src
            ? <OptimizedImage key={src} src={src} width={220} height={90} alt="" className={cn("max-h-full w-full object-contain", swapIn)} />
            : <ImageOff className="size-6 text-[var(--text-faint)]" />}
        </span>

        <span aria-hidden="true" className="pointer-events-none absolute bottom-[26px] left-2 h-4 w-3 rounded border border-dashed border-[var(--line-strong)]" />
        <span className="pointer-events-none absolute bottom-[7px] left-2 right-2 truncate text-[11px] font-semibold uppercase tracking-[0.4px] text-[var(--text-2)]">{title}</span>
        {rarity && <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px]" style={{ backgroundColor: rarity.accent }} />}

        <button
          type="button"
          onClick={(event) => { event.stopPropagation(); (onCustomize ?? onOpen)() }}
          aria-label={onCustomize && savedItem ? `Customize ${savedItem.display_name}` : openLabel}
          className="absolute left-1/2 top-1/2 z-[2] flex size-[34px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[10px] border border-[var(--line-strong)] bg-[var(--panel)] text-[var(--text)] opacity-0 transition-opacity duration-150 ease-[var(--ease-out)] group-hover:opacity-100 focus-visible:opacity-100 motion-reduce:transition-none [@media(hover:none)]:opacity-100"
        >
          <SlidersHorizontal className="size-[18px]" />
        </button>

        {entry && savedItem && onRemove && (
          <button
            type="button"
            onClick={(event) => { event.stopPropagation(); onRemove() }}
            disabled={saving}
            aria-label={`Remove ${savedItem.display_name}`}
            className="absolute right-1.5 top-1.5 z-[2] flex size-7 items-center justify-center rounded-lg border border-[var(--line-strong)] bg-[var(--panel)] text-[var(--text-muted)] opacity-0 transition-[opacity,color] duration-150 ease-[var(--ease-out)] hover:text-[var(--text)] group-hover:opacity-100 focus-visible:opacity-100 disabled:pointer-events-none motion-reduce:transition-none [@media(hover:none)]:opacity-100"
          >
            <Trash2 className="size-3.5" />
          </button>
        )}
      </div>
    )
  }

  const renderSection = (title: string, cards: ReactNode[]) => cards.length === 0 ? null : (
    <section key={title} aria-label={title} className="flex flex-col gap-2.5">
      <h2 className="text-center text-[15px] font-bold tracking-[0.6px] text-[var(--text)]">{title}</h2>
      {cards}
    </section>
  )

  const modelCard = (item: SkinchangerCatalogItem, kind: ModelKind) => {
    const entry = gridEntryFor(item, kind)
    const savedItem = entry?.skinchanger_catalog_items ?? null
    return renderCard({
      id: `${kind}:${item.id}`,
      image: catalogImageUrl(savedItem ?? item) ?? (kind === "glove" ? defaultGloveVisual : null),
      title: item.display_name,
      subtitle: savedItem ? savedSkinLabel(savedItem) : "Default",
      savedItem,
      entry,
      openLabel: savedItem ? `Change ${item.display_name} skin (${savedSkinLabel(savedItem)})` : `Choose a ${item.display_name} skin`,
      onOpen: () => openModelPicker(item, kind),
      onCustomize: () => openModelCustomize(item, kind, entry),
      onRemove: entry ? () => void removeLook(item, entry) : undefined,
    })
  }

  /** Music kit and pin follow the team switch, so a card shows the look for the side you are on. */
  const singleCard = (slot: SingleSlot, team: "t" | "ct") => {
    const entry = singleEntryFor(slot, team)
    const savedItem = entry?.skinchanger_catalog_items ?? null
    const label = slot === "music_kit" ? "Music kit" : "Pin"
    return renderCard({
      id: `${slot}:${team}`,
      image: savedItem ? catalogImageUrl(savedItem) : slot === "pin" ? pinsIcon : defaultMusicKit,
      title: label,
      subtitle: savedItem ? savedItem.display_name : "Default",
      savedItem,
      entry,
      openLabel: savedItem ? `Change ${label.toLowerCase()} (${savedItem.display_name})` : `Choose a ${label.toLowerCase()}`,
      onOpen: () => openSinglePicker(slot, team),
      onRemove: entry && savedItem ? () => void removeLook(savedItem, entry) : undefined,
    })
  }

  const pickerTitle = slotTeam
    ? `${slotTeam === "t" ? "T" : "CT"} ${category === "glove" ? "gloves" : "knife"}`
    : activeWeapon
    ? activeWeapon.display_name
    : category === "agent" ? (agentTeam === "ct" ? "CT agent" : "T agent")
      : category === "music_kit" ? "Music kit" : "Pin"
  const pickerHasOptions = Boolean(selected && activeWeapon)
  // The switch only offers T and CT; "Both" looks count for the side you are on.
  const viewTeam: "t" | "ct" = teamScope === "ct" ? "ct" : "t"
  const equippedCount = loadoutEntries.filter((entry) => entry.team_scope === viewTeam || entry.team_scope === "all").length

  // Switching T/CT re-deals the loadout: every card drops in from above, top to bottom and column
  // by column, so the grid flows down instead of snapping. Skipped on first paint and with reduced motion.
  const gridRef = useRef<HTMLDivElement>(null)
  const dealtTeam = useRef(viewTeam)
  useLayoutEffect(() => {
    if (dealtTeam.current === viewTeam) return
    dealtTeam.current = viewTeam
    const grid = gridRef.current
    if (!grid || motionReduced()) return
    const top = grid.getBoundingClientRect().top
    const columns = Array.from(grid.children) as HTMLElement[]
    const animations: Animation[] = []
    columns.forEach((column, columnIndex) => {
      column.querySelectorAll<HTMLElement>("h2, [data-slot-card]").forEach((card) => {
        const row = Math.max(0, (card.getBoundingClientRect().top - top) / 114)
        const delay = Math.min(640, Math.round(row * 55 + columnIndex * 35))
        animations.push(card.animate(DROP_IN, { duration: 420, delay, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "backwards" }))
      })
    })
    return () => animations.forEach((animation) => animation.cancel())
  }, [viewTeam])

  const skinGridRef = useRef<HTMLDivElement>(null)
  const skinGridKey = pickerOpen && !accessoryOpen ? displayedCatalogItems.map((item) => item.id).join(",") : ""
  useLayoutEffect(() => (skinGridKey ? cascadeTiles(skinGridRef.current, "[data-catalog-item-id]") : undefined), [skinGridKey])

  const accessoryGridRef = useRef<HTMLDivElement>(null)
  const accessoryGridKey = accessoryOpen ? `${accessoryPicker}:${editingStickerSlot ?? ""}:${(accessoryCatalog?.data ?? []).map((item) => item.id).join(",")}` : ""
  useLayoutEffect(() => (accessoryGridKey ? cascadeTiles(accessoryGridRef.current, "[data-catalog-item-id]") : undefined), [accessoryGridKey])

  const slotCard = (kind: SlotKind) => {
    const entry = slotEntryFor(kind, viewTeam)
    const savedItem = entry?.skinchanger_catalog_items ?? null
    const label = kind === "knife" ? "Knife" : "Gloves"
    return renderCard({
      id: `${kind}:${viewTeam}`,
      image: savedItem ? catalogImageUrl(savedItem) : kind === "knife" ? defaultKnifeImage : defaultGloveVisual,
      title: label,
      subtitle: savedItem ? savedItem.display_name.replace(/^★\s*/, "").replace(wearSuffix, "") : "Default",
      savedItem,
      entry,
      openLabel: savedItem ? `Change ${label.toLowerCase()} (${savedItem.display_name})` : `Choose ${label.toLowerCase()}`,
      onOpen: () => openSlotPicker(kind, viewTeam, false),
      onCustomize: () => openSlotPicker(kind, viewTeam, true),
      onRemove: entry && savedItem ? () => void removeLook(modelForEntry(kind, entry) ?? savedItem, entry) : undefined,
    })
  }

  const agentCard = () => {
    const entry = agentEntryFor(viewTeam)
    const savedItem = entry?.skinchanger_catalog_items ?? null
    const defaultAgent = viewTeam === "t" ? defaultAgentT : defaultAgentCt
    return renderCard({
      id: `agent:${viewTeam}`,
      image: savedItem ? catalogImageUrl(savedItem) : defaultAgent,
      title: "Agent",
      subtitle: savedItem ? savedItem.display_name : "Default",
      savedItem,
      entry,
      openLabel: `Choose a ${viewTeam === "t" ? "T" : "CT"} agent`,
      tall: true,
      onOpen: () => openAgentPicker(viewTeam),
      onRemove: entry && savedItem ? () => void removeLook(savedItem, entry) : undefined,
    })
  }

  const weaponSection = (title: string, group: WeaponGridGroup) =>
    renderSection(title, sectionItems(group).map((item) => modelCard(item, "weapon")))

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Three columns when there is room; on a narrow panel the switch drops to its own row. */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-3 px-6 py-4 lg:grid lg:h-[72px] lg:grid-cols-[1fr_auto_1fr] lg:py-0">
        <div className="flex min-w-0 flex-1 flex-col gap-[3px] lg:flex-none">
          <h1 className="text-xl font-semibold leading-[1.2] tracking-[-0.3px] text-[var(--text)]">Loadout</h1>
          <span className="truncate text-xs leading-[1.2] text-[var(--text-muted)]">
            Pick skins, then type <span className="rounded-[5px] bg-[var(--raised)] px-1.5 py-px font-medium text-[var(--text)]">!rs</span> in game.
          </span>
        </div>
        <div className="order-last flex basis-full justify-center lg:order-none lg:basis-auto">{renderTeamSwitch()}</div>
        <p className="flex shrink-0 items-center justify-end gap-2 text-xs text-[var(--text-muted)]">
          Equipped <span className="font-semibold tabular-nums text-[var(--text)]">{equippedCount}</span>
        </p>
      </div>

      <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-6 pb-7 pt-1">
        {gridError ? (
          <QueryState loading={false} error={{ ...gridError, message: "Could not load the collection. Please try again." }} empty={false} onRetry={() => { refetchFirearms(); refetchKnives(); refetchGloves() }} />
        ) : gridLoading && !firearmModels ? (
          <div className="grid grid-cols-1 items-start gap-[18px] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5" aria-hidden="true">
            {[6, 5, 5, 4, 3].map((count, column) => (
              <div key={column} className="flex flex-col gap-2.5">
                <Skeleton className="mx-auto h-3.5 w-20 rounded-full bg-[var(--line)]" />
                {Array.from({ length: count }, (_, index) => <Skeleton key={index} className="h-24 rounded-lg bg-[var(--card-surface)]" />)}
              </div>
            ))}
          </div>
        ) : (
          <div ref={gridRef} className="grid grid-cols-1 items-start gap-[18px] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <div className="flex flex-col gap-[22px]">{weaponSection("PISTOLS", "Pistols")}</div>
            <div className="flex flex-col gap-[22px]">{weaponSection("SMGS", "SMGs")}</div>
            <div className="flex flex-col gap-[22px]">
              {weaponSection("RIFLES", "Rifles")}
            </div>
            <div className="flex flex-col gap-[22px]">
              {weaponSection("SNIPER RIFLES", "Sniper Rifles")}
              {weaponSection("HEAVY", "Heavy")}
            </div>
            <div className="flex flex-col gap-[22px]">
              {renderSection("AGENT", [agentCard()])}
              {showGloves && renderSection("GLOVES", [slotCard("glove")])}
              {showKnives && renderSection("KNIFE", [slotCard("knife")])}
              {renderSection("MUSIC KIT", [singleCard("music_kit", viewTeam)])}
              {renderSection("PIN", [singleCard("pin", viewTeam)])}
            </div>
          </div>
        )}
      </div>

      <Dialog open={pickerOpen} onOpenChange={(open) => { if (!open) closePicker() }}>
        <DialogContent
          overlayClassName="bg-black/55 backdrop-blur-[10px] data-[state=open]:duration-200 data-[state=closed]:duration-150 motion-reduce:animate-none"
          className="flex max-h-[92dvh] w-[calc(100%-1.5rem)] max-w-5xl flex-col gap-0 overflow-hidden rounded-[14px] border-[var(--line)] bg-[var(--panel)] p-0 ease-[var(--ease-out)] data-[state=open]:zoom-in-[0.98] data-[state=closed]:zoom-out-[0.98] data-[state=open]:duration-[250ms] data-[state=closed]:duration-150 motion-reduce:animate-none sm:max-w-5xl"
          onOpenAutoFocus={(event) => { if (searchInputRef.current && searchInputRef.current.offsetParent !== null) { event.preventDefault(); searchInputRef.current.focus() } }}
        >
          <div className="flex items-center gap-3 border-b border-[var(--line-soft)] px-4 py-3 pr-12">
            {selected && pickerHasOptions && (
              <button type="button" onClick={() => setSelected(null)} className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground hover:text-foreground lg:hidden" aria-label="Back to the list">
                <ArrowLeft className="size-4" />
              </button>
            )}
            <div className="min-w-0 flex-1">
              <DialogTitle className="flex items-center gap-2 truncate text-base">
                {selectedTeamScope !== "all" && <img src={selectedTeamScope === "t" ? teamTIcon : teamCtIcon} alt={selectedTeamScope === "t" ? "T" : "CT"} className="size-5 shrink-0 object-contain" />}
                <span className="truncate">{pickerTitle}</span>
              </DialogTitle>
              <DialogDescription className="truncate text-xs">
                {savedItemForActiveSlot ? `Saved: ${activeWeapon ? savedSkinLabel(savedItemForActiveSlot) : savedItemForActiveSlot.display_name}` : activeWeapon ? "Choose a skin" : "Choose one"}
              </DialogDescription>
            </div>
            <label className={cn("relative hidden w-60 shrink-0 sm:block", accessoryOpen && "sm:hidden")}>
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--text-dim)]" />
              <Input
                ref={searchInputRef}
                value={query}
                onChange={(event) => { setQuery(event.target.value); setOffset(0) }}
                placeholder={`Search ${activeWeapon ? "skins" : category === "agent" ? "agents" : category === "music_kit" ? "music kits" : "pins"}`}
                className="h-9 rounded-[10px] border-[var(--line)] bg-[var(--card-surface)] pl-9 text-xs"
              />
            </label>
          </div>

          <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_340px]">
            {/* Catalogue */}
            <div className={cn("flex min-h-0 flex-col", selected && pickerHasOptions && !accessoryOpen && "hidden lg:flex")}>
              {accessoryOpen ? renderAccessoryBrowser() : (<>
              {slotTeam && (category === "knife" || category === "glove") && (
                <div role="tablist" aria-label={category === "knife" ? "Knife type" : "Glove type"} className="flex gap-1.5 overflow-x-auto border-b border-border px-3 py-2.5 [scrollbar-width:thin]">
                  {modelsForSlot(category).map((model) => {
                    const isActive = activeWeapon?.id === model.id
                    const isSaved = modelForEntry(category, slotEntryFor(category, slotTeam))?.id === model.id
                    return (
                      <button
                        key={model.id}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => switchSlotModel(model)}
                        className={cn(
                          "relative h-8 shrink-0 rounded-md border px-3 text-xs font-medium transition-colors",
                          isActive ? "border-foreground/60 bg-secondary text-foreground" : "border-border text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {model.display_name.replace(/\s+(Gloves|Knife)$/i, "")}
                        {isSaved && <span aria-label="saved" className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-[var(--status-green)]" />}
                      </button>
                    )
                  })}
                </div>
              )}
              <div className="flex flex-wrap items-center gap-1.5 border-b border-[var(--line-soft)] p-3 sm:hidden">
                <label className="relative block w-full">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--text-dim)]" />
                  <Input value={query} onChange={(event) => { setQuery(event.target.value); setOffset(0) }} placeholder="Search" className="h-9 rounded-[10px] border-[var(--line)] bg-[var(--card-surface)] pl-9 text-xs" />
                </label>
              </div>
              {rarityFilters.length > 1 && (
                <div role="tablist" aria-label="Rarity" className="flex flex-wrap items-center gap-1.5 border-b border-[var(--line-soft)] p-3">
                  {rarityFilters.map((option) => {
                    const isActive = rarityFilter === option.id
                    return (
                      <button
                        key={option.label}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => setRarityFilter(option.id)}
                        className={cn(
                          "h-7 rounded-full border px-3 text-xs font-medium transition-colors duration-150",
                          isActive
                            ? "border-[var(--accent-solid)]/40 bg-[var(--accent-solid)]/10 text-[var(--accent-solid)]"
                            : "border-[var(--line)] bg-[var(--card-surface)] text-[var(--text-muted)] hover:text-[var(--text)]",
                        )}
                      >
                        {option.label}
                      </button>
                    )
                  })}
                </div>
              )}
              <div className="min-h-0 flex-1 overflow-y-auto p-3">
                <QueryState skeleton={<CardGridSkeleton count={12} className="grid-cols-[repeat(auto-fill,minmax(8rem,1fr))]" />} loading={catalogLoading} error={catalogError ? { ...catalogError, message: "Could not load the collection. Please try again." } : null} empty={!catalogLoading && !catalogError && displayedCatalogItems.length === 0} onRetry={refetchCatalog} emptyMessage="Nothing matches this search." />
                {!catalogLoading && !catalogError && displayedCatalogItems.length > 0 && (
                  <div ref={skinGridRef} className="grid grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-2">
                    {displayedCatalogItems.map((item) => {
                      const rarity = rarityStyle(item)
                      const isSelected = selected?.id === item.id
                      // Once another skin is picked, the old one is no longer marked, so only the new choice stands out.
                      const isSaved = savedItemForActiveSlot?.id === item.id && (!selected || isSelected)
                      const image = catalogImageUrl(item)
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => selectSkin(item)}
                          data-catalog-item-id={item.id}
                          className={cn(
                            "relative flex flex-col overflow-hidden rounded-lg border bg-[var(--card-surface)] p-2 text-left transition-colors duration-150",
                            isSelected ? "border-[var(--accent-solid)]" : "border-[var(--line-soft)] hover:border-[var(--line-strong)]",
                          )}
                        >
                          {rarity && <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px]" style={{ backgroundColor: rarity.accent }} />}
                          {isSaved && <span className="absolute right-1.5 top-1.5 inline-flex items-center gap-1 rounded border border-[var(--accent-solid)]/35 bg-[var(--accent-solid)]/10 px-1 py-px text-[9px] font-semibold uppercase text-[var(--accent-solid)]"><BadgeCheck className="size-3" />Saved</span>}
                          <span className="flex h-20 items-center justify-center">
                            {image ? <OptimizedImage src={image} width={180} height={90} alt="" className="h-full w-full object-contain" /> : <ImageOff className="size-6 text-muted-foreground/50" />}
                          </span>
                          <span className="mt-1.5 line-clamp-2 text-[11px] font-semibold leading-4">{activeWeapon ? savedSkinLabel(item) : item.display_name}</span>
                          {typeof item.metadata.rarity === "string" && <span className="mt-0.5 truncate text-[10px] text-[var(--text-dim)]">{item.metadata.rarity}</span>}
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
              </>)}
            </div>

            {/* Preview, customize and save */}
            <aside className={cn("min-h-0 overflow-y-auto border-t border-border px-4 pt-4 lg:border-l lg:border-t-0", !(selected && pickerHasOptions) && "max-lg:max-h-[40dvh]", accessoryOpen && "max-lg:hidden")}>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{selected ? "Your choice" : "Nothing picked yet"}</p>
              <p className="mb-3 mt-1 truncate text-sm font-semibold">{previewChoice?.display_name || `Pick ${activeWeapon ? `a ${activeWeapon.display_name} skin` : "one from the list"}`}</p>
            <div className="relative flex h-40 items-center justify-center rounded-lg border border-border bg-background">
              {previewChoice && catalogImageUrl(previewChoice) ? <OptimizedImage src={catalogImageUrl(previewChoice) ?? ""} width={320} height={160} priority alt={`${previewChoice.display_name} selected collectible`} data-catalog-item-id={previewChoice.id} className="h-full w-full object-contain p-3" /> : <span className="flex flex-col items-center gap-2 px-6 text-center"><ImageOff className="size-7 text-muted-foreground/50" /><span className="text-[11px] leading-4 text-muted-foreground">Pick one from the list.</span></span>}
              {canCustomizeAccessories && (previewStickerItems.length > 0 || previewCharmItem) && <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2"><div className="flex -space-x-1.5">{previewStickerItems.slice(0, 5).map((item) => catalogImageUrl(item) && <OptimizedImage key={item.id} src={catalogImageUrl(item) ?? ""} width={28} height={28} alt={`${item.display_name} selected sticker`} data-catalog-item-id={item.id} className="size-7 rounded-full border border-background bg-card object-contain p-0.5" />)}</div>{previewCharmItem && catalogImageUrl(previewCharmItem) && <OptimizedImage src={catalogImageUrl(previewCharmItem) ?? ""} width={32} height={32} alt={`${previewCharmItem.display_name} selected charm`} data-catalog-item-id={previewCharmItem.id} className="size-8 rounded-md border border-background bg-card object-contain p-0.5" />}</div>}
            </div>
            {selected && activeWeapon && (
              <div className="mt-3 grid grid-rows-[1fr] overflow-hidden">
              <div className="min-h-0 overflow-hidden">
              <div className="space-y-4 border-t border-border pt-4">
                <div>
                  <div className="mb-2 flex items-center justify-between"><span className="text-xs font-medium">Wear</span><span className="text-xs font-medium tabular-nums" style={{ color: wearColor(customOptions.wear ?? defaultWear) }}>{wearName(customOptions.wear ?? defaultWear)} · {(customOptions.wear ?? defaultWear).toFixed(4)}</span></div>
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
                            "relative h-7 overflow-hidden rounded-md border text-[10px] font-semibold transition-colors duration-150",
                            !isActive && "border-[var(--line)] bg-[var(--panel)] text-[var(--text-muted)] hover:text-[var(--text)]",
                            !available && "cursor-not-allowed opacity-30",
                          )}
                          style={isActive ? { color: tier.color, borderColor: `color-mix(in oklab, ${tier.color} 60%, transparent)`, backgroundColor: `color-mix(in oklab, ${tier.color} 16%, transparent)` } : undefined}
                        >
                          {tier.short}
                          <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[2px]" style={{ backgroundColor: tier.color, opacity: isActive ? 1 : 0.55 }} />
                        </button>
                      )
                    })}
                  </div>
                  <input aria-label="Skin wear" type="range" min={minWear} max={maxWear} step="0.0001" value={customOptions.wear ?? defaultWear} onChange={(event) => setCustomOptions((current) => ({ ...current, wear: Number(event.target.value) }))} className="wear-range h-2 w-full cursor-pointer" style={{ background: wearTrack(minWear, maxWear) }} />
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
                      return <button key={slot} onClick={() => openStickerPicker(slot)} className={cn("relative flex h-10 items-center justify-center rounded-md border text-[10px] transition-colors", sticker ? "border-foreground bg-secondary text-foreground" : "border-border bg-background text-muted-foreground hover:bg-secondary", accessoryPicker === "sticker" && editingStickerSlot === slot && "ring-2 ring-[var(--accent-solid)]/70")} aria-label={sticker ? `Change sticker slot ${slot + 1}` : `Add sticker to slot ${slot + 1}`}>{stickerItem && catalogImageUrl(stickerItem) ? <img src={catalogImageUrl(stickerItem) ?? undefined} alt={`${stickerItem.display_name} in slot ${slot + 1}`} data-catalog-item-id={stickerItem.id} className="size-7 object-contain" /> : <><Sticker className="size-3.5" /><span className="ml-1">{slot + 1}</span></>}{sticker && <span className="absolute -right-1 -top-1 size-2 rounded-full bg-foreground" />}</button>
                    })}
                  </div>
                </div>}
                {canCustomizeAccessories && <div>
                  <div className="mb-2 flex items-center justify-between"><span className="text-xs font-medium">Charm</span>{customOptions.charm && <button onClick={() => setCustomOptions((current) => ({ ...current, charm: undefined }))} className="text-[10px] text-muted-foreground hover:text-foreground">Remove</button>}</div>
                  <button onClick={() => { setAccessoryPicker("charm"); setEditingStickerSlot(null); setAccessoryQuery("") }} className={cn("flex h-10 w-full items-center justify-center gap-2 rounded-md border text-xs transition-colors", customOptions.charm ? "border-foreground bg-secondary text-foreground" : "border-border bg-background text-muted-foreground hover:bg-secondary", accessoryPicker === "charm" && "ring-2 ring-[var(--accent-solid)]/70")}>{selectedCharmItem && catalogImageUrl(selectedCharmItem) ? <img src={catalogImageUrl(selectedCharmItem) ?? undefined} alt={`${selectedCharmItem.display_name} selected charm`} data-catalog-item-id={selectedCharmItem.id} className="size-6 object-contain" /> : <Tag className="size-3.5" />} {customOptions.charm ? "Change charm" : "Choose charm"}</button>
                </div>}
                <button onClick={() => setResetConfirmOpen(true)} className="flex w-full items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground"><RotateCcw className="size-3.5" /> Reset customization</button>
              </div>
              </div>
              </div>
            )}
              {/* Save stays in reach while the options scroll. */}
              <div className="sticky bottom-0 -mx-4 mt-4 border-t border-border bg-card/95 px-4 py-3 backdrop-blur">
                {canUseForBothTeams && (
                  <label className="mb-3 flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                    <Checkbox checked={alsoOtherTeam} onCheckedChange={(checked) => setAlsoOtherTeam(checked === true)} disabled={!selected} />
                    <span>Also use for {otherTeamName}</span>
                    <img src={otherTeamName === "T" ? teamTIcon : teamCtIcon} alt="" className="size-4 object-contain" />
                  </label>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" disabled={saving} onClick={closePicker}>Cancel</Button>
                  <Button className="flex-1" disabled={!selected || saving || selectedAlreadyEquipped} onClick={saveAndClose}>
                    {saving ? <Loader2 className="size-4 animate-spin" /> : <BadgeCheck className="size-4" />}
                    {selectedAlreadyEquipped ? "Saved" : "Save"}
                  </Button>
                </div>
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
    </div>
  )
}
