import { useNavigate } from "react-router-dom"

import { serversService } from "@/api"
import { playService, type PlayServer, type PlayServerList } from "@/api/play"
import type { HomeStats, PageId } from "@/api/types"
import agentHero from "@/assets/home/agent-hero.webp"
import { useApiQuery } from "@/hooks/use-api-query"
import { cs2MapArtwork, cs2MapLabel } from "@/lib/cs2-map-art"
import { cn } from "@/lib/utils"

/**
 * Home's open layout (owner pick 2026-11-17, "like this"): a full-width picture with the line and two buttons on it, your numbers right under it,
 * then the matches being played and the top of the ladder as plain rows. The player count, the matches and their scores are the API's.
 */
export function HomeHero({ onNavigate }: { onNavigate: (page: PageId) => void }) {
  const { data: stats } = useApiQuery<HomeStats>((signal) => serversService.getHomeStats({ signal }), { queryKey: "home-hero-stats", keepPreviousData: true })
  const online = stats?.playersOnline
  return (
    <section aria-label="LXC" className="relative isolate -mx-4 -mt-4 min-h-[420px] overflow-hidden @2xl:-mx-6 @2xl:-mt-6 @2xl:min-h-[480px]">
      <img src={agentHero} alt="" aria-hidden="true" decoding="async" className="absolute inset-0 -z-10 size-full object-cover object-[75%_12%] [mask-image:linear-gradient(90deg,transparent_6%,rgba(0,0,0,0.45)_30%,#000_62%),linear-gradient(180deg,#000_70%,transparent)] [mask-composite:intersect] [-webkit-mask-composite:source-in]" />
      <div className="mx-auto flex h-full min-h-[420px] w-full max-w-[1320px] flex-col justify-center px-4 py-12 @2xl:min-h-[480px] @2xl:px-6">
        {typeof online === "number" && (
          <span className="flex items-center gap-2.5 text-[12px] font-semibold uppercase tracking-[0.2em] text-[var(--text-dim)]">
            <span aria-hidden="true" className="size-[7px] rounded-full bg-[var(--status-green)] shadow-[0_0_10px_var(--status-green)]" />
            {online.toLocaleString()} {online === 1 ? "player" : "players"} online
          </span>
        )}
        <h1 className="mt-5 max-w-[620px] text-[clamp(40px,6vw,68px)] font-bold leading-[0.98] tracking-[-0.03em] text-[var(--text)]">Play CS2.<br /><span className="text-[var(--text-dim)]">Climb the ladder.</span></h1>
        <p className="mt-5 max-w-[430px] text-[16px] leading-relaxed text-[var(--text-muted)]">Ranked 5v5, fun servers and a clan of your own. One click to join.</p>
        <div className="mt-8 flex flex-wrap gap-3.5">
          <button type="button" onClick={() => onNavigate("play-5vs5")} className="lx-primary-button lx-hover-blue inline-flex h-[50px] items-center rounded-xl px-7 text-[15px] font-bold">Play now</button>
          <button type="button" onClick={() => onNavigate("leaders")} className="inline-flex h-[50px] items-center rounded-xl border border-white/30 px-6 text-[15px] font-semibold text-[var(--text)] transition-colors hover:border-white/70 hover:bg-white/[0.06]">See the ladder</button>
        </div>
      </div>
    </section>
  )
}

const STATUS_ORDER: Record<string, number> = { live: 0, warmup: 1, waiting: 2, online: 3, full: 4, offline: 5 }

/** The servers with a match on right now (or about to start), from every mode, live ones first. */
export function LiveNow({ onNavigate }: { onNavigate: (page: PageId) => void }) {
  const navigate = useNavigate()
  const five = useApiQuery<PlayServerList>((signal) => playService.getServers("5x5", { signal }), { queryKey: "home-live-5x5", keepPreviousData: true })
  const fun = useApiQuery<PlayServerList>((signal) => playService.getServers("fun", { signal }), { queryKey: "home-live-fun", keepPreviousData: true })
  const servers: PlayServer[] = [...(five.data?.servers ?? []), ...(fun.data?.servers ?? [])]
    .filter((server) => server.status !== "offline")
    .sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9) || b.players - a.players)
    .slice(0, 4)
  const liveCount = servers.filter((server) => server.status === "live").length
  const loading = (five.loading || fun.loading) && servers.length === 0
  return (
    <section aria-label="Live now" className="flex min-w-0 flex-col">
      <div className="mb-1 flex items-baseline gap-3">
        <h2 className="lx-section-title text-[var(--text)]">Live now</h2>
        {liveCount > 0 && <span aria-hidden="true" className="lx-live-dot size-1.5 self-center rounded-full bg-[var(--status-green)]" />}
        <span className="flex-1" />
        <button type="button" onClick={() => onNavigate("play-5vs5")} className="text-[13px] text-[var(--text-dim)] transition-colors hover:text-[var(--text)]">All servers {"→"}</button>
      </div>
      {servers.length === 0 ? (
        <p className="border-t border-[var(--line-soft)] py-6 text-[14px] text-[var(--text-dim)]">{loading ? "Loading the servers…" : "No match is being played right now."}</p>
      ) : (
        <ul className="lx-rows flex flex-col border-t border-[var(--line-soft)]">
          {servers.map((server) => {
            const art = cs2MapArtwork(server.map)
            const live = server.status === "live"
            return (
              <li key={server.id} className="flex h-[58px] items-center gap-4 text-[15px]">
                <span aria-hidden="true" className="relative h-9 w-14 shrink-0 overflow-hidden rounded-[6px] bg-[var(--raised)]">{art ? <img src={art} alt="" loading="lazy" className="size-full object-cover" /> : null}</span>
                <span className="font-semibold text-[var(--text)]">{cs2MapLabel(server.map)}</span>
                <span className="hidden truncate text-[13px] text-[var(--text-dim)] @md:inline">{server.modeLabel}</span>
                <span className="flex-1" />
                <span className="font-bold tabular-nums text-[var(--text)]">{live && server.score ? `${server.score.ct} : ${server.score.t}` : "—"}</span>
                <span className="w-14 text-right text-[13px] tabular-nums text-[var(--text-dim)]">{server.players}/{server.maxPlayers}</span>
                <button type="button" onClick={() => navigate(server.mode === "fun" ? "/play/fun" : "/play/5x5")} className={cn("border-b border-white/50 pb-px text-[13px] font-semibold text-[var(--text)] transition-colors hover:border-white")}>{live ? "Watch" : "Join"}</button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
