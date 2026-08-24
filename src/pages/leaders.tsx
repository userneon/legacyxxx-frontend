import { Crosshair, Target, Clock, Trophy } from "lucide-react"

import { cn } from "@/lib/utils"
import { communityLeadersService } from "@/api"
import type { CommunityPlayer } from "@/api/types"
import { useApiQuery } from "@/hooks/use-api-query"
import { QueryState } from "@/components/query-state"
import { PlayerModerationAvatar } from "@/components/player-moderation-avatar"
import { CsgoRankBadge } from "@/components/csgo-rank-badge"

// LEGACY-X visual system: Leaders celebrates current community performance, never rank, rating, XP, or level.
export function LeadersPage({ onProfileNavigate }: { onProfileNavigate: (userId: string) => void }) {
  const { data: leaders, loading, error, refetch } = useApiQuery<CommunityPlayer[]>((signal) =>
    communityLeadersService.getLeaders({ signal }),
  )

  const list = leaders ?? []
  const highlights = list.slice(0, 3)
  const totalMatches = list.reduce((sum, player) => sum + player.matches, 0)
  const totalWins = list.reduce((sum, player) => sum + player.wins, 0)
  const bestAim = [...list].sort((a, b) => b.headshots - a.headshots)[0]
  const mostActive = [...list].sort((a, b) => b.playedHours - a.playedHours)[0]

  return (
    <div className="flex flex-col gap-6 p-6">
      <QueryState loading={loading} error={error} empty={!loading && !error && list.length === 0} emptyMessage="No player performance data available yet." onRetry={refetch} />

      {!loading && !error && list.length > 0 && (
        <>
          <section className="relative isolate overflow-hidden rounded-xl border border-white/[0.08] bg-[#181818] px-4 pb-4 pt-8 sm:px-6" aria-label="Top three performance podium">
            <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.025)_24%,transparent_46%,rgba(255,255,255,0.025)_70%,transparent_100%)]" />
            <div className="pointer-events-none absolute inset-x-6 bottom-0 -z-10 h-px bg-gradient-to-r from-transparent via-white/[0.12] to-transparent" />

            <div className="mx-auto grid max-w-4xl grid-cols-3 items-end gap-2 xl:hidden sm:gap-4">
              <PodiumPlayer player={highlights[2]} rank={3} onProfileNavigate={onProfileNavigate} />
              <PodiumPlayer player={highlights[0]} rank={1} onProfileNavigate={onProfileNavigate} />
              <PodiumPlayer player={highlights[1]} rank={2} onProfileNavigate={onProfileNavigate} />
            </div>

            <div className="relative mx-auto hidden min-h-[264px] items-end gap-6 xl:flex">
              <aside className="flex min-w-[170px] flex-1 flex-col justify-center gap-3 pb-2">
                <PodiumInsight label="Match volume" value={totalMatches.toLocaleString()} detail="matches recorded" />
                <PodiumInsight label="Win column" value={totalWins.toLocaleString()} detail="community wins" />
              </aside>

              <div className="grid w-[680px] shrink-0 grid-cols-3 items-end gap-4">
                <PodiumPlayer player={highlights[2]} rank={3} onProfileNavigate={onProfileNavigate} />
                <PodiumPlayer player={highlights[0]} rank={1} onProfileNavigate={onProfileNavigate} />
                <PodiumPlayer player={highlights[1]} rank={2} onProfileNavigate={onProfileNavigate} />
              </div>

              <aside className="flex min-w-[170px] flex-1 flex-col justify-center gap-3 pb-2">
                <PodiumInsight label="Sharpest aim" value={bestAim ? `${bestAim.headshots}%` : "—"} detail={bestAim ? `${bestAim.name} · HS rate` : "Headshot rate"} align="right" />
                <PodiumInsight label="Most active" value={mostActive ? `${mostActive.playedHours}h` : "—"} detail={mostActive ? `${mostActive.name} · time played` : "Hours played"} align="right" />
              </aside>
            </div>
          </section>

          <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-[#181818]">
            <table className="w-full min-w-[980px]">
              <thead><tr className="border-b border-white/[0.08]"><Header>Player</Header><Header>Rank</Header><Header align="right">Kills</Header><Header align="right">Deaths</Header><Header align="right">K/D</Header><Header align="right">HS</Header><Header align="right">Matches</Header><Header align="right">Wins</Header><Header align="right">Played</Header><Header align="right">Last played</Header></tr></thead>
              <tbody>{list.map((player, index) => (
                <tr key={player.steamId ?? player.id ?? player.name} onClick={() => onProfileNavigate(player.steamId ?? player.id ?? player.name)} className="cursor-pointer border-b border-white/[0.06] last:border-0 focus-within:outline-none">
                  <td className="px-4 py-3.5"><div className="flex items-center gap-2.5"><PlayerModerationAvatar avatar={player.avatar} name={player.name} status={player.moderationStatus} className="size-9 shrink-0 rounded-md text-xs" /><div className="min-w-0"><div className="truncate text-sm font-semibold text-white/90">{player.name}</div><div className="mt-0.5 text-[10px] text-white/45">#{index + 1} · {player.moderationStatus}</div></div></div></td>
                  <td className="px-3 py-3.5"><CsgoRankBadge position={index + 1} className="h-7 w-12" /></td>
                  <NumberCell icon={Crosshair} value={player.kills.toLocaleString()} />
                  <td className="px-3 py-3.5 text-right text-sm tabular-nums text-white/65">{player.deaths.toLocaleString()}</td>
                  <td className="px-3 py-3.5 text-right text-sm font-semibold tabular-nums text-white/95">{player.kd.toFixed(2)}</td>
                  <NumberCell icon={Target} value={`${player.headshots}%`} />
                  <td className="px-3 py-3.5 text-right text-sm tabular-nums text-white/75">{player.matches.toLocaleString()}</td>
                  <td className="px-3 py-3.5 text-right text-sm tabular-nums text-white/75">{player.wins.toLocaleString()}</td>
                  <td className="px-3 py-3.5 text-right text-sm tabular-nums text-white/55">{player.playedHours.toLocaleString()} hrs</td>
                  <td className="px-3 py-3.5 text-right text-xs text-white/55"><span className="inline-flex items-center gap-1"><Clock className="size-3" />{player.lastPlayed}</span></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

function PodiumInsight({
  label,
  value,
  detail,
  align = "left",
}: {
  label: string
  value: string
  detail: string
  align?: "left" | "right"
}) {
  return (
    <div className={cn("relative overflow-hidden rounded-lg border border-white/[0.08] bg-black/15 px-4 py-3", align === "right" && "text-right")}>
      <div className={cn("pointer-events-none absolute inset-y-0 w-px bg-white/[0.16]", align === "right" ? "right-0" : "left-0")} />
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/45">{label}</p>
      <p className="mt-1 text-xl font-black tabular-nums text-white/95">{value}</p>
      <p className="mt-0.5 truncate text-[11px] text-white/45">{detail}</p>
    </div>
  )
}

function PodiumPlayer({ player, rank, onProfileNavigate }: { player?: CommunityPlayer; rank: 1 | 2 | 3; onProfileNavigate: (userId: string) => void }) {
  if (!player) return <div aria-hidden="true" />

  const tone = rank === 1
    ? { label: "Gold", height: "h-44 sm:h-52", surface: "border-amber-300/45 bg-gradient-to-b from-amber-300/18 to-[#211c12]", text: "text-amber-200", chip: "border-amber-200/45 bg-amber-300 text-[#201a0d]" }
    : rank === 2
      ? { label: "Silver", height: "h-36 sm:h-44", surface: "border-slate-200/30 bg-gradient-to-b from-slate-200/[0.12] to-[#191b1f]", text: "text-slate-200", chip: "border-slate-100/35 bg-slate-200 text-[#20242b]" }
      : { label: "Bronze", height: "h-28 sm:h-36", surface: "border-orange-300/35 bg-gradient-to-b from-orange-300/[0.13] to-[#211914]", text: "text-orange-200", chip: "border-orange-200/40 bg-orange-300 text-[#28170e]" }

  return (
    <button
      type="button"
      onClick={() => onProfileNavigate(player.steamId ?? player.id ?? player.name)}
      className="group flex min-w-0 flex-col items-center text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
      aria-label={`Open ${player.name} profile`}
    >
      <div className="relative z-10 -mb-3 flex flex-col items-center">
        <div className={cn("mb-1 flex size-7 items-center justify-center rounded-full border text-xs font-black shadow-lg shadow-black/25", tone.chip)}>{rank}</div>
        <PlayerModerationAvatar avatar={player.avatar} name={player.name} status={player.moderationStatus} className="size-14 rounded-md border-2 border-[#181818] text-base sm:size-16" />
      </div>
      <div className={cn("flex w-full min-w-0 flex-col items-center justify-end rounded-t-xl border px-2 pb-3 pt-5", tone.height, tone.surface)}>
        <p className={cn("text-[10px] font-bold uppercase tracking-[0.16em]", tone.text)}>{tone.label}</p>
        <p className="mt-1 max-w-full truncate text-sm font-bold text-white/95 sm:text-base">{player.name}</p>
        <div className="mt-2 flex items-baseline gap-1"><span className="text-lg font-black tabular-nums text-white">{player.kd.toFixed(2)}</span><span className="text-[10px] font-semibold uppercase tracking-wide text-white/50">K/D</span></div>
        <p className="mt-1 text-[10px] tabular-nums text-white/55">{player.kills.toLocaleString()} kills · {player.wins.toLocaleString()} wins</p>
      </div>
    </button>
  )
}

function Header({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) { return <th className={cn("px-3 py-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45", align === "right" ? "text-right" : "text-left")}>{children}</th> }
function NumberCell({ icon: Icon, value }: { icon: typeof Trophy; value: string }) { return <td className="px-3 py-3.5 text-right text-sm tabular-nums text-white/75"><span className="inline-flex items-center gap-1"><Icon className="size-3 text-white/35" />{value}</span></td> }
