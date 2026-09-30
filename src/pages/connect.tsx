import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Check, Copy, MapPin, Play, RotateCcw, Users } from "lucide-react"

import { playService, type PlayServer } from "@/api/play"
import { serversService } from "@/api/servers"
import type { ServerInfo } from "@/api/types"
import { copyText } from "@/components/profile-ids"
import { Skeleton } from "@/components/ui/skeleton"
import { cs2MapArtwork, cs2MapLabel } from "@/lib/cs2-map-art"
import { cn } from "@/lib/utils"

// LEGACY-X connect route (the Discord bot's "Server-т орох" button and the site's Connect links): resolve only an
// allowlisted public server ID through the Root API, never a raw address from a URL.
const SERVER_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{1,63}$/i
const CONNECT_ADDRESS_PATTERN = /^[a-zA-Z0-9.-]+:\d{1,5}$/

interface ServerDetails {
  name: string
  map: string
  modeLabel: string
  players: number
  maxPlayers: number
  status: "live" | "warmup" | "waiting" | "online" | "full" | "offline"
  score: { t: number; ct: number } | null
  address: string
}

const MODE_LABELS: Record<string, string> = { "5x5": "5x5 Matches", competitive_5v5: "5x5 Matches", fun: "Fun Mode", proleague: "Pro League", pro: "Pro League" }
const STATUS_LABELS: Record<ServerDetails["status"], string> = { live: "Live", warmup: "Warmup", waiting: "Waiting for players", online: "Online", full: "Full", offline: "Offline" }

function details(server: ServerInfo | PlayServer): ServerDetails {
  const address = server.connectAddress?.trim() ?? ""
  if (!CONNECT_ADDRESS_PATTERN.test(address)) throw new Error("This server does not expose a valid connection address.")
  const play = "modeLabel" in server ? server : null
  return {
    name: server.name,
    map: server.map,
    modeLabel: play?.modeLabel || MODE_LABELS[server.mode] || "",
    players: server.players,
    maxPlayers: server.maxPlayers,
    status: server.status,
    score: play?.score ?? null,
    address,
  }
}

/**
 * The public server record first; failing that, the live Play lists (the Discord bot's server board
 * links those IDs). Either way the address comes from the API, never from the link.
 */
async function resolveServer(serverId: string): Promise<ServerDetails> {
  try {
    return details(await serversService.getServer(serverId))
  } catch (error) {
    const lists = await Promise.allSettled((["5x5", "fun", "pro"] as const).map((mode) => playService.getServers(mode)))
    const match = lists.flatMap((list) => (list.status === "fulfilled" ? list.value.servers : [])).find((server) => server.id === serverId)
    if (match) return details(match)
    throw error
  }
}

type ConnectState = { status: "loading" } | { status: "error"; message: string } | { status: "ready"; server: ServerDetails }

const steamLink = (address: string) => `steam://connect/${address}`

export function ConnectPage() {
  const [params] = useSearchParams()
  const [state, setState] = useState<ConnectState>({ status: "loading" })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const serverId = params.get("server")?.trim() ?? ""
    if (!SERVER_ID_PATTERN.test(serverId)) {
      setState({ status: "error", message: "This server link is not valid." })
      return
    }

    let active = true
    let opener: number | undefined
    setState({ status: "loading" })
    void resolveServer(serverId)
      .then((server) => {
        if (!active) return
        setState({ status: "ready", server })
        // Steam opens by itself when the server is up; the Join button below covers a browser that blocks it.
        if (server.status !== "offline") opener = window.setTimeout(() => { if (active) window.location.assign(steamLink(server.address)) }, 900)
      })
      .catch((error: unknown) => {
        if (!active) return
        setState({ status: "error", message: error instanceof Error ? error.message : "The server is unavailable right now." })
      })

    return () => {
      active = false
      window.clearTimeout(opener)
    }
  }, [params, attempt])

  return (
    <div className="flex min-h-[calc(100dvh-5rem)] items-center justify-center p-6">
      {state.status === "loading" && <ConnectSkeleton />}
      {state.status === "ready" && <ServerCard server={state.server} />}
      {state.status === "error" && (
        <div className="flex max-w-sm flex-col items-center gap-3 text-center">
          <p className="text-sm text-[var(--text-dim)]">{state.message}</p>
          <button type="button" onClick={() => setAttempt((count) => count + 1)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--line)] px-3.5 text-[13px] font-medium text-[var(--text)] transition-colors hover:border-[var(--line-strong)] hover:bg-[var(--raised)]">
            <RotateCcw className="size-3.5" />
            Retry
          </button>
        </div>
      )}
    </div>
  )
}

