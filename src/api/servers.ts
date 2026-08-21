import { get, type CallOptions } from "./client"
import type { HomeStats, ServerFilters, ServerInfo } from "./types"

/**
 * Servers service. Lists game servers, optionally filtered by mode/status,
 * and records a join intent.
 */
export const serversService = {
  async getServers(filters?: ServerFilters, options?: CallOptions): Promise<ServerInfo[]> {
    const response = await get<{ entries: ServerInfo[] }>(
      "/api/v1/public/servers",
      { mode: filters?.mode, status: filters?.status },
      { ...options, skipAuth: true },
    )
    return response.entries
  },

  async getServer(serverId: string, options?: CallOptions): Promise<ServerInfo> {
    const response = await get<{ server: ServerInfo }>(`/api/v1/public/servers/${serverId}`, undefined, { ...options, skipAuth: true })
    return response.server
  },

  async joinServer(serverId: string, options?: CallOptions): Promise<void> {
    const server = await this.getServer(serverId, options)
    if (!server.connectAddress) throw { status: 404, code: "not_found", message: "A connection address is not available for this server." }
    window.location.assign(`steam://connect/${server.connectAddress}`)
  },

  async getHomeStats(options?: CallOptions): Promise<HomeStats> {
    return get<HomeStats>("/api/v1/public/overview", undefined, { ...options, skipAuth: true })
  },
}
