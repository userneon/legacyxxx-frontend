import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

/** Official CS:GO competitive badge sequence: 1 = Silver I, 18 = Global Elite. */
const CSGO_RANK_ASSETS: Record<number, string> = {
  1: "/manus-storage/1_45c6c776.png",
  2: "/manus-storage/2_421e4c22.png",
  3: "/manus-storage/3_ca17d923.png",
  4: "/manus-storage/4_365685e1.png",
  5: "/manus-storage/5_1d152189.png",
  6: "/manus-storage/6_19942c56.png",
  7: "/manus-storage/7_769f5f93.png",
  8: "/manus-storage/8_9ef22cd7.png",
  9: "/manus-storage/9_122bc3dc.png",
  10: "/manus-storage/10_d1dd1e62.png",
  11: "/manus-storage/11_5e49f374.png",
  12: "/manus-storage/12_73aa7bf8.png",
  13: "/manus-storage/13_c7db0c55.png",
  14: "/manus-storage/14_114a0427.png",
  15: "/manus-storage/15_56bcf996.png",
  16: "/manus-storage/16_218234d0.png",
  17: "/manus-storage/17_a3deb8ef.png",
  18: "/manus-storage/18_6d84bc1c.png",
}

/** Uses verified CS:GO Rank1–Rank18 art; a compact numeric fallback avoids broken images. */
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
    return <span title={tooltip} className={cn("inline-flex h-7 min-w-10 items-center justify-center rounded-md border border-white/[0.12] bg-white/[0.04] px-1 text-[10px] font-black tabular-nums text-white/70", className)}>{resolvedRankId}</span>
  }

  return <img src={source} width={92} height={56} loading="lazy" decoding="async" onError={() => setFailed(true)} alt={resolvedRankName} title={tooltip} className={cn("h-7 w-12 shrink-0 object-contain", className)} />
}
