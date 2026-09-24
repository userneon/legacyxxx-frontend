/**
 * One shared poll of the live server list (reconnect heartbeats), used by the sidebar online counts, the
 * Play pages and Home. Refreshes every 30s while the tab is visible.
 */
import { createContext, useContext, useMemo, type ReactNode } from "react"

import { serversService, type ApiError, type ServerInfo, type ServerModeKind } from "@/api"
import { useApiQuery } from "@/hooks/use-api-query"

interface LiveServersValue {
  servers: ServerInfo[]
  loading: boolean
  error: ApiError | null
  refetch: () => void
  /** Players on online servers per Play mode. */
  onlineByMode: Record<ServerModeKind, number>
}

const LiveServersContext = createContext<LiveServersValue | null>(null)

export function LiveServersProvider({ children }: { children: ReactNode }) {
  const { data, loading, error, refetch } = useApiQuery<ServerInfo[]>((signal) => serversService.getServers({ signal }), {
    pollMs: 30_000,
    keepPreviousData: true,
  })

  const value = useMemo<LiveServersValue>(() => {
    const servers = data ?? []
    const onlineByMode: Record<ServerModeKind, number> = { "5v5": 0, pro: 0, fun: 0, other: 0 }
    for (const server of servers) if (server.status !== "offline") onlineByMode[server.mode] += server.players
    return { servers, loading, error, refetch, onlineByMode }
  }, [data, loading, error, refetch])

  return <LiveServersContext.Provider value={value}>{children}</LiveServersContext.Provider>
}

export function useLiveServers(): LiveServersValue {
  const context = useContext(LiveServersContext)
  if (!context) throw new Error("useLiveServers must be used inside LiveServersProvider")
  return context
}
