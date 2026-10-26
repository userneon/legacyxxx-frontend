import { get, type CallOptions } from "./client"

export type TeamRole = "Owner" | "Manager" | "Admin" | "Developer" | "Designer"

/** One member of the LEGACY-X team (backend GET /public/staff), Owner first. */
export interface TeamMember {
  steamId: string
  username: string
  avatar: string
  role: TeamRole
  /** When they joined the team (ISO), or null. */
  since?: string | null
  clanTag?: string | null
  rank?: { id: number; name: string; imageKey: string | null } | null
  /** Their ranked numbers; null before their first ranked match. */
  stats?: { matches: number; wins: number; kills: number; deaths: number } | null
}

export const teamService = {
  list: (options?: CallOptions) => get<{ team: TeamMember[] }>("/api/v1/public/staff", undefined, options),
}
