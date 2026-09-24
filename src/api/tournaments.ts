import { del, get, post, type CallOptions } from "./client"

/**
 * Tournaments service: player-based registration (solo, own team, or joining a team), check-in
 * and the event page (overview, bracket, players, matches). Contract: backend tournaments.ts.
 */
export type TournamentPhase = "registration" | "upcoming" | "live" | "finished"
export type TournamentMatchStatus = "live" | "upcoming" | "completed"

export interface TournamentSummary {
  id: string
  name: string
  description: string | null
  phase: TournamentPhase
  format: string | null
  prizePool: string | null
  startsAt: string | null
  registrationClosesAt: string | null
  checkInOpensAt: string | null
  nextMatchTime: string | null
  maxPlayers: number | null
  teamSize: number
  registeredPlayers: number
}

export interface PastTournament {
  id: string
  name: string
  startsAt: string | null
  winner: string | null
}

export interface TournamentPlayer {
  userId: string
  steamId: string | null
  name: string
  avatar: string
  checkedIn: boolean
  mode: "solo" | "team"
}

export interface TournamentTeam {
  id: string
  name: string
  captainUserId: string | null
  seed: number | null
  autoBalanced: boolean
  players: TournamentPlayer[]
}

export type TournamentTeamRef = { id: string; name: string } | null

export interface TournamentMatch {
  id: string
  round: string
  bracketOrder: number
  teamA: TournamentTeamRef
  teamB: TournamentTeamRef
  scoreA: number | null
  scoreB: number | null
  winnerTeamId: string | null
  status: TournamentMatchStatus
  scheduledTime: string | null
  map: string | null
  server: { id: string; name: string; connectAddress: string | null } | null
}

export interface TournamentViewer {
  registered: boolean
  mode: "solo" | "team" | null
  teamId: string | null
  isCaptain: boolean
  checkedInAt: string | null
  nextMatch: (TournamentMatch & { opponent: TournamentTeamRef }) | null
}

export interface TournamentDetail extends TournamentSummary {
  checkInOpen: boolean
  winner: { id: string; name: string } | null
  teams: TournamentTeam[]
  soloPlayers: TournamentPlayer[]
  matches: TournamentMatch[]
  bracket: { round: string; matches: TournamentMatch[] }[]
  /** null for guests. */
  me: TournamentViewer | null
}

export type TournamentRegistration = { mode: "solo" } | { mode: "team"; teamName: string } | { mode: "join"; teamId: string }

export const tournamentsService = {
  async list(options?: CallOptions): Promise<{ current: TournamentSummary | null; past: PastTournament[] }> {
    const response = await get<{ current?: TournamentSummary | null; past?: PastTournament[] }>("/api/v1/tournaments", undefined, options)
    return { current: response.current ?? null, past: Array.isArray(response.past) ? response.past : [] }
  },

  async get(tournamentId: string, options?: CallOptions): Promise<TournamentDetail> {
    return get<TournamentDetail>(`/api/v1/tournaments/${encodeURIComponent(tournamentId)}`, undefined, options)
  },

  async register(tournamentId: string, registration: TournamentRegistration, options?: CallOptions): Promise<TournamentDetail> {
    return post<TournamentDetail>(`/api/v1/tournaments/${encodeURIComponent(tournamentId)}/register`, registration, options)
  },

  async leave(tournamentId: string, options?: CallOptions): Promise<void> {
    await del<void>(`/api/v1/tournaments/${encodeURIComponent(tournamentId)}/register`, options)
  },

  async checkIn(tournamentId: string, options?: CallOptions): Promise<TournamentDetail> {
    return post<TournamentDetail>(`/api/v1/tournaments/${encodeURIComponent(tournamentId)}/check-in`, {}, options)
  },
}
