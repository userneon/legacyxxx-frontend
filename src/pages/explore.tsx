import { useState } from "react"
import { Search, Users, Swords, User } from "lucide-react"

import { cn } from "@/lib/utils"
import { searchService } from "@/api"
import type { ClanCard, LeaderPlayer, SearchKind } from "@/api/types"
import { useApiQuery } from "@/hooks/use-api-query"
import { QueryState } from "@/components/query-state"

export function ExplorePage({ onProfileNavigate }: { onProfileNavigate: (userId: string) => void }) {
  const [tab, setTab] = useState<SearchKind>("players")
  const [query, setQuery] = useState("")

  const { data, loading, error, refetch } = useApiQuery<LeaderPlayer[] | ClanCard[]>(
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
  )

  const results = data ?? []

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Search bar */}
      <div className="glass flex items-center gap-3 rounded-xl px-4 py-3">
        <Search className="size-5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search players or clans..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {([
          { id: "players" as const, label: "Players", icon: User },
          { id: "clans" as const, label: "Clans", icon: Swords },
        ]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "glass flex items-center gap-2 rounded-lg px-4 py-2 text-sm transition-all",
              tab === t.id
                ? "bg-primary text-primary-foreground border-transparent"
                : "hover:bg-secondary/60 hover:text-foreground"
            )}
          >
            <t.icon className="size-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Results */}
      <QueryState
        loading={loading}
        error={error}
        empty={!loading && !error && results.length === 0}
        emptyMessage={query ? `No ${tab} found for "${query}".` : "Start typing to search."}
        onRetry={refetch}
      />

      {!loading && !error && results.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {tab === "players"
            ? (results as LeaderPlayer[]).map((player) => (
              <button
                key={player.rank}
                onClick={() => onProfileNavigate(player.name)}
                className="glass group flex w-full items-center gap-4 rounded-xl p-4 transition-all hover:bg-secondary/40 hover-lift cursor-pointer text-left"
              >
                <div className="flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-secondary to-muted text-lg font-bold">
                  {player.avatar}
                </div>
                <div className="flex-1">
                  <div className="font-medium">{player.name}</div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span>XP: {player.experience.toLocaleString()}</span>
                    <span>K/D: {player.kd}</span>
                  </div>
                </div>
                <Users className="size-4 text-muted-foreground" />
              </button>
            ))
            : (results as ClanCard[]).map((clan) => (
              <div
                key={clan.id}
                onClick={() => onProfileNavigate(clan.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter") onProfileNavigate(clan.id) }}
                className="glass group flex items-center gap-4 rounded-xl p-4 transition-all hover:bg-secondary/40 hover-lift cursor-pointer"
              >
                <div className="size-12 rounded-xl overflow-hidden bg-secondary">
                  <img src={clan.logo} alt={clan.name} className="size-full object-cover" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{clan.name}</span>
                    <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
                      [{clan.tag}]
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {clan.currentPlayers}/{clan.maxPlayers} players - {clan.region}
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
