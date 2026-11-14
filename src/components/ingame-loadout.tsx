/**
 * In-game effects in the Loadout (owner request 2026-11-14): smoke colour, grenade trail, grenade light and flash sit beside the skins and are
 * swapped the same way (a card, then a list to pick from). They are cosmetics, not skins, so a shared loadout never carries them.
 */
import { useState, type ReactNode } from "react"
import { toast } from "sonner"

import { cosmeticsService, type CosmeticKind, type Cosmetics, type FrameItem } from "@/api/cosmetics"
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

export function InGameLoadout({ renderSection }: { renderSection: (title: string, cards: ReactNode[]) => ReactNode }) {
  const { user } = useAuth()
  const { data, refetch } = useApiQuery<Cosmetics>((signal) => cosmeticsService.getMine({ signal }), { queryKey: user ? `cosmetics:${user.id}` : "cosmetics:guest" })
  const [open, setOpen] = useState<NadeKind | null>(null)
  const [busy, setBusy] = useState(false)
  if (!data) return null

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
      <div key={kind} className="lx-layer group relative h-24 overflow-hidden rounded-[10px] border border-[var(--glass-line)] bg-[var(--glass-fill)] transition-[border-color,translate] duration-300 hover:-translate-y-0.5 hover:border-[var(--line-strong)]">
        <button type="button" onClick={() => setOpen(kind)} aria-label={`Change ${label.toLowerCase()}`} className="absolute inset-0 z-[1] rounded-[10px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-solid)]/50" />
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
      <Dialog open={open !== null} onOpenChange={(next) => { if (!next) setOpen(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{spec?.label}</DialogTitle></DialogHeader>
          {open && (
            <ul className="grid max-h-[60vh] grid-cols-3 gap-2 overflow-y-auto">
              {items.map((item) => {
                const on = data[spec!.worn] === item.id
                return (
                  <li key={item.id}>
                    <button type="button" disabled={busy} onClick={() => void wear(open, on ? null : item.id)} className={cn("flex h-28 w-full flex-col items-center justify-center gap-2 rounded-[10px] border bg-[var(--glass-fill)] px-2 transition-colors hover:border-[var(--line-strong)]", on ? "border-[var(--status-green)]" : "border-[var(--glass-line)]")}>
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
