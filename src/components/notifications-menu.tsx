/**
 * Notifications bell in the header. It opens a panel under the button rather than navigating, so the
 * page behind it is never lost.
 *
 * There is no notification feed in the API yet, so the panel is empty by design: nothing is invented
 * here. When the feed exists, replace `notifications` with its query and give Clear its call.
 */
import { Bell, Trash2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface NotificationEntry {
  id: string
  title: string
  body?: string
  createdAt: string
}

export function NotificationsMenu() {
  const notifications: NotificationEntry[] = []
  const unread = notifications.length

  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          "glass-strong relative flex size-10 items-center justify-center rounded-lg",
          "text-white/70 transition-all hover:glow-accent hover:text-white",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        )}
        aria-label={unread > 0 ? `Notifications (${unread})` : "Notifications"}
      >
        <Bell className="size-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold tabular-nums text-primary-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent align="end" sideOffset={8} className="glass w-80 rounded-xl p-0">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <h2 className="text-sm font-semibold">Notifications</h2>
          <button
            type="button"
            disabled={unread === 0}
            className={cn(
              "inline-flex h-7 items-center gap-1.5 rounded-md border border-destructive/30 bg-destructive/12 px-2 text-xs font-medium text-destructive",
              "transition-colors hover:bg-destructive/20 disabled:cursor-not-allowed disabled:opacity-40",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/50",
            )}
          >
            Clear
            <Trash2 className="size-3.5" />
          </button>
        </div>

        {unread === 0 ? (
          <p className="px-4 pb-5 pt-1 text-center text-xs text-muted-foreground">No notifications</p>
        ) : (
          <ul className="stagger-in flex max-h-80 flex-col gap-1 overflow-y-auto px-2 pb-2">
            {notifications.map((notification) => (
              <li key={notification.id} className="rounded-lg bg-secondary/50 px-3 py-2.5">
                <p className="truncate text-sm font-medium">{notification.title}</p>
                {notification.body && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{notification.body}</p>}
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  )
}
