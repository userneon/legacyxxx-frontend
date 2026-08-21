import { get, type CallOptions } from "./client"
import type { LeaderPlayer, LeaderboardFilters } from "./types"

/**
 * Players service. Provides player lookups and the global leaderboard used
 * by the Leaders page.
 */
export const playersService = {
  async getPlayer(playerId: string, options?: CallOptions): Promise<LeaderPlayer> {
    return get<LeaderPlayer>(`/players/${playerId}`, undefined, options)
  },

  async getLeaderboard(filters?: LeaderboardFilters, options?: CallOptions): Promise<LeaderPlayer[]> {
    return get<LeaderPlayer[]>(
      "/players/leaderboard",
      { mode: filters?.mode, region: filters?.region },
      options,
    )
  },
}
