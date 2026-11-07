/**
 * The payment window of a rank: a button to Wire's payment page (QPay and the bank apps are there), a clock, and a check every few seconds. The server
 * gives the rank when Wire says the payment succeeded; this window only shows where it stands.
 */
import { useEffect, useRef, useState } from "react"
import { Check, ExternalLink, RotateCcw } from "lucide-react"

import { perksService, type PerkInvoice, type PerkOrder } from "@/api/perks"
import qpayLogo from "@/assets/payments/qpay.svg"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const mnt = (value: number) => `${value.toLocaleString()}₮`
const POLL_MS = 4000

function clock(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`
}

export function PerkPayDialog({ invoice, onClose, onSettled }: { invoice: PerkInvoice | null; onClose: () => void; onSettled: (status: PerkOrder["status"]) => void }) {
  const [status, setStatus] = useState<PerkOrder["status"]>("pending")
  const [now, setNow] = useState(() => Date.now())
  const [checkFailed, setCheckFailed] = useState(false)
  const settled = useRef(onSettled)
  settled.current = onSettled
  const id = invoice?.id ?? null

  useEffect(() => {
    setStatus("pending")
    setCheckFailed(false)
    if (!id) return
    let stopped = false
    const check = async () => {
      try {
        const next = await perksService.order(id)
        if (stopped) return
        setCheckFailed(false)
        setStatus(next.status)
        if (next.status !== "pending") {
          stopped = true
          settled.current(next.status)
        }
      } catch {
        if (!stopped) setCheckFailed(true)
      }
    }
    const poll = window.setInterval(() => { if (!document.hidden) void check() }, POLL_MS)
    const tick = window.setInterval(() => setNow(Date.now()), 1000)
    const wake = () => { if (!document.hidden) void check() }
    document.addEventListener("visibilitychange", wake)
    return () => { stopped = true; window.clearInterval(poll); window.clearInterval(tick); document.removeEventListener("visibilitychange", wake) }
  }, [id])

  const left = invoice ? Date.parse(invoice.createdAt) + invoice.expiresInMinutes * 60_000 - now : 0

  return (
    <Dialog open={Boolean(invoice)} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto rounded-2xl sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{invoice ? `Pay ${mnt(invoice.amountMnt)}` : ""}</DialogTitle>
          <DialogDescription>{invoice ? `${invoice.name} for ${invoice.days} days starts the moment it is paid.` : ""}</DialogDescription>
        </DialogHeader>
        {invoice && status === "paid" && (
          <div className="flex flex-col items-center gap-3 py-8 text-center" role="status">
            <span className="grid size-14 place-items-center rounded-full bg-[var(--status-green)] text-[var(--bg)]"><Check className="size-7" aria-hidden="true" /></span>
            <span className="text-[22px] font-bold text-[var(--text)]">{invoice.name}</span>
            <span className="text-[13px] text-[var(--text-muted)]">Paid. Your rank is active.</span>
            <button type="button" onClick={onClose} className="lx-primary-button mt-1 inline-flex h-10 items-center rounded-lg px-5 text-[13px] font-semibold">Choose your commands</button>
          </div>
        )}
        {invoice && status !== "paid" && status !== "pending" && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <span className="text-[13px] text-[var(--text-muted)]">{status === "expired" ? "This payment ran out of time. Nothing was charged." : "The payment could not be started."}</span>
            <button type="button" onClick={onClose} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--raised)] px-4 text-[13px] text-[var(--text-2)] hover:bg-[var(--line-soft)]"><RotateCcw className="size-3.5" />Start again</button>
          </div>
        )}
        {invoice && status === "pending" && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 rounded-xl border border-[var(--line-soft)] bg-[var(--card-surface)] p-3.5">
              <span className="grid h-11 w-[88px] shrink-0 place-items-center rounded-[10px] border border-[var(--line)] bg-[var(--panel)] px-3"><img src={qpayLogo} alt="QPay" className="h-6 w-[60px]" draggable={false} /></span>
              <span className="text-[12px] leading-snug text-[var(--text-muted)]">Wire's secure page opens in a new tab. Scan the QR code or open your bank app there.</span>
            </div>
            <a href={invoice.checkoutUrl} target="_blank" rel="noreferrer noopener" className="lx-primary-button inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-[14px] font-semibold"><ExternalLink className="size-4" aria-hidden="true" />Open the payment page</a>
            <p className="text-center text-[12px] text-[var(--text-dim)]" aria-live="polite">
              {checkFailed ? "Could not check the payment. Trying again…" : `Waiting for the payment · ${clock(left)} left`}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
