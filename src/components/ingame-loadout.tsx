/**
 * In-game effects in the Loadout (owner request 2026-11-14): smoke colour, grenade trail, grenade light and flash sit beside the skins and are
 * swapped the same way (a card, then a list to pick from). They are cosmetics, not skins, so a shared loadout never carries them.
 * A design the player colours themselves opens an editor: a vivid colour picker (two for the dual smoke) and, for the smoke, one of our own pictures
 * (no uploads). The first pick is free; after it a new colour and a new effect (the smoke's picture) cost the price the API names (500 FOL$) each.
 */
import { useEffect, useState, type ReactNode } from "react"
import { toast } from "sonner"
import { walletService } from "@/api"

import { cosmeticsService, SMOKE_MOTIFS, type CosmeticKind, type Cosmetics, type FrameItem } from "@/api/cosmetics"
import { ColorPicker } from "@/components/color-picker"
import { FlashEffect } from "@/components/flash-effect"
import { GrenadeLight, GrenadeTrail } from "@/components/grenade-trail"
import { SmokePuff } from "@/components/smoke-puff"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"

type NadeKind = Extract<CosmeticKind, "smoke_color" | "grenade_trail" | "grenade_light" | "flash_effect">
const KINDS: Array<{ kind: NadeKind; label: string; list: keyof Cosmetics; worn: keyof Cosmetics }> = [
  { kind: "smoke_color", label: "SMOKE", list: "smokeColors", worn: "equippedSmokeColor" },
  { kind: "grenade_trail", label: "TRAIL", list: "grenadeTrails", worn: "equippedGrenadeTrail" },
  { kind: "grenade_light", label: "GRENADE LIGHT", list: "grenadeLights", worn: "equippedGrenadeLight" },
  { kind: "flash_effect", label: "FLASH", list: "flashEffects", worn: "equippedFlashEffect" },
]

function Art({ kind, item, className }: { kind: NadeKind; item?: FrameItem | null; className?: string }) {
  const color = item?.color
  if (kind === "smoke_color") return <SmokePuff color={color} color2={item?.color2} className={className} />
  if (kind === "grenade_trail") return <GrenadeTrail color={color} shape={item?.fx} className={className} />
  if (kind === "flash_effect") return <FlashEffect color={color} shape={item?.fx} className={className} />
  return <GrenadeLight color={color} className={className} />
}


/** The smoke's pictures, drawn small in the current colour. */
function Motif({ name, className }: { name: string; className?: string }) {
  const paths: Record<string, string> = {
    star: "M12 2.5l2.9 6.2 6.8.8-5 4.7 1.3 6.7L12 17.4 6 20.9l1.3-6.7-5-4.7 6.8-.8z",
    heart: "M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 5 6.4 5c2 0 3.6 1.1 5.6 3.4C14 6.1 15.600 5 17.600 5c3.400 0 5.500 3.400 4 6.800C19.500 16.400 12 21 12 21z",
    diamond: "M12 2l8 10-8 10L4 12z",
    bolt: "M13.500 2L5 13.500h6L10 22l9-12h-6z",
    sparkle: "M12 2c.8 5.200 2.800 7.200 8 8-5.200.8-7.200 2.800-8 8-.8-5.200-2.800-7.200-8-8 5.200-.8 7.200-2.800 8-8z",
    dot: "M12 7a5 5 0 100 10 5 5 0 000-10z",
  }
  return <svg aria-hidden="true" viewBox="0 0 24 24" className={cn("size-5", className)} fill="currentColor"><path d={paths[name] ?? paths.dot} /></svg>
}

