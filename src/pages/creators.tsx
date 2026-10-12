/** LEGACY-X Creators: the community's content creators, Main Content Creators first, each with their channels. */
import { useState } from "react"
import { Link } from "react-router-dom"
import { Clapperboard, ExternalLink, RotateCcw, Star } from "lucide-react"

import { creatorsService, CREATOR_PLATFORMS, type Creator, type CreatorTier } from "@/api/creators"
import { CompetitiveRankBadge } from "@/components/competitive-rank-badge"
import { FramedAvatar } from "@/components/framed-avatar"
import { PageBar, PageBarEnd, PageTabs } from "@/components/page-tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { useApiQuery } from "@/hooks/use-api-query"
import { nameProps, type NameLook } from "@/lib/cosmetics"
import { cn } from "@/lib/utils"

type CreatorsTab = "all" | CreatorTier

/** The badge a creator carries here and on their profile. Main is white-outlined, Content Creator neutral. */
export function CreatorBadge({ tier, label }: { tier: CreatorTier; label: string }) {
  return (
    <span className={cn("inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold", tier === "main" ? "border-[var(--text-2)] text-[var(--text)]" : "border-[var(--line-strong)] bg-[var(--raised)] text-[var(--text-2)]")}>
      {tier === "main" ? <Star className="size-3.5 fill-current" /> : <Clapperboard className="size-3.5" />}
      {label}
    </span>
  )
}

/** A creator's channels as small link buttons, in a fixed platform order. */
export function CreatorLinks({ links, className }: { links: Creator["links"]; className?: string }) {
  const present = CREATOR_PLATFORMS.filter((platform) => links[platform.id])
  if (present.length === 0) return null
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {present.map((platform) => (
        <a key={platform.id} href={links[platform.id]} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--line)] px-2.5 text-xs font-medium text-[var(--text-2)] transition-colors hover:border-[var(--line-strong)] hover:bg-[var(--raised)] hover:text-[var(--text)]">
          {platform.label}
          <ExternalLink className="size-3" />
        </a>
      ))}
    </div>
  )
}

function CreatorCard({ creator, big }: { creator: Creator; big?: boolean }) {
  return (
    <article className={cn("flex flex-col gap-3 rounded-xl border bg-[var(--card-surface)] p-4", big ? "border-[var(--line-strong)] p-5" : "border-[var(--line)]")}>
      <Link to={`/profile/${creator.steamId}`} className="group flex min-w-0 items-center gap-3">
        <FramedAvatar avatar={creator.avatar ?? undefined} name={creator.username} frame={creator.frame} size={big ? 64 : 48} />
        <span className="flex min-w-0 flex-col gap-1">
          <span {...nameProps(creator.nameStyle as NameLook | null, cn("truncate font-bold text-[var(--text)] group-hover:underline underline-offset-4", big ? "text-[22px] leading-tight" : "text-[15px]"))} title={creator.username}>{creator.username}</span>
          {creator.rank && (
            <span className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
              <CompetitiveRankBadge rankId={creator.rank.id} rankName={creator.rank.name} imageKey={creator.rank.imageKey} size={16} />
              {creator.rank.name}
            </span>
          )}
        </span>
      </Link>
      <span><CreatorBadge tier={creator.tier} label={creator.label} /></span>
      {creator.bio && <p className="text-[13px] leading-relaxed text-[var(--text-muted)]">{creator.bio}</p>}
      <CreatorLinks links={creator.links} className="mt-auto" />
    </article>
  )
}

export function CreatorsPage() {
  const [tab, setTab] = useState<CreatorsTab>("all")
  const { data, loading, error, refetch } = useApiQuery((signal) => creatorsService.list({ signal }), { queryKey: "creators" })
  const creators = data?.creators ?? []
  const main = creators.filter((creator) => creator.tier === "main")
  const others = creators.filter((creator) => creator.tier === "creator")

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageBar>
        <PageTabs<CreatorsTab> ariaLabel="Creators" value={tab} onChange={setTab} options={[{ value: "all", label: "All" }, { value: "main", label: "Main Content Creators" }, { value: "creator", label: "Content Creators" }]} />
        <PageBarEnd>{data && <span className="text-xs text-[var(--text-dim)]">{creators.length} creator{creators.length === 1 ? "" : "s"}</span>}</PageBarEnd>
      </PageBar>
      <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-6 py-5 max-md:px-4">
        {loading && !data ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
            {Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-[190px] rounded-xl bg-[var(--card-surface)]" />)}
          </div>
        ) : error && !data ? (
          <p className="flex items-center justify-center gap-3 py-16 text-[13px] text-[var(--text-dim)]">
            Could not load the creators.
            <button type="button" onClick={refetch} className="inline-flex items-center gap-1.5 text-[var(--text-2)] hover:text-[var(--text)]"><RotateCcw className="size-3.5" />Retry</button>
          </p>
        ) : creators.length === 0 ? (
          <p className="py-16 text-center text-[13px] text-[var(--text-dim)]">No creators yet.</p>
        ) : (
          <div className="flex flex-col gap-7">
            {tab !== "creator" && main.length > 0 && (
              <section aria-label="Main Content Creators" className="flex flex-col gap-3">
                {tab === "all" && <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-dim)]">Main Content Creators</h2>}
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{main.map((creator) => <CreatorCard key={creator.userId} creator={creator} big />)}</div>
              </section>
            )}
            {tab !== "main" && others.length > 0 && (
              <section aria-label="Content Creators" className="flex flex-col gap-3">
                {tab === "all" && <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-dim)]">Content Creators</h2>}
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{others.map((creator) => <CreatorCard key={creator.userId} creator={creator} />)}</div>
              </section>
            )}
            {((tab === "main" && main.length === 0) || (tab === "creator" && others.length === 0)) && <p className="py-16 text-center text-[13px] text-[var(--text-dim)]">No creators here yet.</p>}
          </div>
        )}
      </div>
    </div>
  )
}
