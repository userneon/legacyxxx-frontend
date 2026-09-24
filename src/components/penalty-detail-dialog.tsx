/**
 * The penalty details drawer and the type/status vocabulary it shares with the Penalties page and
 * the profile's penalty history — one detail UI, not two.
 */
import { Ban, MessageSquareOff, MicOff, X } from "lucide-react"

import { cn } from "@/lib/utils"
import type { PenaltyEntry, PenaltyType } from "@/api/types"
import { LINKS } from "@/lib/links"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { PlayerModerationAvatar } from "@/components/player-moderation-avatar"

export type PenaltyStatus = "active" | "expired" | "unbanned"

/** Penalty types as stored in legacy_x.penalty_type ("comm" is a voice mute). */
export const TYPE_META: Record<PenaltyType, { label: string; plural: string; icon: typeof Ban; color: string }> = {
  ban: { label: "Ban", plural: "Bans", icon: Ban, color: "var(--penalty-ban)" },
  comm: { label: "Mute", plural: "Mutes", icon: MicOff, color: "var(--penalty-mute)" },
  gag: { label: "Gag", plural: "Gags", icon: MessageSquareOff, color: "var(--penalty-gag)" },
}

/** Colour of a penalty's state: active red, permanent rose, timed-and-running amber, expired grey, unbanned green. */
export function penaltyStatusColor(penalty: PenaltyEntry) {
  const status = penaltyStatus(penalty)
  if (status === "unbanned") return "var(--status-green)"
  if (status === "expired") return "var(--text-dim)"
  return penalty.isPermanent ? "var(--penalty-permanent)" : "var(--status-red)"
}

/** Colour of the term text: permanent rose, a running timer amber, finished grey. */
export function penaltyTermColor(penalty: PenaltyEntry) {
  const status = penaltyStatus(penalty)
  if (penalty.isPermanent && status === "active") return "var(--penalty-permanent)"
  if (status === "active") return "var(--status-amber)"
  return "var(--text-muted)"
}

/** Status pill: Active / Permanent / Expired / Unbanned in its colour, with a dot. */
export function StatusPill({ penalty, className }: { penalty: PenaltyEntry; className?: string }) {
  const color = penaltyStatusColor(penalty)
  const live = penaltyStatus(penalty) === "active"
  return (
    <span
      className={cn("inline-flex h-5 items-center gap-1.5 rounded-full border px-2 text-[11px] font-semibold", className)}
      style={{ color, borderColor: `color-mix(in oklab, ${color} 35%, transparent)`, backgroundColor: `color-mix(in oklab, ${color} 10%, transparent)` }}
    >
      <span className={cn("size-1.5 rounded-full", live && "animate-pulse motion-reduce:animate-none")} style={{ backgroundColor: color }} />
      {penaltyStatusLabel(penalty)}
    </span>
  )
}

/** Term text in its colour ("Permanent", "Ends in 2d 4h", or the stored term once it's over). */
export function TermLabel({ penalty, className }: { penalty: PenaltyEntry; className?: string }) {
  const label = penaltyTermLabel(penalty)
  return <span className={cn("min-w-0 truncate tabular-nums", className)} style={{ color: penaltyTermColor(penalty) }} title={label}>{label}</span>
}

/**
 * Whether the penalty still applies. A lifted one is unbanned even if it was issued as permanent,
 * and only a temporary one can run out.
 */
export function penaltyStatus(penalty: PenaltyEntry): PenaltyStatus {
  if (penalty.isUnbanned) return "unbanned"
  const expiresAt = penalty.expiresAt ? Date.parse(penalty.expiresAt) : Number.NaN
  if (!penalty.isPermanent && Number.isFinite(expiresAt) && expiresAt <= Date.now()) return "expired"
  return "active"
}

/** Active / Expired / Unbanned / Permanent — the word shown for a penalty's state. */
export function penaltyStatusLabel(penalty: PenaltyEntry): string {
  const status = penaltyStatus(penalty)
  if (status === "unbanned") return "Unbanned"
  if (status === "expired") return "Expired"
  return penalty.isPermanent ? "Permanent" : "Active"
}

/** "Ends in 2d 4h" for a running timed penalty, otherwise the stored term. */
export function penaltyTermLabel(penalty: PenaltyEntry, now = Date.now()): string {
  if (penalty.isPermanent) return "Permanent"
  const expiresAt = penalty.expiresAt ? Date.parse(penalty.expiresAt) : Number.NaN
  if (penaltyStatus(penalty) === "active" && Number.isFinite(expiresAt) && expiresAt > now) {
    const minutes = Math.max(1, Math.round((expiresAt - now) / 60_000))
    const days = Math.floor(minutes / 1440)
    const hours = Math.floor((minutes % 1440) / 60)
    const rest = minutes % 60
    return `Ends in ${days > 0 ? `${days}d ${hours}h` : hours > 0 ? `${hours}h ${rest}m` : `${rest}m`}`
  }
  return penalty.term || "—"
}

export function formatPenaltyDate(value: string, withTime = false) {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return "—"
  const pad = (n: number) => String(n).padStart(2, "0")
  const day = `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`
  return withTime ? `${day}, ${pad(date.getHours())}:${pad(date.getMinutes())}` : day
}

