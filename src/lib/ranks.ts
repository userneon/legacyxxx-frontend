/**
 * Display-only copy of the Legacy-X rank ladder (RANK-SYSTEM.md §4). The API is the source of truth for a
 * player's EXP and rank; this table only turns an id or image key into the emblem, name and tier color, and
 * never decides anyone's rank.
 */
export type RankTier = "recruit" | "operator" | "vanguard" | "ace" | "apex" | "legacy"

export interface RankInfo {
  id: number
  name: string
  tier: RankTier
  minimumExp: number
}

export const RANKS: readonly RankInfo[] = [
  { id: 1, name: "Recruit I", tier: "recruit", minimumExp: 0 },
  { id: 2, name: "Recruit II", tier: "recruit", minimumExp: 600 },
  { id: 3, name: "Recruit III", tier: "recruit", minimumExp: 700 },
  { id: 4, name: "Recruit IV", tier: "recruit", minimumExp: 800 },
  { id: 5, name: "Recruit V", tier: "recruit", minimumExp: 900 },
  { id: 6, name: "Recruit VI", tier: "recruit", minimumExp: 950 },
  { id: 7, name: "Operator I", tier: "operator", minimumExp: 1000 },
  { id: 8, name: "Operator II", tier: "operator", minimumExp: 1100 },
  { id: 9, name: "Operator III", tier: "operator", minimumExp: 1200 },
  { id: 10, name: "Operator IV", tier: "operator", minimumExp: 1300 },
  { id: 11, name: "Vanguard I", tier: "vanguard", minimumExp: 1400 },
  { id: 12, name: "Vanguard II", tier: "vanguard", minimumExp: 1500 },
  { id: 13, name: "Vanguard III", tier: "vanguard", minimumExp: 1600 },
  { id: 14, name: "Vanguard IV", tier: "vanguard", minimumExp: 1700 },
  { id: 15, name: "Ace I", tier: "ace", minimumExp: 1800 },
  { id: 16, name: "Ace II", tier: "ace", minimumExp: 1950 },
  { id: 17, name: "Apex", tier: "apex", minimumExp: 2100 },
  { id: 18, name: "Legacy", tier: "legacy", minimumExp: 2300 },
]

/** CS2 rarity ladder, exposed as --rank-<tier> tokens in index.css. */
export const RANK_TIER_COLORS: Record<RankTier, string> = {
  recruit: "var(--rank-recruit)",
  operator: "var(--rank-operator)",
  vanguard: "var(--rank-vanguard)",
  ace: "var(--rank-ace)",
  apex: "var(--rank-apex)",
  legacy: "var(--rank-legacy)",
}

export const PRO_LEAGUE_RANK_ID = 11

export function rankById(id: number | null | undefined): RankInfo | null {
  return RANKS.find((rank) => rank.id === id) ?? null
}

/** "rank-07" → Operator I. */
export function rankByImageKey(imageKey: string | null | undefined): RankInfo | null {
  const match = /^rank-(\d{2})$/.exec(imageKey ?? "")
  return match ? rankById(Number(match[1])) : null
}

/** Display helper for a progress bar; the player's actual rank always comes from the API. */
export function rankForExp(exp: number): RankInfo {
  let current = RANKS[0]
  for (const rank of RANKS) if (exp >= rank.minimumExp) current = rank
  return current
}

export function nextRank(rank: RankInfo): RankInfo | null {
  return rankById(rank.id + 1)
}

export function rankEmblemUrl(rank: RankInfo): string {
  return `/ranks/rank-${String(rank.id).padStart(2, "0")}.svg`
}

/** 0–1 of the way from `rank` to the next threshold, and the EXP still needed (null at Legacy). */
export function rankProgress(exp: number, rank: RankInfo) {
  const next = nextRank(rank)
  if (!next) return { next: null, progress: 1, expToNext: null as number | null }
  const span = next.minimumExp - rank.minimumExp
  return {
    next,
    progress: Math.min(1, Math.max(0, (exp - rank.minimumExp) / span)),
    expToNext: Math.max(0, next.minimumExp - exp),
  }
}
