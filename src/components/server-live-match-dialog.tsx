/**
 * LEGACY-X Server Info: compact neutral liquid glass with map-specific
 * atmosphere. Score, roster, and timestamps are Root API data only; absent
 * plugin fields (rank, ADR, ping, spectators) are intentionally not invented.
 */
import { Map, RadioTower, RefreshCw, Users } from "lucide-react"

import { serversService } from "@/api"
import type { ServerInfo, ServerLiveMatchPlayer } from "@/api/types"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CompetitiveRankBadge } from "@/components/competitive-rank-badge"
import { useApiQuery } from "@/hooks/use-api-query"
import { cs2MapArtwork, cs2MapLabel } from "@/lib/cs2-map-art"

const TEAM_ART = {
  t: "/manus-storage/t_transparent_edb1dce1.webp",
  ct: "/manus-storage/ct_transparent_5b320ee6.webp",
} as const

const MAP_BADGES: Record<string, string> = {
  de_nuke: "/manus-storage/de_nuke_4c27eb7a.png",
  de_inferno: "/manus-storage/de_inferno_cc791279.png",
  de_cache: "/manus-storage/de_cache_c94f2356.png",
  de_anubis: "/manus-storage/de_anubis_f0fcbf9a.png",
  de_ancient: "/manus-storage/de_ancient_ffb0c1b6.webp",
  de_dust2: "/manus-storage/de_dust2_5d8eb039.webp",
  de_train: "/manus-storage/de_train_0b8e8f02.png",
  de_overpass: "/manus-storage/de_overpass_c8d74d6e.png",
}

const MAP_PALETTES: Record<string, { surface: string; overlay: string; badge: string; score: string; panel: string }> = {
  de_nuke: { surface: "border-cyan-200/20 bg-slate-950/70 shadow-cyan-950/35", overlay: "bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,0.18),transparent_52%),linear-gradient(180deg,rgba(8,47,73,0.24),rgba(2,6,23,0.86))]", badge: "border-cyan-200/25 bg-cyan-200/[0.1]", score: "border-cyan-200/18 bg-cyan-200/[0.06]", panel: "border-cyan-100/[0.09]" },
  de_inferno: { surface: "border-orange-200/20 bg-stone-950/70 shadow-orange-950/35", overlay: "bg-[radial-gradient(circle_at_50%_0%,rgba(251,146,60,0.2),transparent_52%),linear-gradient(180deg,rgba(120,53,15,0.26),rgba(28,25,23,0.88))]", badge: "border-orange-200/25 bg-orange-200/[0.1]", score: "border-orange-200/18 bg-orange-200/[0.06]", panel: "border-orange-100/[0.09]" },
  de_anubis: { surface: "border-amber-200/20 bg-[#211b12]/75 shadow-amber-950/35", overlay: "bg-[radial-gradient(circle_at_50%_0%,rgba(251,191,36,0.2),transparent_52%),linear-gradient(180deg,rgba(120,83,20,0.24),rgba(28,25,23,0.9))]", badge: "border-amber-200/25 bg-amber-200/[0.1]", score: "border-amber-200/18 bg-amber-200/[0.06]", panel: "border-amber-100/[0.09]" },
  de_ancient: { surface: "border-teal-200/20 bg-[#0b1f1c]/75 shadow-teal-950/35", overlay: "bg-[radial-gradient(circle_at_50%_0%,rgba(45,212,191,0.18),transparent_52%),linear-gradient(180deg,rgba(15,118,110,0.2),rgba(2,18,15,0.9))]", badge: "border-teal-200/25 bg-teal-200/[0.1]", score: "border-teal-200/18 bg-teal-200/[0.06]", panel: "border-teal-100/[0.09]" },
}

const DEFAULT_PALETTE = MAP_PALETTES.de_nuke

function mapKey(value: string) {
  return value.trim().toLowerCase().replace(/^cs_/, "").replace(/[^a-z0-9]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "")
}

