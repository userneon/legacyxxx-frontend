/**
 * Rank emblems and names. Emblems are the 18 supplied SVGs in /public/ranks, always rendered as <img> with an
 * explicit size and the rank name as alt text. Next to an emblem the rank name is written in its tier color.
 */
import { cn } from "@/lib/utils"
import { RANK_TIER_COLORS, rankById, rankByImageKey, rankEmblemUrl, type RankInfo } from "@/lib/ranks"

type RankRef = { rankId?: number | null; imageKey?: string | null; rank?: RankInfo | null }

function resolveRank({ rank, rankId, imageKey }: RankRef): RankInfo | null {
  return rank ?? rankById(rankId) ?? rankByImageKey(imageKey)
}

export function RankEmblem({ size = 22, className, ...ref }: RankRef & { size?: number; className?: string }) {
  const rank = resolveRank(ref)
  if (!rank) return <span aria-hidden className={cn("inline-block shrink-0 rounded-full bg-line-soft", className)} style={{ width: size, height: size }} />
  return (
    <img
      src={rankEmblemUrl(rank)}
      alt={rank.name}
      width={size}
      height={size}
      draggable={false}
      className={cn("shrink-0 select-none", className)}
      style={{ width: size, height: size }}
    />
  )
}

export function RankName({ className, ...ref }: RankRef & { className?: string }) {
  const rank = resolveRank(ref)
  if (!rank) return null
  return (
    <span className={cn("truncate font-medium", className)} style={{ color: RANK_TIER_COLORS[rank.tier] }}>
      {rank.name}
    </span>
  )
}

/** Emblem + colored name, e.g. in tables, the profile header and the profile menu. */
export function RankBadge({
  size = 22,
  className,
  nameClassName,
  ...ref
}: RankRef & { size?: number; className?: string; nameClassName?: string }) {
  const rank = resolveRank(ref)
  if (!rank) return null
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2", className)}>
      <RankEmblem rank={rank} size={size} />
      <RankName rank={rank} className={cn("text-[13px]", nameClassName)} />
    </span>
  )
}
