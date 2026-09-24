import { useEffect, useState, type ReactNode } from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { AlertTriangle, Ban, Clock, Eye, Fingerprint, KeyRound, Loader2, ShieldAlert, Sparkles, UserPlus, type LucideIcon } from "lucide-react"

import type { ApiError } from "@/api/types"
import { adminService, type Duration, type PlayerCard, type PlayerFlags, type StaffCard } from "@/api/admin"
import { PlayerAvatar } from "@/components/player-avatar"
import { RelativeTime } from "@/components/relative-time"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

/* ---------------------------------------------------------------------------
 * Errors
 * ------------------------------------------------------------------------- */

export function errorText(error: unknown) {
  const api = error as Partial<ApiError> | null
  return api?.detail || api?.message || "Something went wrong"
}

export function isReauthError(error: unknown) {
  return (error as Partial<ApiError> | null)?.status === 428
}

export function toastError(error: unknown) {
  if (isReauthError(error)) {
    toast.error("Re-authenticate with Steam to change roles", {
      action: { label: "Re-authenticate", onClick: () => { window.location.href = adminService.reauthUrl(window.location.pathname) } },
    })
    return
  }
  toast.error(errorText(error))
}

/* ---------------------------------------------------------------------------
 * Layout
 * ------------------------------------------------------------------------- */

export function PanelPage({ title, description, actions, children }: { title: string; description?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
          {description && <p className="text-[13px] text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  )
}

export function Panel({ title, actions, children, className }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("glass rounded-xl border border-border/50", className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 px-4 py-2.5">
          <h2 className="text-[13px] font-semibold">{title}</h2>
          {actions}
        </header>
      )}
      {children}
    </section>
  )
}

export function StatTile({ label, value, icon: Icon, to, tone = "default" }: { label: string; value: ReactNode; icon: LucideIcon; to?: string; tone?: "default" | "warn" | "danger" }) {
  const body = (
    <div className={cn("glass flex items-center gap-3 rounded-xl border border-border/50 p-3.5 transition-colors", to && "hover:border-amber-300/40")}>
      <div className={cn("flex size-9 items-center justify-center rounded-lg bg-secondary", tone === "warn" && "text-amber-300", tone === "danger" && "text-rose-400")}>
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <div className="text-lg font-semibold tabular-nums leading-tight">{value}</div>
        <div className="truncate text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      </div>
    </div>
  )
  return to ? <Link to={to}>{body}</Link> : body
}

export function LoadingRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2 p-4">
      {Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
    </div>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="px-4 py-10 text-center text-[13px] text-muted-foreground">{children}</div>
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-[13px] text-muted-foreground">
      <AlertTriangle className="size-5 text-amber-300" />
      <span>{errorText(error)}</span>
      {onRetry && <Button size="sm" variant="outline" onClick={onRetry}>Try again</Button>}
    </div>
  )
}

/** Responsive table: a grid row on wide screens, a stacked card below 768px. */
export function Rows({ children }: { children: ReactNode }) {
  return <div className="divide-y divide-border/40">{children}</div>
}

/* ---------------------------------------------------------------------------
 * Players
 * ------------------------------------------------------------------------- */

export function PlayerCell({ player, subtitle, className }: { player: Pick<PlayerCard, "steamId" | "name" | "avatar"> | StaffCard | null | undefined; subtitle?: ReactNode; className?: string }) {
  if (!player) return <span className="text-muted-foreground">—</span>
  return (
    <Link to={`/u/${player.steamId}`} className={cn("group flex min-w-0 items-center gap-2.5", className)}>
      <PlayerAvatar avatar={player.avatar} name={player.name} className="size-8 shrink-0 rounded-md" />
      <div className="min-w-0">
        <div className="truncate text-[13px] font-medium group-hover:text-amber-300">{player.name}</div>
        <div className="truncate font-mono text-[11px] text-muted-foreground">{subtitle ?? player.steamId}</div>
      </div>
    </Link>
  )
}

