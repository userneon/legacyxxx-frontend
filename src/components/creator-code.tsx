import { useState } from "react"
import { Check, Copy, Ticket } from "lucide-react"
import { toast } from "sonner"

import { creatorsService, type MyReferral } from "@/api/creators"
import { PlayerAvatar } from "@/components/player-avatar"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"

const secondary = "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--raised)] px-3 text-[13px] text-[var(--text-2)] transition-colors hover:border-[var(--line-strong)] hover:text-[var(--text)] disabled:opacity-50"
const field = "h-10 w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 text-center font-mono text-[15px] uppercase tracking-[0.3em] text-[var(--text)] placeholder:text-[var(--text-faint)] placeholder:tracking-normal focus:border-[var(--text-faint)] focus:outline-none"

const WHY: Record<string, string> = {
  already_used: "You already entered a creator's code.",
  too_old: "Codes can only be entered in an account's first days.",
  not_played: "Play your first ranked match, then enter the code here.",
}

/** The Creators page's code control: a creator sees their own code and who used it; a new player can enter one. */
export function CreatorCode() {
  const { isAuthenticated } = useAuth()
  const mine = useApiQuery<{ isCreator: boolean } | null>((signal) => (isAuthenticated ? creatorsService.myApplication({ signal }) : Promise.resolve(null)), { queryKey: `creator-application-${isAuthenticated}` })
  if (!isAuthenticated || !mine.data) return null
  return mine.data.isCreator ? <MyCode /> : <EnterCode />
}

function MyCode() {
  const [open, setOpen] = useState(false)
  const info = useApiQuery<MyReferral>((signal) => creatorsService.myReferral({ signal }), { queryKey: "my-referral", enabled: open })
  const [copied, setCopied] = useState(false)
  const copy = async (code: string) => {
    try { await navigator.clipboard.writeText(code); setCopied(true); window.setTimeout(() => setCopied(false), 1500) } catch { toast.error("Could not copy it. Select the code and copy it by hand.") }
  }
  const data = info.data
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={secondary}><Ticket className="size-4" aria-hidden="true" />My code</button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[var(--panel)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Your creator code</DialogTitle>
            <DialogDescription>Share it with your viewers. A new player who enters it after their first ranked match gets FOL$, and so do you.</DialogDescription>
          </DialogHeader>
          {info.error ? (
            <p className="text-[13px] text-[var(--text-dim)]">Could not load your code{info.error.message ? ` (${info.error.status ? `${info.error.status}: ` : ""}${info.error.message})` : ""}. <button type="button" onClick={info.refetch} className="text-[var(--text-2)] underline">Retry</button></p>
          ) : !data ? (
            <div className="h-24 animate-pulse rounded-lg bg-[var(--raised)]" aria-hidden="true" />
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--card-surface)] px-4 py-3">
                <span className="select-all font-mono text-[26px] font-semibold tracking-[0.3em] text-[var(--text)]">{data.code}</span>
                <button type="button" onClick={() => void copy(data.code)} className={secondary}>{copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}{copied ? "Copied" : "Copy"}</button>
              </div>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="rounded-lg border border-[var(--line-soft)] px-3 py-2"><p className="text-[18px] font-semibold text-[var(--text)]">{data.count.toLocaleString()}</p><p className="text-[11px] text-[var(--text-dim)]">Players used it</p></div>
                <div className="rounded-lg border border-[var(--line-soft)] px-3 py-2"><p className="text-[18px] font-semibold text-[var(--text)]">{data.earned.toLocaleString()} FOL$</p><p className="text-[11px] text-[var(--text-dim)]">Earned</p></div>
              </div>
              {data.recent.length > 0 ? (
                <ul className="flex flex-col gap-1.5">
                  {data.recent.map((row) => (
                    <li key={row.id} className="flex items-center gap-2 text-[13px] text-[var(--text-2)]">
                      <PlayerAvatar avatar={row.avatar ?? undefined} name={row.name} className="size-6 rounded-md" />
                      <span className="min-w-0 flex-1 truncate">{row.name}</span>
                      <span className="text-[11px] text-[var(--text-dim)]">{new Date(row.at).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-[13px] text-[var(--text-dim)]">Nobody has used your code yet.</p>}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

function EnterCode() {
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState("")
  const [busy, setBusy] = useState(false)
  const status = useApiQuery((signal) => creatorsService.referralStatus({ signal }), { queryKey: "referral-status" })
  const info = status.data
  if (!info || info.used) return null
  const submit = async () => {
    setBusy(true)
    try {
      const result = await creatorsService.redeemReferral(code.trim())
      window.dispatchEvent(new Event("legacyx:wallet-changed"))
      toast.success(result.reward > 0 ? `Code accepted: ${result.reward.toLocaleString()} FOL$ are yours` : "Code accepted")
      setOpen(false)
      status.refetch()
    } catch (caught) {
      toast.error((caught as { message?: string }).message ?? "Could not use the code")
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={secondary}><Ticket className="size-4" aria-hidden="true" />Creator code</button>
      <Dialog open={open} onOpenChange={(next) => { if (!busy) setOpen(next) }}>
        <DialogContent className="bg-[var(--panel)] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Enter a creator's code</DialogTitle>
            <DialogDescription>{info.rewardNew > 0 ? `You get ${info.rewardNew.toLocaleString()} FOL$ and the creator is thanked. ` : ""}It works once, in your account's first {info.windowDays} days, after your first ranked match.</DialogDescription>
          </DialogHeader>
          <input value={code} onChange={(event) => setCode(event.target.value.slice(0, 8))} onKeyDown={(event) => { if (event.key === "Enter" && info.canRedeem && code.trim() && !busy) void submit() }} placeholder="Code" aria-label="Creator code" autoFocus spellCheck={false} className={field} />
          {!info.canRedeem && info.reason && <p className="text-[12px] text-[var(--text-dim)]">{WHY[info.reason] ?? "You cannot enter a code right now."}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} disabled={busy} className={secondary}>Cancel</button>
            <button type="button" disabled={busy || !info.canRedeem || !code.trim()} onClick={() => void submit()} className="lx-primary-button inline-flex h-9 items-center gap-1.5 rounded-lg px-4 text-[13px] font-semibold disabled:opacity-50"><Check className="size-4" aria-hidden="true" />Use code</button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
