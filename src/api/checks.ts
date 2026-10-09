import { del, get, post, type CallOptions } from "./client"

/** A player check: staff ask a player to run the checker program with a one-time code. */
export type CheckStatus = "pending" | "completed" | "expired"

export interface CheckSummary {
  detections: number
  suspicions: number
  /** The Steam accounts found on the PC include the player who was asked. */
  matchesTarget: boolean
}

export interface PlayerCheck {
  id: string
  codeHint: string
  targetSteamId: string
  targetName: string | null
  requestedBy: string
  status: CheckStatus
  expiresAt: string
  createdAt: string
  completedAt: string | null
  checkerVersion: string | null
  summary?: CheckSummary
}

export interface CheckFinding {
  name: string
  kind: "file" | "process" | "trace" | "steam" | "tamper"
  confidence: "detection" | "suspicion"
  path?: string
  note?: string
}

export interface CheckReport extends CheckSummary {
  consent: true
  checkerVersion: string
  steamIds: string[]
  filesScanned: number
  durationSeconds: number
  findings: CheckFinding[]
}

export interface PlayerCheckDetail extends PlayerCheck {
  report: CheckReport | null
}

export interface NewCheck {
  id: string
  /** Shown once: only a hash of it is kept. */
  code: string
  expiresAt: string
  steamId: string
}

export const checksService = {
  async list(options?: CallOptions): Promise<PlayerCheck[]> {
    return get<PlayerCheck[]>("/api/v1/checks", undefined, options)
  },
  async get(id: string, options?: CallOptions): Promise<PlayerCheckDetail> {
    return get<PlayerCheckDetail>(`/api/v1/checks/${id}`, undefined, options)
  },
  async create(steamId: string, options?: CallOptions): Promise<NewCheck> {
    return post<NewCheck>("/api/v1/checks", { steamId }, options)
  },
  async remove(id: string, options?: CallOptions): Promise<void> {
    await del<void>(`/api/v1/checks/${id}`, options)
  },
}
