/**
 * The penalty detail dialog and the type/status vocabulary it shares with the Penalties page.
 *
 * It lives here so the profile's Penalty History opens the very same dialog the Penalties page
 * opens — one detail UI, not two.
 */
import { Ban, MicOff, MessageSquareOff, Lock, Clock3, CalendarDays, ShieldUser } from "lucide-react"

import { cn } from "@/lib/utils"
import type { PenaltyEntry, PenaltyType } from "@/api/types"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { RelativeTime } from "@/components/relative-time"
import { PlayerModerationAvatar } from "@/components/player-moderation-avatar"

export type PenaltyStatus = "active" | "expired" | "unbanned"

/** Penalty types as stored in legacy_x.penalty_type ("comm" is a voice mute). */
export const TYPE_META: Record<PenaltyType, { label: string; icon: typeof Ban; tone: string; iconTone: string }> = {
  ban: { label: "Ban", icon: Ban, tone: "border-destructive/30 bg-destructive/12 text-destructive", iconTone: "bg-destructive/15 text-destructive" },
  comm: { label: "Mute", icon: MicOff, tone: "border-amber-300/30 bg-amber-300/10 text-amber-200", iconTone: "bg-amber-300/12 text-amber-200" },
  gag: { label: "Gag", icon: MessageSquareOff, tone: "border-sky-300/30 bg-sky-300/10 text-sky-200", iconTone: "bg-sky-300/12 text-sky-200" },
}

export const STATUS_META: Record<PenaltyStatus, { label: string; tone: string }> = {
  active: { label: "Active", tone: "border-emerald-300/30 bg-emerald-400/10 text-emerald-200" },
  expired: { label: "Expired", tone: "border-white/10 bg-white/[0.05] text-white/55" },
  unbanned: { label: "Unbanned", tone: "border-sky-300/25 bg-sky-300/10 text-sky-200" },
}

/**
 * Whether the penalty still applies. A lifted one is unbanned even if it was issued as permanent,
 * and only a temporary one can run out. How long it lasts is the Duration column's job, not this.
 */
export function penaltyStatus(penalty: PenaltyEntry): PenaltyStatus {
  if (penalty.isUnbanned) return "unbanned"
  const expiresAt = penalty.expiresAt ? Date.parse(penalty.expiresAt) : Number.NaN
  if (!penalty.isPermanent && Number.isFinite(expiresAt) && expiresAt <= Date.now()) return "expired"
  return "active"
}

export function StatusPill({ status }: { status: PenaltyStatus }) {
  const meta = STATUS_META[status]
  return (
    <span className={cn("inline-flex h-6 items-center gap-1.5 rounded-full border px-2 text-[11px] font-semibold", meta.tone)}>
      {status === "active" && <span className="penalty-active-dot size-1.5 rounded-full bg-emerald-300" />}
      {meta.label}
    </span>
  )
}

export function TypeIcon({ type, className }: { type: PenaltyType; className?: string }) {
  const meta = TYPE_META[type] ?? TYPE_META.ban
  const Icon = meta.icon
  return (
    <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", meta.iconTone, className)} title={meta.label}>
      <Icon className="size-4" />
    </span>
  )
}

export function PenaltyDetailDialog({ penalty, onClose, onProfileNavigate }: { penalty: PenaltyEntry | null; onClose: () => void; onProfileNavigate: (steamId: string) => void }) {
  const status = penalty ? penaltyStatus(penalty) : "active"
  const meta = penalty ? TYPE_META[penalty.type] ?? TYPE_META.ban : TYPE_META.ban
  const exact = penalty && !Number.isNaN(new Date(penalty.date).getTime())
    ? new Date(penalty.date).toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })
    : penalty?.date
  const openProfile = (steamId?: string) => {
    if (!steamId) return
    onClose()
    onProfileNavigate(steamId)
  }

  return (
    <Dialog open={penalty !== null} onOpenChange={(open) => { if (!open) onClose() }}>
      {/* A glass panel over a backdrop that only just softens the page; opens and closes on one eased curve. */}
      <DialogContent
        overlayClassName="bg-black/40 backdrop-blur-[3px] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:animate-none"
        className={cn(
          "glass max-w-md gap-0 overflow-hidden rounded-2xl p-0 shadow-2xl shadow-black/50",
          "duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:animate-none",
          "data-[state=open]:slide-in-from-bottom-2 data-[state=closed]:slide-out-to-bottom-2",
        )}
      >
        {penalty && (
          <>
            <div className={cn("relative px-6 pb-5 pt-6", penalty.type === "ban" && status === "active" ? "bg-destructive/[0.08]" : "bg-white/[0.03]")}>
              <DialogHeader className="items-start text-left">
                <div className="flex items-center gap-3">
                  <TypeIcon type={penalty.type} className="size-11" />
                  <div>
                    <DialogTitle className="text-lg">{meta.label} · {penalty.player}</DialogTitle>
                    <DialogDescription className="mt-0.5">Issued <RelativeTime value={penalty.date} /></DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div className="mt-4"><StatusPill status={status} /></div>
            </div>
            <dl className="grid grid-cols-[7rem_minmax(0,1fr)] gap-x-3 gap-y-3.5 px-6 py-5 text-sm">
              <dt className="text-muted-foreground">Reason</dt>
              <dd className="whitespace-pre-wrap break-words">{penalty.reason || "No reason given"}</dd>
              <dt className="text-muted-foreground">Duration</dt>
              <dd className="flex items-center gap-1.5">{penalty.isPermanent ? <><Lock className="size-3.5 text-destructive" />Permanent</> : <><Clock3 className="size-3.5 text-muted-foreground" />{penalty.term || "—"}</>}</dd>
              <dt className="text-muted-foreground">Player</dt>
              <dd>
                <button type="button" disabled={!penalty.playerSteamId} onClick={() => openProfile(penalty.playerSteamId)} className="flex items-center gap-2 text-left enabled:hover:underline disabled:cursor-default">
                  <PlayerModerationAvatar avatar={penalty.avatar} name={penalty.player} status={penalty.moderationStatus} className="size-6 rounded-md text-[9px]" />
                  <span className="font-medium">{penalty.player}</span>
                  <span className="text-xs text-muted-foreground">· {penalty.moderationStatus}</span>
                </button>
              </dd>
              <dt className="text-muted-foreground">Issued by</dt>
              <dd>
                <button type="button" disabled={!penalty.adminSteamId} onClick={() => openProfile(penalty.adminSteamId)} className="flex items-center gap-1.5 text-left enabled:hover:underline disabled:cursor-default">
                  <ShieldUser className="size-3.5 text-muted-foreground" />{penalty.admin || "System"}
                </button>
              </dd>
              <dt className="text-muted-foreground">Date</dt>
              <dd className="flex items-center gap-1.5"><CalendarDays className="size-3.5 text-muted-foreground" />{exact}</dd>
            </dl>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
