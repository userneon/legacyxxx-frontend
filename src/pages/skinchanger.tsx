/**
 * Skinchanger (docs/design/skinchanger/skinchanger-t, -ct, -modal): an inventory-style loadout grid per team.
 * Columns: Pistols | SMGs | Rifles + Knife | Sniper rifles + Heavy | Agent + Gloves (+ music kit and pin, which the
 * plugin also applies). T shows T-only and shared firearms, CT shows CT-only and shared ones. A card opens the skin
 * dialog; the trash button removes the saved look directly. Saving uses the per-entry API (with the full-loadout
 * fallback for older APIs); the plugin applies the loadout when the player types !rs.
 */
import { useEffect, useMemo, useState, type ReactNode } from "react"
import { Loader2, Search, SlidersHorizontal, Trash2, X } from "lucide-react"
import { toast } from "sonner"

import {
  skinchangerService,
  type ApiError,
  type SkinchangerAppearanceOptions,
  type SkinchangerCatalogItem,
  type SkinchangerCategory,
  type SkinchangerLoadoutEntry,
  type SkinchangerSlot,
  type TeamScope,
} from "@/api"
import { cn } from "@/lib/utils"
import { EmptyState, ErrorState, Skeleton } from "@/components/states"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Chip } from "@/components/ui/chip"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { useApiQuery } from "@/hooks/use-api-query"
import { useDebounced } from "@/hooks/use-debounced"
import { useUrlState } from "@/hooks/use-url-state"

type Team = "t" | "ct"
type ModelKind = "weapon" | "knife" | "glove"
type SingleSlot = "agent" | "music_kit" | "pin"

/** What a dialog edits: one firearm model, or the team's knife / glove / agent / music kit / pin slot. */
type Target = { kind: "weapon"; model: SkinchangerCatalogItem } | { kind: "knife" | "glove" } | { kind: SingleSlot }

/* ----------------------------------------------------------------------------
 * Catalog helpers (weapon_class values exactly as stored in skinchanger_catalog_items)
 * ------------------------------------------------------------------------- */

type WeaponGroup = "Pistols" | "SMGs" | "Rifles" | "Sniper Rifles" | "Heavy"

const FIREARM_GROUP: Record<string, WeaponGroup> = {
  "Glock-18": "Pistols", "USP-S": "Pistols", "P2000": "Pistols", "P250": "Pistols", "Desert Eagle": "Pistols",
  "Dual Berettas": "Pistols", "Five-SeveN": "Pistols", "Tec-9": "Pistols", "CZ75-Auto": "Pistols", "R8 Revolver": "Pistols",
  "MAC-10": "SMGs", "MP9": "SMGs", "MP7": "SMGs", "MP5-SD": "SMGs", "UMP-45": "SMGs", "P90": "SMGs", "PP-Bizon": "SMGs",
  "AK-47": "Rifles", "M4A4": "Rifles", "M4A1-S": "Rifles", "FAMAS": "Rifles", "Galil AR": "Rifles", "AUG": "Rifles", "SG 553": "Rifles",
  "AWP": "Sniper Rifles", "SSG 08": "Sniper Rifles", "SCAR-20": "Sniper Rifles", "G3SG1": "Sniper Rifles",
  "Nova": "Heavy", "XM1014": "Heavy", "MAG-7": "Heavy", "Sawed-Off": "Heavy", "Negev": "Heavy", "M249": "Heavy",
}
const FIREARM_ORDER = Object.keys(FIREARM_GROUP)
const T_ONLY = new Set(["AK-47", "Galil AR", "SG 553", "G3SG1", "Glock-18", "Tec-9", "MAC-10", "Sawed-Off"])
const CT_ONLY = new Set(["AUG", "FAMAS", "M4A1-S", "M4A4", "SCAR-20", "USP-S", "P2000", "Five-SeveN", "MP9", "MAG-7"])

function firearmGroup(item: SkinchangerCatalogItem): WeaponGroup {
  const mapped = FIREARM_GROUP[item.weapon_class ?? item.display_name]
  if (mapped) return mapped
  const group = item.metadata.weaponGroup
  return group === "Pistols" || group === "SMGs" || group === "Heavy" ? group : "Rifles"
}

function firearmOrder(item: SkinchangerCatalogItem) {
  const index = FIREARM_ORDER.indexOf(item.weapon_class ?? item.display_name)
  return index === -1 ? FIREARM_ORDER.length : index
}

/** The side a model is locked to ("all" = both teams can use it). */
function lockedTeam(item: SkinchangerCatalogItem | null): TeamScope {
  const team = typeof item?.metadata.team === "string" ? item.metadata.team.toLowerCase() : ""
  if (team.includes("counter") && !team.includes("terrorist")) return "ct"
  if (team.includes("terrorist") && !team.includes("counter")) return "t"
  const name = item?.weapon_class ?? item?.display_name ?? ""
  if (CT_ONLY.has(name)) return "ct"
  if (T_ONLY.has(name)) return "t"
  return "all"
}

function slotKeyFor(item: SkinchangerCatalogItem, kind: ModelKind) {
  const modelKey = String(item.weapon_defindex ?? item.weapon_class ?? item.id).toLowerCase().replace(/[^a-z0-9_-]+/g, "-")
  return kind === "weapon" ? `weapon:${modelKey}` : `${kind}:${modelKey}`
}

