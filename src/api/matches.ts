import { get, type CallOptions } from "./client"
import type { MatchDetail, MatchReplay } from "./types"

/** Public MatchZy match details: rosters, per-player stats and the round timeline. */
export const matchesService = {
  async getMatchDetail(matchId: string, mapNumber: number, options?: CallOptions): Promise<MatchDetail> {
    return get<MatchDetail>(`/api/v1/public/matches/${encodeURIComponent(matchId)}/maps/${mapNumber}`, undefined, options)
  },
  /** Player movement for every round of one map; 404 when the match has no replay. */
  async getMatchReplay(matchId: string, mapNumber: number, options?: CallOptions): Promise<MatchReplay> {
    return get<MatchReplay>(`/api/v1/public/matches/${encodeURIComponent(matchId)}/maps/${mapNumber}/replay`, undefined, options)
  },
}
