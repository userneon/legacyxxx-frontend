import { get, type CallOptions } from "./client"

export type TeamRole = "Owner" | "Manager" | "Admin" | "Developer" | "Designer"

/** One member of the LEGACY-X team (backend GET /public/staff), Owner first. */
export interface TeamMember {
  steamId: string
  username: string
  avatar: string
  role: TeamRole
}

export const teamService = {
  list: (options?: CallOptions) => get<{ team: TeamMember[] }>("/api/v1/public/staff", undefined, options),
}