function PlayerList({ players, emptyLabel, side }: { players: ServerLiveMatchPlayer[]; emptyLabel: string; side?: "t" | "ct" }) {
  if (players.length === 0) return <p className="py-4 text-center text-xs leading-5 text-white/40">{emptyLabel}</p>

  const rowTone = side === "t"
    ? "border-amber-200/[0.12] bg-amber-200/[0.045]"
    : side === "ct"
      ? "border-sky-200/[0.12] bg-sky-200/[0.045]"
      : "border-white/[0.08] bg-black/15"

  return <ul className="mt-3 space-y-1.5">
    {players.map((player) => <li key={player.steamId} className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-sm text-white/85 ${rowTone}`}>
      <span className={player.connected ? "size-1.5 rounded-full bg-emerald-300" : "size-1.5 rounded-full bg-white/25"} />
      <span className="min-w-0 flex-1 truncate">{player.name}</span>
      {player.rankId !== null && <CompetitiveRankBadge rankId={player.rankId} rankName={player.rankName} imageKey={player.rankImageKey} className="h-5 w-9" />}
      {player.adr !== null && <span className="shrink-0 text-[10px] tabular-nums text-white/50">{player.adr.toFixed(1)} ADR</span>}
      {player.ping !== null && <span title={`Ping: ${player.ping} ms`} className="shrink-0 cursor-help text-[10px] tabular-nums text-white/60">{player.ping}ms</span>}
    </li>)}
  </ul>
}

function TeamPanel({ side, title, players, mapTone }: { side: "t" | "ct"; title: string; players: ServerLiveMatchPlayer[]; mapTone: string }) {
  const teamTone = side === "t" ? "border-amber-200/[0.2] bg-amber-200/[0.06]" : "border-sky-200/[0.2] bg-sky-200/[0.06]"
  const labelTone = side === "t" ? "text-amber-100" : "text-sky-100"

  return <section className={`rounded-xl border p-3 backdrop-blur-sm ${teamTone} ${mapTone}`}>
    <div className="flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <img src={TEAM_ART[side]} alt="" className="size-7 object-contain" />
        <h3 className={`truncate text-[11px] font-bold tracking-[0.14em] ${labelTone}`}>{title}</h3>
      </div>
      <span className="text-xs tabular-nums text-white/45">{players.length}</span>
    </div>
    <PlayerList players={players} emptyLabel="No live team snapshot received." side={side} />
  </section>
}

export function ServerLiveMatchDialog({ server, open, onOpenChange }: { server: ServerInfo; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data: liveMatch, loading, error, refetch } = useApiQuery(
    (signal) => serversService.getLiveMatch(server.id, { signal }),
    { enabled: open, queryKey: `server-live-match:${server.id}` },
  )
  const map = liveMatch?.map ?? server.map
  const background = cs2MapArtwork(map)
  const badge = MAP_BADGES[mapKey(map)]
  const palette = MAP_PALETTES[mapKey(map)] ?? DEFAULT_PALETTE
  const hasScore = Boolean(liveMatch?.score)

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent overlayClassName="bg-transparent backdrop-blur-sm" className={`w-[calc(100vw-2rem)] max-w-2xl gap-0 overflow-hidden p-0 text-white shadow-2xl backdrop-blur-2xl sm:max-w-2xl ${palette.surface}`} showCloseButton>
      <div className="relative isolate max-h-[min(680px,calc(100dvh-5rem))] overflow-y-auto px-4 pb-4 pt-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:px-5 sm:pb-5">
        {background && <img src={background} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover opacity-[0.13]" />}
        <div className={`pointer-events-none absolute inset-0 -z-10 ${palette.overlay}`} />
        <button type="button" onClick={refetch} disabled={loading} className={`absolute left-4 top-4 z-10 inline-flex size-8 items-center justify-center rounded-lg border text-white/85 shadow-lg shadow-black/20 transition-colors hover:bg-white/[0.16] disabled:cursor-wait disabled:opacity-65 sm:left-5 ${palette.badge}`} aria-label={`Refresh ${server.name} live match data`} title="Refresh live match data">
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
        <DialogHeader className="items-center text-center sm:items-center sm:text-center">
          <div className={`mb-1.5 flex size-12 items-center justify-center rounded-xl border shadow-lg shadow-black/20 backdrop-blur-md ${palette.badge}`}>
            {badge ? <img src={badge} alt={`${cs2MapLabel(map)} map badge`} className="size-9 object-contain drop-shadow-[0_0_14px_rgba(255,255,255,0.35)]" /> : <Map className="size-6 text-white/85" />}
          </div>
          <DialogTitle className="text-lg tracking-tight text-white">{server.name}</DialogTitle>
          <DialogDescription className="text-xs text-white/55">{cs2MapLabel(map)} · {liveMatch?.mode ?? server.mode}</DialogDescription>
        </DialogHeader>

        {loading && <div className="py-14 text-center text-sm text-white/55">Loading live server data…</div>}
        {error && <div className="mt-5 rounded-xl border border-red-300/20 bg-red-300/[0.08] p-4 text-center text-sm text-red-100">Live match data could not be loaded. <button type="button" onClick={refetch} className="ml-1 underline underline-offset-2">Try again</button></div>}
        {!loading && !error && liveMatch && <div className="mt-4 space-y-3">
          <section className={`rounded-2xl border px-4 py-3 text-center backdrop-blur-md ${palette.score}`}>
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">Current round</div>
            <div className="mt-1 flex items-center justify-center gap-3"><span className="text-2xl font-black tabular-nums text-amber-100">{hasScore ? liveMatch.score!.t : "—"}</span><span className="text-xs font-bold tracking-[0.2em] text-white/45">VS</span><span className="text-2xl font-black tabular-nums text-sky-100">{hasScore ? liveMatch.score!.ct : "—"}</span></div>
            <div className="mt-1 text-xs text-white/55">{liveMatch.round === null ? "Round information has not been received." : `Round ${liveMatch.round}`}</div>
          </section>
          {liveMatch.availability === "live_snapshot"
            ? <div className="grid gap-3 sm:grid-cols-2"><TeamPanel side="t" title="TERRORIST" players={liveMatch.teams.t} mapTone={palette.panel} /><TeamPanel side="ct" title="COUNTER-TERRORIST" players={liveMatch.teams.ct} mapTone={palette.panel} /></div>
            : <section className={`rounded-xl border bg-black/20 p-4 ${palette.panel}`}><div className="flex items-center gap-2 text-sm font-semibold text-white/85"><Users className="size-4 text-white/65" />Connected players</div><p className="mt-1 text-xs leading-5 text-white/45">Team and score snapshots have not been received from this server yet.</p><PlayerList players={liveMatch.connectedPlayers} emptyLabel="No current player snapshot received." /></section>}
          {liveMatch.availability === "live_snapshot" && liveMatch.spectators.length > 0 && <section className={`rounded-xl border bg-black/20 p-3 ${palette.panel}`}><div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2 text-[11px] font-bold tracking-[0.14em] text-white/80"><Users className="size-3.5 text-white/60" />SPECTATORS</div><span className="text-xs tabular-nums text-white/45">{liveMatch.spectators.length}</span></div><PlayerList players={liveMatch.spectators} emptyLabel="" /></section>}
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-white/40"><RadioTower className="size-3" />{liveMatch.updatedAt ? `Updated ${new Date(liveMatch.updatedAt).toLocaleTimeString()}` : "Waiting for a server heartbeat"}</div>
        </div>}
      </div>
    </DialogContent>
  </Dialog>
}
