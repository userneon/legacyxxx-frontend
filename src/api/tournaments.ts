import { del, get, post, type CallOptions } from "./client"
import type { TournamentDetail, TournamentsOverview } from "./types"

/** Tournaments with player-based registration: solo (auto-balanced by EXP) or as a team. */
export const tournamentsService = {
  getOverview(options?: CallOptions): Promise<TournamentsOverview> {
    return get<TournamentsOverview>("/api/v1/tournaments", undefined, options)
  },
  getTournament(tournamentId: string, options?: CallOptions): Promise<TournamentDetail> {
    return get<TournamentDetail>(`/api/v1/tournaments/${tournamentId}`, undefined, options)
  },
  registerSolo(tournamentId: string, options?: CallOptions) {
    return post<{ registered: true }>(`/api/v1/tournaments/${tournamentId}/register`, { mode: "solo" }, options)
  },
  registerTeam(tournamentId: string, teamName: string, options?: CallOptions) {
    return post<{ registered: true; teamId: string }>(`/api/v1/tournaments/${tournamentId}/register`, { mode: "team", teamName }, options)
  },
  joinTeam(tournamentId: string, teamId: string, options?: CallOptions) {
    return post<{ registered: true }>(`/api/v1/tournaments/${tournamentId}/teams/${teamId}/join`, undefined, options)
  },
  checkIn(tournamentId: string, options?: CallOptions) {
    return post<{ checkedIn: true }>(`/api/v1/tournaments/${tournamentId}/check-in`, undefined, options)
  },
  leave(tournamentId: string, options?: CallOptions) {
    return del<void>(`/api/v1/tournaments/${tournamentId}/registration`, options)
  },
}