export function Editor({ kind, item, price, balance, onBack, onSaved }: { kind: NadeKind; item: FrameItem; price: number; balance: number | null; onBack?: () => void; onSaved: () => void }) {
  const [color, setColor] = useState(item.picked && item.color ? item.color : "#ff3b6b")
  const [color2, setColor2] = useState(item.picked && item.color2 ? item.color2 : "#3bb8ff")
  const [motif, setMotif] = useState<string>(item.motif ?? "")
  const [busy, setBusy] = useState(false)
  useEffect(() => { setColor(item.picked && item.color ? item.color : "#ff3b6b"); setColor2(item.picked && item.color2 ? item.color2 : "#3bb8ff"); setMotif(item.motif ?? "") }, [item.id, item.color, item.color2, item.motif])
  const changed = !item.picked || color !== item.color || (item.twoColours && color2 !== item.color2) || motif !== (item.motif ?? "")
  const colourChanged = color !== item.color || Boolean(item.twoColours && color2 !== item.color2)
  const effectChanged = kind === "smoke_color" && motif !== (item.motif ?? "")
  // Each paid change is its own price: the colour 500, the effect 500, both 1000 (owner 2026-11-21). The first pick is free.
  const total = item.picked ? price * (Number(colourChanged) + Number(effectChanged)) : 0
  const costs = total > 0
  const short = costs && balance != null && balance < total
  const save = async () => {
    setBusy(true)
    try {
      const result = await cosmeticsService.saveCustom(item.id, { color, color2: item.twoColours ? color2 : null, fx: kind === "smoke_color" && motif ? motif : null })
      if (result.charged > 0) window.dispatchEvent(new Event("legacyx:wallet-changed"))
      toast.success(result.charged > 0 ? `Saved · ${result.charged} FOL$` : "Saved")
      onSaved()
    } catch {
      toast.error(costs ? `Could not save it. This change costs ${total} FOL$.` : "Could not save it")
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="flex flex-col gap-4">
      {onBack && <button type="button" onClick={onBack} className="self-start text-[12px] text-[var(--text-dim)] hover:text-[var(--text)]">← Back</button>}
      <div className="flex items-center justify-center rounded-lg bg-[var(--glass-fill)] py-4"><Art kind={kind} item={{ ...item, color, color2: item.twoColours ? color2 : item.color2 }} className="w-[150px]" /></div>
      <div className="flex flex-wrap justify-center gap-5">
        <ColorPicker vivid value={color} onChange={setColor} />
        {item.twoColours && <ColorPicker vivid value={color2} onChange={setColor2} />}
      </div>
      {kind === "smoke_color" && (
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.5px] text-[var(--text-dim)]">Picture</span>
          <div className="flex flex-wrap gap-2">
            {["", ...SMOKE_MOTIFS].map((name) => (
              <button key={name || "dot"} type="button" aria-pressed={motif === name} aria-label={name || "dot"} onClick={() => setMotif(name)} className={cn("flex size-11 items-center justify-center rounded-lg transition-colors", motif === name ? "bg-[var(--line-strong)] text-[var(--text)]" : "bg-[var(--glass-fill)] text-[var(--text-dim)] hover:text-[var(--text)]")} style={motif === name ? { color } : undefined}>
                <Motif name={name || "dot"} />
              </button>
            ))}
          </div>
        </div>
      )}
      <button type="button" disabled={busy || (!changed && Boolean(item.picked)) || short} onClick={() => void save()} className="lx-primary-button inline-flex h-10 items-center justify-center rounded-lg text-[13px] font-semibold disabled:opacity-50">
        {short ? `Need ${total - (balance ?? 0)} more FOL$` : costs ? `Save and wear · ${total} FOL$` : item.picked ? (changed ? "Save and wear" : "Wear") : "Save and wear"}
      </button>
      <p className="text-center text-[11px] text-[var(--text-dim)]">The first pick is free. After that a new colour costs {price} FOL$ {kind === "smoke_color" ? `and a new picture ${price} FOL$, each on its own` : "each time"}. Colours are kept vivid.</p>
    </div>
  )
}

