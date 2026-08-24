import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

/** Uses Rank1–Rank18 artwork when supplied; a compact numeric fallback avoids broken images. */
export function CompetitiveRankBadge({
  rankId,
  rankName,
  imageKey,
  className,
}: {
  rankId?: number | null
  rankName?: string | null
  imageKey?: string | null
  className?: string
}) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [imageKey])
  const source = imageKey ? `/ranks/${imageKey}.png` : ""

  if (!rankId || !source || failed) {
    return <span title={rankName ?? "Unranked"} className={cn("inline-flex h-7 min-w-10 items-center justify-center rounded-md border border-white/[0.12] bg-white/[0.04] px-1 text-[10px] font-black tabular-nums text-white/70", className)}>{rankId ?? "—"}</span>
  }

  return <img src={source} width={92} height={56} loading="lazy" decoding="async" onError={() => setFailed(true)} alt={rankName ?? `Rank ${rankId}`} title={rankName ?? `Rank ${rankId}`} className={cn("h-7 w-12 shrink-0 object-contain", className)} />
}
