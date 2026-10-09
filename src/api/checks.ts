import { del, get, post, type CallOptions } from "./client"

/** A player check: staff ask a player to run the checker program with a one-time code. */
export type CheckStatus = "pending" | "completed" | "expired"

export interface CheckSummary {
  detections: number
  suspicions: number
  /** Accounts on the PC (or the asked player's) that Steam says carry a VAC or game ban. */
  bannedAccounts?: number
  /** The Steam accounts found on the PC include the player who was asked. */
  matchesTarget: boolean
}

export interface PlayerCheck {
  id: string
  codeHint: string
  targetSteamId: string
  targetName: string | null
  targetAvatar?: string | null
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

/** One Steam account that signed in on the PC, from Steam's own files. */
export interface CheckSteamAccount {
  steamId: string
  accountName?: string
  personaName?: string
  lastLogin?: string
  mostRecent?: boolean
  cs2LastPlayed?: string
  cs2Hours?: number
  launchOptions?: string
}

/** What Steam itself says about an account (added by the server). */
export interface CheckSteamBan {
  steamId: string
  personaName: string | null
  createdAt: string | null
  profilePublic: boolean | null
  vacBanned: boolean
  gameBans: number
  communityBanned: boolean
  economyBan: string
  daysSinceLastBan: number | null
}

export interface CheckReport extends CheckSummary {
  consent: true
  checkerVersion: string
  steamIds: string[]
  steamAccounts?: CheckSteamAccount[]
  steamBans?: CheckSteamBan[]
  cs2?: { installed: boolean; lastUpdated?: string }
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
  /** The server can make a personal download of the checker for this check (the code is inside it). */
  downloadAvailable?: boolean
  downloadPath?: string | null
  /** The SHA-256 of the checker program, so the player can check the file they got (Get-FileHash). */
  checkerSha256?: string | null
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