export function InGameLoadout({ renderSection }: { renderSection: (title: string, cards: ReactNode[]) => ReactNode }) {
  const { user } = useAuth()
  const { data, refetch } = useApiQuery<Cosmetics>((signal) => cosmeticsService.getMine({ signal }), { queryKey: user ? `cosmetics:${user.id}` : "cosmetics:guest" })
  const [open, setOpen] = useState<NadeKind | null>(null)
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const { data: wallet } = useApiQuery<{ balance: number }>((signal) => walletService.getMine({ signal }), { enabled: Boolean(user), queryKey: user ? `wallet:${user.id}` : "wallet:guest" })
  // Until the player's cosmetics arrive the section is already there with quiet placeholders (owner 2026-11-18: the In-game part "popped in later, on its own"), so it comes with the rest.
  if (!data) {
    return renderSection("IN-GAME", KINDS.map(({ kind }) => <div key={kind} data-slot-card={`ingame:${kind}`} aria-hidden="true" className="h-24 animate-pulse rounded-lg border border-[var(--glass-line)] bg-[var(--glass-fill)]" />))
  }

  const spec = KINDS.find((entry) => entry.kind === open)
  const items = spec ? ((data[spec.list] as FrameItem[] | undefined) ?? []).filter((item) => item.owned) : []
  const wear = async (kind: NadeKind, item: string | null) => {
    setBusy(true)
    try {
      await cosmeticsService.equip(kind, item)
      await refetch()
    } catch {
      toast.error("Could not change it")
    } finally {
      setBusy(false)
    }
  }

  const cards = KINDS.map(({ kind, label, list, worn }) => {
    const current = ((data[list] as FrameItem[] | undefined) ?? []).find((item) => item.id === data[worn])
    return (
      <div key={kind} data-slot-card={`ingame:${kind}`} className="animate-in fade-in-0 [animation-duration:300ms] motion-reduce:animate-none lx-layer group relative h-24 overflow-hidden rounded-lg border border-[var(--glass-line)] bg-[var(--glass-fill)] transition-[border-color,translate] duration-300 hover:-translate-y-0.5 hover:border-[var(--line-strong)]">
        <button type="button" onClick={() => setOpen(kind)} aria-label={`Change ${label.toLowerCase()}`} className="absolute inset-0 z-[1] rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-solid)]/50" />
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 pb-6 pt-3">
          <Art kind={kind} item={current} className={cn("w-[84px]", !current && "opacity-30 saturate-0")} />
        </span>
        <span className="pointer-events-none absolute bottom-[7px] left-2 right-2 truncate text-[11px] font-semibold uppercase tracking-[0.4px] text-[var(--text-2)]">{current?.name ?? label}</span>
      </div>
    )
  })

  return (
    <>
      {renderSection("IN-GAME", cards)}
      <Dialog open={open !== null} onOpenChange={(next) => { if (!next) { setOpen(null); setEditing(null) } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{spec?.label}</DialogTitle></DialogHeader>
          {open && editing && items.find((item) => item.id === editing) && (
            <div className="max-h-[70vh] overflow-y-auto">
              <Editor kind={open} item={items.find((item) => item.id === editing)!} price={data.customChangePrice ?? 500} balance={wallet?.balance ?? null} onBack={() => setEditing(null)} onSaved={() => { setEditing(null); void refetch() }} />
            </div>
          )}
          {open && !editing && (
            <ul className="grid max-h-[60vh] grid-cols-3 gap-2 overflow-y-auto">
              {items.map((item) => {
                const on = data[spec!.worn] === item.id
                return (
                  <li key={item.id}>
                    <button type="button" disabled={busy} onClick={() => { if (item.custom) setEditing(item.id); else void wear(open, on ? null : item.id) }} className={cn("flex h-28 w-full flex-col items-center justify-center gap-2 rounded-lg border bg-[var(--glass-fill)] px-2 transition-colors hover:border-[var(--line-strong)]", on ? "border-[var(--status-green)]" : "border-[var(--glass-line)]")}>
                      <Art kind={open} item={item} className="w-[72px]" />
                      <span className="w-full truncate text-center text-xs font-medium text-[var(--text)]">{item.name}</span>
                    </button>
                  </li>
                )
              })}
              {items.length === 0 && <li className="col-span-3 py-6 text-center text-sm text-[var(--text-dim)]">You do not own any yet. Get them in the Shop.</li>}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
