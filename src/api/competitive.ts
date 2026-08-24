import { get, type CallOptions } from "./client"
import type { CompetitiveAccess, CompetitiveLeaderboardEntry, CompetitiveProfile } from "./types"

/** Competitive state is read-only in the browser; gameplay servers alone mutate EXP. */
export const competitiveService = {
  async getLeaderboard(options?: CallOptions): Promise<CompetitiveLeaderboardEntry[]> {
    const response = await get<{ entries?: CompetitiveLeaderboardEntry[] }>("/api/v1/public/competitive/leaderboard", undefined, options)
    return Array.isArray(response.entries) ? response.entries : []
  },
  async getPlayer(userId: string, options?: CallOptions): Promise<CompetitiveProfile> {
    const response = await get<CompetitiveProfile | { profile: CompetitiveProfile }>(`/api/v1/public/competitive/players/${userId}`, undefined, options)
    return "profile" in response ? response.profile : response
  },
  async getMyAccess(options?: CallOptions): Promise<CompetitiveAccess> {
    return get<CompetitiveAccess>("/api/v1/competitive/me/access", undefined, options)
  },
}
