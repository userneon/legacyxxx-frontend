/** LEGACY-X Creators: the community's content creators, Main Content Creators first, each with their channels. */
import { useState } from "react"
import { Link } from "react-router-dom"
import { Clapperboard, ExternalLink, RotateCcw, Search, Star, X } from "lucide-react"

import { creatorsService, CREATOR_PLATFORMS, type Creator, type CreatorTier } from "@/api/creators"
import { CreatorApply } from "@/components/creator-apply"
import { CompetitiveRankBadge } from "@/components/competitive-rank-badge"
import { FramedAvatar } from "@/components/framed-avatar"
import { PageBar, PageBarEnd, PageTabs, pageSearchClass } from "@/components/page-tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { useApiQuery } from "@/hooks/use-api-query"
import { nameProps, type NameLook } from "@/lib/cosmetics"
import { cn } from "@/lib/utils"

type CreatorsTab = "all" | CreatorTier

/** The badge a creator carries here and on their profile. Main is white-outlined, Content Creator neutral. */
export function CreatorBadge({ tier, label, violet }: { tier: CreatorTier; label: string; violet?: boolean }) {
  return (
    <span className={cn("inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold", violet ? "border-[var(--brand)]/45 bg-[var(--brand)]/12 text-[var(--brand-bright)]" : tier === "main" ? "border-[var(--text-2)] text-[var(--text)]" : "border-[var(--line-strong)] bg-[var(--raised)] text-[var(--text-2)]")}>
      {tier === "main" ? <Star className="size-3.5 fill-current" /> : <Clapperboard className="size-3.5" />}
      {label}
    </span>
  )
}

const TIKTOK_PATH = "M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"

/** The TikTok note drawn three times, cyan and red offset under white, like TikTok's own logo. */
function TikTokMark() {
  return (
    <span aria-hidden="true" className="lx-tiktok-mark relative size-4 shrink-0">
      <svg viewBox="0 0 24 24" className="lx-tiktok-cyan absolute inset-0 size-4"><path d={TIKTOK_PATH} fill="currentColor" /></svg>
      <svg viewBox="0 0 24 24" className="lx-tiktok-red absolute inset-0 size-4"><path d={TIKTOK_PATH} fill="currentColor" /></svg>
      <svg viewBox="0 0 24 24" className="absolute inset-0 size-4 text-white"><path d={TIKTOK_PATH} fill="currentColor" /></svg>
    </span>
  )
}

/** "@name" from a TikTok link (tiktok.com/@name), or nothing when the link has no handle. */
function tiktokHandle(url: string) {
  try {
    const handle = new URL(url).pathname.split("/").find((part) => part.startsWith("@"))
    return handle && handle.length > 1 ? handle.slice(0, 32) : null
  } catch {
    return null
  }
}

/** TikTok gets a button of its own: black, its glitch logo, the handle, and a short glitch on hover. */
function TikTokButton({ url }: { url: string }) {
  const handle = tiktokHandle(url)
  return (
    <a href={url} target="_blank" rel="noopener noreferrer nofollow" aria-label={handle ? `TikTok ${handle}` : "TikTok"} className="lx-tiktok group inline-flex h-8 items-center gap-2 rounded-lg px-3 text-xs">
      <TikTokMark />
      <span className="lx-tiktok-word font-bold tracking-[0.01em] text-white">TikTok</span>
      {handle && <span className="max-w-[120px] truncate font-medium text-[var(--text-muted)] transition-colors group-hover:text-[var(--text-2)]">{handle}</span>}
    </a>
  )
}

/** A creator's channels as small link buttons, in a fixed platform order; TikTok has its own look. */
export function CreatorLinks({ links, className }: { links: Creator["links"]; className?: string }) {
  const present = CREATOR_PLATFORMS.filter((platform) => links[platform.id])
  if (present.length === 0) return null
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {present.map((platform) => platform.id === "tiktok" ? <TikTokButton key="tiktok" url={links.tiktok!} /> : (
        <a key={platform.id} href={links[platform.id]} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--line)] px-2.5 text-xs font-medium text-[var(--text-2)] transition-colors hover:border-[var(--line-strong)] hover:bg-[var(--raised)] hover:text-[var(--text)]">
          {platform.label}
          <ExternalLink className="size-3" />
        </a>
      ))}
    </div>
  )
}

/** A creator's name (in the look they wear), rank and tier, linking to their profile. */
function CreatorHead({ creator, size }: { creator: Creator; size: number }) {
  return (
    <Link to={`/profile/${creator.steamId}`} className="group flex min-w-0 items-center gap-3">
      <FramedAvatar avatar={creator.avatar ?? undefined} name={creator.username} frame={creator.frame} size={size} />
      <span className="flex min-w-0 flex-col gap-1">
        <span {...nameProps(creator.nameStyle as NameLook | null, cn("truncate font-bold text-[var(--text)] underline-offset-4 group-hover:underline", size > 60 ? "text-[22px] leading-tight" : "text-[15px]"))} title={creator.username}>{creator.username}</span>
        {creator.rank && (
          <span className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
            <CompetitiveRankBadge rankId={creator.rank.id} rankName={creator.rank.name} imageKey={creator.rank.imageKey} size={16} />
            {creator.rank.name}
          </span>
        )}
      </span>
    </Link>
  )
}

