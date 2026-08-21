import { Crosshair, Target, Clock } from "lucide-react"

import { cn } from "@/lib/utils"
import { leaderboardService } from "@/api"
import type { LeaderPlayer } from "@/api/types"
import { useApiQuery } from "@/hooks/use-api-query"
import { QueryState } from "@/components/query-state"
import { PlayerAvatar } from "@/components/player-avatar"

export function LeadersPage({ onProfileNavigate }: { onProfileNavigate: (userId: string) => void }) {
  const { data: leaders, loading, error, refetch } = useApiQuery<LeaderPlayer[]>((signal) =>
    leaderboardService.getLeaderboard(undefined, { signal }),
  )

  const list = leaders ?? []
  const top3 = list.slice(0, 3)

  return (
    <div className="flex flex-col gap-6 p-6">
      <QueryState
        loading={loading}
        error={error}
        empty={!loading && !error && list.length === 0}
        emptyMessage="No leaderboard data available yet."
        onRetry={refetch}
      />

      {!loading && !error && list.length > 0 && (
        <>
          {/* Top 3 podium with glow */}
          <div className="grid gap-4 sm:grid-cols-3">
            {top3.map((player, idx) => (
              <button
                key={player.rank}
                onClick={() => onProfileNavigate(player.steamId ?? player.name)}
                className={cn(
                  "glass shiny glow-amber rounded-xl p-5 flex flex-col items-center text-center transition-all hover:shadow-lg hover:scale-[1.02] cursor-pointer",
                  idx === 0 && "sm:scale-105 sm:order-2",
                  idx === 1 && "sm:order-1",
                  idx === 2 && "sm:order-3",
                )}
              >
                <PlayerAvatar avatar={player.avatar} name={player.name} className={cn(
                  "flex size-16 items-center justify-center rounded-full text-xl font-bold",
                  player.rank === 1 && "bg-chart-4/20 text-chart-4 border border-chart-4/40",
                  player.rank === 2 && "bg-chart-1/20 text-chart-1 border border-chart-1/40",
                  player.rank === 3 && "bg-chart-5/20 text-chart-5 border border-chart-5/40",
                )} />
                <div className="mt-3 font-semibold text-lg">{player.name}</div>
                <div className="text-xs text-muted-foreground mt-1">Level {player.level} - Rank #{player.rank}</div>
                <div className="flex gap-4 mt-4">
                  <div>
                    <div className="text-sm font-bold tabular-nums">{player.experience.toLocaleString()}</div>
                    <div className="text-[10px] text-muted-foreground">XP</div>
                  </div>
                  <div>
                    <div className="text-sm font-bold tabular-nums">{player.kd}</div>
                    <div className="text-[10px] text-muted-foreground">K/D</div>
                  </div>
                  <div>
                    <div className="text-sm font-bold tabular-nums">{player.kills.toLocaleString()}</div>
                    <div className="text-[10px] text-muted-foreground">Kills</div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Full leaderboard table */}
          <div className="glass rounded-xl overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-12">#</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Player</th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Experience</th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Kills</th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Deaths</th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">K/D</th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">HS</th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Played</th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Last Played</th>
                </tr>
              </thead>
              <tbody>
                {list.map((player) => (
                  <tr
                    key={player.rank}
                    onClick={() => onProfileNavigate(player.steamId ?? player.name)}
                    className={cn(
                      "cursor-pointer",
                      "border-b border-border/50 transition-all duration-200 hover:bg-chart-4/8",
                      player.rank <= 3 && "bg-chart-4/8",
                    )}
                  >
                    <td className="px-3 py-3">
                      <span className={cn(
                        "text-sm font-bold tabular-nums",
                        player.rank === 1 && "text-chart-4",
                        player.rank === 2 && "text-chart-1",
                        player.rank === 3 && "text-chart-5",
                        player.rank > 3 && "text-muted-foreground"
                      )}>
                        {player.rank}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2.5">
                        <PlayerAvatar avatar={player.avatar} name={player.name} className={cn(
                          "flex size-8 items-center justify-center rounded-full text-xs font-bold shrink-0",
                          player.rank === 1 && "bg-chart-4/20 text-chart-4",
                          player.rank === 2 && "bg-chart-1/20 text-chart-1",
                          player.rank === 3 && "bg-chart-5/20 text-chart-5",
                          player.rank > 3 && "bg-secondary text-foreground"
                        )} />
                        <div>
                          <div className="text-sm font-medium">{player.name}</div>
                          <div className="text-[10px] text-muted-foreground">Lvl {player.level}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right text-sm tabular-nums">
                      <span className="text-chart-2">{player.experience.toLocaleString()}</span>
                    </td>
                    <td className="px-3 py-3 text-right text-sm tabular-nums">
                      <span className="flex items-center justify-end gap-1">
                        <Crosshair className="size-3 text-muted-foreground" />
                        {player.kills.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right text-sm tabular-nums text-destructive/80">
                      {player.deaths.toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-right text-sm tabular-nums">
                      <span className={cn(
                        "font-medium",
                        player.kd >= 2.0 && "text-chart-2",
                        player.kd >= 1.5 && player.kd < 2.0 && "text-chart-4",
                        player.kd < 1.5 && "text-muted-foreground",
                      )}>
                        {player.kd}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right text-sm tabular-nums">
                      <span className="flex items-center justify-end gap-1">
                        <Target className="size-3 text-muted-foreground" />
                        {player.headshots.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right text-sm tabular-nums text-muted-foreground">
                      {player.playedHours.toLocaleString()} hrs
                    </td>
                    <td className="px-3 py-3 text-right text-xs text-muted-foreground whitespace-nowrap">
                      <span className="flex items-center justify-end gap-1">
                        <Clock className="size-3" />
                        {player.lastPlayed}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
