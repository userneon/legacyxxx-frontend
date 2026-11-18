/** Staff answer for creator ads (owner request 2026-11-18): the banner as it will show, the creator, the length and the price. Approving takes the FOL$ from the creator's wallet. */
import { useState } from "react"
import { Check, ExternalLink, X } from "lucide-react"
import { toast } from "sonner"

import { creatorAdsService, type StaffAd } from "@/api/creator-ads"
import { PlayerAvatar } from "@/components/player-avatar"
import { STAFF_CARD, STAFF_GRID, StaffSection } from "@/components/staff-ui"
import { useApiQuery } from "@/hooks/use-api-query"
import { cn } from "@/lib/utils"

const secondary = "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--raised)] px-3 text-[13px] text-[var(--text-2)] transition-colors hover:text-[var(--text)] disabled:opacity-50"

export function StaffCreatorAds() {
  const ads = useApiQuery((signal) => creatorAdsService.pending({ signal }), { queryKey: "staff-creator-ads" })
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<Record<string, string>>({})
  const rows: StaffAd[] = ads.data?.ads ?? []
  if (rows.length === 0) return null
  const answer = async (ad: StaffAd, decision: "approve" | "reject") => {
    setBusy(true)
    try {
      await creatorAdsService.decide(ad.id, { decision, note: (note[ad.id] ?? "").trim() })
      toast.success(decision === "approve" ? `${ad.creator.username}'s banner is live for ${ad.hours} h` : "Declined, nothing was taken")
    } catch (caught) {
      toast.error((caught as { message?: string }).message ?? "Could not save the answer")
    } finally {
      setBusy(false)
      ads.refetch()
    }
  }
  return (
    <StaffSection title="Home banner ads" count={rows.length}>
      <ul className={STAFF_GRID}>
        {rows.map((ad) => (
          <li key={ad.id} className={cn(STAFF_CARD, "gap-3")}>
            <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-[var(--bg)]">
              <img src={ad.imageUrl} alt="" className="absolute inset-0 size-full object-cover" />
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
              <span className="absolute inset-x-3 bottom-2 truncate text-[13px] font-semibold text-white">{ad.title || ad.handle}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <PlayerAvatar avatar={ad.creator.avatar || undefined} name={ad.creator.username} className="size-8 shrink-0 text-[11px]" />
              <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[var(--text)]">{ad.creator.username}<span className="ml-1.5 font-normal text-[var(--text-dim)]">{ad.handle}</span></span>
              <a href={ad.url} target="_blank" rel="noopener noreferrer" aria-label="Open the TikTok video" className="grid size-8 shrink-0 place-items-center rounded-lg border border-[var(--line)] text-[var(--text-dim)] hover:text-[var(--text)]"><ExternalLink className="size-4" /></a>
            </div>
            <p className="text-[12px] text-[var(--text-muted)]">{ad.hours} h · {ad.price.toLocaleString("en")} FOL$ (taken when you approve)</p>
            <input value={note[ad.id] ?? ""} onChange={(event) => setNote({ ...note, [ad.id]: event.target.value })} maxLength={300} placeholder="Reason, if you decline" className="h-9 w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 text-[13px] text-[var(--text)] placeholder:text-[var(--text-faint)] focus:outline-none" />
            <div className="mt-auto flex gap-2">
              <button type="button" disabled={busy} onClick={() => void answer(ad, "approve")} className="lx-primary-button inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold disabled:opacity-50"><Check className="size-4" />Approve</button>
              <button type="button" disabled={busy} onClick={() => void answer(ad, "reject")} className={cn(secondary, "flex-1")}><X className="size-4" />Decline</button>
            </div>
          </li>
        ))}
      </ul>
    </StaffSection>
  )
}