function imageUrl(item: SkinchangerCatalogItem | null | undefined) {
  if (!item?.image_url) return null
  const separator = item.image_url.includes("?") ? "&" : "?"
  return `${item.image_url}${separator}catalog_item_id=${encodeURIComponent(item.id)}`
}

function metadataNumber(item: SkinchangerCatalogItem | null, key: string, fallback: number) {
  const value = item?.metadata[key]
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

const WEAR_SUFFIX = / \((Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)$/i
function skinName(item: SkinchangerCatalogItem) {
  const [, skin = item.display_name] = item.display_name.split("|")
  return skin.trim().replace(WEAR_SUFFIX, "")
}

const WEAR_TIERS = [
  { label: "Factory New", short: "FN", to: 0.07 },
  { label: "Minimal Wear", short: "MW", to: 0.15 },
  { label: "Field-Tested", short: "FT", to: 0.38 },
  { label: "Well-Worn", short: "WW", to: 0.45 },
  { label: "Battle-Scarred", short: "BS", to: 1 },
]
const wearTier = (wear: number) => WEAR_TIERS.find((tier) => wear <= tier.to) ?? WEAR_TIERS[WEAR_TIERS.length - 1]

/** CS2 rarity → --rarity-* token; only ever drawn as the thin indicator on a tile. */
const RARITIES = [
  { id: "covert", label: "Covert", names: ["Covert", "Extraordinary"] },
  { id: "classified", label: "Classified", names: ["Classified"] },
  { id: "restricted", label: "Restricted", names: ["Restricted"] },
  { id: "milspec", label: "Mil-Spec", names: ["Mil-Spec Grade", "Mil-Spec"] },
  { id: "industrial", label: "Industrial", names: ["Industrial Grade"] },
  { id: "consumer", label: "Consumer", names: ["Consumer Grade", "Base Grade"] },
  { id: "contraband", label: "Contraband", names: ["Contraband"] },
] as const
type RarityId = (typeof RARITIES)[number]["id"]

function rarityOf(item: SkinchangerCatalogItem | null | undefined): RarityId | null {
  const name = item?.metadata.rarity
  if (typeof name !== "string") return null
  return RARITIES.find((rarity) => (rarity.names as readonly string[]).includes(name))?.id ?? null
}

function RarityBar({ item, className }: { item: SkinchangerCatalogItem | null | undefined; className?: string }) {
  const rarity = rarityOf(item)
  if (!rarity) return null
  return <span aria-hidden className={cn("absolute inset-x-0 bottom-0 h-0.5", className)} style={{ background: `var(--rarity-${rarity})` }} />
}

/* ----------------------------------------------------------------------------
 * Loadout lookups
 * ------------------------------------------------------------------------- */

/** The saved look a firearm shows for a team; a "both teams" look counts for either side. */
function weaponEntryFor(entries: SkinchangerLoadoutEntry[], model: SkinchangerCatalogItem, team: Team) {
  const key = slotKeyFor(model, "weapon")
  return entries.find((entry) => entry.slot_key === key && entry.team_scope === team) ?? entries.find((entry) => entry.slot_key === key && entry.team_scope === "all")
}

function slotEntryFor(entries: SkinchangerLoadoutEntry[], slot: SkinchangerSlot, team: Team) {
  return entries.find((entry) => entry.slot === slot && entry.team_scope === team) ?? (slot === "agent" ? undefined : entries.find((entry) => entry.slot === slot && entry.team_scope === "all"))
}

function toInput(entry: SkinchangerLoadoutEntry) {
  return { catalogItemId: entry.catalog_item_id, slot: entry.slot, slotKey: entry.slot_key, teamScope: entry.team_scope, options: entry.options }
}

const legacyFallback = (error: unknown) => {
  const status = (error as Partial<ApiError>).status
  return status === 404 || status === 405
}

/** Per-entry mutations, falling back to replacing the whole loadout on APIs without them. */
function useLoadoutMutations(entries: SkinchangerLoadoutEntry[]) {
  const save = async (entry: ReturnType<typeof toInput>, expectedVersion: number, replaced: SkinchangerLoadoutEntry[]) => {
    try {
      return await skinchangerService.saveLoadoutEntry({ expectedVersion, entry })
    } catch (error) {
      if (!legacyFallback(error)) throw error
      const kept = entries.filter((current) => !(current.slot_key === entry.slotKey && current.team_scope === entry.teamScope) && !replaced.includes(current)).map(toInput)
      const result = await skinchangerService.saveLoadout({ entries: [...kept, entry] })
      return { version: result.version }
    }
  }
  const remove = async (entry: Pick<SkinchangerLoadoutEntry, "slot_key" | "team_scope">, expectedVersion: number) => {
    try {
      return await skinchangerService.removeLoadoutEntry({ expectedVersion, slotKey: entry.slot_key, teamScope: entry.team_scope })
    } catch (error) {
      if (!legacyFallback(error)) throw error
      const kept = entries.filter((current) => !(current.slot_key === entry.slot_key && current.team_scope === entry.team_scope)).map(toInput)
      const result = await skinchangerService.saveLoadout({ entries: kept })
      return { version: result.version, removed: true }
    }
  }
  return { save, remove }
}

/* ----------------------------------------------------------------------------
 * Grid card
 * ------------------------------------------------------------------------- */

function SlotCard({
  label,
  entry,
  fallbackImage,
  tall = false,
  busy,
  onOpen,
  onRemove,
}: {
  label: string
  entry: SkinchangerLoadoutEntry | undefined
  fallbackImage: string | null
  tall?: boolean
  busy: boolean
  onOpen: () => void
  onRemove: () => void
}) {
  const item = entry?.skinchanger_catalog_items ?? null
  const image = imageUrl(item) ?? fallbackImage
  const charm = entry?.options.charm ? entry.resolved_accessories?.find((accessory) => accessory.id === entry.options.charm?.catalogItemId) : null
  return (
    <div className={cn("group relative overflow-hidden rounded-lg border border-line-soft bg-card transition-colors duration-150 hover:border-line", tall ? "h-[314px]" : "h-24")}>
      <button type="button" onClick={onOpen} aria-label={item ? `${label}: ${item.display_name}. Change skin` : `${label}: choose a skin`} className="absolute inset-0 text-left">
        <span aria-hidden className="absolute top-0 left-0 size-[18px] bg-line [clip-path:polygon(0_0,100%_0,0_100%)]" />
        <span className="absolute inset-0 flex items-center justify-center p-3 pb-6 transition-[filter,opacity] duration-200 group-hover:opacity-55 group-hover:blur-[4px] group-focus-within:opacity-55 group-focus-within:blur-[4px]">
          {image ? (
            <img src={image} alt="" loading="lazy" decoding="async" className={cn("max-h-full max-w-full object-contain", !item && "opacity-35 grayscale")} />
          ) : (
            <span className="h-4 w-[64%] rounded-full bg-line-soft" />
          )}
        </span>
        <span aria-hidden className="absolute bottom-[26px] left-2 flex h-4 w-3 items-center justify-center overflow-hidden rounded-[4px] border border-dashed border-line-strong">
          {charm && imageUrl(charm) ? <img src={imageUrl(charm)!} alt="" className="size-full object-contain" /> : null}
        </span>
        <span className="absolute right-2 bottom-[7px] left-2 flex min-w-0 flex-col">
          {item && <span className="truncate text-[10px] text-text-dim">{skinName(item)}</span>}
          <span className="truncate text-[11px] font-semibold tracking-[0.4px] text-text-2 uppercase">{label}</span>
        </span>
        <span aria-hidden className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
          <span className="flex size-[34px] items-center justify-center rounded-[10px] border border-line-strong bg-panel text-text">
            <SlidersHorizontal className="size-4" />
          </span>
        </span>
        <RarityBar item={item} />
      </button>
      {entry && (
        <button
          type="button"
          onClick={onRemove}
          disabled={busy}
          aria-label={`Remove ${label} skin`}
          title={entry.team_scope === "all" ? "Removes it for both teams" : "Remove"}
          className="press absolute top-1.5 right-1.5 flex size-7 items-center justify-center rounded-md border border-line bg-panel/85 text-text-muted opacity-0 transition-[opacity,color] duration-150 group-hover:opacity-100 group-focus-within:opacity-100 hover:text-text focus-visible:opacity-100 disabled:opacity-50"
        >
          <Trash2 className="size-3.5" aria-hidden />
        </button>
      )}
    </div>
  )
}

function Column({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <h2 className="m-0 text-center text-[15px] font-bold tracking-[0.6px] text-text uppercase">{title}</h2>
      {children}
    </section>
  )
}

/* ----------------------------------------------------------------------------
 * Skin dialog
 * ------------------------------------------------------------------------- */

const SLOT_LABEL: Record<Exclude<Target["kind"], "weapon">, string> = { knife: "Knife", glove: "Gloves", agent: "Agent", music_kit: "Music kit", pin: "Pin" }

function targetTitle(target: Target) {
  return target.kind === "weapon" ? target.model.display_name : SLOT_LABEL[target.kind]
}

function defaultOptions(item: SkinchangerCatalogItem | null): SkinchangerAppearanceOptions {
  return { wear: Math.max(0, Math.min(1, metadataNumber(item, "minWear", 0.0001))), seed: 0, statTrak: false, stickers: [] }
}

function SkinDialog({
  target,
  team,
  entries,
  version,
  models,
  onClose,
  onSaved,
}: {
  target: Target | null
  team: Team
  entries: SkinchangerLoadoutEntry[]
  version: number
  models: { knife: SkinchangerCatalogItem[]; glove: SkinchangerCatalogItem[] }
  onClose: () => void
  onSaved: () => void
}) {
  const open = Boolean(target)
  const kind = target?.kind ?? "weapon"
  const slot: SkinchangerSlot = kind
  const mutations = useLoadoutMutations(entries)

  // The entry this dialog starts from (the team's current look for this slot).
  const current = !target
    ? undefined
    : target.kind === "weapon"
      ? weaponEntryFor(entries, target.model, team)
      : slotEntryFor(entries, target.kind, team)
  const modelKind = kind === "knife" || kind === "glove" ? kind : null
  const initialModel =
    target?.kind === "weapon"
      ? target.model
      : modelKind
        ? models[modelKind].find((model) => model.weapon_class === current?.skinchanger_catalog_items?.weapon_class) ?? models[modelKind][0] ?? null
        : null

  const [model, setModel] = useState<SkinchangerCatalogItem | null>(initialModel)
  const [selected, setSelected] = useState<SkinchangerCatalogItem | null>(current?.skinchanger_catalog_items ?? null)
  const [options, setOptions] = useState<SkinchangerAppearanceOptions>(current?.options ?? defaultOptions(current?.skinchanger_catalog_items ?? null))
  const [accessories, setAccessories] = useState<Record<string, SkinchangerCatalogItem>>({})
  const [bothTeams, setBothTeams] = useState(current?.team_scope === "all")
  const [draft, setDraft] = useState("")
  const query = useDebounced(draft.trim(), 250)
  const [rarity, setRarity] = useState<RarityId | "all">("all")
  const [picker, setPicker] = useState<{ type: "sticker"; slot: number } | { type: "charm" } | null>(null)
  const [saving, setSaving] = useState(false)

  // Reset everything whenever the dialog opens on another slot or team.
  const targetKey = target ? `${kind}:${target.kind === "weapon" ? target.model.id : ""}:${team}` : ""
  useEffect(() => {
    if (!target) return
    setModel(initialModel)
    setSelected(current?.skinchanger_catalog_items ?? null)
    setOptions(current?.options ?? defaultOptions(current?.skinchanger_catalog_items ?? null))
    setAccessories(Object.fromEntries((current?.resolved_accessories ?? []).map((item) => [item.id, item])))
    setBothTeams(current?.team_scope === "all")
    setDraft("")
    setRarity("all")
    setPicker(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetKey])

  const category: SkinchangerCategory = kind === "weapon" ? "weapon_skin" : kind
  const weaponClass = kind === "weapon" || modelKind ? model?.weapon_class ?? undefined : undefined
  const catalog = useApiQuery(
    (signal) =>
      skinchangerService.getCatalog(
        { category, weaponClass, team: kind === "agent" ? team : undefined, query: query || undefined, limit: 100, offset: 0 },
        { signal },
      ),
    { enabled: open && (!modelKind || Boolean(model)), queryKey: `${category}|${weaponClass ?? ""}|${kind === "agent" ? team : ""}|${query}`, keepPreviousData: true },
  )
  const accessoryCategory = picker?.type ?? "sticker"
  const accessoryCatalog = useApiQuery(
    (signal) => skinchangerService.getCatalog({ category: accessoryCategory, query: query || undefined, limit: 48, offset: 0 }, { signal }),
    { enabled: open && Boolean(picker), queryKey: `${accessoryCategory}|${query}`, keepPreviousData: true },
  )

  const items = (catalog.data?.data ?? []).filter((item) => !(modelKind === "knife" && item.display_name === "Knife"))
  const rarities = RARITIES.filter((entry) => items.some((item) => rarityOf(item) === entry.id))
  const visible = rarity === "all" ? items : items.filter((item) => rarityOf(item) === rarity)

  const locked = target?.kind === "weapon" ? lockedTeam(target.model) : "all"
  const canUseBoth = kind !== "agent" && locked === "all"
  const saveScope: TeamScope = locked !== "all" ? locked : bothTeams && canUseBoth ? "all" : team
  const slotKey = kind === "weapon" || modelKind ? (model ? slotKeyFor(model, kind as ModelKind) : "") : kind
  const canAccessorize = kind === "weapon"
  const minWear = Math.max(0, Math.min(1, metadataNumber(selected, "minWear", 0.0001)))
  const maxWear = Math.max(minWear, Math.min(1, metadataNumber(selected, "maxWear", 1)))
  const hasWear = kind === "weapon" || modelKind !== null
  const wear = Math.max(minWear, Math.min(maxWear, options.wear ?? minWear))

  const choose = (item: SkinchangerCatalogItem) => {
    setSelected(item)
    const saved = entries.find((entry) => entry.catalog_item_id === item.id && entry.slot_key === slotKey && (entry.team_scope === saveScope || entry.team_scope === "all"))
    setOptions(saved ? saved.options : { ...defaultOptions(item), stickers: options.stickers, charm: options.charm })
  }

  const chooseAccessory = (item: SkinchangerCatalogItem) => {
    if (!picker) return
    setAccessories((current) => ({ ...current, [item.id]: item }))
    const id = item.weapon_defindex ?? undefined
    if (picker.type === "sticker") {
      const slotIndex = picker.slot
      setOptions((current) => ({
        ...current,
        stickers: [...(current.stickers ?? []).filter((sticker) => sticker.slot !== slotIndex), { catalogItemId: item.id, id, slot: slotIndex, schema: 1, wear: 0, scale: 1, rotation: 0 }].sort((a, b) => a.slot - b.slot),
      }))
    } else {
      setOptions((current) => ({ ...current, charm: { catalogItemId: item.id, id, offsetX: 0, offsetY: 0, offsetZ: 0, seed: 0 } }))
    }
    setPicker(null)
    setDraft("")
  }

  const accessoryById = new Map([...(current?.resolved_accessories ?? []), ...Object.values(accessories)].map((item) => [item.id, item]))

  const save = async () => {
    if (!selected || !slotKey) return
    setSaving(true)
    try {
      // One knife and one glove per team: that team's previous one goes first; a both-teams look replaces all of them.
      // Any other both-teams look replaces its T and CT versions.
      const same = (entry: SkinchangerLoadoutEntry) => entry.slot_key === slotKey && entry.catalog_item_id === selected.id && entry.team_scope === saveScope
      const replaced = modelKind
        ? entries.filter((entry) => entry.slot === modelKind && (saveScope === "all" || entry.team_scope === saveScope) && !same(entry))
        : saveScope === "all"
          ? entries.filter((entry) => entry.slot_key === slotKey && entry.team_scope !== "all")
          : []
      let expected = version
      for (const entry of replaced) expected = (await mutations.remove(entry, expected)).version
      const cleanOptions: SkinchangerAppearanceOptions = hasWear
        ? { ...options, wear, nameTag: options.nameTag?.trim() || undefined, stickers: canAccessorize ? options.stickers ?? [] : [], charm: canAccessorize ? options.charm : undefined }
        : {}
      await mutations.save({ catalogItemId: selected.id, slot, slotKey, teamScope: saveScope, options: cleanOptions }, expected, replaced)
      toast.success("Saved", { description: "Type !rs in game to apply it." })
      onSaved()
      onClose()
    } catch {
      toast.error("Couldn't save your choice", { description: "Please try again." })
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  const teamName = saveScope === "all" ? "Both teams" : saveScope === "t" ? "Terrorist" : "Counter-Terrorist"
  const grid = picker ? accessoryCatalog : catalog
  const gridItems = picker ? accessoryCatalog.data?.data ?? [] : visible
  const previewImage = imageUrl(selected)

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !saving && onClose()}>
      <DialogContent showCloseButton={false} className="flex h-[min(640px,calc(100dvh-2rem))] flex-col gap-0 overflow-hidden p-0 sm:max-w-[980px]">
        {target && (
          <>
            <div className="flex items-center gap-3 border-b border-line-soft px-5 py-3.5">
              <DialogTitle className="m-0 truncate text-[17px] font-semibold text-text">{picker ? (picker.type === "charm" ? "Charm" : `Sticker slot ${picker.slot + 1}`) : targetTitle(target)}</DialogTitle>
              <DialogDescription className="m-0 shrink-0 text-xs text-text-dim">{teamName}</DialogDescription>
              <label className="ml-auto hidden h-[34px] w-[240px] items-center gap-2 rounded-lg border border-line bg-card px-3 text-text-dim focus-within:border-line-strong sm:flex">
                <Search className="size-3.5 shrink-0" aria-hidden />
                <input
                  type="search"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={picker ? `Search ${picker.type}s` : "Search skins"}
                  aria-label="Search skins"
                  className="min-w-0 flex-1 bg-transparent text-[13px] text-text outline-none placeholder:text-text-dim [&::-webkit-search-cancel-button]:hidden"
                />
              </label>
              <Button variant="ghost" size="icon-sm" aria-label="Close" onClick={onClose} disabled={saving} className="ml-auto sm:ml-0">
                <X className="size-4" aria-hidden />
              </Button>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto md:grid-cols-[minmax(0,1fr)_312px] md:overflow-hidden">
              <div className="flex min-h-0 flex-col gap-3 p-4 md:overflow-y-auto">
                <label className="flex h-[34px] items-center gap-2 rounded-lg border border-line bg-card px-3 text-text-dim sm:hidden">
                  <Search className="size-3.5 shrink-0" aria-hidden />
                  <input type="search" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Search" aria-label="Search" className="min-w-0 flex-1 bg-transparent text-[13px] text-text outline-none" />
                </label>
                {picker ? (
                  <div>
                    <Button variant="outline" size="sm" onClick={() => { setPicker(null); setDraft("") }}>
                      Back to skins
                    </Button>
                  </div>
                ) : (
                  <>
                    {modelKind && models[modelKind].length > 1 && (
                      <div role="group" aria-label={modelKind === "knife" ? "Knife" : "Gloves"} className="no-scrollbar flex gap-1.5 overflow-x-auto">
                        {models[modelKind].map((option) => (
                          <Chip key={option.id} active={model?.id === option.id} onClick={() => { setModel(option); setSelected(null); setRarity("all") }}>
                            {option.display_name.replace(/^★\s*/, "")}
                          </Chip>
                        ))}
                      </div>
                    )}
                    {rarities.length > 1 && (
                      <div role="group" aria-label="Rarity" className="flex flex-wrap gap-1.5">
                        <Chip active={rarity === "all"} onClick={() => setRarity("all")}>All</Chip>
                        {rarities.map((entry) => (
                          <Chip key={entry.id} active={rarity === entry.id} onClick={() => setRarity(entry.id)}>
                            {entry.label}
                          </Chip>
                        ))}
                      </div>
                    )}
                  </>
                )}
                {grid.loading && !grid.data ? (
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2.5">
                    {Array.from({ length: 12 }, (_, index) => (
                      <Skeleton key={index} className="h-[118px] rounded-[10px]" />
                    ))}
                  </div>
                ) : grid.error && !grid.data ? (
                  <ErrorState onRetry={grid.refetch} />
                ) : gridItems.length === 0 ? (
                  <EmptyState>{query ? `Nothing matches "${query}".` : "Nothing to choose here yet."}</EmptyState>
                ) : (
                  <div className={cn("grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2.5 transition-opacity duration-150", grid.loading && "opacity-70")}>
                    {gridItems.map((item) => {
                      const isSelected = !picker && selected?.id === item.id
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => (picker ? chooseAccessory(item) : choose(item))}
                          aria-pressed={isSelected}
                          className={cn(
                            "press relative flex h-[118px] flex-col overflow-hidden rounded-[10px] border bg-card text-left transition-colors duration-150",
                            isSelected ? "border-accent" : "border-line-soft hover:border-line-strong",
                          )}
                        >
                          <span className="flex min-h-0 flex-1 items-center justify-center p-2">
                            {imageUrl(item) ? <img src={imageUrl(item)!} alt="" loading="lazy" decoding="async" className="max-h-full max-w-full object-contain" /> : <span className="h-3 w-2/3 rounded-full bg-line-soft" />}
                          </span>
                          <span className="border-t border-line-soft bg-panel px-2.5 py-1.5">
                            <span className="block truncate text-xs text-text" title={item.display_name}>{picker ? item.display_name : skinName(item)}</span>
                          </span>
                          <RarityBar item={item} />
                        </button>
                      )
                    })}
                  </div>
                )}
                {!picker && catalog.data && catalog.data.pagination.total > items.length && (
                  <p className="m-0 text-center text-xs text-text-dim">Showing {items.length} of {catalog.data.pagination.total}. Search to narrow it down.</p>
                )}
              </div>

              <aside className="flex flex-col gap-4 border-t border-line-soft p-4 md:overflow-y-auto md:border-t-0 md:border-l">
                <div className="relative flex h-[122px] shrink-0 items-center justify-center overflow-hidden rounded-[10px] border border-line-soft bg-card p-3">
                  {previewImage ? <img src={previewImage} alt={selected?.display_name ?? ""} className="max-h-full max-w-full object-contain" /> : <span className="text-xs text-text-dim">Pick a skin</span>}
                  <RarityBar item={selected} />
                </div>
                {selected && <span className="-mt-2 truncate text-[13px] font-medium text-text" title={selected.display_name}>{selected.display_name}</span>}

                {hasWear && (
                  <>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between text-[13px]">
                        <label htmlFor="skin-wear" className="text-text-2">Wear</label>
                        <span className="tabular-nums text-text">
                          {wear.toFixed(2)} · {wearTier(wear).label}
                        </span>
                      </div>
                      <input
                        id="skin-wear"
                        type="range"
                        min={minWear}
                        max={maxWear}
                        step={0.0001}
                        value={wear}
                        disabled={!selected}
                        onChange={(event) => setOptions((current) => ({ ...current, wear: Number(event.target.value) }))}
                        className="h-1.5 w-full cursor-pointer accent-[#fafafa] disabled:cursor-not-allowed disabled:opacity-50"
                      />
                      <span className="flex justify-between text-[10px] text-text-faint" aria-hidden>
                        {WEAR_TIERS.map((tier) => (
                          <span key={tier.short} className={cn(wearTier(wear).short === tier.short && "text-text-2")}>{tier.short}</span>
                        ))}
                      </span>
                    </div>
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3">
                      <label className="flex flex-col gap-1.5 text-[13px] text-text-2">
                        Seed
                        <input
                          type="number"
                          min={0}
                          max={1000}
                          value={options.seed ?? 0}
                          disabled={!selected}
                          onChange={(event) => setOptions((current) => ({ ...current, seed: Math.max(0, Math.min(1000, Math.round(Number(event.target.value) || 0))) }))}
                          placeholder="0–1000"
                          className="h-[34px] rounded-lg border border-line bg-card px-3 text-[13px] text-text outline-none focus:border-line-strong disabled:opacity-50"
                        />
                      </label>
                      <label className="flex flex-col items-end gap-1.5 text-[13px] text-text-2">
                        StatTrak™
                        <span className="flex h-[34px] items-center">
                          <Switch checked={Boolean(options.statTrak)} disabled={!selected} onCheckedChange={(value) => setOptions((current) => ({ ...current, statTrak: value }))} aria-label="StatTrak" />
                        </span>
                      </label>
                    </div>
                    <label className="flex flex-col gap-1.5 text-[13px] text-text-2">
                      Name tag
                      <input
                        type="text"
                        maxLength={20}
                        value={options.nameTag ?? ""}
                        disabled={!selected}
                        onChange={(event) => setOptions((current) => ({ ...current, nameTag: event.target.value }))}
                        placeholder="Optional"
                        className="h-[34px] rounded-lg border border-line bg-card px-3 text-[13px] text-text outline-none placeholder:text-text-dim focus:border-line-strong disabled:opacity-50"
                      />
                    </label>
                  </>
                )}

                {canAccessorize && (
                  <div className="flex flex-col gap-1.5 text-[13px] text-text-2">
                    Stickers &amp; charm
                    <div className="flex gap-1.5">
                      {[0, 1, 2, 3, 4].map((index) => {
                        const sticker = options.stickers?.find((entry) => entry.slot === index)
                        const stickerItem = sticker ? accessoryById.get(sticker.catalogItemId) : null
                        return (
                          <span key={index} className="group/acc relative">
                            <button
                              type="button"
                              disabled={!selected}
                              onClick={() => { setPicker({ type: "sticker", slot: index }); setDraft("") }}
                              aria-label={stickerItem ? `Sticker ${index + 1}: ${stickerItem.display_name}` : `Add sticker ${index + 1}`}
                              className={cn("press flex size-10 items-center justify-center overflow-hidden rounded-lg border bg-card disabled:opacity-50", picker?.type === "sticker" && picker.slot === index ? "border-accent" : "border-line hover:border-line-strong")}
                            >
                              {stickerItem && imageUrl(stickerItem) ? <img src={imageUrl(stickerItem)!} alt="" className="size-full object-contain p-0.5" /> : <span className="text-xs text-text-faint">+</span>}
                            </button>
                            {sticker && (
                              <button
                                type="button"
                                aria-label={`Remove sticker ${index + 1}`}
                                onClick={() => setOptions((current) => ({ ...current, stickers: (current.stickers ?? []).filter((entry) => entry.slot !== index) }))}
                                className="absolute -top-1.5 -right-1.5 hidden size-4 items-center justify-center rounded-full bg-line-strong text-text group-hover/acc:flex"
                              >
                                <X className="size-2.5" aria-hidden />
                              </button>
                            )}
                          </span>
                        )
                      })}
                      <span className="group/acc relative ml-1">
                        <button
                          type="button"
                          disabled={!selected}
                          onClick={() => { setPicker({ type: "charm" }); setDraft("") }}
                          aria-label={options.charm ? "Change charm" : "Add charm"}
                          className={cn("press flex h-10 w-8 items-center justify-center overflow-hidden rounded-lg border border-dashed bg-card disabled:opacity-50", picker?.type === "charm" ? "border-accent" : "border-line-strong")}
                        >
                          {options.charm && imageUrl(accessoryById.get(options.charm.catalogItemId)) ? (
                            <img src={imageUrl(accessoryById.get(options.charm.catalogItemId))!} alt="" className="size-full object-contain" />
                          ) : (
                            <span className="text-xs text-text-faint">+</span>
                          )}
                        </button>
                        {options.charm && (
                          <button
                            type="button"
                            aria-label="Remove charm"
                            onClick={() => setOptions((current) => ({ ...current, charm: undefined }))}
                            className="absolute -top-1.5 -right-1.5 hidden size-4 items-center justify-center rounded-full bg-line-strong text-text group-hover/acc:flex"
                          >
                            <X className="size-2.5" aria-hidden />
                          </button>
                        )}
                      </span>
                    </div>
                  </div>
                )}

                {canUseBoth && (
                  <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-text-2">
                    <Checkbox checked={bothTeams} onCheckedChange={(value) => setBothTeams(value === true)} />
                    Use on both T and CT
                  </label>
                )}
                {locked !== "all" && <p className="m-0 text-xs text-text-dim">{locked === "t" ? "Terrorist" : "Counter-Terrorist"} only weapon.</p>}
              </aside>
            </div>

            <div className="flex justify-end gap-2 border-t border-line-soft px-4 py-3">
              <Button variant="outline" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={() => void save()} disabled={!selected || saving}>
                {saving && <Loader2 className="size-4 animate-spin" aria-hidden />}
                Save
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

/* ----------------------------------------------------------------------------
 * Page
 * ------------------------------------------------------------------------- */

const DEFAULT_KNIFE = "https://raw.githubusercontent.com/ByMykel/counter-strike-image-tracker/main/static/panorama/images/econ/weapons/base_weapons/weapon_knife_png.png"
const DEFAULT_GLOVES = "https://raw.githubusercontent.com/ByMykel/counter-strike-image-tracker/main/static/panorama/images/econ/weapons/base_weapons/ct_gloves_png.png"

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-[18px] md:grid-cols-3 xl:grid-cols-5" aria-busy="true" aria-label="Loading loadout">
      {Array.from({ length: 5 }, (_, column) => (
        <div key={column} className="flex flex-col gap-2.5">
          <Skeleton className="mx-auto h-3.5 w-20" />
          {Array.from({ length: column === 4 ? 2 : 6 }, (_, row) => (
            <Skeleton key={row} className={cn("rounded-lg", column === 4 && row === 0 ? "h-[314px]" : "h-24")} />
          ))}
        </div>
      ))}
    </div>
  )
}

export function SkinchangerPage() {
  const [team, setTeam] = useUrlState<Team>("team", "t", ["t", "ct"])
  const [target, setTarget] = useState<Target | null>(null)
  const [busy, setBusy] = useState(false)

  const firearms = useApiQuery((signal) => skinchangerService.getCatalog({ category: "weapon", limit: 100, offset: 0 }, { signal }), { queryKey: "grid:firearms" })
  const knives = useApiQuery((signal) => skinchangerService.getCatalog({ category: "knife", limit: 100, offset: 0 }, { signal }), { queryKey: "grid:knives" })
  const gloves = useApiQuery((signal) => skinchangerService.getCatalog({ category: "glove", limit: 100, offset: 0 }, { signal }), { queryKey: "grid:gloves" })
  const loadout = useApiQuery((signal) => skinchangerService.getLoadout({ signal }), { queryKey: "loadout", keepPreviousData: true })

  const entries = useMemo(() => loadout.data?.loadout.skinchanger_loadout_entries ?? [], [loadout.data])
  const version = loadout.data?.loadout.version ?? 0
  const mutations = useLoadoutMutations(entries)
  const models = useMemo(
    () => ({
      knife: (knives.data?.data ?? []).filter((item) => item.display_name !== "Knife").sort((a, b) => a.display_name.localeCompare(b.display_name)),
      glove: [...(gloves.data?.data ?? [])].sort((a, b) => a.display_name.localeCompare(b.display_name)),
    }),
    [knives.data, gloves.data],
  )
  const defaultKnifeImage = imageUrl((knives.data?.data ?? []).find((item) => item.display_name === "Knife")) ?? DEFAULT_KNIFE

  const sections = useMemo(() => {
    const byGroup = new Map<WeaponGroup, SkinchangerCatalogItem[]>()
    for (const item of firearms.data?.data ?? []) {
      const side = lockedTeam(item)
      if (side !== "all" && side !== team) continue
      const group = firearmGroup(item)
      byGroup.set(group, [...(byGroup.get(group) ?? []), item])
    }
    for (const list of byGroup.values()) list.sort((a, b) => firearmOrder(a) - firearmOrder(b))
    return byGroup
  }, [firearms.data, team])

  const equipped = entries.filter((entry) => entry.team_scope === team || entry.team_scope === "all").length

  const remove = async (entry: SkinchangerLoadoutEntry, label: string) => {
    setBusy(true)
    try {
      await mutations.remove(entry, version)
      toast.success(`${label} skin removed`, { description: entry.team_scope === "all" ? "Removed for both teams." : undefined })
    } catch {
      toast.error("Couldn't remove it", { description: "Please try again." })
    } finally {
      setBusy(false)
      loadout.refetch()
    }
  }

  const weaponCards = (group: WeaponGroup) =>
    (sections.get(group) ?? []).map((model) => {
      const entry = weaponEntryFor(entries, model, team)
      return (
        <SlotCard
          key={model.id}
          label={model.display_name}
          entry={entry}
          fallbackImage={imageUrl(model)}
          busy={busy}
          onOpen={() => setTarget({ kind: "weapon", model })}
          onRemove={() => entry && void remove(entry, model.display_name)}
        />
      )
    })

  const slotCard = (slot: Exclude<Target["kind"], "weapon">, fallbackImage: string | null, tall = false) => {
    const entry = slotEntryFor(entries, slot, team)
    return (
      <SlotCard
        label={SLOT_LABEL[slot]}
        entry={entry}
        fallbackImage={fallbackImage}
        tall={tall}
        busy={busy}
        onOpen={() => setTarget({ kind: slot })}
        onRemove={() => entry && void remove(entry, SLOT_LABEL[slot])}
      />
    )
  }

  const loading = (firearms.loading && !firearms.data) || (loadout.loading && !loadout.data)
  const error = firearms.error ?? loadout.error

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="grid shrink-0 grid-cols-1 items-center gap-3 px-4 py-4 sm:px-6 md:h-[72px] md:grid-cols-[1fr_auto_1fr] md:py-0">
        <div className="flex flex-col gap-[3px]">
          <h1 className="m-0 text-xl font-semibold tracking-[-0.3px] text-text">Loadout</h1>
          <span className="text-xs text-text-muted">
            Pick skins, then type <kbd className="rounded-[5px] bg-raised px-1.5 py-px font-sans font-medium text-text">!rs</kbd> in game.
          </span>
        </div>
        <div role="tablist" aria-label="Team" className="flex gap-0.5 justify-self-start rounded-[10px] border border-line bg-card p-[3px] md:justify-self-center">
          {(["t", "ct"] as const).map((side) => (
            <button
              key={side}
              type="button"
              role="tab"
              aria-selected={team === side}
              onClick={() => setTeam(side)}
              className={cn("press h-8 rounded-[7px] px-[18px] text-[13px] font-semibold transition-colors duration-150", team === side ? "bg-accent text-accent-contrast" : "text-text-muted hover:text-text")}
            >
              {side === "t" ? "TERRORIST" : "COUNTER-TERRORIST"}
            </button>
          ))}
        </div>
        <div className="hidden items-center justify-end gap-2 text-xs text-text-muted md:flex">
          Equipped <span className="font-semibold tabular-nums text-text">{loadout.data ? equipped : "–"}</span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-1 pb-7 sm:px-6">
        {loading ? (
          <GridSkeleton />
        ) : error && !firearms.data ? (
          <ErrorState onRetry={() => { firearms.refetch(); loadout.refetch() }} />
        ) : (
          <div key={team} className="grid grid-cols-2 items-start gap-[18px] animate-fade-in md:grid-cols-3 xl:grid-cols-5">
            <div className="flex flex-col gap-[22px]">
              <Column title="Pistols">{weaponCards("Pistols")}</Column>
            </div>
            <div className="flex flex-col gap-[22px]">
              <Column title="SMGs">{weaponCards("SMGs")}</Column>
            </div>
            <div className="flex flex-col gap-[22px]">
              <Column title="Rifles">{weaponCards("Rifles")}</Column>
              <Column title="Knife">{slotCard("knife", defaultKnifeImage)}</Column>
            </div>
            <div className="flex flex-col gap-[22px]">
              <Column title="Sniper rifles">{weaponCards("Sniper Rifles")}</Column>
              <Column title="Heavy">{weaponCards("Heavy")}</Column>
            </div>
            <div className="flex flex-col gap-[22px]">
              <Column title="Agent">{slotCard("agent", null, true)}</Column>
              <Column title="Gloves">{slotCard("glove", DEFAULT_GLOVES)}</Column>
              <Column title="Music kit">{slotCard("music_kit", null)}</Column>
              <Column title="Pin">{slotCard("pin", null)}</Column>
            </div>
          </div>
        )}
      </div>

      <SkinDialog target={target} team={team} entries={entries} version={version} models={models} onClose={() => setTarget(null)} onSaved={loadout.refetch} />
    </div>
  )
}
