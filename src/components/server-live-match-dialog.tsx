/**
 * LEGACY-X server roster: who is on a server right now, plus the live score when
 * the plugin has reported one. Plain flat panels on the standard dialog surface —
 * no map artwork or per-map theming. Absent plugin fields are never invented.
 */
import type { ReactNode } from "react"
import { RadioTower, RefreshCw, Users } from "lucide-react"

import { serversService } from "@/api"
import type { ServerInfo, ServerLiveMatchPlayer } from "@/api/types"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CompetitiveRankBadge } from "@/components/competitive-rank-badge"
import { MapIcon, SideIcon } from "@/components/cs2-icons"
import { useApiQuery } from "@/hooks/use-api-query"
import { cs2MapLabel } from "@/lib/cs2-map-art"
import { cn } from "@/lib/utils"

const SIDE = {
  t: { label: "Terrorist", text: "text-amber-200" },
  ct: { label: "Counter-Terrorist", text: "text-sky-200" },
} as const

function PlayerRow({ player }: { player: ServerLiveMatchPlayer }) {
  return (
    <li className="flex items-center gap-2 rounded-lg bg-white/[0.035] px-2.5 py-2 text-sm">
      <span
        title={player.connected ? "Connected" : "Disconnected"}
        className={cn("size-1.5 shrink-0 rounded-full", player.connected ? "bg-emerald-300" : "bg-white/25")}
      />
      <span className="min-w-0 flex-1 truncate text-white/85">{player.name}</span>
      {player.rankId !== null && <CompetitiveRankBadge rankId={player.rankId} rankName={player.rankName} imageKey={player.rankImageKey} className="h-5 w-9 shrink-0" />}
      {player.adr !== null && <span className="shrink-0 text-[11px] tabular-nums text-white/45">{player.adr.toFixed(0)} ADR</span>}
      {player.ping !== null && <span title="Ping" className="w-11 shrink-0 text-right text-[11px] tabular-nums text-white/45">{player.ping} ms</span>}
    </li>
  )
}

function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn("rounded-xl border border-white/[0.07] p-3", className)}>{children}</section>
}

function TeamPanel({ side, players }: { side: "t" | "ct"; players: ServerLiveMatchPlayer[] }) {
  const meta = SIDE[side]
  return (
    <Panel>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className={cn("flex min-w-0 items-center gap-2", meta.text)}>
          <SideIcon side={side} className="size-6" />
          <span className="sr-only">{meta.label}</span>
        </h3>
        <span className="text-xs tabular-nums text-muted-foreground">{players.length}</span>
      </div>
      {players.length === 0
        ? <p className="py-3 text-center text-xs text-muted-foreground">No players on this side.</p>
        : <ul className="stagger-in flex flex-col gap-1">{players.map((player) => <PlayerRow key={player.steamId} player={player} />)}</ul>}
    </Panel>
  )
}

export function ServerLiveMatchDialog({ server, open, onOpenChange }: { server: ServerInfo; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data: liveMatch, loading, error, refetch } = useApiQuery(
    (signal) => serversService.getLiveMatch(server.id, { signal }),
    { enabled: open, queryKey: `server-live-match:${server.id}` },
  )
  const map = liveMatch?.map ?? server.map
  const score = liveMatch?.score ?? null
  const hasSnapshot = liveMatch?.availability === "live_snapshot"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-xl gap-0 overflow-y-auto p-0 sm:max-w-xl">
        <div className="flex items-start gap-3 border-b border-white/[0.06] px-5 py-4 pr-14">
          <MapIcon map={map} className="mt-0.5 size-11" />
          <DialogHeader className="min-w-0 flex-1 items-start text-left">
            <DialogTitle className="truncate text-base">{server.name}</DialogTitle>
            <DialogDescription className="text-xs">
              {cs2MapLabel(map)} · {liveMatch?.mode ?? server.mode}
              {typeof liveMatch?.round === "number" ? ` · Round ${liveMatch.round}` : ""}
            </DialogDescription>
          </DialogHeader>
          <button
            type="button"
            onClick={refetch}
            disabled={loading}
            aria-label={`Refresh ${server.name} roster`}
            title="Refresh"
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-muted-foreground transition-colors hover:bg-white/[0.08] hover:text-foreground disabled:cursor-wait disabled:opacity-60"
          >
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
          </button>
        </div>

        <div className="px-5 py-4">
          {loading && !liveMatch ? (
            <div className="flex flex-col gap-2" aria-busy="true">
              {[0, 1, 2, 3, 4].map((index) => <div key={index} className="h-9 animate-pulse rounded-lg bg-white/[0.05]" />)}
            </div>
          ) : error || !liveMatch ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              The roster could not be loaded.{" "}
              <button type="button" onClick={refetch} className="underline underline-offset-2 hover:text-foreground">Try again</button>
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {score && (
                <div className="flex items-center justify-center gap-3 rounded-xl border border-white/[0.07] py-3">
                  <SideIcon side="t" className="size-8" />
                  <span className="text-2xl font-black tabular-nums text-amber-200">{score.t}</span>
                  <span className="text-sm font-bold text-white/25">:</span>
                  <span className="text-2xl font-black tabular-nums text-sky-200">{score.ct}</span>
                  <SideIcon side="ct" className="size-8" />
                </div>
              )}

              {hasSnapshot ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <TeamPanel side="t" players={liveMatch.teams.t} />
                  <TeamPanel side="ct" players={liveMatch.teams.ct} />
                </div>
              ) : (
                <Panel>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-white/70"><Users className="size-3.5" />Connected players</div>
                    <span className="text-xs tabular-nums text-muted-foreground">{liveMatch.connectedPlayers.length}</span>
                  </div>
                  {liveMatch.connectedPlayers.length === 0
                    ? <p className="py-6 text-center text-sm text-muted-foreground">Nobody is on this server right now.</p>
                    : <ul className="stagger-in flex flex-col gap-1">{liveMatch.connectedPlayers.map((player) => <PlayerRow key={player.steamId} player={player} />)}</ul>}
                  <p className="mt-2 text-[11px] leading-4 text-muted-foreground">Teams and score appear once the server plugin reports a live match.</p>
                </Panel>
              )}

              {hasSnapshot && liveMatch.spectators.length > 0 && (
                <Panel>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-white/70">Spectators</div>
                    <span className="text-xs tabular-nums text-muted-foreground">{liveMatch.spectators.length}</span>
                  </div>
                  <ul className="flex flex-col gap-1">{liveMatch.spectators.map((player) => <PlayerRow key={player.steamId} player={player} />)}</ul>
                </Panel>
              )}

              <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                <RadioTower className="size-3" />
                {liveMatch.updatedAt ? `Updated ${new Date(liveMatch.updatedAt).toLocaleTimeString()}` : "Waiting for a server report"}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
