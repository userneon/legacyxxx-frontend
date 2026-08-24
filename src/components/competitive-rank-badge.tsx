import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

/** Official CS:GO competitive badge sequence: 1 = Silver I, 18 = Global Elite. */
const CSGO_RANK_ASSETS: Record<number, string> = {
  1: "/manus-storage/1_94904039.png",
  2: "/manus-storage/2_738f9f74.png",
  3: "/manus-storage/3_4dab2883.png",
  4: "/manus-storage/4_c099e2ae.png",
  5: "/manus-storage/5_245c9833.png",
  6: "/manus-storage/6_8c447d7d.png",
  7: "/manus-storage/7_0691599a.png",
  8: "/manus-storage/8_2060e7ad.png",
  9: "/manus-storage/9_b6fd1c87.png",
  10: "/manus-storage/10_c90851a1.png",
  11: "/manus-storage/11_03a41531.png",
  12: "/manus-storage/12_e91a0a00.png",
  13: "/manus-storage/13_91f334f0.png",
  14: "/manus-storage/14_d50fb4ce.png",
  15: "/manus-storage/15_8bd87662.png",
  16: "/manus-storage/16_22f9ab7d.png",
  17: "/manus-storage/17_6b9072a8.png",
  18: "/manus-storage/18_bb4ee74d.png",
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
