import { cn } from "@/lib/utils"

/**
 * Legacy-X rank emblems (RANK-SYSTEM.md section 4): 18 ranks in six tiers, drawn by the
 * supplied SVGs in public/ranks/rank-01.svg … rank-18.svg. The API names the emblem with
 * `rank_image_key`; the tier colour is only ever used on the emblem and the rank name next to it.
 */
export type RankTier = "recruit" | "operator" | "vanguard" | "ace" | "apex" | "legacy"

export function rankTier(rankId: number | null | undefined): RankTier {
  const id = rankId ?? 7
  if (id <= 6) return "recruit"
  if (id <= 10) return "operator"
  if (id <= 14) return "vanguard"
  if (id <= 16) return "ace"
  if (id === 17) return "apex"
  return "legacy"
}

/** CSS colour of a rank's tier, for the rank name written next to its emblem. */
export const rankTierColor = (rankId: number | null | undefined) => `var(--rank-${rankTier(rankId)})`

export function rankImageSrc(rankId: number | null | undefined, imageKey?: string | null) {
  const key = imageKey && /^rank-\d{2}$/.test(imageKey) ? imageKey : `rank-${String(rankId ?? 7).padStart(2, "0")}`
  return `/ranks/${key}.svg`
}

interface RankProps {
  rankId?: number | null
  rankName?: string | null
  imageKey?: string | null
  currentExp?: number | null
  /** Emblem size in px: 72 on the profile rank card, 40 on Leaders top-3, 22–24 in badges and tables. */
  size?: number
  className?: string
}

export function CompetitiveRankBadge({ rankId, rankName, imageKey, currentExp, size = 22, className }: RankProps) {
  const name = rankName ?? "Operator I"
  const title = currentExp == null ? name : `${name} · ${currentExp.toLocaleString()} EXP`
  return (
    <img
      src={rankImageSrc(rankId, imageKey)}
      width={size}
      height={size}
      alt={name}
      title={title}
      loading="lazy"
      decoding="async"
      style={{ width: size, height: size }}
      className={cn("shrink-0 select-none object-contain", className)}
    />
  )
}

/** Emblem + rank name in its tier colour — the pairing used in tables, badges and menus. */
export function RankLabel({ rankId, rankName, imageKey, currentExp, size = 22, className, nameClassName }: RankProps & { nameClassName?: string }) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2", className)}>
      <CompetitiveRankBadge rankId={rankId} rankName={rankName} imageKey={imageKey} currentExp={currentExp} size={size} />
      <span className={cn("truncate text-[13px] font-semibold", nameClassName)} style={{ color: rankTierColor(rankId) }}>
        {rankName ?? "Operator I"}
      </span>
    </span>
  )
}

/** Pill with a small emblem and the rank name, as in the profile header and profile menu. */
export function RankPill({ rankId, rankName, imageKey, currentExp, size = 16, className }: RankProps) {
  return (
    <span className={cn("inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--raised)] pl-1 pr-[9px]", className)}>
      <CompetitiveRankBadge rankId={rankId} rankName={rankName} imageKey={imageKey} currentExp={currentExp} size={size} />
      <span className="text-xs font-semibold" style={{ color: rankTierColor(rankId) }}>{rankName ?? "Operator I"}</span>
    </span>
  )
}
