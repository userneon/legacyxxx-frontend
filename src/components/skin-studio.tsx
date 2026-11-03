/**
 * Skinchanger → Advanced: the editor of one craft, a gun with everything on it (owner request 2026-11-03). The weapon is shown big; each
 * sticker and the charm can be grabbed and moved on it, and the options beside it set the skin, wear, pattern, StatTrak with its kill count,
 * the name tag, and each sticker's size, turn and scratches. Guns only. Save keeps a craft; nothing changes in game until the craft is picked in the loadout.
 */
import { lazy, Suspense, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react"
import { BadgeCheck, Box, ImageOff, Loader2, Minus, Plus, RotateCcw, Search, X } from "lucide-react"
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
import { wearColor, wearName, wearTiers, wearTrack } from "@/lib/skin-wear"
import { useWeaponModels, weaponModelFor } from "@/lib/weapon-models"
import { clampOffset, cleanKillCount, FLAT_CHARM, FLAT_SLOTS, offsetAt, positionOf, STICKER_SLOTS } from "@/lib/studio-layout"

// three.js is fetched only for a gun that has a 3D model.
const StudioStage3D = lazy(() => import("@/components/studio-stage-3d"))

const imageOf = (item: SkinchangerCatalogItem | null | undefined) => {
  if (!item?.image_url) return null
  return `${item.image_url}${item.image_url.includes("?") ? "&" : "?"}catalog_item_id=${encodeURIComponent(item.id)}`
}
const metaNumber = (item: SkinchangerCatalogItem | null, key: string, fallback: number) => (typeof item?.metadata[key] === "number" ? (item.metadata[key] as number) : fallback)
const skinLabel = (item: SkinchangerCatalogItem) => (item.display_name.split("|")[1] ?? item.display_name).trim().replace(/ \((Factory New|Minimal Wear|Field-Tested|Well-Worn|Battle-Scarred)\)$/i, "")

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
  const [view, setView] = useState<"3d" | "flat">("3d")
  const models = useWeaponModels()
  // Memoised: the 3D view is rebuilt whenever this changes, so it must change only with the gun or the skin.
  const model3d = useMemo(() => weaponModelFor(models, { weapon_defindex: weapon.weapon_defindex, paint_id: skin?.paint_id ?? null }), [models, weapon.weapon_defindex, skin?.paint_id])
  const show3d = Boolean(model3d) && view === "3d"
  const stage = useRef<HTMLDivElement>(null)
  const drag = useRef<{ kind: "sticker" | "charm"; slot: number } | null>(null)

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

  /* ---- the stage: the gun, its stickers and charm, grabbed with the pointer ---------------------------------------------------------------------- */
  const stageImage = imageOf(skin) ?? imageOf(weapon)
  const aspect = 16 / 9
  const pointFromEvent = (event: ReactPointerEvent): [number, number] | null => {
    const box = stage.current?.getBoundingClientRect()
    if (!box || box.width === 0) return null
    return [(event.clientX - box.left) / box.width, (event.clientY - box.top) / box.height]
  }
  const onGrab = (kind: "sticker" | "charm", slot: number) => (event: ReactPointerEvent<HTMLElement>) => {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { kind, slot }
    setSelection(kind === "charm" ? { kind: "charm" } : { kind: "sticker", slot })
  }
  const onMove = (event: ReactPointerEvent<HTMLElement>) => {
    const held = drag.current
    const point = pointFromEvent(event)
    if (!held || !point) return
    const anchor = held.kind === "charm" ? FLAT_CHARM : FLAT_SLOTS[held.slot]!
    const offset = offsetAt(anchor, point, aspect)
    if (held.kind === "charm") setOptions((current) => (current.charm ? { ...current, charm: { ...current.charm, offsetX: round(offset.x), offsetY: round(offset.y) } } : current))
    else setSticker(held.slot, { offsetX: round(offset.x), offsetY: round(offset.y) })
  }
  const onRelease = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    drag.current = null
  }

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
          <div ref={stage} className="relative aspect-video w-full select-none overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--card-surface)]" aria-label="The weapon: drag a sticker or the charm to move it">
            {model3d && (
              <button type="button" onClick={() => setView(show3d ? "flat" : "3d")} aria-pressed={show3d} className="absolute right-2 top-2 z-10 inline-flex h-7 items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--card-surface)] px-2 text-[11px] font-semibold text-[var(--text-2)] transition-colors hover:border-[var(--line-strong)] hover:bg-[var(--raised)] aria-pressed:border-[var(--text-2)] aria-pressed:text-[var(--text)]"><Box className="size-3.5" aria-hidden="true" />3D</button>
            )}
            {show3d && model3d ? (
              <Suspense fallback={null}>
                <StudioStage3D
                  choice={model3d}
                  label={weapon.display_name}
                  selection={selection}
                  onSelect={setSelection}
                  stickers={stickers.map((entry) => ({ slot: entry.slot, imageUrl: imageOf(accessories[entry.catalogItemId]), offsetX: entry.offsetX ?? 0, offsetY: entry.offsetY ?? 0, scale: entry.scale ?? 1, rotation: entry.rotation ?? 0, wear: entry.wear ?? 0 }))}
                  charm={charm ? { imageUrl: imageOf(accessories[charm.catalogItemId]), offsetX: charm.offsetX ?? 0, offsetY: charm.offsetY ?? 0, offsetZ: charm.offsetZ ?? 0 } : null}
                  onMove={(pick, offsetX, offsetY) => (pick.kind === "charm" ? setOptions((current) => (current.charm ? { ...current, charm: { ...current.charm, offsetX, offsetY } } : current)) : setSticker(pick.slot, { offsetX, offsetY }))}
                />
              </Suspense>
            ) : (<>
            {stageImage ? <OptimizedImage src={stageImage} width={960} height={540} priority alt="" className="pointer-events-none absolute inset-0 size-full object-contain p-6" /> : <ImageOff className="absolute left-1/2 top-1/2 size-8 -translate-x-1/2 -translate-y-1/2 text-[var(--text-faint)]" />}
            {Array.from({ length: STICKER_SLOTS }, (_, slot) => {
              const entry = stickerAt(slot)
              const item = stickerOf(slot)
              const [x, y] = positionOf(FLAT_SLOTS[slot]!, { x: entry?.offsetX ?? 0, y: entry?.offsetY ?? 0 }, aspect)
              const on = selection?.kind === "sticker" && selection.slot === slot
              const size = 9 * (entry?.scale ?? 1)
              return (
                <button
                  key={slot}
                  type="button"
                  aria-label={entry ? `Sticker ${slot + 1}: ${item?.display_name ?? "sticker"}. Drag to move.` : `Empty sticker slot ${slot + 1}`}
                  onClick={() => setSelection({ kind: "sticker", slot })}
                  onPointerDown={entry ? onGrab("sticker", slot) : undefined}
                  onPointerMove={entry ? onMove : undefined}
                  onPointerUp={entry ? onRelease : undefined}
                  onPointerCancel={entry ? onRelease : undefined}
                  style={{ left: `${x * 100}%`, top: `${y * 100}%`, width: `${size}%`, rotate: `${entry?.rotation ?? 0}deg`, opacity: entry ? 1 - (entry.wear ?? 0) * 0.6 : 1 }}
                  className={cn("absolute aspect-square -translate-x-1/2 -translate-y-1/2 touch-none rounded-md transition-shadow", entry ? "cursor-grab active:cursor-grabbing" : "border border-dashed border-[var(--line-strong)] !w-[5%] text-[10px] text-[var(--text-dim)]", on && "ring-2 ring-[var(--text)]")}
                >
                  {entry && imageOf(item) ? <OptimizedImage src={imageOf(item)!} width={96} height={96} alt="" className="pointer-events-none size-full object-contain drop-shadow" /> : entry ? <span className="grid size-full place-items-center rounded-md bg-[var(--raised)] text-[10px]">{slot + 1}</span> : slot + 1}
                </button>
              )
            })}
            {charm && (() => {
              const item = accessories[charm.catalogItemId]
              const [x, y] = positionOf(FLAT_CHARM, { x: charm.offsetX ?? 0, y: charm.offsetY ?? 0 }, aspect)
              return (
                <button
                  type="button"
                  aria-label={`Charm: ${item?.display_name ?? "charm"}. Drag to move.`}
                  onClick={() => setSelection({ kind: "charm" })}
                  onPointerDown={onGrab("charm", 0)}
                  onPointerMove={onMove}
                  onPointerUp={onRelease}
                  onPointerCancel={onRelease}
                  style={{ left: `${x * 100}%`, top: `${y * 100}%`, width: "7%" }}
                  className={cn("absolute aspect-square -translate-x-1/2 -translate-y-1/2 cursor-grab touch-none rounded-md active:cursor-grabbing", selection?.kind === "charm" && "ring-2 ring-[var(--text)]")}
                >
                  {imageOf(item) ? <OptimizedImage src={imageOf(item)!} width={96} height={96} alt="" className="pointer-events-none size-full object-contain drop-shadow" /> : <span className="grid size-full place-items-center rounded-md bg-[var(--raised)] text-[10px]">C</span>}
                </button>
              )
            })()}
            </>)}
          </div>
          <p className="text-[11px] text-[var(--text-dim)]">{show3d ? "Drag the gun to turn it." : "Drag a sticker or the charm to place it."} The picture is a guide: the game places each one by the same offsets, relative to its slot.</p>

          {/* What is on the weapon */}
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Stickers and charm">
            {Array.from({ length: STICKER_SLOTS }, (_, slot) => {
              const item = stickerOf(slot)
              const on = selection?.kind === "sticker" && selection.slot === slot
              return (
                <button key={slot} type="button" role="tab" aria-selected={on} onClick={() => setSelection({ kind: "sticker", slot })} className={cn("flex h-11 min-w-[88px] items-center gap-2 rounded-lg border px-2.5 text-xs transition-colors", on ? "border-[var(--text-2)] bg-[var(--raised)] text-[var(--text)]" : "border-[var(--line)] bg-[var(--panel)] text-[var(--text-muted)] hover:border-[var(--line-strong)]")}>
                  <span className="flex size-7 shrink-0 items-center justify-center">{imageOf(item) ? <OptimizedImage src={imageOf(item)!} width={56} height={56} alt="" className="max-h-7 w-auto object-contain" /> : <span className="text-[var(--text-dim)]">{slot + 1}</span>}</span>
                  Sticker {slot + 1}
                </button>
              )
            })}
            <button type="button" role="tab" aria-selected={selection?.kind === "charm"} onClick={() => setSelection({ kind: "charm" })} className={cn("flex h-11 min-w-[88px] items-center gap-2 rounded-lg border px-2.5 text-xs transition-colors", selection?.kind === "charm" ? "border-[var(--text-2)] bg-[var(--raised)] text-[var(--text)]" : "border-[var(--line)] bg-[var(--panel)] text-[var(--text-muted)] hover:border-[var(--line-strong)]")}>
              <span className="flex size-7 shrink-0 items-center justify-center">{imageOf(charm ? accessories[charm.catalogItemId] : null) ? <OptimizedImage src={imageOf(accessories[charm!.catalogItemId])!} width={56} height={56} alt="" className="max-h-7 w-auto object-contain" /> : <span className="text-[var(--text-dim)]">C</span>}</span>
              Charm
            </button>
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
                <div className="grid gap-3 sm:grid-cols-2">
                  <Slider name="Size" value={selectedSticker.scale ?? 1} min={0.1} max={3} step={0.01} onChange={(value) => setSticker(selection.slot, { scale: value })} format={(value) => `${value.toFixed(2)}×`} />
                  <Slider name="Turn" value={selectedSticker.rotation ?? 0} min={-180} max={180} step={1} onChange={(value) => setSticker(selection.slot, { rotation: value })} format={(value) => `${value}°`} />
                  <Slider name="Scratches" value={selectedSticker.wear ?? 0} min={0} max={1} step={0.01} onChange={(value) => setSticker(selection.slot, { wear: value })} format={(value) => `${Math.round(value * 100)}%`} />
                  <div className="grid grid-cols-2 gap-3">
                    <Slider name="Left–right" value={selectedSticker.offsetX ?? 0} min={-1} max={1} step={0.001} onChange={(value) => setSticker(selection.slot, { offsetX: clampOffset(value) })} format={(value) => value.toFixed(3)} />
                    <Slider name="Up–down" value={selectedSticker.offsetY ?? 0} min={-1} max={1} step={0.001} onChange={(value) => setSticker(selection.slot, { offsetY: clampOffset(value) })} format={(value) => value.toFixed(3)} />
                  </div>
                  <button type="button" onClick={() => setSticker(selection.slot, { offsetX: 0, offsetY: 0, scale: 1, rotation: 0, wear: 0 })} className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text)]"><RotateCcw className="size-3.5" />Back to the slot's default</button>
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
                <div className="grid gap-3 sm:grid-cols-2">
                  <Slider name="Left–right" value={charm.offsetX ?? 0} min={-1} max={1} step={0.001} onChange={(value) => set({ charm: { ...charm, offsetX: clampOffset(value) } })} format={(value) => value.toFixed(3)} />
                  <Slider name="Up–down" value={charm.offsetY ?? 0} min={-1} max={1} step={0.001} onChange={(value) => set({ charm: { ...charm, offsetY: clampOffset(value) } })} format={(value) => value.toFixed(3)} />
                  <Slider name="Depth" value={charm.offsetZ ?? 0} min={-1} max={1} step={0.001} onChange={(value) => set({ charm: { ...charm, offsetZ: clampOffset(value) } })} format={(value) => value.toFixed(3)} />
                  <Slider name="Charm pattern" value={charm.seed ?? 0} min={0} max={1000} step={1} onChange={(value) => set({ charm: { ...charm, seed: Math.round(value) } })} />
                  <button type="button" onClick={() => set({ charm: { ...charm, offsetX: 0, offsetY: 0, offsetZ: 0 } })} className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text)]"><RotateCcw className="size-3.5" />Back to the default spot</button>
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
