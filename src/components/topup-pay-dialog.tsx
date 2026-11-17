/**
 * The payment window of a top-up: a button to Wire's payment page (QPay and the bank apps are there), a clock, and a check every few
 * seconds. The LX are added by the server when Wire says the payment succeeded; this window only shows where it stands.
 */
import { useEffect, useRef, useState } from "react"
import { Check, ExternalLink, RotateCcw } from "lucide-react"

import { walletService, type TopUp, type TopUpInvoice } from "@/api/wallet"
import qpayLogo from "@/assets/payments/qpay.svg"
import successArt from "@/assets/home/hero-wallet.webp"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const mnt = (value: number) => `${value.toLocaleString()}₮`
const POLL_MS = 4000

function clock(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`
}

export function TopUpPayDialog({ invoice, onClose, onSettled }: { invoice: TopUpInvoice | null; onClose: () => void; onSettled: (status: TopUp["status"]) => void }) {
  const [status, setStatus] = useState<TopUp["status"]>("pending")
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
        const next = await walletService.topUp(id)
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
    <><Dialog open={Boolean(invoice) && status !== "paid"} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto rounded-2xl sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{invoice ? `Pay ${mnt(invoice.amountMnt)}` : ""}</DialogTitle>
          <DialogDescription>{invoice ? `${invoice.grantsLx.toLocaleString()} FOL$ arrive the moment it is paid.` : ""}</DialogDescription>
        </DialogHeader>
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
      {invoice && status === "paid" && <TopUpSuccess amountLx={invoice.grantsLx} paidMnt={invoice.amountMnt} onClose={onClose} />}
    </>
  )
}

/** Shown full screen when a top-up is paid (owner request 2026-11-17): "Top up successful" and the amount that arrived. Any key, Done or Escape closes it. */
function TopUpSuccess({ amountLx, paidMnt, onClose }: { amountLx: number; paidMnt: number; onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape" || event.key === "Enter") onClose() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])
  return (
    <div role="alertdialog" aria-modal="true" aria-label="Top up successful" className="fixed inset-0 z-[100] flex items-center overflow-hidden bg-[#060606]">
      <img src={successArt} alt="" aria-hidden="true" decoding="async" draggable={false} className="lx-welcome-art pointer-events-none absolute inset-0 size-full object-cover object-[75%_20%]" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(6,6,6,0.92)_0%,rgba(6,6,6,0.7)_34%,rgba(6,6,6,0.1)_64%,transparent_100%),linear-gradient(180deg,rgba(6,6,6,0.4),transparent_25%,transparent_70%,rgba(6,6,6,0.6))]" />
      <section className="lx-welcome-text relative w-full max-w-[560px] px-6 py-10 sm:px-14" role="status">
        <span className="flex items-center gap-2.5 text-[12px] font-semibold uppercase tracking-[0.2em] text-[var(--text-dim)]"><span aria-hidden="true" className="grid size-5 place-items-center rounded-full bg-[var(--status-green)] text-[var(--bg)]"><Check className="size-3" aria-hidden="true" /></span>Payment received</span>
        <h1 className="mt-5 text-[clamp(34px,5vw,58px)] font-bold leading-[1.02] tracking-[-0.03em] text-[var(--text)]">Top up<br /><span className="text-[var(--text-dim)]">successful.</span></h1>
        <div className="mt-8 border-t border-[var(--line-soft)] pt-5">
          <div className="text-[11.5px] font-semibold uppercase tracking-[0.16em] text-[var(--text-dim)]">Amount</div>
          <div className="mt-2 flex items-center gap-3 text-[clamp(38px,5.4vw,60px)] font-bold leading-none tracking-[-0.02em] text-[#f6c945]">+{amountLx.toLocaleString()}<span className="text-[0.4em] font-semibold text-[var(--text-muted)]">FOL$</span></div>
          <div className="mt-3 text-[13px] text-[var(--text-dim)]">Paid {mnt(paidMnt)}. The FOL$ are in your wallet.</div>
        </div>
        <button type="button" autoFocus onClick={onClose} className="lx-primary-button lx-hover-blue mt-8 inline-flex h-[50px] items-center rounded-xl px-8 text-[15px] font-bold">Done</button>
      </section>
    </div>
  )
}
