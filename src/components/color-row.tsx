import { Plus } from "lucide-react"

import { cn } from "@/lib/utils"

/* palette-exempt: the colours a player or clan leader can pick by hand, far apart so they are easy to tell apart. */
export const PICK_COLORS = ["#ef4444", "#fb923c", "#fcd34d", "#22c55e", "#2dd4bf", "#38bdf8", "#8b5cf6", "#fb7185", "#fafafa"] // palette-exempt
/** Sample colours the Shop tiles show a design in until its owner picks one (owner request 2026-10-26: all grey, the designs looked alike). */
const DEMO_COLORS = ["#8b5cf6", "#ef4444", "#2dd4bf", "#fb923c", "#38bdf8", "#22c55e", "#fb7185", "#fcd34d"] // palette-exempt
/** The sample colour for the nth tile, so neighbours differ. */
export const demoColour = (index: number) => DEMO_COLORS[((index % DEMO_COLORS.length) + DEMO_COLORS.length) % DEMO_COLORS.length]
/** The colour every design starts in before anyone picks one (the API's). */
export const PICK_DEFAULT = "#d4d4d4" // palette-exempt
export const PICK_BASES = ["#0a0a0a", "#171717", "#262626"]

/** A short row of clearly different colours, and the browser's own picker for any other. */
export function ColorRow({ label, value, colors, onChange }: { label: string; value: string; colors: string[]; onChange: (next: string) => void }) {
  const custom = !colors.includes(value)
  return (
    <div role="group" aria-label={label} className="flex items-center gap-3">
      <span className="w-12 shrink-0 text-[12px] text-[var(--text-dim)]">{label}</span>
      <div className="flex flex-wrap items-center gap-2">
        {colors.map((color) => (
          <button key={color} type="button" aria-label={color} aria-pressed={value === color} onClick={() => onChange(color)} style={{ background: color }} className="lx-shop-swatch size-7 rounded-full border border-[var(--line-strong)] transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]/60" />
        ))}
        <label title="Other colour" className={cn("relative grid size-7 cursor-pointer place-items-center overflow-hidden rounded-full border text-[var(--text-2)] transition-transform hover:scale-110", custom ? "border-[var(--text)] ring-2 ring-[var(--text)]/40" : "border-[var(--line-strong)] bg-[var(--raised)]")} style={custom ? { background: value } : undefined}>
          {!custom && <Plus className="size-3.5" aria-hidden="true" />}
          <input type="color" value={value} onChange={(event) => onChange(event.target.value)} aria-label={`Other ${label.toLowerCase()}`} className="absolute inset-0 size-full cursor-pointer opacity-0" />
        </label>
      </div>
    </div>
  )
}

