/** The creator's own panel on the Creators page (owner request 2026-11-13): their code, how many players used it, the FOL$ it earned, the latest players, and the tools (kit, edit page).
 *  Real numbers only: everything comes from GET /creators/me/referral. Shown only to content creators. */
import { useState } from "react"
import { Check, Copy, RotateCcw, Ticket } from "lucide-react"
import { toast } from "sonner"

import { creatorsService, type MyReferral } from "@/api/creators"
import { PlayerAvatar } from "@/components/player-avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { CreatorKit } from "@/components/creator-kit"
import { CreatorApply } from "@/components/creator-apply"
import { CreatorTikTok } from "@/components/creator-tiktok"
import { useApiQuery } from "@/hooks/use-api-query"

const card = "rounded-[24px] border border-[var(--glass-line)] bg-[var(--glass-fill)] p-6"
const label = "text-[11px] font-semibold uppercase tracking-[1.2px] text-[var(--text-dim)]"

export function CreatorPanel({ onAboutSaved }: { onAboutSaved?: () => void }) {
  const info = useApiQuery<MyReferral>((signal) => creatorsService.myReferral({ signal }), { queryKey: "my-referral-panel" })
  const [copied, setCopied] = useState(false)
  const data = info.data
  const copy = async (code: string) => {
    try { await navigator.clipboard.writeText(code); setCopied(true); window.setTimeout(() => setCopied(false), 1500) } catch { toast.error("Could not copy it. Select the code and copy it by hand.") }
  }
  if (info.error && !data) {
    return <p className="flex items-center justify-center gap-3 py-16 text-[13px] text-[var(--text-dim)]">Could not load your panel.<button type="button" onClick={info.refetch} className="inline-flex items-center gap-1.5 text-[var(--text-2)] hover:text-[var(--text)]"><RotateCcw className="size-3.5" />Retry</button></p>
  }
  if (!data) {
    return <div className="grid gap-4 lg:grid-cols-12" aria-hidden="true"><Skeleton className="h-[200px] rounded-[24px] lg:col-span-5" /><Skeleton className="h-[200px] rounded-[24px] lg:col-span-7" /></div>
  }
  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <section aria-label="Your code" className={`${card} flex flex-col gap-5 lg:col-span-5`}>
        <div className="flex items-center gap-2"><Ticket className="size-4 text-[var(--text-2)]" aria-hidden="true" /><span className={label}>Your creator code</span></div>
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-[var(--bg)] px-5 py-4">
          <span className="select-all font-mono text-[32px] font-semibold tracking-[0.3em] text-[var(--text)]">{data.code}</span>
          <button type="button" onClick={() => void copy(data.code)} aria-label="Copy the code" className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--raised)] px-3.5 text-[13px] font-medium text-[var(--text-2)] transition-colors hover:border-[var(--line-strong)] hover:text-[var(--text)]">
            {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}{copied ? "Copied" : "Copy"}
          </button>
        </div>
        <p className="text-[13px] leading-relaxed text-[var(--text-muted)]">Share it with your viewers. A new player who enters it after their first ranked match gets FOL$, and so do you.</p>
        <div className="mt-auto flex flex-wrap gap-2"><CreatorKit /><CreatorApply onAboutSaved={onAboutSaved} /></div>
      </section>

      <div className="flex min-w-0 flex-col gap-4 lg:col-span-7">
        <div className="grid grid-cols-2 gap-4">
          <section aria-label="Players who used your code" className={`${card} flex flex-col gap-2`}>
            <span className={label}>Players used it</span>
            <b className="text-[40px] font-bold leading-none text-[var(--text)]">{data.count.toLocaleString()}</b>
          </section>
          <section aria-label="FOL$ earned" className={`${card} flex flex-col gap-2`}>
            <span className={label}>You earned</span>
            <b className="text-[40px] font-bold leading-none text-[var(--text)]">{data.earned.toLocaleString()}<span className="ml-1.5 text-[14px] font-semibold text-[var(--text-muted)]">FOL$</span></b>
          </section>
        </div>
        <section aria-label="Latest players" className={`${card} flex flex-col gap-3`}>
          <span className={label}>Latest players</span>
          {data.recent.length > 0 ? (
            <ul className="flex flex-col">
              {data.recent.map((row) => (
                <li key={row.id} className="flex items-center gap-3 border-t border-[var(--line-soft)] py-2.5 first:border-t-0 first:pt-0 text-[13px] text-[var(--text-2)]">
                  <PlayerAvatar avatar={row.avatar ?? undefined} name={row.name} className="size-8 rounded-full" />
                  <span className="min-w-0 flex-1 truncate font-medium text-[var(--text)]">{row.name}</span>
                  <span className="text-[12px] text-[var(--text-dim)]">{new Date(row.at).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-[13px] text-[var(--text-dim)]">Nobody has used your code yet.</p>}
        </section>
      </div>
      <div className="lg:col-span-12"><CreatorTikTok onChanged={onAboutSaved} /></div>
    </div>
  )
}
