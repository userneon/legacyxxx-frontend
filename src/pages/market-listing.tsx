import { useState } from "react"
import { AlertTriangle, ArrowLeft, Check, Copy, ImageOff, Mail, Phone, RotateCcw, ShieldAlert, Trash2 } from "lucide-react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"

import { formatPrice, marketService } from "@/api/market"
import { MarketForm } from "@/components/market-form"
import { PlayerAvatar } from "@/components/player-avatar"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { useModerationAccess } from "@/components/penalty-staff"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"
import { timeAgo } from "@/pages/market"
import { cn } from "@/lib/utils"

const button = "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--raised)] px-3 text-[13px] text-[var(--text-2)] transition-colors hover:border-[var(--line-strong)] hover:text-[var(--text)] disabled:opacity-50"

function CopyLine({ icon: Icon, value, href }: { icon: typeof Phone; value: string; href: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try { await navigator.clipboard.writeText(value); setCopied(true); window.setTimeout(() => setCopied(false), 1500) } catch { toast.error("Could not copy it. Select the text instead.") }
  }
  return (
    <div className="flex items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--card-surface)] px-3 py-2">
      <Icon className="size-4 shrink-0 text-[var(--text-2)]" aria-hidden="true" />
      <a href={href} className="min-w-0 flex-1 select-all truncate text-[14px] text-[var(--text)] hover:underline">{value}</a>
      <button type="button" onClick={() => void copy()} aria-label={`Copy ${value}`} className="inline-flex size-8 items-center justify-center rounded-lg text-[var(--text-2)] hover:bg-[var(--raised)]">{copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}</button>
    </div>
  )
}

