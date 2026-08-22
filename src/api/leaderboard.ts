import { get, type CallOptions } from "./client"
import type { LeaderPlayer, LeaderboardFilters } from "./types"

interface PublicRankEntry {
  rank: number
  steam_id: string
  username: string
  matches_played: number
  kills: number
  deaths: number
  kd_ratio: number
  last_match_at: string | null
}

interface PublicExperienceEntry {
  steam_id: string
  level: number
  experience: number
}

/**
 * Leaderboard service. Thin wrapper dedicated to the Leaders page ranking.
 * Kept separate from `playersService` so leaderboard-only consumers have a
 * focused import surface.
 */
export const leaderboardService = {
  async getLeaderboard(filters?: LeaderboardFilters, options?: CallOptions): Promise<LeaderPlayer[]> {
    const [rankResponse, experienceResponse] = await Promise.all([
      get<{ entries: PublicRankEntry[] }>(
        "/api/v1/public/rank/leaderboard",
        { season: filters?.mode === "5vs5" ? undefined : undefined, limit: 100 },
        { ...options, skipAuth: true },
      ),
      get<{ entries: PublicExperienceEntry[] }>(
        "/api/v1/public/community/experience",
        { limit: 100 },
        { ...options, skipAuth: true },
      ),
    ])

    const experienceBySteamId = new Map(experienceResponse.entries.map((entry) => [entry.steam_id, entry]))
    return rankResponse.entries.map((entry) => {
      const progression = experienceBySteamId.get(entry.steam_id)
      return {
        steamId: entry.steam_id,
        rank: entry.rank,
        name: entry.username,
        level: progression?.level ?? 0,
        experience: progression?.experience ?? 0,
        kills: entry.kills,
        deaths: entry.deaths,
        kd: Number.isFinite(entry.kd_ratio) ? entry.kd_ratio : 0,
        headshots: 0,
        playedHours: 0,
        lastPlayed: entry.last_match_at ? new Date(entry.last_match_at).toLocaleDateString() : "—",
        avatar: entry.username.slice(0, 2).toUpperCase() || "LX",
        moderationStatus: "Clear" as const,
      }
    })
  },
}
