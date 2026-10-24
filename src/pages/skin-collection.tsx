import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, ThumbsUp, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { skinchangerService, type SkinCollectionDetail, type SkinCollectionDetailItem } from "@/api"
import type { ApiError } from "@/api/types"
import { QueryState } from "@/components/query-state"
import { OptimizedImage } from "@/components/optimized-image"
import { PlayerAvatar } from "@/components/player-avatar"
import { TeamIcon } from "@/components/team-icon"
import { PageBar, PageTabs } from "@/components/page-tabs"
import type { SegmentOption } from "@/components/segmented"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { SLOT_LABEL, daysAgo, loadFailure, wearLabel } from "@/components/skin-collections"
import { useApiQuery } from "@/hooks/use-api-query"
import { rarityStyles } from "@/lib/cs2-rarity"
import { setSkinchangerView } from "@/lib/skinchanger-view"
import { cn } from "@/lib/utils"

type SideFilter = "all" | "t" | "ct" | "both"
const sideOf = (item: SkinCollectionDetailItem): SideFilter => (item.teamScope === "t" || item.teamScope === "ct" ? item.teamScope : "both")
const rarityRank = (item: SkinCollectionDetailItem) => (item.rarity ? rarityStyles[item.rarity]?.rank ?? 99 : 99)

/** "AK-47 | Redline" -> the weapon on top (quiet) and the finish below it (the thing a player recognises). */
function splitName(name: string) {
  const [weapon, ...rest] = name.split(" | ")
  return rest.length ? { weapon, finish: rest.join(" | ") } : { weapon: SLOT_LABEL.weapon, finish: name }
}

const chipClass = "inline-flex h-5 items-center rounded-md border border-[var(--line)] px-1.5 text-[11px] font-medium text-[var(--text-muted)]"

