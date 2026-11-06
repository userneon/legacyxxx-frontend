/**
 * Skinchanger → Advanced: the editor of one craft, a gun with everything on it (owner request 2026-11-03). The gun is shown big as the game draws
 * it (the ChainSkins viewer; only that view, owner request 2026-11-06), with a "Loading" cover until it is drawn. Each sticker and the charm is
 * moved on a small square (a dot to grab) or with sliders, and the options beside it set the skin, wear, pattern, StatTrak with its kill count,
 * the name tag, and each sticker's size, turn and scratches. Guns only. Save keeps a craft; nothing changes in game until the craft is picked in the loadout.
 */
import { useMemo, useState, type PointerEvent as ReactPointerEvent } from "react"
import { BadgeCheck, ImageOff, Loader2, Minus, Plus, RotateCcw, Search, X } from "lucide-react"
import { toast } from "sonner"

import { skinchangerService, type SkinchangerAppearanceOptions, type SkinchangerCatalogItem, type SkinCraft, type SkinchangerStickerOption } from "@/api"
import { DetailSheetContent } from "@/components/detail-sheet"
import { OptimizedImage } from "@/components/optimized-image"
import { QueryState } from "@/components/query-state"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Sheet } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { useApiQuery } from "@/hooks/use-api-query"
import { cn } from "@/lib/utils"
import { StudioRealPreview } from "@/components/studio-real-preview"
import { StudioSkinWarmer } from "@/components/studio-skin-warmer"
import { wearColor, wearName, wearTiers, wearTrack } from "@/lib/skin-wear"
import { clampOffset, cleanKillCount, OFFSET_LIMIT, STICKER_SLOTS } from "@/lib/studio-layout"

const imageOf = (item: SkinchangerCatalogItem | null | undefined) => {
  if (!item?.image_url) return null
  return `${item.image_url}${item.image_url.includes("?") ? "&" : "?"}catalog_item_id=${encodeURIComponent(item.id)}`
}
const metaNumber = (item: SkinchangerCatalogItem | null, key: string, fallback: number) => (typeof item?.metadata[key] === "number" ? (item.metadata[key] as number) : fallback)
const skinLabel = (item: SkinchangerCatalogItem) => (item.display_name.split("|")[1] ?? item.display_name).trim().replace(/ \((Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)$/i, "")

function SlotTile({ name, number, image, filled, on, onClick }: { name: string; number: number | string; image: string | null | undefined; filled: boolean; on: boolean; onClick: () => void }) {
  return (
    <button type="button" role="tab" aria-selected={on} aria-label={name} title={filled ? name : `Add ${name.toLowerCase()}`} onClick={onClick} className={cn("relative flex size-14 items-center justify-center rounded-xl border transition-colors", on ? "border-[var(--text-2)] bg-[var(--raised)]" : filled ? "border-[var(--line)] bg-[var(--panel)] hover:border-[var(--line-strong)]" : "border-dashed border-[var(--line-strong)] text-[var(--text-dim)] hover:bg-[var(--raised)] hover:text-[var(--text)]")}>
      {filled && image ? <OptimizedImage src={image} width={64} height={64} alt="" className="max-h-9 w-auto object-contain" /> : filled ? <span className="text-[11px] text-[var(--text-muted)]">{number}</span> : <Plus className="size-4" aria-hidden="true" />}
      <span className="absolute left-1.5 top-1 text-[9px] font-semibold text-[var(--text-faint)]">{number}</span>
    </button>
  )
}

/**
 * A square to grab: the dot is the item's place on the gun, left–right and up–down (±0.5, the offsets the game reads; up is plus). Drag the dot or
 * press the arrow keys. The gun's picture is the viewer beside it, which follows a moment after.
 */
function PositionPad({ name, x, y, onChange }: { name: string; x: number; y: number; onChange: (x: number, y: number) => void }) {
  const toOffset = (event: ReactPointerEvent<HTMLElement>) => {
    const box = event.currentTarget.getBoundingClientRect()
    const nx = Math.max(0, Math.min(1, (event.clientX - box.left) / box.width))
    const ny = Math.max(0, Math.min(1, (event.clientY - box.top) / box.height))
    onChange(round(clampOffset((nx - 0.5) * 2 * OFFSET_LIMIT)), round(clampOffset(-(ny - 0.5) * 2 * OFFSET_LIMIT)))
  }
  const left = ((x / OFFSET_LIMIT) / 2 + 0.5) * 100
  const top = (0.5 - (y / OFFSET_LIMIT) / 2) * 100
  return (
    <div
      role="application"
      aria-label={`${name}: drag to move, or use the arrow keys`}
      tabIndex={0}
      onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); toOffset(event) }}
      onPointerMove={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) toOffset(event) }}
      onPointerUp={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId) }}
      onKeyDown={(event) => {
        const step = event.shiftKey ? 0.05 : 0.01
        const move: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }
        const delta = move[event.key]
        if (!delta) return
        event.preventDefault()
        onChange(round(clampOffset(x + delta[0])), round(clampOffset(y + delta[1])))
      }}
      className="relative aspect-square w-full max-w-[168px] cursor-grab touch-none select-none rounded-xl border border-[var(--line)] bg-[var(--bg)] outline-none focus-visible:border-[var(--accent-solid)] active:cursor-grabbing"
    >
      <span aria-hidden="true" className="absolute inset-x-0 top-1/2 h-px bg-[var(--line-soft)]" />
      <span aria-hidden="true" className="absolute inset-y-0 left-1/2 w-px bg-[var(--line-soft)]" />
      <span aria-hidden="true" style={{ left: `${left}%`, top: `${top}%` }} className="absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--text)] bg-[var(--card-surface)]" />
    </div>
  )
}

