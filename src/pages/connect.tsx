import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { LoaderCircle, ServerCrash } from "lucide-react"

import { serversService } from "@/api/servers"

// LEGACY-X Discord connect route: resolve only an allowlisted public server ID through Root API, never a raw address from a URL.
const SERVER_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{1,63}$/i
const CONNECT_ADDRESS_PATTERN = /^[a-zA-Z0-9.-]+:\d{1,5}$/

type ConnectState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; name: string; address: string }

export function ConnectPage() {
  const [params] = useSearchParams()
  const [state, setState] = useState<ConnectState>({ status: "loading" })

  useEffect(() => {
    const serverId = params.get("server")?.trim() ?? ""
    if (!SERVER_ID_PATTERN.test(serverId)) {
      setState({ status: "error", message: "This server link is not valid." })
      return
    }

    let active = true
    void serversService.getServer(serverId)
      .then((server) => {
        const address = server.connectAddress?.trim() ?? ""
        if (!CONNECT_ADDRESS_PATTERN.test(address)) throw new Error("This server does not expose a valid connection address.")
        if (!active) return
        setState({ status: "ready", name: server.name, address })
        window.setTimeout(() => { if (active) window.location.assign(`steam://connect/${address}`) }, 250)
      })
      .catch((error: unknown) => {
        if (!active) return
        setState({ status: "error", message: error instanceof Error ? error.message : "The server is unavailable right now." })
      })

    return () => { active = false }
  }, [params])

  return (
    <div className="flex min-h-[20rem] items-center justify-center p-6">
      {state.status === "loading" && <div className="text-center"><LoaderCircle className="mx-auto size-6 animate-spin text-chart-2" /><p className="mt-3 text-sm font-medium">Opening Steam…</p><p className="mt-1 text-xs text-muted-foreground">Checking the LEGACY-X server route.</p></div>}
      {state.status === "ready" && <div className="text-center"><LoaderCircle className="mx-auto size-6 animate-spin text-chart-2" /><p className="mt-3 text-sm font-medium">Connecting to {state.name}</p><p className="mt-1 font-mono text-xs text-muted-foreground">{state.address}</p></div>}
      {state.status === "error" && <div className="max-w-sm text-center"><ServerCrash className="mx-auto size-6 text-destructive" /><p className="mt-3 text-sm font-medium">Server connection unavailable</p><p className="mt-1 text-xs text-muted-foreground">{state.message}</p></div>}
    </div>
  )
}