/** One listing: photos, the price and the words, who sells it, the contact (for signed-in players), and what its owner or staff may do. */
export function MarketListingPage() {
  const { id = "" } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated, loginWithSteam } = useAuth()
  const staff = useModerationAccess()
  const mayModerate = Boolean(staff?.role && ["ADMIN", "MANAGER", "OWNER"].includes(staff.role))
  const query = useApiQuery((signal) => marketService.detail(id, isAuthenticated, { signal }), { queryKey: `market-listing-${id}-${isAuthenticated}` })
  const listing = query.data
  const [shown, setShown] = useState(0)
  const [contact, setContact] = useState<{ phone: string; email: string } | null>(null)
  const [contactBusy, setContactBusy] = useState(false)
  const [editing, setEditing] = useState(false)
  const [reporting, setReporting] = useState(false)
  const [reason, setReason] = useState("")
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [busy, setBusy] = useState(false)

  const act = async (work: () => Promise<unknown>, done?: string) => {
    setBusy(true)
    try { await work(); if (done) toast.success(done); query.refetch() } catch (failure) { toast.error((failure as { message?: string }).message ?? "Could not do that") } finally { setBusy(false) }
  }
  const showContact = async () => {
    if (!isAuthenticated) return loginWithSteam()
    setContactBusy(true)
    try { setContact(await marketService.contact(id)) } catch (failure) { toast.error((failure as { message?: string }).message ?? "Could not load the contact") } finally { setContactBusy(false) }
  }

  const back = <Link to="/market" className="inline-flex items-center gap-1.5 text-[13px] text-[var(--text-2)] hover:text-[var(--text)]"><ArrowLeft className="size-4" aria-hidden="true" />Market</Link>
  if (query.loading && !listing) {
    return <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-4 px-6 py-6 max-md:px-4">{back}<div className="grid gap-6 md:grid-cols-[1.2fr_1fr]"><Skeleton className="aspect-[4/3] rounded-xl bg-[var(--card-surface)]" /><Skeleton className="h-64 rounded-xl bg-[var(--card-surface)]" /></div></div>
  }
  if (!listing) {
    return <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-4 px-6 py-6 max-md:px-4">{back}<p className="flex items-center gap-3 text-[13px] text-[var(--text-dim)]">{query.error?.status === 404 ? "This listing is gone." : "Could not load this listing."}{query.error?.status !== 404 && <button type="button" onClick={query.refetch} className="inline-flex items-center gap-1.5 text-[var(--text-2)] hover:text-[var(--text)]"><RotateCcw className="size-3.5" aria-hidden="true" />Retry</button>}</p></div>
  }

  const image = listing.images[shown] ?? listing.images[0]
  const mine = listing.mine
  const owner = listing.owner
  const phone = contact?.phone || (mine ? owner?.phone : "")
  const email = contact?.email || (mine ? owner?.email : "")

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-5 px-6 py-6 max-md:px-4">
      {back}
      {listing.status === "sold" && <p className="rounded-lg border border-[var(--line)] bg-[var(--raised)] px-3 py-2 text-[13px] text-[var(--text-2)]" role="status">This has been sold.</p>}
      {listing.hidden && <p className="flex items-center gap-2 rounded-lg border border-[var(--status-red)]/40 bg-[var(--raised)] px-3 py-2 text-[13px] text-[var(--text-2)]" role="status"><AlertTriangle className="size-4 shrink-0 text-[var(--status-red)]" aria-hidden="true" />Other players reported this listing, so it is hidden from the list until staff look at it.</p>}
      <div className="grid gap-6 md:grid-cols-[1.2fr_1fr]">
        <div className="flex flex-col gap-2.5">
          <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--card-surface)]">
            {image ? <img src={image.url} alt={listing.title} className="size-full object-contain" /> : <ImageOff className="size-10 text-[var(--text-faint)]" aria-hidden="true" />}
          </div>
          {listing.images.length > 1 && (
            <ul className="grid grid-cols-6 gap-2">
              {listing.images.map((entry, index) => (
                <li key={entry.id}><button type="button" aria-label={`Photo ${index + 1}`} aria-pressed={index === shown} onClick={() => setShown(index)} className={cn("aspect-square w-full overflow-hidden rounded-lg border", index === shown ? "border-[var(--text)]" : "border-[var(--line)] opacity-70 hover:opacity-100")}><img src={entry.url} alt="" className="size-full object-cover" /></button></li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-[22px] font-semibold leading-tight text-[var(--text)]">{listing.title}</h1>
            <p className="text-[20px] font-semibold text-[var(--text)]">{formatPrice(listing.priceMnt)}</p>
            <p className="text-[12px] text-[var(--text-dim)]">Posted {timeAgo(listing.createdAt)}</p>
          </div>
          <Link to={listing.seller.steamId ? `/profile/${listing.seller.steamId}` : "#"} className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--card-surface)] p-3 hover:border-[var(--line-strong)]">
            <PlayerAvatar avatar={listing.seller.avatar ?? undefined} name={listing.seller.name} className="size-10 rounded-full" />
            <span className="flex min-w-0 flex-col"><span className="text-[11px] uppercase tracking-wider text-[var(--text-dim)]">Seller</span><span className="truncate text-[14px] font-medium text-[var(--text)]">{listing.seller.name}</span></span>
          </Link>
          {(listing.hasPhone || listing.hasEmail || mine) && (
            <div className="flex flex-col gap-2">
              {phone || email ? (
                <>
                  {phone && <CopyLine icon={Phone} value={phone} href={`tel:${phone.replace(/[^\d+]/g, "")}`} />}
                  {email && <CopyLine icon={Mail} value={email} href={`mailto:${email}`} />}
                </>
              ) : (
                <button type="button" disabled={contactBusy} onClick={() => void showContact()} className="lx-primary-button inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-[13px] font-semibold disabled:opacity-60">
                  <Phone className="size-4" aria-hidden="true" />{isAuthenticated ? "Show phone and email" : "Sign in to see the contact"}
                </button>
              )}
            </div>
          )}
          <p className="flex items-start gap-2 text-[12px] leading-relaxed text-[var(--text-dim)]"><ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />LEGACY-X does not take part in deals. Meet in a safe public place, check the item before you pay, and never send money first to someone you do not know.</p>
          <div className="flex flex-wrap gap-2">
            {mine ? (
              <>
                <button type="button" className={button} onClick={() => setEditing(true)}>Edit</button>
                <button type="button" disabled={busy} className={button} onClick={() => void act(() => marketService.setStatus(listing.id, listing.status === "sold" ? "active" : "sold"), listing.status === "sold" ? "Back on sale" : "Marked as sold")}>{listing.status === "sold" ? "Put back on sale" : "Mark as sold"}</button>
                <button type="button" className={cn(button, "text-[var(--status-red)]")} onClick={() => setConfirmDelete(true)}><Trash2 className="size-4" aria-hidden="true" />Delete</button>
              </>
            ) : (
              isAuthenticated && <button type="button" className={button} onClick={() => setReporting(true)}>Report</button>
            )}
            {mayModerate && !mine && (
              <>
                <button type="button" disabled={busy} className={cn(button, "text-[var(--status-red)]")} onClick={() => { const why = window.prompt("Why is it removed? The seller will not see this.", ""); if (why !== null) void act(async () => { await marketService.remove(listing.id, why.trim() || undefined); navigate("/market") }, "Removed") }}><Trash2 className="size-4" aria-hidden="true" />Remove (staff)</button>
                {(listing.hidden || (listing.reportCount ?? 0) > 0) && <button type="button" disabled={busy} className={button} onClick={() => void act(() => marketService.restore(listing.id), "Restored")}>Keep it up</button>}
              </>
            )}
            {(mine || mayModerate) && typeof listing.reportCount === "number" && listing.reportCount > 0 && <span className="self-center text-[12px] text-[var(--status-red)]">{listing.reportCount} report{listing.reportCount === 1 ? "" : "s"}</span>}
          </div>
        </div>
      </div>
      {listing.description && (
        <section aria-label="Description" className="flex flex-col gap-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-[1.2px] text-[var(--text-faint)]">Description</h2>
          <p className="whitespace-pre-wrap break-words text-[14px] leading-relaxed text-[var(--text-2)]">{listing.description}</p>
        </section>
      )}

      <MarketForm open={editing} onClose={() => setEditing(false)} listing={listing} onSaved={() => query.refetch()} />
      <Dialog open={reporting} onOpenChange={(next) => { if (!busy) setReporting(next) }}>
        <DialogContent className="bg-[var(--panel)] sm:max-w-sm">
          <DialogHeader><DialogTitle>Report this listing</DialogTitle><DialogDescription>Three players reporting it hides it until staff look. Say what is wrong, if you like.</DialogDescription></DialogHeader>
          <textarea value={reason} onChange={(event) => setReason(event.target.value.slice(0, 200))} placeholder="Optional: a scam, not allowed, wrong…" className="min-h-[80px] w-full rounded-lg border border-[var(--line)] bg-[var(--bg)] px-3 py-2.5 text-[13px] text-[var(--text)] placeholder:text-[var(--text-dim)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/50" />
          <div className="flex justify-end gap-2">
            <button type="button" className={button} disabled={busy} onClick={() => setReporting(false)}>Cancel</button>
            <button type="button" className="lx-primary-button inline-flex h-9 items-center rounded-lg px-4 text-[13px] font-semibold disabled:opacity-50" disabled={busy} onClick={() => void act(async () => { await marketService.report(listing.id, reason); setReporting(false); setReason("") }, "Thanks, staff will look.")}>Send report</button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={confirmDelete} onOpenChange={(next) => { if (!busy) setConfirmDelete(next) }}>
        <DialogContent className="bg-[var(--panel)] sm:max-w-sm">
          <DialogHeader><DialogTitle>Delete this listing?</DialogTitle><DialogDescription>It and its photos are removed for good.</DialogDescription></DialogHeader>
          <div className="flex justify-end gap-2">
            <button type="button" className={button} disabled={busy} onClick={() => setConfirmDelete(false)}>Keep it</button>
            <button type="button" className="inline-flex h-9 items-center rounded-lg border border-[var(--status-red)]/50 bg-[var(--raised)] px-4 text-[13px] font-semibold text-[var(--status-red)] hover:bg-[var(--bg)] disabled:opacity-50" disabled={busy} onClick={() => void act(async () => { await marketService.remove(listing.id); navigate("/market") }, "Deleted")}>Delete</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
