import { get, post, type CallOptions } from "./client"

/**
 * The matchmaking queue (owner decision 2026-11-14): join, leave, accept and the player's own state. The backend is matchmakingRoutes.ts.
 * idle → queued → found (ten players, press Accept) → preparing (all accepted, waiting for a server) → ready (the server is loading the match).
 */
export type QueueMode = "5x5" | "pro"
export type QueueState = "idle" | "queued" | "found" | "preparing" | "ready"

export interface QueueMatch {
  id: string
  mode: QueueMode
  map: string
  acceptDeadline: string
  accepted: number
  total: number
  myAccepted: boolean
  status?: string
  team?: 1 | 2
  connectAddress?: string | null
  players?: Array<{ userId: string; username: string; team: 1 | 2; exp: number }>
}

export interface PartyMember { userId: string; username: string; exp: number }
export interface Party { id: string; leaderId: string; members: PartyMember[]; invited: Array<{ userId: string; username: string }> }
export interface PartyInvitation { partyId: string; from: string }

export interface QueueStatus {
  state: QueueState
  counts: Record<QueueMode, number>
  queue?: { mode: QueueMode; joinedAt: string }
  match?: QueueMatch
  /** The player's party (up to five who queue together) and the invitations waiting for them. */
  party: Party | null
  invitations: PartyInvitation[]
}

export const queueService = {
  async status(options?: CallOptions): Promise<QueueStatus> {
    const response = await get<Partial<QueueStatus>>("/api/v1/queue/status", undefined, options)
    return { state: response.state ?? "idle", counts: { "5x5": Number(response.counts?.["5x5"]) || 0, pro: Number(response.counts?.pro) || 0 }, queue: response.queue, match: response.match, party: response.party ?? null, invitations: response.invitations ?? [] }
  },
  join: (mode: QueueMode) => post<{ ok: true }>("/api/v1/queue/join", { mode }),
  leave: () => post<{ ok: true }>("/api/v1/queue/leave"),
  accept: (matchId: string) => post<{ ok: true }>("/api/v1/queue/accept", { matchId }),

  partyInvite: (userId: string) => post<{ ok: true }>("/api/v1/party/invite", { userId }),
  partyAccept: (partyId: string) => post<{ ok: true }>("/api/v1/party/accept", { partyId }),
  partyDecline: (partyId: string) => post<{ ok: true }>("/api/v1/party/decline", { partyId }),
  partyLeave: () => post<{ ok: true }>("/api/v1/party/leave"),
  partyKick: (userId: string) => post<{ ok: true }>("/api/v1/party/kick", { userId }),
}
