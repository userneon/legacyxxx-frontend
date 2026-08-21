import { get, post, type CallOptions } from "./client"
import type {
  TournamentBracket,
  TournamentInfo,
  TournamentMatch,
  TournamentMatchStatus,
} from "./types"

/**
 * Tournaments service. Powers the Tournaments play page: the live/upcoming
 * match schedule, the playoff bracket, and clan registration.
 */
export const tournamentsService = {
  async getMatches(status?: TournamentMatchStatus, options?: CallOptions): Promise<TournamentMatch[]> {
    return get<TournamentMatch[]>("/api/v1/tournaments/matches", { status }, options)
  },

  async getMatch(matchId: string, options?: CallOptions): Promise<TournamentMatch> {
    return get<TournamentMatch>(`/api/v1/tournaments/matches/${matchId}`, undefined, options)
  },

  async getBracket(options?: CallOptions): Promise<TournamentBracket[]> {
    return get<TournamentBracket[]>("/api/v1/tournaments/bracket", undefined, options)
  },

  async getInfo(options?: CallOptions): Promise<TournamentInfo> {
    return get<TournamentInfo>("/api/v1/tournaments/info", undefined, options)
  },

  async registerClan(clanId: string, options?: CallOptions): Promise<void> {
    await post<void>("/api/v1/tournaments/register", { clanId }, options)
  },
}