const FLAG_META: { key: keyof PlayerFlags; label: string; icon: LucideIcon; className: string; test: (flags: PlayerFlags) => boolean; hint: (flags: PlayerFlags) => string }[] = [
  { key: "previousBan", label: "Prior ban", icon: Ban, className: "text-rose-300 bg-rose-500/10", test: (f) => f.previousBan, hint: () => "Has been banned on LEGACY-X before" },
  { key: "vacBans", label: "VAC", icon: ShieldAlert, className: "text-rose-300 bg-rose-500/10", test: (f) => f.vacBans > 0 || f.gameBans > 0, hint: (f) => `${f.vacBans} VAC · ${f.gameBans} game ban(s) on Steam` },
  { key: "newAccount", label: "New", icon: Sparkles, className: "text-sky-300 bg-sky-500/10", test: (f) => f.newAccount, hint: () => "First seen on LEGACY-X servers under 7 days ago" },
  { key: "manyNameChanges", label: "Names", icon: Fingerprint, className: "text-amber-300 bg-amber-500/10", test: (f) => f.manyNameChanges, hint: () => "3 or more names in the last 30 days" },
  { key: "firstVisit", label: "First visit", icon: UserPlus, className: "text-emerald-300 bg-emerald-500/10", test: (f) => f.firstVisit, hint: () => "First time on this server" },
]

