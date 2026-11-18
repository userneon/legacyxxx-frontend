import type { ReactNode } from "react"
import { ArrowRight } from "lucide-react"

/**
 * A section heading with a thin line running out to the right (owner 2026-11-18, like the Shop's "Ranks ————"): "Live now ————— All servers →".
 * Home puts two of them side by side, so both use this and sit on the same line.
 */
export function RuledHeading({ title, note, action, onAction }: { title: string; note?: ReactNode; action?: string; onAction?: () => void }) {
  return (
    <div className="mb-3 flex items-center gap-3">
      <h2 className="lx-section-title shrink-0 text-[var(--text)]">{title}</h2>
      {note}
      <span aria-hidden="true" className="h-px min-w-6 flex-1 bg-[var(--line)]" />
      {action && onAction && (
        <button type="button" onClick={onAction} className="group inline-flex shrink-0 items-center gap-1 text-[13px] text-[var(--text-dim)] transition-colors hover:text-[var(--text)]">
          {action}
          <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
