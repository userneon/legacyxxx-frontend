/** Connect TikTok (owner request 2026-11-13): a content creator proves their TikTok account with TikTok's own sign-in (Login Kit, OAuth2). The API keeps
 *  only the public profile; the numbers here are what TikTok told it when the account was connected (Reconnect refreshes them). Real data only. */
import { useEffect, useState } from "react"
import { BadgeCheck, Loader2, RotateCcw } from "lucide-react"
import { toast } from "sonner"

import { creatorsService, type TikTokLink } from "@/api/creators"
import { BrandIcon } from "@/components/brand-icons"
import { OptimizedImage } from "@/components/optimized-image"
import { Skeleton } from "@/components/ui/skeleton"
import { useApiQuery } from "@/hooks/use-api-query"

const card = "rounded-[24px] border border-[var(--glass-line)] bg-[var(--glass-fill)] p-6"
const label = "text-[11px] font-semibold uppercase tracking-[1.2px] text-[var(--text-dim)]"
const button = "inline-flex h-10 items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--raised)] px-4 text-[13px] font-semibold text-[var(--text)] transition-colors hover:border-[var(--line-strong)] disabled:cursor-not-allowed disabled:opacity-50"

const RESULTS: Record<string, { ok: boolean; text: string }> = {
  linked: { ok: true, text: "TikTok is connected." },
  cancelled: { ok: false, text: "TikTok was not connected: the sign-in was cancelled." },
  expired: { ok: false, text: "That TikTok sign-in expired. Press Connect TikTok again." },
  failed: { ok: false, text: "TikTok could not be connected. Try again in a moment." },
  unavailable: { ok: false, text: "Connecting TikTok is not set up yet." },
}

const compact = (value: number | null) => (value === null ? "-" : new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value))

export function CreatorTikTok({ onChanged }: { onChanged?: () => void }) {
  const info = useApiQuery<{ available: boolean; link: TikTokLink | null }>((signal) => creatorsService.myTikTok({ signal }), { queryKey: "my-tiktok-link" })
  const [busy, setBusy] = useState(false)

  // The page TikTok sent the creator back to carries ?tiktok=<result>: say how it went once, then clean the address.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const result = params.get("tiktok")
    if (!result) return
    const message = RESULTS[result]
    if (message) (message.ok ? toast.success : toast.error)(message.text)
    params.delete("tiktok")
    window.history.replaceState(null, "", `${window.location.pathname}${params.toString() ? `?${params}` : ""}`)
    if (result === "linked") { void info.refetch(); onChanged?.() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- once, on arrival

  const connect = async () => {
    setBusy(true)
    try {
      const { url } = await creatorsService.startTikTok()
      window.location.assign(url)
    } catch (failure) {
      toast.error(failure instanceof Error ? failure.message : "Could not start the TikTok sign-in.")
      setBusy(false)
    }
  }
  const disconnect = async () => {
    setBusy(true)
    try {
      await creatorsService.removeTikTok()
      toast.success("TikTok is disconnected.")
      await info.refetch()
      onChanged?.()
    } catch (failure) {
      toast.error(failure instanceof Error ? failure.message : "Could not disconnect TikTok.")
    } finally {
      setBusy(false)
    }
  }

  if (info.loading && !info.data) return <Skeleton className="h-[140px] rounded-[24px]" aria-hidden="true" />
  if (info.error && !info.data) {
    return <p className={`${card} flex items-center gap-3 text-[13px] text-[var(--text-dim)]`}>Could not load your TikTok.<button type="button" onClick={info.refetch} className="inline-flex items-center gap-1.5 text-[var(--text-2)] hover:text-[var(--text)]"><RotateCcw className="size-3.5" aria-hidden="true" />Retry</button></p>
  }
  const data = info.data
  if (!data) return null
  const link = data.link
  return (
    <section aria-label="TikTok" className={`${card} flex flex-col gap-4`}>
      <div className="flex items-center gap-2"><BrandIcon platform="tiktok" className="size-4 text-[var(--text-2)]" /><span className={label}>TikTok</span>{link && <span className="ml-auto inline-flex items-center gap-1 text-[12px] font-medium text-[var(--status-green)]"><BadgeCheck className="size-4" aria-hidden="true" />Verified by TikTok</span>}</div>
      {link ? (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
          <div className="flex min-w-0 items-center gap-3">
            {link.avatarUrl ? <OptimizedImage src={link.avatarUrl} width={48} height={48} alt="" className="size-12 shrink-0 rounded-full object-cover" /> : <span aria-hidden="true" className="size-12 shrink-0 rounded-full bg-[var(--raised)]" />}
            <div className="min-w-0">
              <b className="block truncate text-[15px] text-[var(--text)]">{link.displayName || link.username}</b>
              {link.username && <span className="block truncate text-[13px] text-[var(--text-muted)]">@{link.username}</span>}
            </div>
          </div>
          <dl className="flex gap-6 text-[13px]">
            {[{ name: "Followers", value: link.followers }, { name: "Likes", value: link.likes }, { name: "Videos", value: link.videos }].map((stat) => (
              <div key={stat.name} className="flex flex-col gap-1"><dt className={label}>{stat.name}</dt><dd className="text-[22px] font-bold leading-none text-[var(--text)]">{compact(stat.value)}</dd></div>
            ))}
          </dl>
          <div className="ml-auto flex gap-2">
            <button type="button" disabled={busy || !data.available} onClick={() => void connect()} className={button}>{busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}Reconnect</button>
            <button type="button" disabled={busy} onClick={() => void disconnect()} className={button}>Disconnect</button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-4">
          <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-[var(--text-muted)]">Connect your TikTok with TikTok's own sign-in. Your Creators card then shows a Verified mark, and your followers, likes and videos. LEGACY-X only reads your public profile and never posts.</p>
          <button type="button" disabled={busy || !data.available} onClick={() => void connect()} className={button}>{busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <BrandIcon platform="tiktok" className="size-4" />}Connect TikTok</button>
          {!data.available && <p className="basis-full text-[12px] text-[var(--text-dim)]">Connecting TikTok is not set up yet.</p>}
        </div>
      )}
    </section>
  )
}
