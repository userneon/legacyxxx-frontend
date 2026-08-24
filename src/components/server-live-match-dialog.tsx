/**
 * LEGACY-X live match modal: dark liquid glass, low-key map art, and only
 * Root API-provided roster/score data. No sample player or score data is rendered.
 */
import { Map, RadioTower, Users } from "lucide-react"

import { serversService } from "@/api"
import type { ServerInfo, ServerLiveMatchPlayer } from "@/api/types"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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

function mapKey(value: string) {
  return value.trim().toLowerCase().replace(/^cs_/, "").replace(/[^a-z0-9]+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "")
}

function PlayerList({ players, emptyLabel }: { players: ServerLiveMatchPlayer[]; emptyLabel: string }) {
  if (players.length === 0) return <p className="py-4 text-center text-xs leading-5 text-white/40">{emptyLabel}</p>
  return <ul className="mt-3 space-y-1.5">
    {players.map((player) => <li key={player.steamId} className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-black/15 px-2.5 py-2 text-sm text-white/85"><span className={player.connected ? "size-1.5 rounded-full bg-emerald-300" : "size-1.5 rounded-full bg-white/25"} /><span className="truncate">{player.name}</span></li>)}
  </ul>
}

function TeamPanel({ side, title, players }: { side: "t" | "ct"; title: string; players: ServerLiveMatchPlayer[] }) {
  return <section className="rounded-xl border border-white/[0.1] bg-black/20 p-3 backdrop-blur-sm">
    <div className="flex items-center justify-between gap-2"><div className="flex min-w-0 items-center gap-2"><img src={TEAM_ART[side]} alt="" className="size-7 object-contain" /><h3 className="truncate text-[11px] font-bold tracking-[0.14em] text-white/80">{title}</h3></div><span className="text-xs tabular-nums text-white/45">{players.length}</span></div>
    <PlayerList players={players} emptyLabel="No live team snapshot received." />
  </section>
}

export function ServerLiveMatchDialog({ server, open, onOpenChange }: { server: ServerInfo; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data: liveMatch, loading, error, refetch } = useApiQuery((signal) => serversService.getLiveMatch(server.id, { signal }), { enabled: open, queryKey: `server-live-match:${server.id}` })
  const map = liveMatch?.map ?? server.map
  const background = cs2MapArtwork(map)
  const badge = MAP_BADGES[mapKey(map)]
  const hasScore = Boolean(liveMatch?.score)

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent overlayClassName="bg-black/70 backdrop-blur-md" className="max-h-[min(760px,calc(100dvh-2rem))] max-w-3xl gap-0 overflow-y-auto border-white/[0.14] bg-[#111827]/65 p-0 text-white shadow-2xl shadow-black/60 backdrop-blur-2xl sm:max-w-3xl" showCloseButton>
      <div className="relative isolate overflow-hidden px-5 pb-5 pt-6 sm:px-7 sm:pb-7">
        {background && <img src={background} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover opacity-[0.13]" />}
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.09),transparent_50%),linear-gradient(180deg,rgba(3,7,18,0.22),rgba(3,7,18,0.82))]" />
        <DialogHeader className="items-center text-center sm:items-center sm:text-center"><div className="mb-2 flex size-16 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.1] shadow-lg shadow-black/20 backdrop-blur-md">{badge ? <img src={badge} alt={`${cs2MapLabel(map)} map badge`} className="size-12 object-contain drop-shadow-[0_0_14px_rgba(255,255,255,0.35)]" /> : <Map className="size-7 text-white/85" />}</div><DialogTitle className="text-xl tracking-tight text-white">{server.name}</DialogTitle><DialogDescription className="text-white/55">{cs2MapLabel(map)} · {liveMatch?.mode ?? server.mode}</DialogDescription></DialogHeader>

        {loading && <div className="py-14 text-center text-sm text-white/55">Loading live server data…</div>}
        {error && <div className="mt-6 rounded-xl border border-red-300/20 bg-red-300/[0.08] p-4 text-center text-sm text-red-100">Live match data could not be loaded. <button type="button" onClick={() => void refetch()} className="ml-1 underline underline-offset-2">Try again</button></div>}
        {!loading && !error && liveMatch && <div className="mt-6 space-y-4">
          <section className="rounded-2xl border border-white/[0.12] bg-white/[0.06] px-5 py-4 text-center backdrop-blur-md"><div className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/45">Current round</div><div className="mt-2 flex items-center justify-center gap-3"><span className="text-3xl font-black tabular-nums text-amber-100">{hasScore ? liveMatch.score!.t : "—"}</span><span className="text-xs font-bold tracking-[0.2em] text-white/45">VS</span><span className="text-3xl font-black tabular-nums text-sky-100">{hasScore ? liveMatch.score!.ct : "—"}</span></div><div className="mt-2 text-xs text-white/55">{liveMatch.round === null ? "Round information has not been received." : `Round ${liveMatch.round}`}</div></section>
          {liveMatch.availability === "live_snapshot" ? <div className="grid gap-3 sm:grid-cols-2"><TeamPanel side="t" title="TERRORIST" players={liveMatch.teams.t} /><TeamPanel side="ct" title="COUNTER‑TERRORIST" players={liveMatch.teams.ct} /></div> : <section className="rounded-xl border border-white/[0.1] bg-black/20 p-4"><div className="flex items-center gap-2 text-sm font-semibold text-white/85"><Users className="size-4 text-white/65" />Connected players</div><p className="mt-1 text-xs leading-5 text-white/45">Team and score snapshots have not been received from this server yet.</p><PlayerList players={liveMatch.connectedPlayers} emptyLabel="No current player snapshot received." /></section>}
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-white/40"><RadioTower className="size-3" />{liveMatch.updatedAt ? `Updated ${new Date(liveMatch.updatedAt).toLocaleTimeString()}` : "Waiting for a server heartbeat"}</div>
        </div>}
      </div>
    </DialogContent>
  </Dialog>
}
