import { get, post, put, type CallOptions } from "./client"

/** What the signed-in player may do to penalties from the website (backend /moderation/*). Players get canManage: false. */
export interface ModerationAccess {
  canManage: boolean
  role: string | null
  can: { ban: boolean; unban: boolean; edit: boolean }
}

export type PenaltyKind = "ban" | "comm" | "gag"

export const penaltyAdminService = {
  async getAccess(options?: CallOptions): Promise<ModerationAccess> {
    return get<ModerationAccess>("/api/v1/moderation/access", undefined, options)
  },

  async lift(penaltyId: string, reason?: string, options?: CallOptions): Promise<void> {
    await post<void>(`/api/v1/moderation/penalties/${penaltyId}/lift`, reason ? { reason } : {}, options)
  },

  /** A new reason, a new length counted from now (0 = permanent), or both. */
  async change(penaltyId: string, payload: { reason?: string; durationMinutes?: number }, options?: CallOptions): Promise<void> {
    await put<void>(`/api/v1/moderation/penalties/${penaltyId}`, payload, options)
  },

  async issue(payload: { steamId: string; type: PenaltyKind; durationMinutes: number; reason: string }, options?: CallOptions): Promise<{ penaltyId: string }> {
    return post<{ penaltyId: string }>("/api/v1/moderation/penalties", payload, options)
  },
}
