import { get, post, type CallOptions } from "./client"
import type { HomeStats, QuickJoinResult, ReconnectMatch, ServerInfo, ServerLiveMatch, ServerModeKind } from "./types"

/** Live game servers from reconnect heartbeats, their live match snapshot, quick join and join intent. */
export const serversService = {
  async getServers(options?: CallOptions): Promise<ServerInfo[]> {
    const response = await get<{ entries: ServerInfo[] }>("/api/v1/public/servers", undefined, { ...options, skipAuth: true })
    return Array.isArray(response.entries) ? response.entries : []
  },

  async getServer(serverId: string, options?: CallOptions): Promise<ServerInfo> {
    const response = await get<{ server: ServerInfo }>(`/api/v1/public/servers/${serverId}`, undefined, { ...options, skipAuth: true })
    return response.server
  },

  async getLiveMatch(serverId: string, options?: CallOptions): Promise<ServerLiveMatch> {
    const response = await get<{ liveMatch: ServerLiveMatch }>(`/api/v1/public/servers/${serverId}/live-match`, undefined, { ...options, skipAuth: true })
    return response.liveMatch
  },

  async getMyReconnect(options?: CallOptions): Promise<ReconnectMatch | null> {
    const response = await get<{ reconnect: ReconnectMatch | null }>("/api/v1/reconnect/me", undefined, options)
    return response.reconnect
  },

  quickJoin(mode: Exclude<ServerModeKind, "other">, favouriteMaps: string[], options?: CallOptions): Promise<QuickJoinResult> {
    return get<QuickJoinResult>(`/api/v1/play/${mode}/quick-join`, { maps: favouriteMaps.join(",") || undefined }, { ...options, skipAuth: true })
  },

  /** Records the join intent (best effort), then hands the address to Steam. */
  connect(server: Pick<ServerInfo, "id" | "connectAddress">) {
    if (!server.connectAddress) return
    void post<void>(`/api/v1/public/servers/${encodeURIComponent(server.id)}/join`).catch(() => undefined)
    window.location.assign(`steam://connect/${server.connectAddress}`)
  },

  async getHomeStats(options?: CallOptions): Promise<HomeStats> {
    return get<HomeStats>("/api/v1/public/overview", undefined, { ...options, skipAuth: true })
  },
}
