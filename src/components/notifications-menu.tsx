/**
 * Notifications bell in the header. It opens a panel under the button rather than navigating, so the
 * page behind it is never lost.
 *
 * The feed belongs to the signed-in player, so the bell is only rendered for one; opening the panel
 * marks what it shows as read.
 */
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Bell, CircleCheck, Gavel, Info, Loader2, MessageSquare, Scale, Swords, Users, type LucideIcon } from "lucide-react"
import { toast } from "sonner"

import { notificationsService, type NotificationEntry, type NotificationFeed } from "@/api"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { RelativeTime } from "@/components/relative-time"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"

/** The icon of each kind, in a neutral tile; the accent only marks unread. */
const KIND_ICON: Record<NotificationEntry["kind"], LucideIcon> = {
  penalty: Gavel,
  match: Swords,
  system: Info,
  clan: Users,
}

/** System notifications say what they are about in `metadata.kind`: a more exact icon for each. */
const SYSTEM_ICON: Record<string, LucideIcon> = {
  lift_request: Scale,
  lift_decision: CircleCheck,
  staff_message: MessageSquare,
}

/** The icon of one notification. Anything unknown gets the kind's icon, and an unknown kind the info icon. */
export function notificationIcon(notification: Pick<NotificationEntry, "kind" | "metadata">): LucideIcon {
  const detail = notification.kind === "system" && typeof notification.metadata?.kind === "string" ? SYSTEM_ICON[notification.metadata.kind] : undefined
  return detail ?? KIND_ICON[notification.kind] ?? Info
}

/** The page a notification is about, or null when there is nothing to open (a message from staff, for one). */
export function notificationTarget(notification: Pick<NotificationEntry, "kind" | "metadata">): string | null {
  const detail = typeof notification.metadata?.kind === "string" ? notification.metadata.kind : ""
  const clanId = typeof notification.metadata?.clanId === "string" ? notification.metadata.clanId : ""
  if (notification.kind === "penalty") return "/penalties"
  if (notification.kind === "match") return "/profile"
  if (notification.kind === "clan") return clanId ? `/clans/${encodeURIComponent(clanId)}` : "/clans"
  switch (detail) {
    case "lift_request": return "/staff/penalties"
    case "lift_decision": return "/penalties"
    case "wallet": return "/wallet"
    case "founder": return "/profile/appearance"
    case "creator": return "/creators"
    default: return null
  }
}

export function NotificationsMenu() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [readLocally, setReadLocally] = useState(false)

  const { data: feed, loading, error, refetch } = useApiQuery<NotificationFeed>(
    (signal) => notificationsService.getFeed({ signal }),
    { enabled: Boolean(user), queryKey: user ? `notifications:${user.id}` : "notifications:guest" },
  )

  if (!user) return null

  const entries = feed?.entries ?? []
  const unread = readLocally ? 0 : feed?.unreadCount ?? 0

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) return
    refetch()
    // Seeing the panel is what marks the feed read; the badge clears immediately.
    if ((feed?.unreadCount ?? 0) > 0) {
      setReadLocally(true)
      notificationsService.markRead().catch(() => setReadLocally(false))
    }
  }

  const handleClear = async () => {
    if (entries.length === 0 || clearing) return
    setClearing(true)
    try {
      await notificationsService.clear()
      setReadLocally(true)
      refetch()
    } catch {
      toast.error("Could not clear your notifications. Try again.")
    } finally {
      setClearing(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        className={cn(
          "relative flex size-10 items-center justify-center rounded-[10px] text-[var(--text-muted)]",
          "transition-colors hover:bg-[var(--raised)] hover:text-[var(--text)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60",
        )}
        aria-label={unread > 0 ? `Notifications (${unread} unread)` : "Notifications"}
      >
        <Bell className="size-[18px]" />
        {unread > 0 && <span aria-hidden="true" className="absolute right-2.5 top-2.5 size-[7px] rounded-full bg-[var(--accent-solid)] ring-2 ring-[var(--panel)]" />}
      </PopoverTrigger>

      <PopoverContent align="end" sideOffset={8} className="w-[360px] overflow-hidden rounded-[14px] border-[var(--line-soft)] bg-[var(--panel)] p-0 shadow-[0_16px_40px_rgba(0,0,0,0.5)]">
        <div className="flex h-12 items-center justify-between gap-3 border-b border-[var(--line-soft)] px-4">
          <h2 className="text-sm font-semibold text-[var(--text)]">Notifications</h2>
          <button
            type="button"
            disabled={entries.length === 0 || clearing}
            onClick={() => void handleClear()}
            className={cn(
              "inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--text)]",
              "disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60",
            )}
          >
            Mark all as read
            {clearing && <Loader2 className="size-3.5 animate-spin" />}
          </button>
        </div>

        {loading && !feed ? (
          <div className="flex flex-col gap-1 px-2 pb-2" aria-busy="true">
            {[0, 1].map((index) => <div key={index} className="h-12 animate-pulse rounded-lg bg-white/[0.05]" />)}
          </div>
        ) : error && !feed ? (
          <p className="px-4 pb-5 pt-1 text-center text-xs text-muted-foreground">
            Could not load notifications.{" "}
            <button type="button" onClick={refetch} className="underline underline-offset-2 hover:text-foreground">Try again</button>
          </p>
        ) : entries.length === 0 ? (
          <p className="px-4 pb-5 pt-1 text-center text-xs text-muted-foreground">No notifications</p>
        ) : (
          <ul className="flex max-h-80 flex-col overflow-y-auto">
            {entries.map((notification) => {
              const Icon = notificationIcon(notification)
              const target = notificationTarget(notification)
              return (
              <li key={notification.id}>
                <button
                  type="button"
                  disabled={target === null}
                  onClick={() => { if (target === null) return; setOpen(false); navigate(target) }}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors enabled:hover:bg-[var(--raised)] disabled:cursor-default"
                >
                  <span aria-hidden="true" className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--line)] text-[var(--text-2)]">
                    <Icon className="size-4" strokeWidth={2} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{notification.title}</p>
                    {notification.body && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{notification.body}</p>}
                    <RelativeTime value={notification.createdAt} className="mt-1 block text-[11px] text-[var(--text-dim)]" />
                  </div>
                  {notification.readAt === null && <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-[var(--accent-solid)]" />}
                </button>
              </li>
              )
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  )
}
