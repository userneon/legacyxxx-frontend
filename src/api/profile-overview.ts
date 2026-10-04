import { del, get, post, put, type CallOptions } from "./client"
import type { ProfileLink } from "@/lib/profile-links"
import type { PenaltyEntry, UserProfile } from "./types"

/**
 * The profile page in one call (backend GET /profile/:id/overview). Sections the player hid are
 * already left out server-side for everyone but the owner and staff; `hidden` names them so the
 * page can say "<Section> hidden by player".
 */
export type ProfileSection = "stats" | "matches" | "faceit" | "loadout"

export interface ProfileMatchRow {
  map: string
  result: "Win" | "Loss" | "Draw" | string
  score: string
  kd: string
  matchId?: string
  mapNumber?: number
  playedAt?: string | null
  expDelta?: number
  expAfter?: number
  /** How the EXP was worked out; `limited` is set when the daily (×¼) or weekly (stopped) limit reduced the gain. */
  expBreakdown?: { limited?: "daily" | "weekly" } | null
}

export interface ProfileOverview {
  user: {
    id: string
    steamId: string
    username: string
    avatar: string
    role: UserProfile["role"]
    memberSince: string | null
    steamBackground: string | null
    steamMedia: UserProfile["steamMedia"]
  }
  viewer: { isOwner: boolean; isStaff: boolean }
  visibility: Record<ProfileSection, boolean> | null
  hidden: ProfileSection[]
  competitive: {
    exp: number
    rankId: number
    rankName: string
    rankImageKey: string | null
    currentRankMinExp: number
    nextRankName: string | null
    nextRankMinExp: number | null
    proLeagueUnlocked: boolean
    position: number | null
    /** EXP gained against the daily / weekly limits. Absent until the API sends it; nothing is shown then. */
    expLimits?: { day: { used: number; cap: number; resetsAt?: string }; week: { used: number; cap: number; resetsAt?: string } } | null
  } | null
  lastPlayedAt: string | null
  trust: { steamAccountCreatedAt: string | null; activePenalty: { id: string; type: PenaltyEntry["type"] } | null }
  stats: { key: "matches" | "winRate" | "kd" | "hs" | "avgKills"; label: string; value: number }[] | null
  recentMatches: ProfileMatchRow[] | null
  maps: { map: string; matches: number; wins: number; winRate: number }[] | null
  penalties: PenaltyEntry[]
  penaltyCount: number
  loadout: { side: "t" | "ct"; items: { key: string; label: string; name: string | null; image: string | null }[] } | null
  staff: { role: string; description: string; penaltiesIssued: number } | null
  presence: { serverId: string; serverName: string; connectAddress: string | null; map: string } | null
  /** Links the player shows on the profile (the Owner role). Absent or empty: nothing is shown. */
  links?: ProfileLink[] | null
  /** The respect count and whether the signed-in viewer gave one. Absent: no Respect button. */
  respect?: { count: number; given: boolean } | null
  /** A short message from the player (the Owner). Absent: no message card. */
  message?: string | null
  /** The team shown on the Owner's profile (staff with their roles). Absent or empty: no team card. */
  team?: { steamId: string; username: string; avatar: string; role: string }[] | null
  /** The latest community updates for the Owner's profile. Absent or empty: no updates card. */
  updates?: { id: string; title: string; at: string }[] | null
}

export const profileOverviewService = {
  async get(userId: string, options?: CallOptions): Promise<ProfileOverview> {
    return get<ProfileOverview>(`/api/v1/profile/${encodeURIComponent(userId)}/overview`, undefined, options)
  },

  /** Give (`true`) or take back (`false`) respect for a profile; answers with the new count. */
  async setRespect(userId: string, give: boolean, options?: CallOptions): Promise<{ count: number; given: boolean }> {
    const path = `/api/v1/profile/${encodeURIComponent(userId)}/respect`
    return give ? post<{ count: number; given: boolean }>(path, undefined, options) : del<{ count: number; given: boolean }>(path, options)
  },

  /** "What others can see": sends the sections to hide; saved immediately. */
  async setHidden(hidden: ProfileSection[], options?: CallOptions): Promise<void> {
    await put<unknown>("/api/v1/profile/me", { hiddenSections: hidden }, options)
  },
}
