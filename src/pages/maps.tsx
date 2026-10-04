/**
 * Maps: how the signed-in player does on each map, from the same profile overview the profile page reads.
 * Only what the API reports is shown (matches played and won per map); nothing is estimated.
 */
import { useMemo, useState } from "react"
import { RotateCcw } from "lucide-react"

import { profileOverviewService, type ProfileOverview } from "@/api/profile-overview"
import { Segmented } from "@/components/segmented"
import { Skeleton } from "@/components/ui/skeleton"
import { useApiQuery } from "@/hooks/use-api-query"
import { cs2MapArtwork, cs2MapLabel } from "@/lib/cs2-map-art"
import { PAGE_TITLES } from "@/lib/routes"
import { cn } from "@/lib/utils"

type MapRow = NonNullable<ProfileOverview["maps"]>[number]
type Sort = "winRate" | "played" | "name"

/** Same threshold the profile page uses: a map with fewer matches says too little to rank. */
const MIN_MATCHES = 3

function SummaryCell({ label, row, detail }: { label: string; row: MapRow | null; detail: (row: MapRow) => string }) {
  return (
    <div className="lx-stat-cell">
      <span className="lx-stat-label">{label}</span>
      {row ? (
        <>
          <span className="truncate text-[22px] font-bold leading-none text-[var(--text)]">{cs2MapLabel(row.map)}</span>
          <span className="text-xs text-[var(--text-dim)]">{detail(row)}</span>
        </>
      ) : (
        <>
          <span className="text-[22px] font-bold leading-none text-[var(--text-faint)]">—</span>
          <span className="text-xs text-[var(--text-dim)]">Not enough matches yet</span>
        </>
      )}
    </div>
  )
}

function MapCard({ row, tag }: { row: MapRow; tag?: string }) {
  const art = cs2MapArtwork(row.map)
  return (
    <article className="overflow-hidden rounded-[10px] border border-[var(--glass-line)] bg-[var(--glass-fill)] transition-colors duration-200 hover:border-[var(--line-strong)]">
      <div className="relative h-24 bg-[var(--line-soft)]">
        {art && <img src={art} alt="" className="size-full object-cover" loading="lazy" />}
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[var(--card-surface)] to-transparent" />
        {tag && <span className="absolute right-2 top-2 rounded-full border border-[var(--line)] bg-[var(--card-surface)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-muted)]">{tag}</span>}
      </div>
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="truncate text-[15px] font-semibold text-[var(--text)]">{cs2MapLabel(row.map)}</h2>
          <span className="text-[22px] font-bold leading-none text-[var(--text)]">{row.winRate}%</span>
        </div>
        <div role="img" aria-label={`${row.winRate}% win rate`} className="h-1.5 overflow-hidden rounded-full bg-[var(--line-soft)]">
          <div className="h-full rounded-full bg-[var(--accent-solid)]" style={{ width: `${Math.min(100, Math.max(0, row.winRate))}%` }} />
        </div>
        <span className="text-xs text-[var(--text-dim)]">{row.wins} won of {row.matches} {row.matches === 1 ? "match" : "matches"}</span>
      </div>
    </article>
  )
}