type Selection = { kind: "sticker"; slot: number } | { kind: "charm" }
type Picking = "sticker" | "charm" | null

const label = "text-[11px] font-semibold uppercase tracking-[1.2px] text-[var(--text-dim)]"
const field = "h-9 text-xs"
const stepButton = "inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--raised)] text-[var(--text-2)] transition-colors hover:border-[var(--line-strong)] hover:text-[var(--text)] disabled:opacity-40"

/** A labelled slider with its number beside it. */
function Slider({ name, value, min, max, step, onChange, format }: { name: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void; format?: (value: number) => string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center justify-between text-xs"><span className="font-medium">{name}</span><span className="text-[var(--text-muted)]">{format ? format(value) : value}</span></span>
      <input aria-label={name} type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className="h-2 w-full cursor-pointer accent-[var(--text-2)]" />
    </label>
  )
}

/** Search and pick one sticker or charm. */
function AccessoryDialog({ kind, onPick, onClose }: { kind: Picking; onPick: (item: SkinchangerCatalogItem) => void; onClose: () => void }) {
  const [query, setQuery] = useState("")
  const [offset, setOffset] = useState(0)
  const { data, loading, error, refetch } = useApiQuery(
    (signal) => skinchangerService.getCatalog({ category: kind ?? "sticker", query: query.trim() || undefined, limit: 48, offset }, { signal }),
    { enabled: Boolean(kind), queryKey: `studio-${kind}:${query.trim()}:${offset}` },
  )
  const items = data?.data ?? []
  const total = data?.pagination.total ?? 0
  return (
    <Dialog open={Boolean(kind)} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-h-[88dvh] overflow-hidden rounded-2xl p-0 sm:max-w-[640px]">
        <DialogHeader className="px-5 pt-5">
          <DialogTitle>{kind === "charm" ? "Choose a charm" : "Choose a sticker"}</DialogTitle>
          <DialogDescription>{total ? `${total.toLocaleString()} to pick from` : "Search by name"}</DialogDescription>
        </DialogHeader>
        <label className="relative mx-5 block">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--text-dim)]" />
          <Input autoFocus value={query} onChange={(event) => { setQuery(event.target.value); setOffset(0) }} placeholder={`Search ${kind === "charm" ? "charms" : "stickers"}`} className="h-9 rounded-[10px] pl-9 text-xs" />
        </label>
        <div className="min-h-[240px] overflow-y-auto px-5 pb-5">
          {error && !data ? <QueryState loading={false} error={{ ...error, message: "Could not load the list." }} empty={false} onRetry={refetch} />
            : loading && !data ? <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" aria-hidden="true">{Array.from({ length: 12 }, (_, index) => <Skeleton key={index} className="h-24 rounded-lg bg-[var(--glass-fill)]" />)}</div>
              : items.length === 0 ? <p className="py-10 text-center text-[13px] text-[var(--text-dim)]">Nothing matches.</p>
                : (
                  <>
                    <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {items.map((item) => (
                        <li key={item.id}>
                          <button type="button" onClick={() => onPick(item)} title={item.display_name} className="flex h-full w-full flex-col items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--panel)] p-2 text-center transition-colors hover:border-[var(--line-strong)] hover:bg-[var(--raised)]">
                            <span className="flex h-14 w-full items-center justify-center">{imageOf(item) ? <OptimizedImage src={imageOf(item)!} width={96} height={72} alt="" className="max-h-14 w-auto object-contain" /> : <ImageOff className="size-5 text-[var(--text-faint)]" />}</span>
                            <span className="line-clamp-2 text-[10px] leading-tight text-[var(--text-muted)]">{item.display_name.replace(/^(Sticker|Charm) \| /, "")}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                    {total > 48 && (
                      <div className="mt-3 flex items-center justify-between text-[11px] text-[var(--text-dim)]">
                        <button type="button" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 48))} className="rounded-lg border border-[var(--line)] px-3 py-1.5 hover:bg-[var(--raised)] disabled:opacity-40">Previous</button>
                        <span>{offset + 1}–{Math.min(total, offset + 48)} of {total.toLocaleString()}</span>
                        <button type="button" disabled={offset + 48 >= total} onClick={() => setOffset(offset + 48)} className="rounded-lg border border-[var(--line)] px-3 py-1.5 hover:bg-[var(--raised)] disabled:opacity-40">Next</button>
                      </div>
                    )}
                  </>
                )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function SkinStudio({ weapon, initial, onClose, onSaved }: { weapon: SkinchangerCatalogItem | null; initial: SkinCraft | null; onClose: () => void; onSaved: () => void }) {
  return (
    <Sheet open={Boolean(weapon)} onOpenChange={(open) => { if (!open) onClose() }}>
      <DetailSheetContent fill width="max-w-7xl">
        {weapon && <Editor key={`${weapon.id}:${initial?.id ?? "new"}`} weapon={weapon} initial={initial} onClose={onClose} onSaved={onSaved} />}
      </DetailSheetContent>
    </Sheet>
  )
}

function Editor({ weapon, initial, onClose, onSaved }: { weapon: SkinchangerCatalogItem; initial: SkinCraft | null; onClose: () => void; onSaved: () => void }) {
  const [skin, setSkin] = useState<SkinchangerCatalogItem | null>(initial?.catalogItem ?? null)
  const [options, setOptions] = useState<SkinchangerAppearanceOptions>(() => ({ wear: initial?.options.wear ?? 0.0001, seed: initial?.options.seed ?? 0, statTrak: initial?.options.statTrak ?? false, statTrakCount: initial?.options.statTrakCount ?? 0, nameTag: initial?.options.nameTag, stickers: initial?.options.stickers ?? [], charm: initial?.options.charm }))
  const [accessories, setAccessories] = useState<Record<string, SkinchangerCatalogItem>>(() => Object.fromEntries((initial?.accessories ?? []).map((item) => [item.id, item])))
  const [name, setName] = useState(initial?.name ?? "")
  const [selection, setSelection] = useState<Selection | null>(initial?.options.stickers?.[0] ? { kind: "sticker", slot: initial.options.stickers[0].slot } : { kind: "sticker", slot: 0 })
  const [picking, setPicking] = useState<Picking>(null)
  const [query, setQuery] = useState("")
  const [saving, setSaving] = useState(false)
  const realCraft = useMemo(() => {
    if (!skin?.paint_id || !weapon.weapon_defindex) return null
    const kit = (id: string) => accessories[id]?.weapon_defindex ?? null
    const charmId = options.charm ? kit(options.charm.catalogItemId) : null
    return {
      defindex: weapon.weapon_defindex, paintId: skin.paint_id, wear: options.wear ?? 0.0001, seed: options.seed ?? 0,
      statTrakCount: options.statTrak ? cleanKillCount(options.statTrakCount ?? 0) : null, nameTag: options.nameTag,
      stickers: (options.stickers ?? []).flatMap((entry) => { const id = kit(entry.catalogItemId); return id ? [{ slot: entry.slot, id, wear: entry.wear, scale: entry.scale, rotation: entry.rotation, offsetX: entry.offsetX, offsetY: entry.offsetY }] : [] }),
      charm: options.charm && charmId ? { id: charmId, offsetX: options.charm.offsetX, offsetY: options.charm.offsetY, offsetZ: options.charm.offsetZ, seed: options.charm.seed } : null,
    }
  }, [skin?.paint_id, weapon.weapon_defindex, options, accessories])

  const { data: skinsPage, loading: skinsLoading, error: skinsError, refetch: refetchSkins } = useApiQuery(
    (signal) => skinchangerService.getCatalog({ category: "weapon_skin", weaponClass: weapon.weapon_class ?? undefined, query: query.trim() || undefined, limit: 60, offset: 0 }, { signal }),
    { queryKey: `studio-skins:${weapon.id}:${query.trim()}` },
  )
  const skins = skinsPage?.data ?? []

  const minWear = Math.max(0, Math.min(1, metaNumber(skin, "minWear", 0.0001)))
  const maxWear = Math.max(minWear, Math.min(1, metaNumber(skin, "maxWear", 1)))
  const wear = Math.max(minWear, Math.min(maxWear, options.wear ?? minWear))
  const stickers = options.stickers ?? []
  const stickerAt = (slot: number) => stickers.find((entry) => entry.slot === slot)
  const set = (patch: Partial<SkinchangerAppearanceOptions>) => setOptions((current) => ({ ...current, ...patch }))
  const setSticker = (slot: number, patch: Partial<SkinchangerStickerOption>) => setOptions((current) => ({ ...current, stickers: (current.stickers ?? []).map((entry) => (entry.slot === slot ? { ...entry, ...patch } : entry)) }))

  const pickSkin = (item: SkinchangerCatalogItem) => {
    setSkin(item)
    const lo = Math.max(0, Math.min(1, metaNumber(item, "minWear", 0.0001)))
    const hi = Math.max(lo, Math.min(1, metaNumber(item, "maxWear", 1)))
    setOptions((current) => ({ ...current, wear: Math.max(lo, Math.min(hi, current.wear ?? lo)) }))
  }

  const pickAccessory = (item: SkinchangerCatalogItem) => {
    setAccessories((current) => ({ ...current, [item.id]: item }))
    if (picking === "charm") {
      set({ charm: { catalogItemId: item.id, offsetX: options.charm?.offsetX ?? 0, offsetY: options.charm?.offsetY ?? 0, offsetZ: options.charm?.offsetZ ?? 0, seed: options.charm?.seed ?? 0 } })
      setSelection({ kind: "charm" })
    } else if (selection?.kind === "sticker") {
      const slot = selection.slot
      setOptions((current) => {
        const existing = (current.stickers ?? []).find((entry) => entry.slot === slot)
        const next: SkinchangerStickerOption = { ...(existing ?? { slot, offsetX: 0, offsetY: 0, scale: 1, rotation: 0, wear: 0 }), catalogItemId: item.id }
        return { ...current, stickers: [...(current.stickers ?? []).filter((entry) => entry.slot !== slot), next].sort((a, b) => a.slot - b.slot) }
      })
    }
    setPicking(null)
  }

  const stageImage = imageOf(skin) ?? imageOf(weapon)

  const selectedSticker = selection?.kind === "sticker" ? stickerAt(selection.slot) : undefined
  const charm = options.charm

  const save = async () => {
    if (!skin || saving) return
    setSaving(true)
    try {
      const input = {
        name: name.trim().slice(0, 40),
        catalogItemId: skin.id,
        options: {
          wear,
          seed: options.seed ?? 0,
          statTrak: options.statTrak ? true : undefined,
          statTrakCount: options.statTrak ? cleanKillCount(options.statTrakCount ?? 0) : undefined,
          nameTag: options.nameTag?.trim() || undefined,
          stickers: stickers.map(({ id: _id, ...rest }) => rest),
          charm: charm ? { ...charm, id: undefined } : undefined,
        },
      }
      if (initial) await skinchangerService.updateCraft(initial.id, input)
      else await skinchangerService.createCraft(input)
      toast.success("Craft saved. Pick it from your loadout.", { id: "skin-craft" })
      onSaved()
    } catch (caught) {
      const message = (caught as { message?: unknown } | null)?.message
      toast.error(typeof message === "string" && message ? message : "Could not save the craft. Try again.", { id: "skin-craft" })
    } finally {
      setSaving(false)
    }
  }

  const stickerOf = (slot: number) => { const entry = stickerAt(slot); return entry ? accessories[entry.catalogItemId] : undefined }
  const seed = options.seed ?? 0
  // An empty slot opens its picker at once; a filled one is selected to be edited.
  const selectSlot = (next: Selection | null) => {
    setSelection(next)
    if (next && (next.kind === "sticker" ? !stickerAt(next.slot) : !charm)) setPicking(next.kind)
  }

  return (
    <>
      <div className="flex items-center gap-3 border-b border-[var(--line-soft)] px-4 py-3 pr-12">
        <div className="min-w-0 flex-1">
          <DialogTitle className="truncate text-base">{weapon.display_name}</DialogTitle>
          <DialogDescription className="truncate text-xs">{initial ? "Editing a craft" : "New craft"}: nothing changes in game until you pick it in your loadout</DialogDescription>
        </div>
        <Input aria-label="Craft name" value={name} maxLength={40} placeholder="Craft name (optional)" onChange={(event) => setName(event.target.value)} className="hidden h-9 w-60 text-xs sm:block" />
      </div>

      <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_380px] lg:overflow-hidden">
        {/* The weapon */}
        <div className="flex min-h-0 flex-col gap-4 p-4 lg:overflow-y-auto">
          <div className="relative aspect-video w-full select-none overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--card-surface)]" aria-label="The weapon as the game draws it">
            {realCraft && <StudioSkinWarmer weapon={weapon} activeSkinId={skin?.id ?? null} changeKey={`${skin?.id ?? ""}:${JSON.stringify(options)}`} />}
            {realCraft ? <StudioRealPreview craft={realCraft} label={weapon.display_name} skinKey={`${weapon.id}:${skin?.id ?? ""}`} /> : (
              <>
                {stageImage ? <OptimizedImage src={stageImage} width={960} height={540} priority alt="" className="pointer-events-none absolute inset-0 size-full object-contain p-6 opacity-40" /> : <ImageOff className="absolute left-1/2 top-1/2 size-8 -translate-x-1/2 -translate-y-1/2 text-[var(--text-faint)]" />}
                <p className="absolute inset-x-0 bottom-4 text-center text-[13px] text-[var(--text-dim)]">Pick a skin to see the gun.</p>
              </>
            )}
          </div>

          {/* What is on the weapon */}
          <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Stickers and charm">
            {Array.from({ length: STICKER_SLOTS }, (_, slot) => {
              const item = stickerOf(slot)
              return <SlotTile key={slot} name={`Sticker ${slot + 1}`} number={slot + 1} image={imageOf(item)} filled={Boolean(stickerAt(slot))} on={selection?.kind === "sticker" && selection.slot === slot} onClick={() => selectSlot({ kind: "sticker", slot })} />
            })}
            <span aria-hidden="true" className="mx-1 h-8 w-px bg-[var(--line)]" />
            <SlotTile name="Charm" number="C" image={imageOf(charm ? accessories[charm.catalogItemId] : null)} filled={Boolean(charm)} on={selection?.kind === "charm"} onClick={() => selectSlot({ kind: "charm" })} />
          </div>

          {/* The selected sticker or charm */}
          {selection?.kind === "sticker" && (
            <section className="flex flex-col gap-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3.5" aria-label={`Sticker ${selection.slot + 1}`}>
              <div className="flex items-center gap-2">
                <span className={label}>Sticker {selection.slot + 1}</span>
                <span className="ml-auto flex gap-2">
                  <Button variant="outline" className="h-8 text-xs" onClick={() => setPicking("sticker")}>{selectedSticker ? "Change" : "Choose a sticker"}</Button>
                  {selectedSticker && <Button variant="outline" className="h-8 text-xs" onClick={() => set({ stickers: stickers.filter((entry) => entry.slot !== selection.slot) })}>Remove</Button>}
                </span>
              </div>
              {selectedSticker ? (
                <div className="grid gap-4 sm:grid-cols-[168px_minmax(0,1fr)]">
                  <PositionPad name={`Sticker ${selection.slot + 1} place`} x={selectedSticker.offsetX ?? 0} y={selectedSticker.offsetY ?? 0} onChange={(offsetX, offsetY) => setSticker(selection.slot, { offsetX, offsetY })} />
                  <div className="grid gap-3 sm:grid-cols-2">
                  <Slider name="Size" value={selectedSticker.scale ?? 1} min={0.1} max={3} step={0.01} onChange={(value) => setSticker(selection.slot, { scale: value })} format={(value) => `${value.toFixed(2)}×`} />
                  <Slider name="Turn" value={selectedSticker.rotation ?? 0} min={-180} max={180} step={1} onChange={(value) => setSticker(selection.slot, { rotation: value })} format={(value) => `${value}°`} />
                  <Slider name="Scratches" value={selectedSticker.wear ?? 0} min={0} max={1} step={0.01} onChange={(value) => setSticker(selection.slot, { wear: value })} format={(value) => `${Math.round(value * 100)}%`} />
                  <div className="grid grid-cols-2 gap-3">
                    <Slider name="Left–right" value={selectedSticker.offsetX ?? 0} min={-0.5} max={0.5} step={0.005} onChange={(value) => setSticker(selection.slot, { offsetX: clampOffset(value) })} format={(value) => value.toFixed(3)} />
                    <Slider name="Up–down" value={selectedSticker.offsetY ?? 0} min={-0.5} max={0.5} step={0.005} onChange={(value) => setSticker(selection.slot, { offsetY: clampOffset(value) })} format={(value) => value.toFixed(3)} />
                  </div>
                  <button type="button" onClick={() => setSticker(selection.slot, { offsetX: 0, offsetY: 0, scale: 1, rotation: 0, wear: 0 })} className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text)]"><RotateCcw className="size-3.5" />Back to the slot's default</button>
                  </div>
                </div>
              ) : <p className="text-[13px] text-[var(--text-dim)]">This slot is empty.</p>}
            </section>
          )}
          {selection?.kind === "charm" && (
            <section className="flex flex-col gap-3 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3.5" aria-label="Charm">
              <div className="flex items-center gap-2">
                <span className={label}>Charm</span>
                <span className="ml-auto flex gap-2">
                  <Button variant="outline" className="h-8 text-xs" onClick={() => setPicking("charm")}>{charm ? "Change" : "Choose a charm"}</Button>
                  {charm && <Button variant="outline" className="h-8 text-xs" onClick={() => set({ charm: undefined })}>Remove</Button>}
                </span>
              </div>
              {charm ? (
                <div className="grid gap-4 sm:grid-cols-[168px_minmax(0,1fr)]">
                  <PositionPad name="Charm place" x={charm.offsetX ?? 0} y={charm.offsetY ?? 0} onChange={(offsetX, offsetY) => set({ charm: { ...charm, offsetX, offsetY } })} />
                  <div className="grid gap-3 sm:grid-cols-2">
                  <Slider name="Left–right" value={charm.offsetX ?? 0} min={-0.5} max={0.5} step={0.005} onChange={(value) => set({ charm: { ...charm, offsetX: clampOffset(value) } })} format={(value) => value.toFixed(3)} />
                  <Slider name="Up–down" value={charm.offsetY ?? 0} min={-0.5} max={0.5} step={0.005} onChange={(value) => set({ charm: { ...charm, offsetY: clampOffset(value) } })} format={(value) => value.toFixed(3)} />
                  <Slider name="Depth" value={charm.offsetZ ?? 0} min={-0.5} max={0.5} step={0.005} onChange={(value) => set({ charm: { ...charm, offsetZ: clampOffset(value) } })} format={(value) => value.toFixed(3)} />
                  <Slider name="Charm pattern" value={charm.seed ?? 0} min={0} max={1000} step={1} onChange={(value) => set({ charm: { ...charm, seed: Math.round(value) } })} />
                  <button type="button" onClick={() => set({ charm: { ...charm, offsetX: 0, offsetY: 0, offsetZ: 0 } })} className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text)]"><RotateCcw className="size-3.5" />Back to the default spot</button>
                  </div>
                </div>
              ) : <p className="text-[13px] text-[var(--text-dim)]">No charm on this weapon.</p>}
            </section>
          )}
        </div>

        {/* The look */}
        <aside className="flex min-h-0 flex-col border-t border-[var(--line)] lg:overflow-y-auto lg:border-l lg:border-t-0">
          <div className="flex flex-col gap-5 p-4">
            <section className="flex flex-col gap-2.5" aria-label="Skin">
              <span className={label}>Skin</span>
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[var(--text-dim)]" />
                <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${weapon.display_name} skins`} className="h-9 rounded-[10px] pl-9 text-xs" />
              </label>
              <div className="max-h-56 overflow-y-auto rounded-lg border border-[var(--line)] bg-[var(--panel)] p-1.5">
                {skinsError && !skinsPage ? <QueryState loading={false} error={{ ...skinsError, message: "Could not load the skins." }} empty={false} onRetry={refetchSkins} />
                  : skinsLoading && !skinsPage ? <div className="grid grid-cols-3 gap-1.5" aria-hidden="true">{Array.from({ length: 9 }, (_, index) => <Skeleton key={index} className="h-16 rounded-md bg-[var(--glass-fill)]" />)}</div>
                    : skins.length === 0 ? <p className="py-6 text-center text-[13px] text-[var(--text-dim)]">No skin matches.</p>
                      : (
                        <ul className="grid grid-cols-3 gap-1.5">
                          {skins.map((item) => (
                            <li key={item.id}>
                              <button type="button" onClick={() => pickSkin(item)} aria-pressed={skin?.id === item.id} title={item.display_name} className={cn("flex w-full flex-col items-center gap-1 rounded-md border p-1.5 transition-colors hover:bg-[var(--raised)]", skin?.id === item.id ? "border-[var(--text-2)] bg-[var(--raised)]" : "border-transparent")}>
                                <span className="flex h-9 w-full items-center justify-center">{imageOf(item) ? <OptimizedImage src={imageOf(item)!} width={96} height={48} alt="" className="max-h-9 w-auto object-contain" /> : <ImageOff className="size-4 text-[var(--text-faint)]" />}</span>
                                <span className="w-full truncate text-center text-[10px] text-[var(--text-muted)]">{skinLabel(item)}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
              </div>
            </section>

            <section className="flex flex-col gap-2" aria-label="Wear">
              <div className="flex items-center justify-between"><span className={label}>Wear</span><span className="text-xs font-medium" style={{ color: wearColor(wear) }}>{wearName(wear)} · {wear.toFixed(4)}</span></div>
              <div className="grid grid-cols-5 gap-1">
                {wearTiers.map((tier) => {
                  const available = tier.from < maxWear && tier.to > minWear
                  const target = Math.min(maxWear, Math.max(minWear, tier.from === 0 ? 0.0001 : tier.from + 0.002))
                  const active = wearName(wear) === tier.label
                  return (
                    <button key={tier.short} type="button" disabled={!available || !skin} title={tier.label} onClick={() => set({ wear: target })} className={cn("relative h-7 overflow-hidden rounded-md border text-[10px] font-semibold transition-colors", !active && "border-[var(--line)] bg-[var(--panel)] text-[var(--text-muted)] hover:text-[var(--text)]", (!available || !skin) && "cursor-not-allowed opacity-30")} style={active ? { color: tier.color, borderColor: `color-mix(in oklab, ${tier.color} 60%, transparent)`, backgroundColor: `color-mix(in oklab, ${tier.color} 16%, transparent)` } : undefined}>
                      {tier.short}<span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[2px]" style={{ backgroundColor: tier.color, opacity: active ? 1 : 0.55 }} />
                    </button>
                  )
                })}
              </div>
              <input aria-label="Skin wear" type="range" min={minWear} max={maxWear} step="0.0001" value={wear} disabled={!skin} onChange={(event) => set({ wear: Number(event.target.value) })} className="wear-range h-2 w-full cursor-pointer" style={{ background: wearTrack(minWear, maxWear) }} />
            </section>

            <section className="flex flex-col gap-2" aria-label="Pattern">
              <div className="flex items-center justify-between"><span className={label}>Pattern seed</span><span className="text-xs text-[var(--text-muted)]">0–1000</span></div>
              <div className="flex items-center gap-2">
                <button type="button" aria-label="Lower pattern seed" disabled={seed <= 0} onClick={() => set({ seed: seed - 1 })} className={stepButton}><Minus className="size-4" /></button>
                <Input aria-label="Pattern seed" type="number" min={0} max={1000} value={seed} onChange={(event) => set({ seed: Math.max(0, Math.min(1000, Math.round(Number(event.target.value) || 0))) })} className={cn(field, "text-center")} />
                <button type="button" aria-label="Raise pattern seed" disabled={seed >= 1000} onClick={() => set({ seed: seed + 1 })} className={stepButton}><Plus className="size-4" /></button>
              </div>
            </section>

            <section className="flex flex-col gap-2.5" aria-label="StatTrak">
              <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-2">
                <div><p className="text-xs font-medium">StatTrak™</p><p className="text-[10px] text-[var(--text-dim)]">Counts kills in game</p></div>
                <button type="button" role="switch" aria-checked={Boolean(options.statTrak)} aria-label="StatTrak" onClick={() => set({ statTrak: !options.statTrak })} className={cn("relative h-5 w-9 shrink-0 rounded-full border transition-colors", options.statTrak ? "border-[var(--text)] bg-[var(--text)]" : "border-[var(--line)] bg-[var(--raised)]")}>
                  <span className={cn("absolute top-0.5 size-3.5 rounded-full transition-[left] duration-200", options.statTrak ? "left-[1.1rem] bg-[var(--bg)]" : "left-0.5 bg-[var(--text-dim)]")} />
                </button>
              </div>
              {options.statTrak && (
                <label className="flex flex-col gap-1.5 text-xs font-medium">
                  Kills it starts with
                  <Input aria-label="StatTrak kills" type="number" min={0} max={999999} value={options.statTrakCount ?? 0} onChange={(event) => set({ statTrakCount: cleanKillCount(Number(event.target.value)) })} className={field} />
                </label>
              )}
            </section>

            <section className="flex flex-col gap-2" aria-label="Name tag">
              <div className="flex items-center justify-between"><span className={label}>Gun name</span>{options.nameTag && <button type="button" onClick={() => set({ nameTag: undefined })} className="text-[10px] text-[var(--text-dim)] hover:text-[var(--text)]">Clear</button>}</div>
              <Input aria-label="Gun name" value={options.nameTag ?? ""} maxLength={20} placeholder="Name tag (optional)" onChange={(event) => set({ nameTag: event.target.value || undefined })} className={field} />
            </section>

            <label className="flex flex-col gap-1.5 sm:hidden">
              <span className={label}>Craft name</span>
              <Input aria-label="Craft name" value={name} maxLength={40} placeholder="Optional" onChange={(event) => setName(event.target.value)} className={field} />
            </label>
          </div>
          <div className="sticky bottom-0 mt-auto flex gap-2 border-t border-[var(--line)] bg-[var(--panel)] p-3">
            <Button variant="outline" className="flex-1" disabled={saving} onClick={onClose}><X className="size-4" />Cancel</Button>
            <Button className="lx-primary-button flex-1 disabled:opacity-40" disabled={!skin || saving} onClick={() => void save()}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <BadgeCheck className="size-4" />}Save craft
            </Button>
          </div>
        </aside>
      </div>
      <AccessoryDialog kind={picking} onPick={pickAccessory} onClose={() => setPicking(null)} />
    </>
  )
}

const round = (value: number) => Math.round(value * 1000) / 1000
