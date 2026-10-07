import { useState } from "react"
import { Download, Search, Share2, ThumbsUp } from "lucide-react"
import { toast } from "sonner"

import { skinchangerService, type SkinCollection, type SkinCollectionSort, type TeamScope } from "@/api"
import { QueryState } from "@/components/query-state"
import { OptimizedImage } from "@/components/optimized-image"
import { PageTabs, pageSearchClass } from "@/components/page-tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { useApiQuery } from "@/hooks/use-api-query"
import { rarityStyles } from "@/lib/cs2-rarity"
import { cn } from "@/lib/utils"
import teamTIcon from "@/assets/skinchanger/team-t.webp"
import teamCtIcon from "@/assets/skinchanger/team-ct.webp"

const SORTS: Array<{ value: SkinCollectionSort; label: string }> = [
  { value: "popular", label: "Popular" },
  { value: "new", label: "New" },
  { value: "mine", label: "Mine" },
]

const TEAMS: Array<{ id: TeamScope; label: string; icon: string | null }> = [
  { id: "t", label: "Terrorist", icon: teamTIcon },
  { id: "ct", label: "Counter-Terrorist", icon: teamCtIcon },
  { id: "all", label: "Both teams", icon: null },
]

function daysAgo(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  return days < 1 ? "today" : days === 1 ? "yesterday" : `${days} days ago`
}

/** Community collections: loadouts other players shared. One press applies a whole collection to the chosen side. */
export function SkinCollections({ team, onApplied }: { team: "t" | "ct"; onApplied: () => void }) {
  const [sort, setSort] = useState<SkinCollectionSort>("popular")
  const [query, setQuery] = useState("")
  const [target, setTarget] = useState<SkinCollection | null>(null)
  const [side, setSide] = useState<TeamScope>(team)
  const [applying, setApplying] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [shareName, setShareName] = useState("")
  const { data, loading, error, refetch } = useApiQuery(
    (signal) => skinchangerService.getCollections({ sort, query: query.trim() || undefined }, { signal }),
    { queryKey: `collections:${sort}:${query.trim()}` },
  )
  const collections = data?.collections ?? []

  const apply = async () => {
    if (!target) return
    setApplying(true)
    try {
      await skinchangerService.applyCollection(target.id, side)
      toast.success(`${target.name} applied`)
      setTarget(null)
      onApplied()
    } catch {
      toast.error("Could not apply the collection. Please try again.")
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <PageTabs value={sort} onChange={setSort} options={SORTS} ariaLabel="Collections" />
        <label className={cn(pageSearchClass, "ml-auto")}>
          <Search className="size-3.5 text-[var(--text-dim)]" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search collections" aria-label="Search collections" className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--text)] outline-none placeholder:text-[var(--text-dim)]" />
        </label>
        <button type="button" onClick={() => setSharing(true)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--raised)] px-3 text-[13px] font-medium text-[var(--text)] transition-colors hover:border-[var(--line-strong)]">
          <Share2 className="size-4" />
          Share my loadout
        </button>
      </div>

      {error ? (
        <QueryState loading={false} error={{ ...error, message: "Could not load collections. Please try again." }} empty={false} onRetry={refetch} />
      ) : loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
          {Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-[218px] rounded-[10px] bg-[var(--glass-fill)]" />)}
        </div>
      ) : collections.length === 0 ? (
        <p className="py-10 text-center text-[13px] text-[var(--text-dim)]">{sort === "mine" ? "You have not shared a loadout yet." : "No collections found."}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {collections.map((collection) => (
            <article key={collection.id} className="lx-layer group flex flex-col gap-3 rounded-[10px] border border-[var(--glass-line)] bg-[var(--glass-fill)] p-3 transition-colors duration-300 hover:border-[var(--line-strong)]">
              <div className="grid grid-cols-4 gap-1.5">
                {(collection.items.length > 4 ? collection.items.slice(0, 3) : collection.items).map((item, index) => {
                  const accent = item.rarity ? rarityStyles[item.rarity]?.accent : undefined
                  return (
                    <div key={`${item.name}:${index}`} title={item.name} className="relative flex h-[58px] items-center justify-center overflow-hidden rounded-lg border border-[var(--line-soft)] bg-[var(--card-surface)]">
                      <OptimizedImage src={item.imageUrl ?? ""} width={120} height={64} alt={item.name} className="max-h-[46px] w-[88%] object-contain" />
                      {accent && <span aria-hidden="true" className="absolute bottom-0 left-0 h-[2px] w-full" style={{ background: accent }} />}
                    </div>
                  )
                })}
                {collection.items.length > 4 && (
                  <div className="flex h-[58px] items-center justify-center rounded-lg border border-[var(--line-soft)] text-[13px] font-semibold text-[var(--text-dim)]">+{collection.items.length - 3}</div>
                )}
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-[15px] font-semibold text-[var(--text)]">{collection.name}</h3>
                <p className="mt-0.5 line-clamp-1 text-[13px] text-[var(--text-dim)]">{collection.description}</p>
                <p className="mt-1.5 text-[11px] text-[var(--text-faint)]">
                  by <span className="text-[var(--text-muted)]">{collection.author.username}</span> · {collection.items.length} items · {daysAgo(collection.createdAt)}
                </p>
              </div>
              <div className="mt-auto flex items-center gap-3 border-t border-[var(--line-soft)] pt-3">
                <span className={cn("inline-flex items-center gap-1.5 text-[13px]", collection.liked ? "text-[var(--text)]" : "text-[var(--text-dim)]")}>
                  <ThumbsUp className="size-3.5" />
                  {collection.likes}
                </span>
                <span className="inline-flex items-center gap-1.5 text-[13px] text-[var(--text-dim)]">
                  <Download className="size-3.5" />
                  {collection.applies}
                </span>
                <button type="button" onClick={() => { setSide(team); setTarget(collection) }} className="lx-primary-button ml-auto inline-flex h-8 items-center rounded-lg px-4 text-[13px] font-semibold">
                  Apply
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <AlertDialog open={Boolean(target)} onOpenChange={(open) => { if (!open && !applying) setTarget(null) }}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Apply {target?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {target ? `${target.items.length} items from ${target.author.username} replace the matching slots in your loadout. Everything else stays as it is.` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div role="radiogroup" aria-label="Apply to" className="flex flex-col gap-1.5">
            {TEAMS.map((option) => (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={side === option.id}
                onClick={() => setSide(option.id)}
                className={cn("flex h-10 items-center gap-2.5 rounded-lg border px-3 text-[13px] font-medium transition-colors", side === option.id ? "border-[var(--accent-solid)] text-[var(--text)]" : "border-[var(--line)] text-[var(--text-muted)] hover:bg-[var(--raised)]")}
              >
                {option.icon ? <img src={option.icon} alt="" className="size-4 object-contain" /> : <span className="size-4" />}
                {option.label}
              </button>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={applying}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={applying} onClick={(event) => { event.preventDefault(); void apply() }}>Apply</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={sharing} onOpenChange={setSharing}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Share my loadout</AlertDialogTitle>
            <AlertDialogDescription>Your current loadout becomes a free collection anyone can apply.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-2.5">
            <input value={shareName} onChange={(event) => setShareName(event.target.value)} maxLength={40} placeholder="Collection name" aria-label="Collection name" className="h-10 rounded-lg border border-[var(--line)] bg-transparent px-3 text-[13px] text-[var(--text)] outline-none placeholder:text-[var(--text-dim)] focus:border-[var(--text-faint)]" />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={!shareName.trim()} onClick={() => toast("Sharing opens when collections go live.")}>Share</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