/** A Main Content Creator: one wide card, like the Owner's on the Staff page. */
function MainCard({ creator }: { creator: Creator }) {
  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-[var(--glass-line)] bg-[var(--glass-fill)] p-5 transition-colors hover:border-[var(--line-strong)] sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-col gap-2.5 sm:w-[300px] sm:shrink-0">
        <CreatorHead creator={creator} size={72} />
        <span><CreatorBadge tier={creator.tier} label={creator.label} /></span>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:border-l sm:border-[var(--line-soft)] sm:pl-5">
        {creator.bio ? <p className="text-[13px] leading-relaxed text-[var(--text-2)]">{creator.bio}</p> : <p className="text-[13px] text-[var(--text-dim)]">No line yet.</p>}
        <CreatorLinks links={creator.links} />
      </div>
    </article>
  )
}

/** A Content Creator: a compact card in the grid. */
function CreatorCard({ creator }: { creator: Creator }) {
  return (
    <article className="flex h-full flex-col gap-3 rounded-xl border border-[var(--glass-line)] bg-[var(--glass-fill)] p-4 transition-colors hover:border-[var(--line-strong)]">
      <CreatorHead creator={creator} size={48} />
      {creator.bio && <p className="line-clamp-2 text-[13px] leading-relaxed text-[var(--text-muted)]">{creator.bio}</p>}
      <CreatorLinks links={creator.links} className="mt-auto" />
    </article>
  )
}

export function CreatorsPage() {
  const [tab, setTab] = useState<CreatorsTab>("all")
  const [search, setSearch] = useState("")
  const { data, loading, error, refetch } = useApiQuery((signal) => creatorsService.list({ signal }), { queryKey: "creators" })
  const creators = data?.creators ?? []
  const query = search.trim().toLowerCase()
  const found = creators.filter((creator) => !query || creator.username.toLowerCase().includes(query))
  const main = found.filter((creator) => creator.tier === "main")
  const others = found.filter((creator) => creator.tier === "creator")
  const count = (tier: CreatorTier) => creators.filter((creator) => creator.tier === tier).length
  const showMain = tab !== "creator" && main.length > 0
  const showOthers = tab !== "main" && others.length > 0

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageBar>
        <PageTabs<CreatorsTab> ariaLabel="Creators" value={tab} onChange={setTab} options={[{ value: "all", label: "Everyone", count: data ? creators.length : undefined }, { value: "main", label: "Main", count: data ? count("main") : undefined }, { value: "creator", label: "Creators", count: data ? count("creator") : undefined }]} />
        <PageBarEnd>
          <label className={cn(pageSearchClass, "max-md:hidden")}>
            <Search className="size-4 shrink-0 text-[var(--text-dim)]" aria-hidden="true" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a creator" aria-label="Find a creator" className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--text)] placeholder:text-[var(--text-faint)] focus:outline-none" />
            {search && <button type="button" aria-label="Clear search" onClick={() => setSearch("")} className="text-[var(--text-dim)] hover:text-[var(--text)]"><X className="size-3.5" /></button>}
          </label>
          <CreatorApply />
        </PageBarEnd>
      </PageBar>
      <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-6 py-6 max-md:px-4">
        <div className="mx-auto flex max-w-[1320px] flex-col gap-7">
          {loading && !data ? (
            <div className="flex flex-col gap-3" aria-hidden="true">
              <div className="grid gap-3 xl:grid-cols-2">{[0, 1].map((index) => <Skeleton key={index} className="h-[130px] rounded-2xl bg-[var(--card-surface)]" />)}</div>
              <div className="lx-creator-grid">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-[150px] rounded-xl bg-[var(--card-surface)]" />)}</div>
            </div>
          ) : error && !data ? (
            <p className="flex items-center justify-center gap-3 py-16 text-[13px] text-[var(--text-dim)]">
              Could not load the creators.
              <button type="button" onClick={refetch} className="inline-flex items-center gap-1.5 text-[var(--text-2)] hover:text-[var(--text)]"><RotateCcw className="size-3.5" />Retry</button>
            </p>
          ) : creators.length === 0 ? (
            <p className="py-16 text-center text-[13px] text-[var(--text-dim)]">No creators yet.</p>
          ) : !showMain && !showOthers ? (
            <p className="py-16 text-center text-[13px] text-[var(--text-dim)]">{query ? "No creator by that name." : "No creators here yet."}</p>
          ) : (
            <>
              {showMain && (
                <section aria-label="Main Content Creators" className="flex flex-col gap-3">
                  {tab === "all" && <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-dim)] before:h-3 before:w-[3px] before:rounded-full before:bg-[var(--text-faint)]">Main Content Creators</h2>}
                  <div className="flex flex-col gap-3">{main.map((creator) => <MainCard key={creator.userId} creator={creator} />)}</div>
                </section>
              )}
              {showOthers && (
                <section aria-label="Content Creators" className="flex flex-col gap-3">
                  {tab === "all" && <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-dim)] before:h-3 before:w-[3px] before:rounded-full before:bg-[var(--text-faint)]">Content Creators</h2>}
                  <div className="lx-creator-grid">{others.map((creator) => <CreatorCard key={creator.userId} creator={creator} />)}</div>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
