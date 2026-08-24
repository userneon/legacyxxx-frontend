import { cn } from "@/lib/utils"
import { OptimizedImage } from "@/components/optimized-image"

const RANK_BADGES = [
  { maxPosition: 1, src: "/ranks/global-elite.webp", name: "Global Elite" },
  { maxPosition: 2, src: "/ranks/legendary-eagle.webp", name: "Legendary Eagle" },
  { maxPosition: Number.POSITIVE_INFINITY, src: "/ranks/master-guardian.webp", name: "Master Guardian" },
] as const

export function getCsgoRankBadge(position?: number) {
  if (!position || position < 1) return null
  return RANK_BADGES.find((badge) => position <= badge.maxPosition) ?? null
}

// LEGACY-X visual system: use compact CS:GO-style emblems as a visual leaderboard cue, never as a competitive rating claim.
export function CsgoRankBadge({ position, className }: { position?: number; className?: string }) {
  const badge = getCsgoRankBadge(position)
  if (!badge) return null

  return (
    <OptimizedImage
      src={badge.src}
      width={92}
      height={56}
      alt={`${badge.name} style leaderboard emblem`}
      title={`${badge.name} style leaderboard emblem`}
      className={cn("h-7 w-[46px] shrink-0 object-contain", className)}
    />
  )
}
