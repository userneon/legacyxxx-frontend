import { useState } from "react"
import { Search, ShieldAlert, Ban, MessageSquareOff, MicOff } from "lucide-react"

import { cn } from "@/lib/utils"
import { moderationService } from "@/api"
import type { PenaltyEntry, PenaltyStats, PenaltyType } from "@/api/types"
import { Badge } from "@/components/ui/badge"
import { useApiQuery } from "@/hooks/use-api-query"
import { QueryState } from "@/components/query-state"
import { PlayerAvatar } from "@/components/player-avatar"

type PenaltyFilter = "all" | PenaltyType

const FILTERS: { id: PenaltyFilter; label: string; icon: typeof Ban }[] = [
  { id: "all", label: "All", icon: ShieldAlert },
  { id: "ban", label: "Bans", icon: Ban },
  { id: "comm", label: "Comms", icon: MessageSquareOff },
  { id: "gag", label: "Gags", icon: MicOff },
]

function getTypeColor(type: PenaltyType) {
  switch (type) {
    case "ban": return "bg-destructive/15 text-destructive"
    case "comm": return "bg-chart-4/15 text-chart-4"
    case "gag": return "bg-chart-1/15 text-chart-1"
  }
}

function getTypeLabel(type: PenaltyType) {
  switch (type) {
    case "ban": return "BAN"
    case "comm": return "COMM"
    case "gag": return "GAG"
  }
}

export function PenaltiesPage({ onProfileNavigate }: { onProfileNavigate: (userId: string) => void }) {
  const [filter, setFilter] = useState<PenaltyFilter>("all")
  const [query, setQuery] = useState("")

  const { data: penalties, loading, error, refetch } = useApiQuery<PenaltyEntry[]>((signal) =>
    moderationService.getPenalties(undefined, { signal }),
  )

  const { data: stats } = useApiQuery<PenaltyStats>((signal) =>
    moderationService.getStats({ signal }),
  )

  const allPenalties = penalties ?? []

  const filtered = allPenalties.filter((p) => {
    if (filter !== "all" && p.type !== filter) return false
    if (query) {
      const q = query.toLowerCase()
      return (
        p.player.toLowerCase().includes(q) ||
        p.reason.toLowerCase().includes(q) ||
        p.admin.toLowerCase().includes(q)
      )
    }
    return true
  })

  const statItems = stats ? [
    { label: "Total Bans", value: stats.totalBans.toLocaleString(), color: "text-destructive" },
    { label: "Active Bans", value: stats.activeBans.toLocaleString(), color: "text-chart-5" },
    { label: "Permanent", value: stats.permanentBans.toLocaleString(), color: "text-chart-4" },
    { label: "Total Comms", value: stats.totalComms.toLocaleString(), color: "text-chart-1" },
    { label: "Total Gags", value: stats.totalGags.toLocaleString(), color: "text-chart-2" },
  ] : []

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Stats row */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {statItems.map((stat) => (
            <div key={stat.label} className="glass rounded-xl p-4 hover-lift transition-all">
              <div className={cn("text-xl font-bold tabular-nums", stat.color)}>{stat.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters + Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "glass flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition-all",
                filter === f.id
                  ? "bg-primary text-primary-foreground border-transparent"
                  : "hover:bg-secondary/60 hover:text-foreground"
              )}
            >
              <f.icon className="size-3.5" />
              {f.label}
            </button>
          ))}
        </div>

        <div className="glass flex items-center gap-2 rounded-lg px-3 py-2 max-w-xs w-full">
          <Search className="size-4 text-muted-foreground shrink-0" />
          <input
            type="text"
            placeholder="Search player, reason, or admin..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Penalty list */}
      <div className="glass rounded-xl overflow-hidden">
        {/* Table header */}
        <div className="hidden md:grid md:grid-cols-[3rem_1fr_2fr_1fr_5rem_1fr_5rem] border-b border-border px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <span>Type</span>
          <span>Player</span>
          <span>Reason</span>
          <span>Term</span>
          <span>Status</span>
          <span>Admin</span>
          <span>Date</span>
        </div>

        <QueryState
          loading={loading}
          error={error}
          empty={!loading && !error && filtered.length === 0}
          emptyMessage="No penalties found matching your search."
          onRetry={refetch}
        />

        {!loading && !error && filtered.length > 0 && (
          filtered.map((penalty) => <PenaltyRow key={penalty.id} penalty={penalty} onProfileNavigate={onProfileNavigate} />)
        )}
      </div>
    </div>
  )
}

function PenaltyRow({ penalty, onProfileNavigate }: { penalty: PenaltyEntry; onProfileNavigate: (userId: string) => void }) {
  return (
    <div
      onClick={() => onProfileNavigate(penalty.player)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") onProfileNavigate(penalty.player) }}
      className="grid grid-cols-2 gap-2 border-b border-border/50 px-4 py-3 text-sm transition-colors hover:bg-destructive/5 md:grid-cols-[3rem_1fr_2fr_1fr_5rem_1fr_5rem] md:items-center cursor-pointer"
    >
      {/* Type badge */}
      <div>
        <Badge variant="secondary" className={cn("text-[10px] font-bold uppercase px-1.5 py-0.5", getTypeColor(penalty.type))}>
          {getTypeLabel(penalty.type)}
        </Badge>
      </div>

      {/* Player */}
      <div className="flex items-center gap-2">
        <PlayerAvatar avatar={penalty.avatar} name={penalty.player} className="size-7 rounded-full text-xs" />
        <span className="font-medium truncate text-left">
          {penalty.player}
        </span>
      </div>

      {/* Reason */}
      <div className="col-span-2 text-muted-foreground truncate md:col-span-1">{penalty.reason}</div>

      {/* Term */}
      <div className="tabular-nums text-muted-foreground">
        {penalty.isPermanent ? (
          <span className="text-destructive font-medium">Permanent</span>
        ) : penalty.isUnbanned ? (
          <span className="text-muted-foreground">-</span>
        ) : (
          penalty.term
        )}
      </div>

      {/* Status */}
      <div>
        {penalty.isUnbanned ? (
          <Badge variant="secondary" className="bg-chart-2/15 text-chart-2 text-[10px]">Unbanned</Badge>
        ) : penalty.isPermanent ? (
          <Badge variant="secondary" className="bg-destructive/15 text-destructive text-[10px]">Active</Badge>
        ) : (
          <Badge variant="secondary" className="bg-chart-4/15 text-chart-4 text-[10px]">Active</Badge>
        )}
      </div>

      {/* Admin */}
      <div className="text-muted-foreground truncate">{penalty.admin}</div>

      {/* Date */}
      <div className="text-muted-foreground text-xs whitespace-nowrap">{penalty.date}</div>
    </div>
  )
}
