import { Star } from "lucide-react"

/** The Founder badge next to a name: the player's number in the numbered LEGACY-X Founder pack (owner decision 2026-10-23). */
export function FounderBadge({ number }: { number?: number }) {
  return (
    <span title="LEGACY-X Founder" className="lx-founder-badge inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-bold">
      <Star className="size-3 fill-current" aria-hidden="true" />
      {number ? `Founder #${String(number).padStart(4, "0")}` : "Founder"}
    </span>
  )
}
