import { Star } from "lucide-react"

/** The Genesis badge next to a name: the player's number in the numbered LEGACY-X Genesis pack (owner decision 2026-10-23; called Founder until that day, which is also a staff role, so only the name changed and the code keeps "founder"). */
export function FounderBadge({ number }: { number?: number }) {
  return (
    <span title="LEGACY-X Genesis" className="lx-founder-badge inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-bold">
      <Star className="size-3 fill-current" aria-hidden="true" />
      {number ? `Genesis #${String(number).padStart(4, "0")}` : "Genesis"}
    </span>
  )
}
