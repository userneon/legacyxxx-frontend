import { get, post, type CallOptions } from "./client"
import type { MatchFilters, MatchInfo, PlaySubMode } from "./types"

/**
 * Play service. Powers the play pages (5vs5, fun, pro league) by listing
 * active matches for a given mode and recording join/favorite actions.
 */
export const playService = {
  async getMatches(filters?: MatchFilters, options?: CallOptions): Promise<MatchInfo[]> {
    return get<MatchInfo[]>(
      "/api/v1/play/matches",
      { mode: filters?.mode, status: filters?.status },
      options,
    )
  },

  async getMatchesByMode(mode: PlaySubMode, options?: CallOptions): Promise<MatchInfo[]> {
    return get<MatchInfo[]>("/api/v1/play/matches", { mode }, options)
  },

  async getMatch(matchId: string, options?: CallOptions): Promise<MatchInfo> {
    return get<MatchInfo>(`/api/v1/play/matches/${matchId}`, undefined, options)
  },

  async joinMatch(matchId: string, options?: CallOptions): Promise<void> {
    await post<void>(`/api/v1/play/matches/${matchId}/join`, undefined, options)
  },

  async toggleFavorite(matchId: string, favorite: boolean, options?: CallOptions): Promise<MatchInfo> {
    return post<MatchInfo>(`/api/v1/play/matches/${matchId}/favorite`, { favorite }, options)
  },
}