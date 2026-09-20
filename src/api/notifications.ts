import { get, post, del, type CallOptions } from "./client"

/**
 * Notifications service. Backs the header bell: the player's own feed, marking it read, and
 * clearing it. Rows are written by the platform, never by the browser.
 */
export type NotificationKind = "penalty" | "match" | "system"

export interface NotificationEntry {
  id: string
  kind: NotificationKind
  title: string
  body: string | null
  metadata: Record<string, unknown>
  /** null while the notification is still unread. */
  readAt: string | null
  createdAt: string
}

export interface NotificationFeed {
  entries: NotificationEntry[]
  unreadCount: number
}

export const notificationsService = {
  getFeed(options?: CallOptions): Promise<NotificationFeed> {
    return get<NotificationFeed>("/notifications", undefined, options)
  },

  /** Marks the given notifications read, or every unread one when no ids are given. */
  async markRead(ids?: string[], options?: CallOptions): Promise<void> {
    await post<void>("/notifications/read", ids?.length ? { ids } : {}, options)
  },

  async clear(options?: CallOptions): Promise<void> {
    await del<void>("/notifications", options)
  },
}
