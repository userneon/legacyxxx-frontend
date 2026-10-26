import { useState } from "react"
import { Check, ChevronDown } from "lucide-react"

import type { FrameItem, Nade, NadeSlotKind, NadeSlots as NadeSlotMap } from "@/api/cosmetics"
import { GrenadeLight, GrenadeTrail } from "@/components/grenade-trail"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

/** The five slots (owner request 2026-10-26): the molotov and the incendiary share "Fire". */
const NADES: Array<{ id: Nade; label: string; hint: string }> = [
  { id: "he", label: "HE grenade", hint: "Explosive" },
  { id: "flash", label: "Flashbang", hint: "Flash" },
  { id: "smoke", label: "Smoke", hint: "Smoke" },
  { id: "fire", label: "Fire", hint: "Molotov and incendiary" },
  { id: "decoy", label: "Decoy", hint: "Decoy" },
]

/** What one slot is set to: nothing in the map means it follows the default. */
type Setting = { mode: "default" } | { mode: "none" } | { mode: "item"; id: string }

function settingOf(slots: NadeSlotMap | undefined, nade: Nade, kind: NadeSlotKind): Setting {
  const own = slots?.[nade]
  if (!own || !(kind in own)) return { mode: "default" }
  const id = own[kind]
  return id ? { mode: "item", id } : { mode: "none" }
}

/**
 * Per grenade (owner request 2026-10-26): a trail or light can be worn on one kind of grenade only. What you wear in the list above stays
 * the default for every grenade; a row here replaces it for one grenade, or turns it off there. Only what you own can be picked.
 */
export function NadeSlots({ kind, items, defaultId, slots, busy, onChange }: {
  kind: NadeSlotKind
  items: FrameItem[]
  defaultId: string | null
  slots: NadeSlotMap | undefined
  busy: boolean
  /** An item id, null for nothing on this grenade, or "default" to follow the default again. */
  onChange: (nade: Nade, value: string | null | "default") => void
}) {
  const [open, setOpen] = useState<Nade | null>(null)
  const owned = items.filter((item) => item.owned)
  const byId = new Map(items.map((item) => [item.id, item]))
  const defaultItem = defaultId ? byId.get(defaultId) ?? null : null
  const noun = kind === "grenade_trail" ? "trail" : "light"
  const preview = (item: FrameItem | null) => !item ? null : kind === "grenade_trail"
    ? <GrenadeTrail key={item.id} color={item.color} shape={item.fx} className="w-[58px]" />
    : <GrenadeLight color={item.color} className="w-[58px]" />

  return (
    <section aria-label={`${noun} for each grenade`} className="flex flex-col gap-2.5 rounded-[10px] border border-[var(--line-soft)] bg-[var(--panel)] p-3.5">
      <div className="flex flex-col gap-0.5">
        <h3 className="text-[13px] font-semibold text-[var(--text)]">For each grenade</h3>
        <p className="text-xs text-[var(--text-dim)]">What you wear above is the default for every grenade. Pick a different {noun}, or none, for one kind of grenade.</p>
      </div>
      <ul className="flex flex-col divide-y divide-[var(--line-soft)]">
        {NADES.map((nade) => {
          const setting = settingOf(slots, nade.id, kind)
          const shown = setting.mode === "item" ? byId.get(setting.id) ?? null : setting.mode === "default" ? defaultItem : null
          const label = setting.mode === "item" ? shown?.name ?? "Unknown" : setting.mode === "none" ? "Nothing" : defaultItem ? `Default · ${defaultItem.name}` : "Default · nothing"
          return (
            <li key={nade.id} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
              <span className="flex w-[120px] shrink-0 flex-col"><span className="text-[13px] font-medium text-[var(--text)]">{nade.label}</span><span className="text-[11px] text-[var(--text-dim)]">{nade.hint}</span></span>
              <span aria-hidden="true" className="hidden h-9 w-[58px] shrink-0 items-center justify-center overflow-hidden sm:flex">{preview(shown)}</span>
              <Popover open={open === nade.id} onOpenChange={(next) => setOpen(next ? nade.id : null)}>
                <PopoverTrigger asChild>
                  <button type="button" disabled={busy} aria-label={`${nade.label}: ${label}`} className={cn("group ml-auto flex h-9 min-w-0 max-w-[220px] flex-1 items-center justify-between gap-2 rounded-lg border bg-[var(--raised)] px-3 text-left text-[13px] transition-colors hover:border-[var(--line-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60 disabled:opacity-60", setting.mode === "default" ? "border-[var(--line)] text-[var(--text-muted)]" : "border-[var(--line-strong)] text-[var(--text)]")}>
                    <span className="truncate">{label}</span>
                    <ChevronDown className="size-3.5 shrink-0 text-[var(--text-dim)] transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" sideOffset={6} className="max-h-[300px] w-[240px] overflow-y-auto rounded-xl border-[var(--line)] bg-[var(--panel)] p-1.5 shadow-[0_18px_44px_rgba(0,0,0,0.55)]">
                  <div role="radiogroup" aria-label={`${nade.label} ${noun}`} className="flex flex-col">
                    {[
                      { key: "default", label: defaultItem ? `Default · ${defaultItem.name}` : "Default · nothing", value: "default" as const, on: setting.mode === "default" },
                      { key: "none", label: "Nothing", value: null, on: setting.mode === "none" },
                      ...owned.map((item) => ({ key: item.id, label: item.name, value: item.id, on: setting.mode === "item" && setting.id === item.id })),
                    ].map((option) => (
                      <button key={option.key} type="button" role="radio" aria-checked={option.on} onClick={() => { setOpen(null); if (!option.on) onChange(nade.id, option.value) }} className="flex h-8 items-center justify-between gap-2 rounded-lg px-2.5 text-left text-[13px] text-[var(--text-2)] transition-colors hover:bg-[var(--raised)] hover:text-[var(--text)] aria-checked:text-[var(--text)]">
                        <span className="truncate">{option.label}</span>
                        {option.on && <Check className="size-3.5 shrink-0" aria-hidden="true" />}
                      </button>
                    ))}
                    {owned.length === 0 && <p className="px-2.5 py-2 text-xs text-[var(--text-dim)]">You do not own a {noun} yet.</p>}
                  </div>
                </PopoverContent>
              </Popover>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
