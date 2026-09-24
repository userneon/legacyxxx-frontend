import { cn } from "@/lib/utils"
import tIcon from "@/assets/teams/t.svg"
import ctIcon from "@/assets/teams/ct.svg"

export type TeamSide = "t" | "ct"

const META: Record<TeamSide, { src: string; label: string }> = {
  t: { src: tIcon, label: "Terrorists" },
  ct: { src: ctIcon, label: "Counter-Terrorists" },
}

/** CS2 side mark, used instead of the "T" / "CT" text in match details and results. */
export function TeamIcon({ side, className }: { side: TeamSide; className?: string }) {
  const meta = META[side]
  return <img src={meta.src} alt={meta.label} title={meta.label} draggable={false} className={cn("size-4 shrink-0 select-none object-contain", className)} />
}

/** Text colour for a side (muted yellow T, sky-blue CT). */
export const teamTextClass = (side: TeamSide) => (side === "t" ? "text-[var(--team-t)]" : "text-[var(--team-ct)]")