/** One item as a card: a large picture on a lit floor, the finish as the title, then rarity and how it is set up. */
function ItemCard({ item }: { item: SkinCollectionDetailItem }) {
  const accent = item.rarity ? rarityStyles[item.rarity]?.accent : undefined
  const { weapon, finish } = splitName(item.name)
  return (
    <li className="lx-layer group flex flex-col overflow-hidden rounded-xl border border-[var(--glass-line)] bg-[var(--glass-fill)] transition-[border-color,translate] duration-300 hover:-translate-y-0.5 hover:border-[var(--line-strong)] motion-reduce:transition-none">
      <div className="relative flex h-[116px] items-center justify-center sm:h-[168px] bg-[radial-gradient(ellipse_at_50%_85%,var(--raised),var(--card-surface)_70%)] px-5">
        <OptimizedImage src={item.imageUrl ?? ""} width={360} height={220} alt="" className="max-h-[88px] w-full object-contain sm:max-h-[132px] transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none" />
        {accent && <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[2px]" style={{ background: accent }} />}
        {(item.teamScope === "t" || item.teamScope === "ct") && <TeamIcon side={item.teamScope} className="absolute right-3 top-3 size-5" />}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2.5 p-3 sm:p-4">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-medium uppercase tracking-[1px] text-[var(--text-dim)]">{weapon}{item.slot !== "weapon" && item.slot !== "knife" ? ` · ${SLOT_LABEL[item.slot] ?? item.slot}` : ""}</p>
          <p className="truncate text-[15px] font-semibold text-[var(--text)]" title={item.name}>{finish}</p>
        </div>
        {item.rarity && (
          <p className="flex items-center gap-1.5 text-[13px] text-[var(--text-muted)]">
            <span aria-hidden="true" className="size-2 rounded-full" style={{ background: accent }} />
            {item.rarity.replace(/ Grade$/, "")}
          </p>
        )}
        <div className="mt-auto flex flex-wrap gap-1.5">
          {item.wear !== null && <span className={chipClass}>{wearLabel(item.wear)}</span>}
          {item.statTrak && <span className={chipClass}>StatTrak™</span>}
          {item.stickers > 0 && <span className={chipClass}>{item.stickers} sticker{item.stickers > 1 ? "s" : ""}</span>}
          {item.hasCharm && <span className={chipClass}>Charm</span>}
          {item.wear === null && !item.statTrak && item.stickers === 0 && !item.hasCharm && <span className="text-[11px] text-[var(--text-faint)]">Default settings</span>}
        </div>
      </div>
    </li>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-[17px] font-semibold text-[var(--text)]">{value}</span>
      <span className="text-[13px] text-[var(--text-dim)]">{label}</span>
    </div>
  )
}

/** One shared loadout on its own page: who made it, how it was received, and every item in it. */
export function SkinCollectionPage() {
  const { collectionId = "" } = useParams()
  const navigate = useNavigate()
  const [target, setTarget] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [busy, setBusy] = useState(false)
  const [side, setSide] = useState<SideFilter>("all")
  // The sidebar marks Collections while one is open, even when the address was opened directly.
  useEffect(() => { setSkinchangerView("collections") }, [])
  const { data, loading, error, refetch } = useApiQuery(
    (signal) => skinchangerService.getCollection(collectionId, { signal }),
    { queryKey: `collection-page:${collectionId}` },
  )
  const collection: SkinCollectionDetail | undefined = data?.collection

  const failure = (problem: unknown, fallback: string) => {
    const message = (problem as Partial<ApiError> | null)?.message
    toast.error(message && message.length < 140 ? message : fallback)
  }

  const back = () => { setSkinchangerView("collections"); navigate("/skinchanger") }

  const apply = async () => {
    if (!collection) return
    setBusy(true)
    try {
      const result = await skinchangerService.applyCollection(collection.id)
      toast.success(result.skipped > 0 ? `${collection.name} applied. ${result.skipped} unavailable items were skipped.` : `${collection.name} applied`)
      setTarget(false)
      setSkinchangerView("loadout")
      navigate("/skinchanger")
    } catch (problem) {
      failure(problem, "Could not apply the collection. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!collection) return
    setBusy(true)
    try {
      await skinchangerService.removeCollection(collection.id)
      setRemoving(false)
      back()
    } catch (problem) {
      failure(problem, "Could not remove the collection. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  const toggleLike = async () => {
    if (!collection) return
    try {
      await skinchangerService.likeCollection(collection.id, !collection.liked)
      refetch()
    } catch (problem) {
      failure(problem, "Could not save your like. Please try again.")
    }
  }

  const items = [...(collection?.items ?? [])].sort((x, y) => rarityRank(x) - rarityRank(y))
  const shown = side === "all" ? items : items.filter((item) => sideOf(item) === side)
  const sideOptions: SegmentOption<SideFilter>[] = [
    { value: "all", label: "All items", count: items.length },
    ...(["t", "ct", "both"] as const).flatMap((value) => {
      const count = items.filter((item) => sideOf(item) === value).length
      return count > 0 ? [{ value, label: value === "t" ? "T side" : value === "ct" ? "CT side" : "Both teams", count }] : []
    }),
  ]
  // The three rarest items stand in the header as the collection's face.
  const showcase = items.filter((item) => item.imageUrl).slice(0, 3)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageBar>
        <button type="button" onClick={back} className="-ml-1 inline-flex h-10 items-center gap-1.5 rounded-lg px-1 text-[13px] text-[var(--text-muted)] transition-colors hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60">
          <ArrowLeft className="size-4" />
          Collections
        </button>
        {collection && <div className="scrollbar-hidden -mr-6 max-w-full overflow-x-auto pr-6 [&_button]:whitespace-nowrap"><PageTabs value={side} onChange={setSide} options={sideOptions} ariaLabel="Show items by side" /></div>}
      </PageBar>

      <div className="scrollbar-hidden flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 pb-8 pt-5">
        {error ? (
          <QueryState loading={false} error={{ ...error, message: loadFailure(error).replace("collections", "this collection") }} empty={false} onRetry={refetch} />
        ) : loading || !collection ? (
          <div className="flex flex-col gap-6" aria-hidden="true">
            <Skeleton className="h-[200px] rounded-xl bg-[var(--glass-fill)]" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(220px,1fr))]">
              {Array.from({ length: 8 }, (_, index) => <Skeleton key={index} className="h-[290px] rounded-xl bg-[var(--glass-fill)]" />)}
            </div>
          </div>
        ) : (
          <>
            <header className="lx-layer flex flex-wrap items-center gap-x-10 gap-y-6 rounded-xl border border-[var(--glass-line)] bg-[var(--glass-fill)] p-6 sm:p-8">
              <div className="flex min-w-[260px] flex-1 flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <h1 className="font-display text-[30px] font-bold leading-tight tracking-[-0.4px] text-[var(--text)] [overflow-wrap:anywhere]">{collection.name}</h1>
                  <p className="max-w-[56ch] text-[15px] leading-relaxed text-[var(--text-muted)]">{collection.description || "No description."}</p>
                </div>
                <Link to={`/profile/${encodeURIComponent(collection.author.steamId)}`} className="flex w-fit items-center gap-2.5 rounded-lg text-[13px] text-[var(--text-dim)] transition-colors hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60">
                  <PlayerAvatar avatar={collection.author.avatar} name={collection.author.username} className="size-8 rounded-full" />
                  <span>by <span className="font-semibold text-[var(--text-2)]">{collection.author.username}</span> · {daysAgo(collection.createdAt)}</span>
                </Link>
                <div className="flex flex-wrap gap-x-6 gap-y-1">
                  <Stat label="items" value={collection.itemCount} />
                  <Stat label="likes" value={collection.likes} />
                  <Stat label="applied" value={collection.applies} />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => setTarget(true)} className="lx-primary-button inline-flex h-11 items-center rounded-lg px-6 text-[14px] font-semibold">
                    Apply to my loadout
                  </button>
                  <button type="button" disabled={collection.mine} onClick={() => void toggleLike()} aria-pressed={collection.liked} className={cn("inline-flex h-11 items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--raised)] px-4 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60 disabled:cursor-default", collection.liked ? "text-[var(--text)]" : "text-[var(--text-muted)] enabled:hover:text-[var(--text)]")}>
                    <ThumbsUp className={cn("size-4", collection.liked && "fill-current")} />
                    {collection.liked ? "Liked" : "Like"}
                  </button>
                  {collection.mine && (
                    <button type="button" onClick={() => setRemoving(true)} aria-label={`Remove ${collection.name}`} className="inline-flex size-11 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--raised)] text-[var(--text-muted)] transition-colors hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60">
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
              </div>
              {showcase.length > 0 && (
                <div aria-hidden="true" className="flex shrink-0 items-center max-lg:hidden">
                  {showcase.map((item, index) => (
                    <div key={`${item.name}:${index}`} className={cn("flex h-[150px] w-[190px] items-center justify-center rounded-xl border border-[var(--line-soft)] bg-[var(--card-surface)] p-3", index > 0 && "-ml-8")} style={{ zIndex: showcase.length - index, rotate: `${(index - 1) * 3}deg` }}>
                      <OptimizedImage src={item.imageUrl ?? ""} width={260} height={160} alt="" className="max-h-[118px] w-full object-contain" />
                    </div>
                  ))}
                </div>
              )}
            </header>

            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] sm:gap-4">
              {shown.map((item, index) => <ItemCard key={`${item.name}:${item.teamScope}:${index}`} item={item} />)}
            </ul>
          </>
        )}
      </div>

      <AlertDialog open={target} onOpenChange={(open) => { if (!open && !busy) setTarget(false) }}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Replace your loadout?</AlertDialogTitle>
            <AlertDialogDescription>
              {collection ? `Applying ${collection.name} by ${collection.author.username} replaces everything you have equipped now with its ${collection.itemCount} items, for both teams. This can't be undone.` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Keep my loadout</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={(event) => { event.preventDefault(); void apply() }}>Replace</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={removing} onOpenChange={(open) => { if (!open && !busy) setRemoving(false) }}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {collection?.name}?</AlertDialogTitle>
            <AlertDialogDescription>It disappears for everyone. Players who already applied it keep their loadout.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Keep it</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={(event) => { event.preventDefault(); void remove() }}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
