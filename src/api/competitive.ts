import { get, type CallOptions } from "./client"
import type { CompetitiveAccess, CompetitiveLeaderboardEntry, CompetitiveProfile } from "./types"

/** Postgres numerics can arrive as strings, so ratios are coerced before anyone formats them. */
function toNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

/** Competitive state is read-only in the browser; gameplay servers alone mutate EXP. */
export const competitiveService = {
  async getLeaderboard(options?: CallOptions): Promise<CompetitiveLeaderboardEntry[]> {
    const response = await get<{ entries?: CompetitiveLeaderboardEntry[] }>("/api/v1/public/competitive/leaderboard", undefined, options)
    if (!Array.isArray(response.entries)) return []
    return response.entries.map(entry => ({ ...entry, kd_ratio: toNumber(entry.kd_ratio), played_hours: toNumber(entry.played_hours) }))
  },
  async getPlayer(userId: string, options?: CallOptions): Promise<CompetitiveProfile> {
    const response = await get<CompetitiveProfile | { profile: CompetitiveProfile }>(`/api/v1/public/competitive/players/${userId}`, undefined, options)
    return "profile" in response ? response.profile : response
  },
  async getMyAccess(options?: CallOptions): Promise<CompetitiveAccess> {
    return get<CompetitiveAccess>("/api/v1/competitive/me/access", undefined, options)
  },
}
