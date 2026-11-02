/**
 * The QPay payment window of a top-up: the invoice's QR code and the bank-app links QPay gave, a clock, and a check every few
 * seconds. The LX are added by the server when QPay says the invoice is paid; this window only shows where it stands.
 */
import { useEffect, useRef, useState } from "react"
import { Check, Copy, ExternalLink, RotateCcw } from "lucide-react"
import { toast } from "sonner"

import { walletService, type TopUp, type TopUpInvoice } from "@/api/wallet"
import qpayLogo from "@/assets/payments/qpay.svg"
import { LxMark } from "@/components/lx-mark"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const mnt = (value: number) => `${value.toLocaleString()}₮`
const POLL_MS = 4000

function clock(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`
}

export function QpayPayDialog({ invoice, onClose, onSettled }: { invoice: TopUpInvoice | null; onClose: () => void; onSettled: (status: TopUp["status"]) => void }) {
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
  const copyLink = async () => {
    if (!invoice?.shortUrl) return
    try { await navigator.clipboard.writeText(invoice.shortUrl); toast.success("Link copied") } catch { toast.error("Could not copy the link") }
  }

  return (
    <Dialog open={Boolean(invoice)} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto rounded-2xl sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5"><img src={qpayLogo} alt="QPay" className="h-5 w-12 shrink-0" draggable={false} />{invoice ? mnt(invoice.amountMnt) : ""}</DialogTitle>
          <DialogDescription>{invoice ? `Scan the code or open your bank app. ${invoice.grantsLx.toLocaleString()} LX arrive the moment it is paid.` : ""}</DialogDescription>
        </DialogHeader>
        {invoice && status === "paid" && (
          <div className="flex flex-col items-center gap-3 py-8 text-center" role="status">
            <span className="grid size-14 place-items-center rounded-full bg-[var(--status-green)] text-[var(--bg)]"><Check className="size-7" aria-hidden="true" /></span>
            <span className="flex items-center gap-1.5 text-[22px] font-bold text-[var(--text)]"><LxMark size={22} />+{invoice.grantsLx.toLocaleString()} LX</span>
            <span className="text-[13px] text-[var(--text-muted)]">Paid. The LX are in your wallet.</span>
            <button type="button" onClick={onClose} className="lx-primary-button mt-1 inline-flex h-10 items-center rounded-lg px-5 text-[13px] font-semibold">Done</button>
          </div>
        )}
        {invoice && status !== "paid" && status !== "pending" && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <span className="text-[13px] text-[var(--text-muted)]">{status === "expired" ? "This invoice ran out of time. Nothing was charged." : "The invoice could not be used."}</span>
            <button type="button" onClick={onClose} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--raised)] px-4 text-[13px] text-[var(--text-2)] hover:bg-[var(--line-soft)]"><RotateCcw className="size-3.5" />Start again</button>
          </div>
        )}
        {invoice && status === "pending" && (
          <div className="flex flex-col gap-4">
            <div className="mx-auto grid size-[220px] place-items-center rounded-xl bg-[var(--text)] p-2">
              {invoice.qrImage ? <img src={`data:image/png;base64,${invoice.qrImage}`} alt="QPay QR code" className="size-full" draggable={false} /> : <span className="px-4 text-center text-xs text-[var(--bg)]">No QR code. Use a bank app below.</span>}
            </div>
            <p className="text-center text-[12px] text-[var(--text-dim)]" aria-live="polite">
              {checkFailed ? "Could not check the payment. Trying again…" : `Waiting for the payment · ${clock(left)} left`}
            </p>
            {invoice.links.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[1.2px] text-[var(--text-dim)]">Open your bank app</span>
                <ul className="grid max-h-[180px] grid-cols-2 gap-2 overflow-y-auto">
                  {invoice.links.map((bank) => (
                    <li key={bank.name}>
                      <a href={bank.link} className="flex h-10 items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--raised)] px-2.5 text-[12px] text-[var(--text-2)] hover:border-[var(--line-strong)]">
                        {bank.logo.startsWith("https://") && <img src={bank.logo} alt="" loading="lazy" onError={(event) => { event.currentTarget.style.display = "none" }} className="size-6 shrink-0 rounded-md" />}
                        <span className="truncate">{bank.description || bank.name}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {invoice.shortUrl.startsWith("https://") && (
              <div className="flex gap-2">
                <a href={invoice.shortUrl} target="_blank" rel="noreferrer noopener" className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--raised)] text-[13px] text-[var(--text-2)] hover:border-[var(--line-strong)]"><ExternalLink className="size-3.5" />Open the QPay page</a>
                <button type="button" onClick={() => void copyLink()} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--raised)] px-3 text-[13px] text-[var(--text-2)] hover:border-[var(--line-strong)]"><Copy className="size-3.5" />Copy</button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