function CardsSkeleton() {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3" aria-hidden="true">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-[10px] border border-[var(--glass-line)] bg-[var(--glass-fill)]">
          <Skeleton className="h-24 rounded-none bg-[var(--line-soft)]" />
          <div className="flex flex-col gap-3 p-4">
            <Skeleton className="h-4 w-28 rounded-full bg-[var(--line)]" />
            <Skeleton className="h-1.5 w-full rounded-full bg-[var(--line-soft)]" />
            <Skeleton className="h-3 w-32 rounded-full bg-[var(--line-soft)]" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function MapsPage() {
  const { data, loading, error, refetch } = useApiQuery<ProfileOverview>((signal) => profileOverviewService.get("me", { signal }), { queryKey: "maps-me" })
  const [sort, setSort] = useState<Sort>("winRate")

  const maps = data?.maps ?? []
  const ranked = useMemo(() => maps.filter((row) => row.matches >= MIN_MATCHES), [maps])
  const best = ranked.length > 0 ? [...ranked].sort((a, b) => b.winRate - a.winRate || b.matches - a.matches)[0]! : null
  const weakest = ranked.length > 1 ? [...ranked].sort((a, b) => a.winRate - b.winRate || b.matches - a.matches)[0]! : null
  const mostPlayed = maps.length > 0 ? [...maps].sort((a, b) => b.matches - a.matches)[0]! : null
  const sorted = useMemo(() => {
    const rows = [...maps]
    if (sort === "name") return rows.sort((a, b) => cs2MapLabel(a.map).localeCompare(cs2MapLabel(b.map)))
    if (sort === "played") return rows.sort((a, b) => b.matches - a.matches)
    // Maps with too few matches go last so one lucky game never tops the list.
    return rows.sort((a, b) => Number(b.matches >= MIN_MATCHES) - Number(a.matches >= MIN_MATCHES) || b.winRate - a.winRate || b.matches - a.matches)
  }, [maps, sort])

  return (
    <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto">
      <div className="flex flex-col gap-4 px-6 pb-6 pt-6">
        <section aria-label={PAGE_TITLES.maps} className="relative overflow-hidden rounded-xl border border-[var(--glass-line)] bg-[var(--glass-fill)]">
          <div aria-hidden="true" className="lx-hero-glow pointer-events-none absolute -inset-10" />
          <div aria-hidden="true" className="lx-hero-grid pointer-events-none absolute inset-0" />
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--line-strong)] to-transparent" />
          <div className="relative z-10 flex flex-wrap items-end justify-between gap-4 p-7">
            <div className="flex min-w-0 flex-col gap-2.5">
              <h1 className="flex items-center gap-2.5 text-[34px] font-bold leading-[1.1] tracking-[-0.6px] text-[var(--text)]">
                <span aria-hidden="true" className="h-7 w-1 rounded-full bg-[var(--text-faint)]" />
                {PAGE_TITLES.maps}
              </h1>
              <span className="text-[14px] text-[var(--text-2)]">How you do on each map you have played.</span>
            </div>
            <Segmented
              ariaLabel="Sort maps"
              value={sort}
              onChange={setSort}
              options={[
                { value: "winRate", label: "Win rate" },
                { value: "played", label: "Most played" },
                { value: "name", label: "A–Z" },
              ]}
            />
          </div>
        </section>

        {loading && !data ? (
          <CardsSkeleton />
        ) : error ? (
          <p className="flex items-center justify-center gap-3 py-16 text-[13px] text-[var(--text-dim)]">
            Your maps could not be loaded.
            <button type="button" onClick={refetch} className="inline-flex items-center gap-1.5 text-[var(--text-2)] hover:text-[var(--text)]"><RotateCcw className="size-3.5" />Retry</button>
          </p>
        ) : maps.length === 0 ? (
          <p className="py-16 text-center text-[13px] text-[var(--text-dim)]">No maps yet. Play a match and it will show up here.</p>
        ) : (
          <>
            <div className="lx-stat-grid grid-cols-1 sm:grid-cols-3">
              <SummaryCell label="Best map" row={best} detail={(row) => `${row.winRate}% · ${row.wins} of ${row.matches}`} />
              <SummaryCell label="Most played" row={mostPlayed} detail={(row) => `${row.matches} matches`} />
              <SummaryCell label="Hardest map" row={weakest} detail={(row) => `${row.winRate}% · ${row.wins} of ${row.matches}`} />
            </div>
            <p className="text-xs text-[var(--text-dim)]">Best and hardest need at least {MIN_MATCHES} matches on the map.</p>
            <div className={cn("grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-3")}>
              {sorted.map((row) => (
                <MapCard key={row.map} row={row} tag={row === best ? "Best" : row.matches < MIN_MATCHES ? "Few matches" : undefined} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
