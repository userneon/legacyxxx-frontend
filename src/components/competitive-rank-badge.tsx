import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

import rank01 from "@/assets/ranks/rank-01.webp"
import rank02 from "@/assets/ranks/rank-02.webp"
import rank03 from "@/assets/ranks/rank-03.webp"
import rank04 from "@/assets/ranks/rank-04.webp"
import rank05 from "@/assets/ranks/rank-05.webp"
import rank06 from "@/assets/ranks/rank-06.webp"
import rank07 from "@/assets/ranks/rank-07.webp"
import rank08 from "@/assets/ranks/rank-08.webp"
import rank09 from "@/assets/ranks/rank-09.webp"
import rank10 from "@/assets/ranks/rank-10.webp"
import rank11 from "@/assets/ranks/rank-11.webp"
import rank12 from "@/assets/ranks/rank-12.webp"
import rank14 from "@/assets/ranks/rank-14.webp"
import rank15 from "@/assets/ranks/rank-15.webp"
import rank16 from "@/assets/ranks/rank-16.webp"
import rank17 from "@/assets/ranks/rank-17.webp"
import rank18 from "@/assets/ranks/rank-18.webp"

/**
 * Official CS:GO competitive badge sequence: 1 = Silver I, 18 = Global Elite (matches competitive_rank_definitions).
 * Artwork is bundled from src/assets so it ships with every build. Rank 13 (Master Guardian Elite) has no artwork yet
 * and renders the labelled fallback; add src/assets/ranks/rank-13.webp and import it here to replace it.
 */
const CSGO_RANK_ASSETS: Record<number, string> = {
  1: rank01,
  2: rank02,
  3: rank03,
  4: rank04,
  5: rank05,
  6: rank06,
  7: rank07,
  8: rank08,
  9: rank09,
  10: rank10,
  11: rank11,
  12: rank12,
  14: rank14,
  15: rank15,
  16: rank16,
  17: rank17,
  18: rank18,
}

/** Short labels for the fallback badge, e.g. "MGE" for Master Guardian Elite. */
function rankInitials(rankName: string) {
  const words = rankName.replace(/[^A-Za-z0-9 ]/g, "").split(/\s+/).filter(Boolean)
  const initials = words.map((word) => (/^[IVX]+$/.test(word) ? word : word[0]!.toUpperCase())).join("")
  return initials.slice(0, 4) || "?"
}

/** Uses CS:GO Rank1–Rank18 art; a labelled badge-shaped fallback avoids broken images. */
export function CompetitiveRankBadge({
  rankId,
  rankName,
  imageKey,
  currentExp,
  className,
}: {
  rankId?: number | null
  rankName?: string | null
  imageKey?: string | null
  currentExp?: number | null
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [rankId, imageKey])
  const resolvedRankId = rankId ?? 1
  const resolvedRankName = rankName ?? "Silver I"
  const source = CSGO_RANK_ASSETS[resolvedRankId] ?? ""
  const tooltip = `${resolvedRankName} · ${(currentExp ?? 0).toLocaleString()} EXP`

  if (!source || failed) {
    return (
      <span
        title={tooltip}
        aria-label={resolvedRankName}
        className={cn(
          "inline-flex h-7 w-12 shrink-0 items-center justify-center rounded-md border border-amber-200/25 bg-gradient-to-b from-slate-700/80 to-slate-900/90 text-[10px] font-black tracking-wider text-amber-100 shadow-inner shadow-black/40",
          className
        )}
      >
        {rankInitials(resolvedRankName)}
      </span>
    )
  }

  return <img src={source} width={200} height={80} loading="lazy" decoding="async" onError={() => setFailed(true)} alt={resolvedRankName} title={tooltip} className={cn("h-7 w-12 shrink-0 object-contain", className)} />
}
