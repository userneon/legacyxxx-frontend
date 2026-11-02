import { del, get, put, type CallOptions } from "./client"

/** The kinds of server a role may work on; none picked means every kind. */
export type GameMode = "5x5" | "pro" | "fun"

export interface GameRoleSettings {
  commands: string[]
  extraFlags: string[]
  modes: GameMode[]
  immunity: number
}

/** An in-game role as the Owner sees it on the staff site (Staff → Roles). */
export interface GameRoleView extends GameRoleSettings {
  role: string
  label: string
  /** True when the Owner changed it from the built-in role. */
  changed: boolean
  updatedAt: string | null
  builtIn: GameRoleSettings
}

export interface GameCommandInfo {
  name: string
  group: string
  summary: string
  /** Shown but never grantable: it changes the server itself or the permissions. */
  locked: boolean
}

export interface GameRolesData {
  roles: GameRoleView[]
  commands: GameCommandInfo[]
  extraFlags: Array<{ flag: string; label: string }>
  modes: GameMode[]
}

export const gameRolesService = {
  /** Owner only. */
  list: (options?: CallOptions) => get<GameRolesData>("/api/v1/staff/game-roles", undefined, options),
  save: (role: string, settings: GameRoleSettings, options?: CallOptions) => put<GameRoleSettings & { role: string }>(`/api/v1/staff/game-roles/${encodeURIComponent(role)}`, settings, options),
  reset: (role: string, options?: CallOptions) => del<void>(`/api/v1/staff/game-roles/${encodeURIComponent(role)}`, options),
}
