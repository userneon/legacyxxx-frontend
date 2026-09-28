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
  return <span className={cn("min-w-0 truncate", className)} style={{ color: penaltyTermColor(penalty) }} title={label}>{label}</span>
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

/** One fact in the details panel (Term, Issued by, Date). */
function Tile({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5 rounded-xl border border-[var(--glass-line)] bg-[var(--glass-fill)] px-3.5 py-3", wide && "col-span-2")}>
      <span className="text-[11px] font-medium text-[var(--text-dim)]">{label}</span>
      <span className="min-w-0 truncate text-[13px] font-semibold text-[var(--text)]">{children}</span>
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
        overlayClassName="lx-sheet-overlay bg-[rgba(10,10,10,0.55)] data-[state=open]:duration-300 data-[state=closed]:duration-200"
        className="lx-sheet inset-y-2 right-2 h-auto w-[420px] max-w-[calc(100%-16px)] gap-0 overflow-hidden rounded-2xl border border-[var(--line)] p-0 data-[state=open]:duration-[450ms] data-[state=open]:ease-[cubic-bezier(0.22,1,0.36,1)] data-[state=closed]:duration-[250ms] data-[state=closed]:ease-[cubic-bezier(0.4,0,1,1)] sm:max-w-[420px]"
      >
        {penalty && (() => {
          const color = penaltyStatusColor(penalty)
          const meta = TYPE_META[penalty.type] ?? TYPE_META.ban
          // How much of a timed penalty has run, from the issue date to its end.
          const issued = Date.parse(penalty.date)
          const ends = penalty.expiresAt ? Date.parse(penalty.expiresAt) : Number.NaN
          const timed = !penalty.isPermanent && Number.isFinite(issued) && Number.isFinite(ends) && ends > issued
          const served = timed ? Math.max(0, Math.min(100, ((Date.now() - issued) / (ends - issued)) * 100)) : 0
          return (
          <>
            {/* Header tinted in the penalty's state colour (active red, permanent rose, lifted green). */}
            <div className="relative shrink-0 overflow-hidden border-b border-[var(--line-soft)] px-[18px] pb-[18px] pt-5">
              <div aria-hidden="true" className="pointer-events-none absolute -inset-10" style={{ background: `radial-gradient(60% 90% at 85% 0%, color-mix(in oklab, ${color} 30%, transparent), transparent 70%)` }} />
              <div aria-hidden="true" className="lx-hero-grid pointer-events-none absolute inset-0" />
              <meta.icon aria-hidden="true" strokeWidth={1.25} className="pointer-events-none absolute -right-4 -top-4 size-32 opacity-[0.08]" style={{ color }} />
              <div className="relative flex items-center gap-3.5">
                <PlayerModerationAvatar avatar={penalty.avatar} name={penalty.player} status={penalty.moderationStatus} className="size-14 shrink-0 rounded-2xl text-base" />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <SheetTitle className="truncate text-lg font-bold tracking-[-0.2px] text-[var(--text)]">{penalty.player}</SheetTitle>
                  <SheetDescription className="truncate text-xs text-[var(--text-dim)]">{penalty.playerSteamId ?? "Steam ID unavailable"}</SheetDescription>
                  <span className="flex flex-wrap items-center gap-1.5"><TypePill type={penalty.type} /><StatusPill penalty={penalty} /></span>
                </div>
                <button type="button" onClick={onClose} aria-label="Close" className="flex size-8 shrink-0 items-center justify-center self-start rounded-lg border border-[var(--line)] bg-[var(--panel)]/70 text-[var(--text-muted)] backdrop-blur transition-[color,border-color,rotate] duration-300 hover:rotate-90 hover:border-[var(--brand)]/50 hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-bright)]/60">
                  <X className="size-4" />
                </button>
              </div>
            </div>
            <div className="lx-sheet-rise flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-[18px] py-4">
              <div className="grid grid-cols-2 gap-2">
                <Tile label="Term"><TermLabel penalty={penalty} /></Tile>
                <Tile label="Issued by">{penalty.admin || "System"}</Tile>
                <Tile label="Date" wide>{formatPenaltyDate(penalty.date, true)}</Tile>
              </div>
              {timed && (
                <div className="flex flex-col gap-2 rounded-xl border border-[var(--glass-line)] bg-[var(--glass-fill)] p-3.5">
                  <span className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                    <span>Time served</span>
                    <span className="font-semibold text-[var(--text-2)]">{Math.round(served)}%</span>
                  </span>
                  <span className="h-2 overflow-hidden rounded-full bg-[var(--line-soft)]">
                    <span className="lx-bar-grow block h-full rounded-full" style={{ width: `${served}%`, background: `linear-gradient(90deg, color-mix(in oklab, ${color} 55%, transparent), ${color})`, boxShadow: `0 0 10px -2px ${color}` }} />
                  </span>
                  <span className="flex justify-between text-[11px] text-[var(--text-dim)]">
                    <span>{formatPenaltyDate(penalty.date)}</span>
                    <span>{formatPenaltyDate(penalty.expiresAt!)}</span>
                  </span>
                </div>
              )}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium text-[var(--text-muted)]">Reason</span>
                <p className="whitespace-pre-wrap break-words rounded-xl border border-[var(--line-soft)] border-l-[3px] bg-[var(--glass-fill)] p-3.5 text-[13px] leading-5 text-[var(--text-2)]" style={{ borderLeftColor: color }}>
                  {penalty.reason || "No reason given"}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 gap-2 border-t border-[var(--line-soft)] bg-[var(--panel)]/60 px-[18px] py-3.5">
              <button
                type="button"
                disabled={!penalty.playerSteamId}
                onClick={() => { if (penalty.playerSteamId) { onClose(); onProfileNavigate(penalty.playerSteamId) } }}
                className="flex h-10 flex-1 items-center justify-center rounded-lg border border-[var(--line)] text-[13px] font-medium text-[var(--text)] transition-colors hover:border-[var(--brand)]/50 hover:bg-[var(--raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-bright)]/60 disabled:opacity-50"
              >
                View profile
              </button>
              {isOwn && LINKS.discordAppeals && (
                <a
                  href={LINKS.discordAppeals}
                  target="_blank"
                  rel="noreferrer"
                  className="lx-brand-button flex h-10 flex-1 items-center justify-center rounded-lg text-[13px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-bright)]/60"
                >
                  Appeal on Discord
                </a>
              )}
            </div>
          </>
          )
        })()}
      </SheetContent>
    </Sheet>
  )
}
