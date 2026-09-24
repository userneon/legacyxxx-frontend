import { get, type CallOptions } from "./client"
import type { CompetitiveAccess, CompetitiveLeaderboard, CompetitiveLeaderboardEntry, CompetitiveProfile, LeaderboardSort, RankedMatch, RankedMatchDetail } from "./types"

/** Postgres numerics can arrive as strings, so ratios are coerced before anyone formats them. */
function toNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function normalizeEntry(entry: CompetitiveLeaderboardEntry): CompetitiveLeaderboardEntry {
  return { ...entry, kd_ratio: toNumber(entry.kd_ratio), win_rate: toNumber(entry.win_rate), played_hours: toNumber(entry.played_hours) }
}

/** Competitive state is read-only in the browser; the API alone calculates and applies EXP. */
export const competitiveService = {
  async getLeaderboard(params: { sort?: LeaderboardSort; query?: string; limit?: number } = {}, options?: CallOptions): Promise<CompetitiveLeaderboard> {
    const response = await get<Partial<CompetitiveLeaderboard>>(
      "/api/v1/public/competitive/leaderboard",
      { sort: params.sort, q: params.query || undefined, limit: params.limit },
      options,
    )
    return {
      sort: response.sort ?? params.sort ?? "exp",
      minimumMatches: response.minimumMatches ?? 0,
      entries: Array.isArray(response.entries) ? response.entries.map(normalizeEntry) : [],
      viewer: response.viewer ? normalizeEntry(response.viewer) : null,
    }
  },
  async getPlayer(userId: string, options?: CallOptions): Promise<CompetitiveProfile> {
    const response = await get<CompetitiveProfile | { profile: CompetitiveProfile }>(`/api/v1/public/competitive/players/${userId}`, undefined, options)
    return "profile" in response ? response.profile : response
  },
  async getPlayerMatches(userId: string, limit = 20, options?: CallOptions): Promise<{ hidden: boolean; entries: RankedMatch[] }> {
    const response = await get<{ hidden?: boolean; entries?: RankedMatch[] }>(`/api/v1/public/competitive/players/${userId}/matches`, { limit }, options)
    return { hidden: Boolean(response.hidden), entries: Array.isArray(response.entries) ? response.entries : [] }
  },
  async getRankedMatch(matchId: string, options?: CallOptions): Promise<RankedMatchDetail> {
    return get<RankedMatchDetail>(`/api/v1/public/ranked-matches/${matchId}`, undefined, options)
  },
  async getMyAccess(options?: CallOptions): Promise<CompetitiveAccess> {
    return get<CompetitiveAccess>("/api/v1/competitive/me/access", undefined, options)
  },
}
