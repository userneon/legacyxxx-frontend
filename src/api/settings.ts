import { get, put, type CallOptions } from "./client"

/** Settings → Notifications, saved to the account (users.notification_prefs). */
export interface NotificationSettings {
  tournaments: boolean
  rankChanges: boolean
  /** Penalty notices can't be turned off. */
  penalties: true
}

export const settingsService = {
  async getNotifications(options?: CallOptions): Promise<NotificationSettings> {
    return get<NotificationSettings>("/api/v1/settings/notifications", undefined, options)
  },

  async updateNotifications(changes: Partial<Pick<NotificationSettings, "tournaments" | "rankChanges">>, options?: CallOptions): Promise<NotificationSettings> {
    return put<NotificationSettings>("/api/v1/settings/notifications", changes, options)
  },
}
