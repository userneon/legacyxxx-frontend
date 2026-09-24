/**
 * Bell → notifications popover (docs/design/shell-notifications): header with "Mark all as read", rows with an
 * icon, two text lines and an unread dot. The feed belongs to the signed-in player.
 */
import { useState } from "react"
import { Bell, Gavel, Info, Swords } from "lucide-react"

import { notificationsService, type NotificationEntry, type NotificationFeed } from "@/api"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { RelativeTime } from "@/components/relative-time"
import { ErrorState, Skeleton } from "@/components/states"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"

const KIND_ICON: Record<NotificationEntry["kind"], typeof Bell> = {
  penalty: Gavel,
  match: Swords,
  system: Info,
}

export function NotificationsMenu() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [readIds, setReadIds] = useState<Set<string> | "all">(new Set())

  const { data: feed, loading, error, refetch } = useApiQuery<NotificationFeed>((signal) => notificationsService.getFeed({ signal }), {
    enabled: Boolean(user),
    queryKey: user?.id ?? "guest",
    keepPreviousData: true,
    pollMs: 60_000,
  })

  if (!user) return null

  const entries = feed?.entries ?? []
  const isUnread = (entry: NotificationEntry) => !entry.readAt && readIds !== "all" && !readIds.has(entry.id)
  const unread = entries.filter(isUnread).length

  const markAllRead = () => {
    if (unread === 0) return
    setReadIds("all")
    notificationsService.markRead().then(refetch).catch(() => setReadIds(new Set()))
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) refetch()
      }}
    >
      <PopoverTrigger
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        className="relative flex size-10 shrink-0 items-center justify-center rounded-[10px] text-text-muted transition-colors duration-150 hover:bg-raised hover:text-text data-[state=open]:bg-raised data-[state=open]:text-text"
      >
        <Bell className="size-[18px]" aria-hidden />
        <span
          aria-hidden
          className={cn(
            "absolute top-[9px] right-2.5 size-[7px] rounded-full bg-accent shadow-[0_0_0_2px_var(--panel)] transition-opacity duration-200",
            unread > 0 ? "opacity-100" : "opacity-0",
          )}
        />
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={12} className="w-[360px] max-w-[calc(100vw-16px)] p-0">
        <div className="flex h-12 items-center justify-between border-b border-line-soft px-4">
          <span className="text-sm font-semibold text-text">Notifications</span>
          <button
            type="button"
            onClick={markAllRead}
            disabled={unread === 0}
            className="text-xs text-text-muted transition-colors duration-150 hover:text-text disabled:cursor-default disabled:opacity-50"
          >
            Mark all as read
          </button>
        </div>
        {loading && !feed ? (
          <div aria-busy="true" aria-label="Loading notifications">
            {[0, 1, 2].map((row) => (
              <div key={row} className="flex items-start gap-3 px-4 py-3">
                <Skeleton className="size-8 rounded-lg" />
                <span className="flex flex-1 flex-col gap-2 pt-[3px]">
                  <Skeleton className="h-2.5 w-4/5" />
                  <Skeleton className="h-2 w-2/5 bg-raised" />
                </span>
              </div>
            ))}
          </div>
        ) : error && !feed ? (
          <ErrorState onRetry={refetch} className="py-8" />
        ) : entries.length === 0 ? (
          <p className="px-4 py-8 text-center text-[13px] text-text-dim">You're all caught up.</p>
        ) : (
          <ul className="max-h-[420px] overflow-y-auto">
            {entries.map((entry) => {
              const Icon = KIND_ICON[entry.kind] ?? Info
              return (
                <li key={entry.id} className="flex items-start gap-3 px-4 py-3 transition-colors duration-150 hover:bg-card">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-line bg-raised text-text-muted">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-[13px] font-medium text-text" title={entry.title}>{entry.title}</span>
                    <span className="truncate text-xs text-text-dim">
                      {entry.body ? `${entry.body} · ` : ""}
                      <RelativeTime value={entry.createdAt} />
                    </span>
                  </span>
                  <span aria-label={isUnread(entry) ? "Unread" : undefined} className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", isUnread(entry) ? "bg-accent" : "bg-transparent")} />
                </li>
              )
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  )
}
