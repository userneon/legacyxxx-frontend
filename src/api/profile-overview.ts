import type { CreatorLinks, CreatorTier } from "./creators"
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
  expBefore?: number | null
  expAfter?: number
  /** The ranks the player stood at before and after this match (the API works them out; the site never does). */
  rankBefore?: { id: number; name: string; imageKey: string } | null
  rankAfter?: { id: number; name: string; imageKey: string } | null
  /** How the EXP was worked out; `limited` is set when the daily (×¼) or weekly (stopped) limit reduced the gain. */
  expBreakdown?: ExpBreakdown | null
}

/** The parts of one match's EXP change, as the API stored them (RANK-SYSTEM.md section 1). Any part can be missing on an older match. */
export interface ExpBreakdown {
  result?: number
  margin?: number
  performance?: number
  bonus?: number
  /** 2 while the player is still calibrating (their first ranked matches count double). */
  calibration?: 1 | 2
  limited?: "daily" | "weekly"
  /** Why the formula was not applied, when it was not. */
  rule?: "leaver" | "invalid_match" | "low_participation" | "fun_mode"
  mvp?: boolean
  shortHanded?: boolean
}

export interface ProfileOverview {
  /** 1, 2 or 3 for the top three Discord boosters (the Gold, Silver or Bronze booster frame), otherwise null. */
  boosterPlace?: 1 | 2 | 3 | null
  /** A paid in-game rank that is running (the Shop's Ranks): its tier ("tier1".."tier3") and name, otherwise null. */
  perk?: { tier: string; name: string } | null
  user: {
    id: string
    steamId: string
    username: string
    avatar: string
    role: UserProfile["role"]
    memberSince: string | null
    steamBackground: string | null
    steamMedia: UserProfile["steamMedia"]
    /** The avatar frame the player wears (id), if any. */
    frame?: string | null
    /** The profile banner the player wears (an effect key the site draws), if any. */
    banner?: string | null
    /** The title the player wears under their name, if any. */
    title?: string | null
    /** The player's number in the Genesis pack, if they bought it. */
    founder?: number | null
    /** The profile background worn (an item id) and the knobs its owner saved. */
    background?: { id: string; look: import("@/lib/backgrounds").BgLook | null } | null
    /** The settings of the Crystal Orb when that is the frame worn. */
    frameLook?: import("@/lib/frame-look").FrameLook | null
    /** The name colour and glow the player wears. */
    nameStyle?: { color: string | null; glow: string | null; colorFx?: string | null; glowFx?: string | null } | null
  }
  /** Set while the player has an active ban: the API sends no numbers then and the page draws its stat cards censored with "Banned". Null otherwise (lifting the ban brings everything back). */
  banned?: { permanent: boolean; expiresAt: string | null; reason: string | null; since: string | null } | null
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
  /** `average` is the community's (players with at least 5 ranked matches); `percentile` is the share of them this player beats. Both are null when there are too few players to say. */
  stats: { key: "matches" | "winRate" | "kd" | "hs" | "avgKills"; label: string; value: number; average?: number | null; percentile?: number | null }[] | null
  recentMatches: ProfileMatchRow[] | null
  maps: { map: string; matches: number; wins: number; winRate: number }[] | null
  penalties: PenaltyEntry[]
  penaltyCount: number
  loadout: { side: "t" | "ct"; items: { key: string; label: string; name: string | null; image: string | null }[] } | null
  staff: { role: string; description: string; penaltiesIssued: number } | null
  /** Content creator badge and channels (owner request 2026-10-12); null for everyone else. */
  creator?: { tier: CreatorTier; label: string; bio: string; links: CreatorLinks } | null
  presence: { serverId: string; serverName: string; connectAddress: string | null; map: string } | null
  /** The player linked Discord (only the fact is public). Absent from an older API: no mark. */
  discordLinked?: boolean
  /** The linked Discord account boosts the LEGACY-X Discord server right now (shows a Booster mark). Absent from an older API. */
  discordBoosting?: boolean
  /** The clan the player is in (absent when the clan feature is off). */
  clan?: { id: string; number?: number | null; name: string; tag: string; look?: import("@/api/types").ClanLook | null } | null
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

/** Compare → head to head (GET /compare/head-to-head): the ranked matches two players were both in. `hidden` when either hid their matches. */
export interface HeadToHead {
  hidden: boolean
  against?: { matches: number; aWins: number; bWins: number; draws: number; aKills: number; bKills: number }
  together?: { matches: number; wins: number; losses: number; draws: number }
  recent?: Array<{ matchId: string; map: string | null; at: string; together: boolean; outcome: "a" | "b" | "draw" | "win" | "loss"; aKills: number; bKills: number }>
}

export const compareService = {
  async headToHead(a: string, b: string, options?: CallOptions): Promise<HeadToHead> {
    return get<HeadToHead>("/api/v1/compare/head-to-head", { a, b }, options)
  },
}

/** What a player typed about their setup (Configs tab). Every part is optional; the API leaves empty ones out. */
export interface PlayerConfig {
  crosshair?: string
  mouse?: { model?: string; dpi?: number; sensitivity?: number; zoomSensitivity?: number; pollingRate?: number }
  keyboard?: { model?: string }
  monitor?: { resolution?: string; refreshRate?: number; aspect?: string }
  viewmodel?: { fov?: number; offsetX?: number; offsetY?: number; offsetZ?: number }
  other?: Array<{ label: string; value: string }>
}

export const profileOverviewService = {
  async getConfig(userId: string, options?: CallOptions): Promise<{ config: PlayerConfig | null; updatedAt: string | null }> {
    return get(`/api/v1/profile/${encodeURIComponent(userId)}/config`, undefined, options)
  },

  async saveConfig(config: PlayerConfig, options?: CallOptions): Promise<{ config: PlayerConfig | null }> {
    return put("/api/v1/profile/me/config", config, options)
  },

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
