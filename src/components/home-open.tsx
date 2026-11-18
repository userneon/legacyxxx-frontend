import { HeroSlider } from "@/components/home-parts"
import { useNavigate } from "react-router-dom"

import { playService, type PlayServer, type PlayServerList } from "@/api/play"
import type { PageId } from "@/api/types"
import { useApiQuery } from "@/hooks/use-api-query"
import { cs2MapArtwork, cs2MapLabel } from "@/lib/cs2-map-art"
import { cn } from "@/lib/utils"

/**
 * Home's open layout (owner pick 2026-11-17, "like this"): a full-width picture with the line and two buttons on it, your numbers right under it,
 * then the matches being played and the top of the ladder as plain rows. The player count, the matches and their scores are the API's.
 */
export function HomeHero(_props: { onNavigate: (page: PageId) => void }) {
  return (
    <section aria-label="LXC" className="relative isolate w-full">
      {/* The slider is the top of Home (owner 2026-11-18: "put the slider where Play CS2 is; it looked like a separate thing"): full width of the page, no frame, fading into the page below. */}
      <div className="mx-auto w-full max-w-[var(--lx-w)] px-4 pb-2 pt-[84px] @2xl:px-6">
        <HeroSlider bare className="h-[clamp(280px,31vw,440px)] w-full" />
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
