import { get, post, put, type CallOptions } from "./client"

/** What the signed-in player may do to penalties from the website (backend /moderation/*). Players get canManage: false. */
export interface ModerationAccess {
  canManage: boolean
  role: string | null
  /** Penalties this person already asked to have lifted and nobody has decided yet. */
  requestedPenaltyIds?: string[]
  /** Owners and Managers decide on unban requests. */
  canApprove?: boolean
  can: { ban: boolean; unban: boolean; edit: boolean }
}

/** An Admin's ask to lift a penalty someone else issued. */
export interface LiftRequest {
  id: string
  penaltyId: string
  type: string
  player: string
  avatar: string
  penaltyReason: string
  reason: string | null
  requestedBy: string
  at: string
}

export type PenaltyKind = "ban" | "comm" | "gag"

export const penaltyAdminService = {
  async getAccess(options?: CallOptions): Promise<ModerationAccess> {
    return get<ModerationAccess>("/api/v1/moderation/access", undefined, options)
  },

  /** "lifted" at once (your own penalty, or you are a Manager or Owner) or "requested" (an Admin on someone else's). */
  async lift(penaltyId: string, reason?: string, options?: CallOptions): Promise<{ status: "lifted" | "requested" }> {
    return post<{ status: "lifted" | "requested" }>(`/api/v1/moderation/penalties/${penaltyId}/lift`, reason ? { reason } : {}, options)
  },

  async getLiftRequests(options?: CallOptions): Promise<LiftRequest[]> {
    return get<LiftRequest[]>("/api/v1/moderation/lift-requests", undefined, options)
  },

  async decideLift(requestId: string, approve: boolean, options?: CallOptions): Promise<void> {
    await post<void>(`/api/v1/moderation/lift-requests/${requestId}/${approve ? "approve" : "decline"}`, undefined, options)
  },

  /** A new reason, a new length counted from now (0 = permanent), or both. */
  async change(penaltyId: string, payload: { reason?: string; durationMinutes?: number }, options?: CallOptions): Promise<void> {
    await put<void>(`/api/v1/moderation/penalties/${penaltyId}`, payload, options)
  },

  /** A message from staff to one player, shown in their notification bell. */
  async notify(payload: { steamId: string; title: string; body: string }, options?: CallOptions): Promise<void> {
    await post<void>("/api/v1/moderation/notify", payload, options)
  },

  async issue(payload: { steamId: string; type: PenaltyKind; durationMinutes: number; reason: string }, options?: CallOptions): Promise<{ penaltyId: string }> {
    return post<{ penaltyId: string }>("/api/v1/moderation/penalties", payload, options)
  },
}
