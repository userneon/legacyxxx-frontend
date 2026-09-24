import { useState } from "react"
import { Search, Swords, User, Clock3, Medal, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { competitiveService, searchService } from "@/api"
import type { ClanCard, CommunityPlayer, CompetitiveLeaderboardEntry, SearchKind } from "@/api/types"
import { useApiQuery } from "@/hooks/use-api-query"
import { QueryState } from "@/components/query-state"
import { RowsSkeleton } from "@/components/skeletons"
import { PlayerAvatar } from "@/components/player-avatar"
import { CompetitiveRankBadge } from "@/components/competitive-rank-badge"
import { RelativeTime } from "@/components/relative-time"
import { segmentGroupClass, segmentItemClass } from "@/components/page-kit"
import { isFeatureEnabled } from "@/lib/features"

const DISCOVER_SIZE = 6

/** A short list of players to start from while nothing is being searched. */
function DiscoverList({ title, icon: Icon, players, detail, onOpen }: {
  title: string
  icon: typeof Medal
  players: CompetitiveLeaderboardEntry[]
  detail: (player: CompetitiveLeaderboardEntry) => React.ReactNode
  onOpen: (steamId: string) => void
}) {
  return (
    <section className="glass rounded-2xl p-2">
      <h2 className="flex items-center gap-2 px-2 pb-1.5 pt-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        <Icon className="size-3.5" />
        {title}
      </h2>
      <ul>
        {players.map((player) => (
          <li key={player.user_id}>
            <button
              type="button"
              onClick={() => onOpen(player.steam_id)}
              className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-secondary/50"
            >
              <PlayerAvatar avatar={player.avatar} name={player.username} className="size-9 shrink-0 rounded-md text-xs" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{player.username}</div>
                <div className="truncate text-xs text-muted-foreground">{detail(player)}</div>
              </div>
              <CompetitiveRankBadge rankId={player.rank_id} rankName={player.rank_name} imageKey={player.rank_image_key} className="h-7 w-12 shrink-0" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

// LEGACY-X visual system: every result leads to its real resource route.
export function ExplorePage({ onProfileNavigate, onClanNavigate }: { onProfileNavigate: (userId: string) => void; onClanNavigate: (clanId: string) => void }) {
  const [tab, setTab] = useState<SearchKind>("players")
  const [query, setQuery] = useState("")
  const searching = query.trim().length > 0
  // Clan search only exists while the clan feature is on; without it there is a single kind of result.
  const searchTabs = [
    { id: "players" as const, label: "Players", icon: User },
    ...(isFeatureEnabled("clan") ? [{ id: "clans" as const, label: "Clans", icon: Swords }] : []),
  ]

  const { data, loading, error, refetch } = useApiQuery<CommunityPlayer[] | ClanCard[]>(
    (signal) => {
      if (tab === "players") {
        return searchService
          .searchPlayers(query, { signal })
          .then((res) => res.players)
      }
      return searchService
        .searchClans(query, { signal })
        .then((res) => res.clans)
    },
    { enabled: searching },
  )
  const { data: ladder, loading: ladderLoading } = useApiQuery<CompetitiveLeaderboardEntry[]>(
    (signal) => competitiveService.getLeaderboard({ signal }),
    { queryKey: "explore:ladder" },
  )

  const results = data ?? []
  const topPlayers = [...(ladder ?? [])].sort((a, b) => a.position - b.position).slice(0, DISCOVER_SIZE)
  const recentPlayers = [...(ladder ?? [])]
    .filter((player) => player.last_match_at)
    .sort((a, b) => new Date(b.last_match_at!).getTime() - new Date(a.last_match_at!).getTime())
    .slice(0, DISCOVER_SIZE)

  return (
    <div className="@container flex flex-col gap-5 p-4 @2xl:p-6">
      <div className="glass flex items-center gap-3 rounded-2xl px-4 py-3">
        <Search className="size-5 shrink-0 text-muted-foreground" />
        <input
          type="text"
          autoFocus
          placeholder={isFeatureEnabled("clan") ? "Search players or clans..." : "Search players by name..."}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {query && (
          <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="rounded-md p-0.5 text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        )}
      </div>

      {searchTabs.length > 1 && (
        <div className={segmentGroupClass} role="tablist">
          {searchTabs.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={segmentItemClass(tab === t.id)}>
              <t.icon className="size-3.5" />
              {t.label}
            </button>
          ))}
        </div>
      )}

      {!searching ? (
        ladderLoading && !ladder ? (
          <div className="grid gap-4 @3xl:grid-cols-2"><RowsSkeleton rows={DISCOVER_SIZE} /><RowsSkeleton rows={DISCOVER_SIZE} /></div>
        ) : topPlayers.length > 0 ? (
          <div className="grid gap-4 @3xl:grid-cols-2">
            <DiscoverList title="Top players" icon={Medal} players={topPlayers} onOpen={onProfileNavigate} detail={(player) => `#${player.position} · ${player.kd_ratio.toFixed(2)} K/D`} />
            {recentPlayers.length > 0 && (
              <DiscoverList title="Recently active" icon={Clock3} players={recentPlayers} onOpen={onProfileNavigate} detail={(player) => <>Played <RelativeTime value={player.last_match_at!} /></>} />
            )}
          </div>
        ) : (
          <p className="glass rounded-2xl px-4 py-10 text-center text-sm text-muted-foreground">Search for any player by name.</p>
        )
      ) : (
        <>
          <QueryState
            skeleton={<RowsSkeleton rows={5} />}
            loading={loading}
            error={error}
            empty={!loading && !error && results.length === 0}
            emptyMessage={`No ${tab} found for "${query}".`}
            onRetry={refetch}
          />

          {!loading && !error && results.length > 0 && (
            <div className="stagger-in grid gap-3 @2xl:grid-cols-2">
              {tab === "players"
                ? (results as CommunityPlayer[]).map((player) => (
                  <button
                    key={player.steamId ?? player.id ?? player.name}
                    type="button"
                    onClick={() => {
                      const identity = player.steamId ?? player.id
                      if (identity) onProfileNavigate(identity)
                    }}
                    disabled={!(player.steamId ?? player.id)}
                    className="glass group flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-colors hover:bg-secondary/40"
                  >
                    <PlayerAvatar avatar={player.avatar} name={player.name} className="size-10 rounded-md text-sm" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{player.name}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">K/D {player.kd}</div>
                    </div>
                  </button>
                ))
                : (results as ClanCard[]).map((clan) => (
                  <button
                    key={clan.id}
                    type="button"
                    onClick={() => onClanNavigate(clan.id)}
                    className={cn("glass group flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-colors hover:bg-secondary/40")}
                  >
                    <div className="size-10 shrink-0 overflow-hidden rounded-xl bg-secondary">
                      <img src={clan.logo} alt="" className="size-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium">{clan.name}</span>
                        <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">[{clan.tag}]</span>
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{clan.currentPlayers}/{clan.maxPlayers} players · {clan.region}</div>
                    </div>
                  </button>
                ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