function ConnectSkeleton() {
  return (
    <div aria-hidden="true" className="w-full max-w-[460px] overflow-hidden rounded-xl border border-[var(--glass-line)] bg-[var(--glass-fill)]">
      <Skeleton className="h-36 rounded-none bg-[var(--raised)]" />
      <div className="flex flex-col gap-3 p-5">
        <Skeleton className="h-6 w-56 rounded-full bg-[var(--line-strong)]" />
        <Skeleton className="h-3.5 w-40 rounded-full bg-[var(--line-soft)]" />
        <Skeleton className="mt-2 h-11 rounded-lg bg-[var(--line-soft)]" />
        <Skeleton className="h-10 rounded-lg bg-[var(--line-soft)]" />
      </div>
    </div>
  )
}

function ServerCard({ server }: { server: ServerDetails }) {
  const [copied, setCopied] = useState(false)
  const art = cs2MapArtwork(server.map)
  const offline = server.status === "offline"
  const live = server.status === "live" || server.status === "warmup" || server.status === "online"

  const copy = async () => {
    if (!(await copyText(server.address, "Server IP"))) return
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <section aria-label={server.name} className="lx-swap-in w-full max-w-[460px] overflow-hidden rounded-xl border border-[var(--glass-line)] bg-[var(--glass-fill)]">
      <div className="relative h-36 overflow-hidden bg-[var(--raised)]">
        {art && <img src={art} alt="" className="size-full object-cover opacity-50" />}
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[var(--card-surface)] via-[var(--card-surface)]/30 to-transparent" />
        <span className="absolute left-4 top-4 inline-flex h-6 items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--panel)]/80 px-2.5 text-xs font-medium text-[var(--text-2)] backdrop-blur">
          <span className={cn("size-1.5 rounded-full", live ? "lx-live-dot bg-[var(--status-green)]" : "bg-[var(--text-faint)]")} />
          {STATUS_LABELS[server.status]}
        </span>
      </div>

      <div className="flex flex-col gap-4 p-5">
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-semibold leading-tight tracking-[-0.3px] text-[var(--text)]">{server.name}</h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-[var(--text-muted)]">
            <span className="inline-flex items-center gap-1.5"><MapPin className="size-3.5" />{cs2MapLabel(server.map)}</span>
            <span className="inline-flex items-center gap-1.5"><Users className="size-3.5" />{server.players}/{server.maxPlayers} players</span>
            {server.modeLabel && <span>{server.modeLabel}</span>}
            {server.score && <span className="font-medium text-[var(--text)]">T {server.score.t} : {server.score.ct} CT</span>}
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--panel)]/60 p-1.5 pl-3">
          <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-[var(--text)]" title={server.address}>{server.address}</span>
          <button
            type="button"
            onClick={() => void copy()}
            aria-label="Copy server IP"
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-[var(--text-2)] transition-colors hover:bg-[var(--raised)] hover:text-[var(--text)]"
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied ? "Copied" : "Copy IP"}
          </button>
        </div>

        <a
          href={offline ? undefined : steamLink(server.address)}
          aria-disabled={offline}
          className={cn(
            "lx-primary-button inline-flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-semibold focus-visible:outline-none focus-visible:ring-2",
            offline && "pointer-events-none opacity-40",
          )}
        >
          <Play className="size-4 fill-current" />
          {offline ? "Server is offline" : "Join server"}
        </a>

        <p className="text-xs leading-[1.5] text-[var(--text-dim)]">
          {offline
            ? "This server is not answering right now. Try again in a moment."
            : <>Steam should open by itself. If it does not, press Join, or paste <span className="font-mono text-[var(--text-2)]">connect {server.address}</span> into the CS2 console.</>}
        </p>
      </div>
    </section>
  )
}