export function FlagBadges({ flags }: { flags?: PlayerFlags }) {
  if (!flags) return null
  const active = FLAG_META.filter((meta) => meta.test(flags))
  if (active.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1">
      {active.map(({ key, label, icon: Icon, className, hint }) => (
        <Tooltip key={key}>
          <TooltipTrigger asChild>
            <span className={cn("inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium", className)}>
              <Icon className="size-3" />{label}
            </span>
          </TooltipTrigger>
          <TooltipContent>{hint(flags)}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  )
}

export function AboveRank() {
  return <span className="inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">Above your rank</span>
}

export function StatusPill({ status }: { status: string }) {
  const tone: Record<string, string> = {
    active: "bg-rose-500/15 text-rose-300",
    open: "bg-amber-500/15 text-amber-300",
    pending: "bg-amber-500/15 text-amber-300",
    expired: "bg-secondary text-muted-foreground",
    revoked: "bg-emerald-500/15 text-emerald-300",
    actioned: "bg-emerald-500/15 text-emerald-300",
    accepted: "bg-emerald-500/15 text-emerald-300",
    approved: "bg-emerald-500/15 text-emerald-300",
    dismissed: "bg-secondary text-muted-foreground",
    rejected: "bg-secondary text-muted-foreground",
    queued: "bg-sky-500/15 text-sky-300",
    delivered: "bg-sky-500/15 text-sky-300",
    done: "bg-emerald-500/15 text-emerald-300",
    failed: "bg-rose-500/15 text-rose-300",
  }
  return <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium capitalize", tone[status] ?? "bg-secondary text-muted-foreground")}>{status}</span>
}

export function durationLabel(minutes: number) {
  if (minutes % 10080 === 0) return `${minutes / 10080}w`
  if (minutes % 1440 === 0) return `${minutes / 1440}d`
  if (minutes % 60 === 0) return `${minutes / 60}h`
  return `${minutes}m`
}

export function ExpiryText({ permanent, expiresAt }: { permanent: boolean; expiresAt: string | null }) {
  if (permanent) return <span className="text-rose-300">Permanent</span>
  if (!expiresAt) return <span className="text-muted-foreground">—</span>
  const past = new Date(expiresAt).getTime() < Date.now()
  return <span className="inline-flex items-center gap-1 text-muted-foreground"><Clock className="size-3" />{past ? "Ended " : "Ends "}<RelativeTime value={expiresAt} /></span>
}

export { RelativeTime }

/* ---------------------------------------------------------------------------
 * Low-risk actions: run after 5 seconds unless undone
 * ------------------------------------------------------------------------- */

const UNDO_MS = 5000

/** Timers live outside React, so leaving the page does not cancel an action the user already chose. */
export function runWithUndo(label: string, action: () => Promise<unknown>, onDone?: () => void) {
  let cancelled = false
  const id = toast(label, {
    duration: UNDO_MS,
    action: { label: "Undo", onClick: () => { cancelled = true; window.clearTimeout(timer); toast.dismiss(id); toast("Cancelled") } },
  })
  const timer = window.setTimeout(() => {
    if (cancelled) return
    action().then(() => onDone?.()).catch(toastError)
  }, UNDO_MS)
}

/* ---------------------------------------------------------------------------
 * Ban dialog (preset reasons and durations)
 * ------------------------------------------------------------------------- */

export const BAN_REASONS = ["Cheating", "Griefing", "Toxicity", "Abuse of game mechanics", "Ban evasion", "Other"]
export const BAN_DURATIONS: { label: string; duration: Duration }[] = [
  { label: "1 day", duration: { permanent: false, minutes: 1440 } },
  { label: "3 days", duration: { permanent: false, minutes: 4320 } },
  { label: "7 days", duration: { permanent: false, minutes: 10080 } },
  { label: "30 days", duration: { permanent: false, minutes: 43200 } },
  { label: "Permanent", duration: { permanent: true } },
]
export const MUTE_PRESETS: { label: string; kind: "voice" | "chat" | "all"; minutes: number; reason: string }[] = [
  { label: "Mute 30m · Spam", kind: "all", minutes: 30, reason: "Spam" },
  { label: "Mute 2h · Toxicity", kind: "all", minutes: 120, reason: "Toxicity" },
  { label: "Mute 1d · Abuse", kind: "all", minutes: 1440, reason: "Abuse" },
  { label: "Voice only 1h · Mic spam", kind: "voice", minutes: 60, reason: "Mic spam" },
]
export const KICK_PRESETS = ["AFK", "Toxic behaviour", "Wrong team", "Other"]

export function BanDialog({ open, onOpenChange, target, allowPermanent, onDone }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  target: { steamId: string; name: string }
  allowPermanent: boolean
  onDone?: () => void
}) {
  const [reason, setReason] = useState(BAN_REASONS[0]!)
  const [custom, setCustom] = useState("")
  const [durationIndex, setDurationIndex] = useState(2)
  const [busy, setBusy] = useState(false)
  const durations = BAN_DURATIONS.filter((item) => allowPermanent || !item.duration.permanent)
  const chosen = durations[Math.min(durationIndex, durations.length - 1)]!

  useEffect(() => { if (open) { setReason(BAN_REASONS[0]!); setCustom(""); setDurationIndex(2); setBusy(false) } }, [open])

  const finalReason = reason === "Other" ? custom.trim() : reason
  const submit = async () => {
    setBusy(true)
    try {
      const result = await adminService.issueBan({ steamId: target.steamId, reason: finalReason, duration: chosen.duration })
      toast.success(result.reviewStatus === "pending" ? `${target.name} banned — sent to the review queue` : `${target.name} banned`)
      onOpenChange(false)
      onDone?.()
    } catch (error) {
      toastError(error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass max-w-md">
        <DialogHeader>
          <DialogTitle>Ban {target.name}</DialogTitle>
          <DialogDescription className="font-mono text-[11px]">{target.steamId}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <ChoiceGroup label="Reason" options={BAN_REASONS} value={reason} onChange={setReason} />
          {reason === "Other" && <Input autoFocus placeholder="Describe the reason" value={custom} maxLength={240} onChange={(e) => setCustom(e.target.value)} />}
          <ChoiceGroup label="Duration" options={durations.map((d) => d.label)} value={chosen.label} onChange={(label) => setDurationIndex(durations.findIndex((d) => d.label === label))} danger="Permanent" />
          {chosen.duration.permanent && <p className="text-[12px] text-muted-foreground">Permanent bans from your rank may go to the manager review queue. The ban applies immediately either way.</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" disabled={busy || finalReason.length === 0} onClick={submit}>
            {busy && <Loader2 className="animate-spin" />}Ban {chosen.label.toLowerCase()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function ChoiceGroup({ label, options, value, onChange, danger }: { label: string; options: string[]; value: string; onChange: (value: string) => void; danger?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={cn(
              "rounded-md border px-2.5 py-1 text-[12px] transition-colors",
              value === option
                ? option === danger ? "border-rose-400/60 bg-rose-500/15 text-rose-200" : "border-amber-300/60 bg-amber-300/10 text-amber-200"
                : "border-border/60 text-muted-foreground hover:text-foreground",
            )}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------------------
 * High-risk confirmation: type the name
 * ------------------------------------------------------------------------- */

export function TypeToConfirmDialog({ open, onOpenChange, title, description, expected, confirmLabel, onConfirm }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: ReactNode
  expected: string
  confirmLabel: string
  onConfirm: (typed: string) => Promise<void>
}) {
  const [typed, setTyped] = useState("")
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (open) { setTyped(""); setBusy(false) } }, [open])
  const matches = typed.trim().toLowerCase() === expected.trim().toLowerCase()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <label className="flex flex-col gap-1.5 text-[12px] text-muted-foreground">
          Type <span className="font-mono text-foreground">{expected}</span> to confirm
          <Input autoFocus value={typed} onChange={(e) => setTyped(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && matches && !busy) void run() }} />
        </label>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" disabled={!matches || busy} onClick={() => void run()}>{busy && <Loader2 className="animate-spin" />}{confirmLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

  async function run() {
    setBusy(true)
    try {
      await onConfirm(typed)
      onOpenChange(false)
    } catch (error) {
      toastError(error)
    } finally {
      setBusy(false)
    }
  }
}

export function ReasonDialog({ open, onOpenChange, title, confirmLabel, destructive, onConfirm, placeholder }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  confirmLabel: string
  destructive?: boolean
  placeholder?: string
  onConfirm: (reason: string) => Promise<void>
}) {
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)
  useEffect(() => { if (open) { setReason(""); setBusy(false) } }, [open])
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass max-w-md">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <Textarea autoFocus rows={3} maxLength={240} placeholder={placeholder ?? "Reason"} value={reason} onChange={(e) => setReason(e.target.value)} />
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant={destructive ? "destructive" : "default"} disabled={busy || reason.trim().length === 0} onClick={async () => {
            setBusy(true)
            try { await onConfirm(reason.trim()); onOpenChange(false) } catch (error) { toastError(error) } finally { setBusy(false) }
          }}>{busy && <Loader2 className="animate-spin" />}{confirmLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/* ---------------------------------------------------------------------------
 * Re-authentication banner for role changes
 * ------------------------------------------------------------------------- */

export function ReauthBanner({ fresh, expiresAt, returnTo }: { fresh: boolean; expiresAt: string | null; returnTo: string }) {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-3 text-[13px]", fresh ? "border-emerald-400/30 bg-emerald-500/10" : "border-amber-300/30 bg-amber-300/10")}>
      <span className="flex items-center gap-2">
        <KeyRound className={cn("size-4", fresh ? "text-emerald-300" : "text-amber-300")} />
        {fresh ? <>Role changes unlocked · expires <RelativeTime value={expiresAt} /></> : "Role and permission changes need a fresh Steam sign-in."}
      </span>
      {!fresh && <Button size="sm" onClick={() => { window.location.href = adminService.reauthUrl(returnTo) }}>Re-authenticate with Steam</Button>}
    </div>
  )
}

export function ViewToggle({ asPlayer, onChange }: { asPlayer: boolean; onChange: (value: boolean) => void }) {
  return (
    <Button size="sm" variant={asPlayer ? "secondary" : "outline"} onClick={() => onChange(!asPlayer)} aria-pressed={asPlayer}>
      <Eye />{asPlayer ? "Viewing as player" : "View as player"}
    </Button>
  )
}
