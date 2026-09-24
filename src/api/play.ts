import { get, type CallOptions } from "./client"

/**
 * Play service: the live server list per play page and Quick join, both built from the game
 * servers' plugin heartbeats (backend play.ts). Public — guests can browse and connect.
 */
export type PlayMode = "5x5" | "fun" | "pro"
export type PlayServerStatus = "waiting" | "warmup" | "live" | "full" | "offline"

export interface PlayServer {
  id: string
  name: string
  map: string
  mode: PlayMode
  modeLabel: string
  players: number
  maxPlayers: number
  status: PlayServerStatus
  round: number | null
  score: { t: number; ct: number } | null
  connectAddress: string | null
  gotvAddress: string | null
  joinable: boolean
}

export interface PlayServerList {
  mode: PlayMode
  players: number
  onlineServers: number
  servers: PlayServer[]
}

export const playService = {
  async getServers(mode: PlayMode, options?: CallOptions): Promise<PlayServerList> {
    const response = await get<Partial<PlayServerList>>(`/api/v1/play/${mode}/servers`, undefined, { ...options, skipAuth: true })
    return {
      mode,
      players: Number(response.players) || 0,
      onlineServers: Number(response.onlineServers) || 0,
      servers: Array.isArray(response.servers) ? response.servers : [],
    }
  },

  async quickJoin(mode: PlayMode, favouriteMaps: string[], options?: CallOptions): Promise<PlayServer | null> {
    const response = await get<{ server?: PlayServer | null }>(`/api/v1/play/${mode}/quick-join`, favouriteMaps.length ? { maps: favouriteMaps.join(",") } : undefined, { ...options, skipAuth: true })
    return response.server ?? null
  },
}