/** Penalty type pill in the type's colour (Ban red, Mute orange, Gag violet). */
export function TypePill({ type }: { type: PenaltyType }) {
  const meta = TYPE_META[type] ?? TYPE_META.ban
  const Icon = meta.icon
  return (
    <span
      className="inline-flex h-5 items-center gap-1 rounded-full border px-2 text-[11px] font-semibold"
      style={{ color: meta.color, borderColor: `color-mix(in oklab, ${meta.color} 35%, transparent)`, backgroundColor: `color-mix(in oklab, ${meta.color} 10%, transparent)` }}
    >
      <Icon className="size-3" />
      {meta.label}
    </span>
  )
}

/** Icon tile for a penalty type (profile history rows), tinted in the type's colour. */
export function TypeIcon({ type, className }: { type: PenaltyType; className?: string }) {
  const meta = TYPE_META[type] ?? TYPE_META.ban
  const Icon = meta.icon
  return (
    <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-[10px]", className)} style={{ color: meta.color, backgroundColor: `color-mix(in oklab, ${meta.color} 12%, transparent)` }} title={meta.label}>
      <Icon className="size-4" />
    </span>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex h-10 items-center justify-between gap-4 border-b border-[var(--line-soft)]">
      <span className="text-[13px] text-[var(--text-muted)]">{label}</span>
      <span className="min-w-0 truncate text-right text-[13px] font-medium text-[var(--text)]">{children}</span>
    </div>
  )
}

/**
 * Right-side details drawer (400px, dim overlay, Esc / overlay closes). "Appeal on Discord" only
 * appears on the viewer's own penalty.
 */
export function PenaltyDetailSheet({
  penalty,
  onClose,
  onProfileNavigate,
  isOwn = false,
}: {
  penalty: PenaltyEntry | null
  onClose: () => void
  onProfileNavigate: (steamId: string) => void
  isOwn?: boolean
}) {
  return (
    <Sheet open={penalty !== null} onOpenChange={(open) => { if (!open) onClose() }}>
      <SheetContent
        side="right"
        showCloseButton={false}
        overlayClassName="bg-[rgba(10,10,10,0.5)] data-[state=open]:duration-200 data-[state=closed]:duration-150"
        className="inset-y-2 right-2 h-auto w-[400px] max-w-[calc(100%-16px)] gap-0 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-0 shadow-[-16px_0_40px_rgba(0,0,0,0.45)] data-[state=open]:duration-[250ms] data-[state=closed]:duration-150 sm:max-w-[400px]"
      >
        {penalty && (
          <>
            <div className="flex items-center gap-3 border-b border-[var(--line-soft)] p-[18px]">
              <PlayerModerationAvatar avatar={penalty.avatar} name={penalty.player} status={penalty.moderationStatus} className="size-11 shrink-0 rounded-xl text-sm" />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <SheetTitle className="truncate text-[15px] font-semibold text-[var(--text)]">{penalty.player}</SheetTitle>
                <SheetDescription className="truncate text-xs tabular-nums text-[var(--text-dim)]">{penalty.playerSteamId ?? "Steam ID unavailable"}</SheetDescription>
              </div>
              <button type="button" onClick={onClose} aria-label="Close" className="flex size-8 shrink-0 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--raised)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60">
                <X className="size-4" />
              </button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-[18px] pb-[18px] pt-2">
              <Field label="Type"><TypePill type={penalty.type} /></Field>
              <Field label="Status"><StatusPill penalty={penalty} /></Field>
              <Field label="Term"><TermLabel penalty={penalty} /></Field>
              <Field label="Issued by">{penalty.admin || "System"}</Field>
              <Field label="Date">{formatPenaltyDate(penalty.date, true)}</Field>
              <div className="flex flex-col gap-2 py-4">
                <span className="text-[13px] text-[var(--text-muted)]">Reason</span>
                <p className="whitespace-pre-wrap break-words rounded-[10px] border border-[var(--line-soft)] bg-[var(--card-surface)] p-3 text-[13px] leading-5 text-[var(--text-2)]">
                  {penalty.reason || "No reason given"}
                </p>
              </div>
            </div>
            <div className="flex gap-2 border-t border-[var(--line-soft)] px-[18px] py-3.5">
              <button
                type="button"
                disabled={!penalty.playerSteamId}
                onClick={() => { if (penalty.playerSteamId) { onClose(); onProfileNavigate(penalty.playerSteamId) } }}
                className="flex h-9 flex-1 items-center justify-center rounded-lg border border-[var(--line)] text-[13px] font-medium text-[var(--text)] transition-colors hover:border-[var(--line-strong)] hover:bg-[var(--raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60 disabled:opacity-50"
              >
                View profile
              </button>
              {isOwn && LINKS.discordAppeals && (
                <a
                  href={LINKS.discordAppeals}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-9 flex-1 items-center justify-center rounded-lg bg-[var(--accent-solid)] text-[13px] font-semibold text-[var(--accent-on)] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60"
                >
                  Appeal on Discord
                </a>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
