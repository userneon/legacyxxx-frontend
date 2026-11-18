/** A creator's ads (owner request 2026-11-18): paste one of your TikTok video links, pick 24 h (5,000 FOL$) or 48 h (8,000 FOL$), and the video's own picture becomes a banner in
 *  the Home slider once staff approve it. The FOL$ is taken only when staff approve; a declined ad costs nothing. */
import { useState } from "react"
import { Loader2, Megaphone, X } from "lucide-react"
import { toast } from "sonner"

import { creatorAdsService, type AdHours, type AdStatus, type MyAd } from "@/api/creator-ads"
import { Skeleton } from "@/components/ui/skeleton"
import { useApiQuery } from "@/hooks/use-api-query"
import { cn } from "@/lib/utils"

const card = "rounded-[24px] border border-[var(--glass-line)] bg-[var(--glass-fill)] p-6"
const label = "text-[11px] font-semibold uppercase tracking-[1.2px] text-[var(--text-dim)]"
const STATUS: Record<AdStatus, { text: string; tone: string }> = {
  pending: { text: "Waiting for staff", tone: "text-[var(--text-2)]" },
  approved: { text: "Approved", tone: "text-[var(--status-green)]" },
  rejected: { text: "Declined", tone: "text-[var(--status-red)]" },
  cancelled: { text: "Cancelled", tone: "text-[var(--text-dim)]" },
}
const fol = (value: number) => `${value.toLocaleString("en")} FOL$`

function timeLeft(endsAt: string | null) {
  if (!endsAt) return ""
  const ms = Date.parse(endsAt) - Date.now()
  if (ms <= 0) return "ended"
  const hours = Math.floor(ms / 3_600_000)
  return hours >= 1 ? `${hours} h left` : `${Math.max(1, Math.floor(ms / 60_000))} min left`
}

export function CreatorAds() {
  const mine = useApiQuery((signal) => creatorAdsService.mine({ signal }), { queryKey: "my-creator-ads" })
  const [url, setUrl] = useState("")
  const [hours, setHours] = useState<AdHours>(24)
  const [busy, setBusy] = useState(false)
  const data = mine.data
  const price = data?.prices[String(hours)] ?? (hours === 24 ? 5000 : 8000)
  const open = data?.ads.some((ad) => ad.status === "pending" || (ad.status === "approved" && ad.endsAt && Date.parse(ad.endsAt) > Date.now())) ?? false
  const short = data ? data.balance < price : false
  const send = async () => {
    setBusy(true)
    try {
      await creatorAdsService.submit({ url: url.trim(), hours })
      toast.success("Sent. Staff will look at it; nothing is taken until they approve.")
      setUrl("")
      mine.refetch()
    } catch (caught) {
      toast.error((caught as { message?: string }).message ?? "Could not send the ad")
    } finally {
      setBusy(false)
    }
  }
  const cancel = async (ad: MyAd) => {
    setBusy(true)
    try { await creatorAdsService.cancel(ad.id); toast.success("Cancelled"); mine.refetch() } catch (caught) { toast.error((caught as { message?: string }).message ?? "Could not cancel") } finally { setBusy(false) }
  }
  return (
    <section aria-label="Home banner ad" className={card}>
      <div className="flex items-center gap-2.5"><Megaphone className="size-4 text-[var(--text-dim)]" aria-hidden="true" /><h2 className="text-[15px] font-semibold text-[var(--text)]">Put your video on Home</h2></div>
      <p className="mt-1.5 max-w-[560px] text-[13px] text-[var(--text-muted)]">Your TikTok video becomes a banner in the Home slider. The picture comes from the video itself. Staff approve it, and the FOL$ is taken only then.</p>
      {mine.loading && !data ? <Skeleton className="mt-5 h-[120px] rounded-xl" /> : (
        <>
          <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <label className="flex flex-col gap-1.5"><span className={label}>TikTok video link</span>
              <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder={`https://www.tiktok.com/${data?.tiktokHandle ?? "@name"}/video/123…`} className="h-11 w-full rounded-xl border border-[var(--line)] bg-[var(--bg)] px-3.5 text-[14px] text-[var(--text)] placeholder:text-[var(--text-faint)] focus:border-[var(--text-faint)] focus:outline-none" />
            </label>
            <div role="radiogroup" aria-label="How long" className="flex h-11 gap-0.5 rounded-xl border border-[var(--line)] p-[3px]">
              {([24, 48] as const).map((value) => (
                <button key={value} type="button" role="radio" aria-checked={hours === value} onClick={() => setHours(value)} className={cn("flex flex-col items-center justify-center rounded-lg px-4 text-[13px] leading-tight transition-colors", hours === value ? "bg-[var(--raised)] font-semibold text-[var(--text)]" : "text-[var(--text-dim)] hover:text-[var(--text)]")}>
                  {value} h<span className="text-[11px] font-normal text-[var(--text-dim)]">{fol(data?.prices[String(value)] ?? (value === 24 ? 5000 : 8000))}</span>
                </button>
              ))}
            </div>
          </div>
          {data && !data.tiktokHandle && <p className="mt-3 text-[12px] text-[var(--status-red)]">Add your TikTok profile link to your creator links first, so we can check the video is yours.</p>}
          {open && <p className="mt-3 text-[12px] text-[var(--text-dim)]">You already have an ad waiting or running. You can send the next one when it ends.</p>}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <span className="text-[12px] text-[var(--text-dim)]">Your balance: {fol(data?.balance ?? 0)}{short && <span className="text-[var(--status-red)]"> · {fol(price)} needed</span>}</span>
            <button type="button" disabled={busy || !url.trim() || open || short || !data?.tiktokHandle} onClick={() => void send()} className="lx-primary-button inline-flex h-10 items-center gap-2 rounded-xl px-5 text-[13px] font-semibold disabled:opacity-50">
              {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}Send for {fol(price)}
            </button>
          </div>
          {(data?.ads.length ?? 0) > 0 && (
            <ul className="mt-6 flex flex-col">
              {data!.ads.map((ad) => (
                <li key={ad.id} className="flex items-center gap-3 border-t border-[var(--line-soft)] py-3 first:border-t-0">
                  <img src={ad.imageUrl} alt="" className="h-12 w-[86px] shrink-0 rounded-lg object-cover bg-[var(--bg)]" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[13px] font-medium text-[var(--text)]">{ad.title || ad.handle}</span>
                    <span className="text-[11px] text-[var(--text-dim)]">{ad.hours} h · {fol(ad.price)}{ad.status === "approved" ? ` · ${timeLeft(ad.endsAt)}` : ""}{ad.status === "rejected" && ad.note ? ` · ${ad.note}` : ""}</span>
                  </span>
                  <span className={cn("shrink-0 text-[12px] font-semibold", STATUS[ad.status].tone)}>{STATUS[ad.status].text}</span>
                  {ad.status === "pending" && <button type="button" aria-label="Cancel this ad" disabled={busy} onClick={() => void cancel(ad)} className="grid size-8 shrink-0 place-items-center rounded-lg border border-[var(--line)] text-[var(--text-dim)] transition-colors hover:text-[var(--text)]"><X className="size-4" /></button>}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}
