import { get, type CallOptions } from "./client"
import type { MatchDetail } from "./types"

/** Public MatchZy match details: rosters, per-player stats and the round timeline. */
export const matchesService = {
  async getMatchDetail(matchId: string, mapNumber: number, options?: CallOptions): Promise<MatchDetail> {
    return get<MatchDetail>(`/api/v1/public/matches/${encodeURIComponent(matchId)}/maps/${mapNumber}`, undefined, options)
  },
}
