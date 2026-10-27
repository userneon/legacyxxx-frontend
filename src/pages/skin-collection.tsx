import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, ThumbsUp, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { skinchangerService, type SkinCollectionDetail, type SkinCollectionDetailItem } from "@/api"
import type { SkinAccessory } from "@/api/skinchanger"
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

/** A sticker or charm on a weapon: its picture when there is one, always its name (in the tooltip and, for a charm, beside it). */
function AccessoryThumb({ accessory, label }: { accessory: SkinAccessory; label: string }) {
  return (
    <span title={`${label}: ${accessory.name}`} className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-md border border-[var(--line)] bg-[var(--card-surface)]">
      {accessory.imageUrl ? <OptimizedImage src={accessory.imageUrl} width={64} height={64} alt={accessory.name} className="size-7 object-contain" /> : <span aria-hidden="true" className="text-[10px] font-semibold text-[var(--text-dim)]">{accessory.name.slice(0, 2).toUpperCase()}</span>}
    </span>
  )
}

/** One item as a compact card: the picture on a lit floor, the finish as the title, its set-up, and exactly which stickers and charm it carries. */
function ItemCard({ item, index }: { item: SkinCollectionDetailItem; index: number }) {
  const accent = item.rarity ? rarityStyles[item.rarity]?.accent : undefined
  const { weapon, finish } = splitName(item.name)
  const stickers = item.stickerItems ?? []
  return (
    <li style={{ animationDelay: `${Math.min(index, 10) * 40}ms` }} className="lx-layer lx-row-in group flex flex-col overflow-hidden rounded-xl border border-[var(--glass-line)] bg-[var(--glass-fill)] transition-[translate,border-color,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:border-[var(--line-strong)] hover:shadow-[0_14px_30px_-18px_rgb(0_0_0/0.8)] motion-reduce:transition-none motion-reduce:hover:translate-y-0">
      <div className="relative flex h-[88px] items-center justify-center bg-[radial-gradient(ellipse_at_50%_90%,var(--raised),var(--card-surface)_72%)] px-3 sm:h-[100px]">
        <OptimizedImage src={item.imageUrl ?? ""} width={320} height={200} alt="" className="max-h-[68px] w-full object-contain transition-[rotate,translate] duration-300 ease-out group-hover:-translate-y-1 group-hover:-rotate-[5deg] sm:max-h-[78px] motion-reduce:transition-none motion-reduce:group-hover:rotate-0 motion-reduce:group-hover:translate-y-0" />
        {accent && <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[2px]" style={{ background: accent }} />}
        {(item.teamScope === "t" || item.teamScope === "ct") && <TeamIcon side={item.teamScope} className="absolute right-2.5 top-2.5 size-4" />}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-3">
        <div className="min-w-0">
          <p className="truncate text-[10px] font-medium uppercase tracking-[1px] text-[var(--text-dim)]">{weapon}{item.slot !== "weapon" && item.slot !== "knife" ? ` · ${SLOT_LABEL[item.slot] ?? item.slot}` : ""}</p>
          <p className="truncate text-[13px] font-semibold text-[var(--text)]" title={item.name}>{finish}</p>
        </div>
        {(stickers.length > 0 || item.charm) && (
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-1">
              {stickers.map((sticker, n) => <AccessoryThumb key={`${sticker.name}:${n}`} accessory={sticker} label="Sticker" />)}
              {item.charm && <AccessoryThumb accessory={item.charm} label="Charm" />}
            </div>
            <p className="line-clamp-2 text-[11px] leading-snug text-[var(--text-muted)]">
              {[...stickers.map((sticker) => sticker.name), ...(item.charm ? [`Charm: ${item.charm.name}`] : [])].join(" · ")}
            </p>
          </div>
        )}
        <div className="mt-auto flex flex-wrap gap-1">
          {item.wear !== null && <span className={chipClass}>{wearLabel(item.wear)}</span>}
          {item.statTrak && <span className={chipClass}>StatTrak™</span>}
          {/* An older server sends only how many: say that much when it does not name them. */}
          {stickers.length === 0 && item.stickers > 0 && <span className={chipClass}>{item.stickers} sticker{item.stickers > 1 ? "s" : ""}</span>}
          {!item.charm && item.hasCharm && <span className={chipClass}>Charm</span>}
          {item.wear === null && !item.statTrak && item.stickers === 0 && !item.hasCharm && <span className="text-[11px] text-[var(--text-faint)]">Default settings</span>}
        </div>
      </div>
    </li>
  )
}

/** The rarities in this collection as one thin bar (a share per rarity, from the real item counts) with a line of names under it. */
function RarityBar({ items }: { items: SkinCollectionDetailItem[] }) {
  const counts = new Map<string, number>()
  for (const item of items) if (item.rarity && rarityStyles[item.rarity]) counts.set(item.rarity, (counts.get(item.rarity) ?? 0) + 1)
  const rows = [...counts.entries()].sort((x, y) => rarityStyles[x[0]].rank - rarityStyles[y[0]].rank)
  if (rows.length === 0) return null
  return (
    <div className="flex max-w-[460px] flex-col gap-2" aria-label="Rarity of the items">
      <div className="flex h-1 w-full gap-0.5 overflow-hidden rounded-full">
        {rows.map(([name, count]) => <span key={name} aria-hidden="true" className="h-full rounded-full" style={{ flexGrow: count, flexBasis: 0, background: rarityStyles[name].accent }} />)}
      </div>
      <p className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[var(--text-dim)]">
        {rows.map(([name, count]) => (
          <span key={name} className="inline-flex items-center gap-1.5"><span aria-hidden="true" className="size-1.5 rounded-full" style={{ background: rarityStyles[name].accent }} />{count} {name.replace(/ Grade$/, "")}</span>
        ))}
      </p>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex min-w-0 flex-col-reverse gap-1 pr-6 [&:not(:first-child)]:border-l [&:not(:first-child)]:border-[var(--line)] [&:not(:first-child)]:pl-6">
      <span className="text-[11px] font-medium uppercase tracking-wide text-[var(--text-dim)]">{label}</span>
      <span key={value} className="lx-count-in text-[24px] font-semibold leading-none text-[var(--text)]">{value}</span>
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
  const { data, error, refetch } = useApiQuery(
    (signal) => skinchangerService.getCollection(collectionId, { signal }),
    { queryKey: `collection-page:${collectionId}`, keepPreviousData: true },
  )
  const collection: SkinCollectionDetail | undefined = data?.collection
  // An address with the long id moves to the short one (/skinchanger/collections/7).
  useEffect(() => {
    if (collection?.number !== undefined && collectionId !== String(collection.number)) navigate(`/skinchanger/collections/${collection.number}`, { replace: true })
  }, [collection?.number, collectionId, navigate])

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

  // A like shows at once and pops; the server's answer replaces it, and a refusal puts it back.
  const [likeState, setLikeState] = useState<{ liked: boolean; likes: number } | null>(null)
  const [popped, setPopped] = useState(false)
  const liked = likeState?.liked ?? collection?.liked ?? false
  const likes = likeState?.likes ?? collection?.likes ?? 0
  const toggleLike = async () => {
    if (!collection) return
    const before = { liked, likes }
    const next = { liked: !liked, likes: likes + (liked ? -1 : 1) }
    setLikeState(next)
    setPopped(next.liked)
    try {
      const result = await skinchangerService.likeCollection(collection.id, next.liked)
      setLikeState({ liked: result.liked, likes: result.likes })
    } catch (problem) {
      setLikeState(before)
      failure(problem, "Could not save your like. Please try again.")
    }
  }

  const items = [...(collection?.items ?? [])].sort((x, y) => rarityRank(x) - rarityRank(y))
  // Changing side lets the current cards shrink away first, then the new side's cards arrive one after another.
  const [shownSide, setShownSide] = useState<SideFilter>("all")
  const [leaving, setLeaving] = useState(false)
  const changeSide = (next: SideFilter) => {
    if (next === side) return
    setSide(next)
    setLeaving(true)
    window.setTimeout(() => { setShownSide(next); setLeaving(false) }, 180)
  }
  const shown = shownSide === "all" ? items : items.filter((item) => sideOf(item) === shownSide)
  const sideLabel = (value: SideFilter) => (value === "all" ? "All items" : value === "t" ? "T side" : value === "ct" ? "CT side" : "Both teams")
  const sideOptions: SegmentOption<SideFilter>[] = [
    { value: "all", label: "All items", count: items.length },
    ...(["t", "ct", "both"] as const).flatMap((value) => {
      const count = items.filter((item) => sideOf(item) === value).length
      return count > 0 ? [{ value, label: sideLabel(value), count }] : []
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
        {collection && <div className="scrollbar-hidden -mr-6 max-w-full overflow-x-auto pr-6 [&_button]:whitespace-nowrap"><PageTabs value={side} onChange={changeSide} options={sideOptions} ariaLabel="Show items by side" /></div>}
      </PageBar>

      <div className="scrollbar-hidden flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 pb-8 pt-5">
        {error ? (
          <QueryState loading={false} error={{ ...error, message: loadFailure(error).replace("collections", "this collection") }} empty={false} onRetry={refetch} />
        ) : !collection ? (
          <div className="flex flex-col gap-6" aria-hidden="true">
            <Skeleton className="h-[200px] rounded-xl bg-[var(--glass-fill)]" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(168px,1fr))]">
              {Array.from({ length: 8 }, (_, index) => <Skeleton key={index} className="h-[290px] rounded-xl bg-[var(--glass-fill)]" />)}
            </div>
          </div>
        ) : (
          <>
            <header className="lx-layer lx-swap-in flex flex-col gap-8 overflow-hidden rounded-2xl border border-[var(--glass-line)] bg-[var(--glass-fill)] p-6 sm:p-9">
              <div className="flex min-w-0 flex-col gap-5">
                <div className="flex flex-col gap-3">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-dim)]">Collection</span>
                  <h1 className="font-display text-[34px] font-bold leading-[1.05] tracking-[-0.5px] text-[var(--text)] [overflow-wrap:anywhere] sm:text-[40px]">{collection.name}</h1>
                  <p className="max-w-[56ch] text-[15px] leading-relaxed text-[var(--text-muted)]">{collection.description || "No description."}</p>
                </div>
                <Link to={`/profile/${encodeURIComponent(collection.author.steamId)}`} className="flex w-fit items-center gap-2.5 rounded-full border border-[var(--line)] py-1 pl-1 pr-3.5 text-[13px] text-[var(--text-dim)] transition-colors hover:border-[var(--line-strong)] hover:bg-[var(--raised)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]">
                  <PlayerAvatar avatar={collection.author.avatar} name={collection.author.username} className="size-7 rounded-full" />
                  <span>by <span className="font-semibold text-[var(--text-2)]">{collection.author.username}</span> · {daysAgo(collection.createdAt)}</span>
                </Link>
                <div className="flex flex-wrap gap-y-3">
                  <Stat label="items" value={collection.itemCount} />
                  <Stat label="likes" value={likes} />
                  <Stat label="applied" value={collection.applies} />
                </div>
                <RarityBar items={items} />
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button type="button" onClick={() => setTarget(true)} className="lx-primary-button inline-flex h-12 items-center rounded-lg px-7 text-[14px] font-semibold">
                    Apply to my loadout
                  </button>
                  <button type="button" disabled={collection.mine} onClick={() => void toggleLike()} aria-pressed={liked} className={cn("inline-flex h-12 items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--raised)] px-5 text-[13px] font-medium transition-colors hover:border-[var(--line-strong)] disabled:cursor-default disabled:opacity-60", liked ? "text-[var(--text)]" : "text-[var(--text-2)]")}>
                    <ThumbsUp className={cn("size-4", liked && "fill-current", popped && liked && "lx-like-pop")} />
                    {liked ? "Liked" : "Like"}
                  </button>
                  {collection.mine && (
                    <button type="button" onClick={() => setRemoving(true)} aria-label={`Remove ${collection.name}`} className="inline-flex size-12 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--raised)] text-[var(--text-muted)] transition-colors hover:border-[var(--line-strong)] hover:text-[var(--text)]">
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
              </div>
              {showcase.length > 0 && (
                <div aria-hidden="true" className="grid grid-cols-3 items-end gap-3 sm:gap-4">
                  {[showcase[1], showcase[0], showcase[2]].map((item, index) => item ? (
                    <div key={`${item.name}:${index}`} className={cn("relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-[var(--line-soft)] bg-[radial-gradient(ellipse_at_50%_90%,var(--raised),var(--card-surface)_72%)] p-3 sm:p-4", index === 1 ? "h-[150px] sm:h-[210px]" : "h-[120px] sm:h-[170px]")}>
                      <OptimizedImage src={item.imageUrl ?? ""} width={400} height={240} alt="" className={cn("w-full object-contain", index === 1 ? "max-h-[96px] sm:max-h-[140px]" : "max-h-[70px] sm:max-h-[100px]")} />
                      <span className="mt-2 max-w-full truncate text-[11px] font-medium text-[var(--text-dim)]">{splitName(item.name).finish}</span>
                      {item.rarity && rarityStyles[item.rarity] && <span className="absolute inset-x-0 bottom-0 h-[2px]" style={{ background: rarityStyles[item.rarity].accent }} />}
                    </div>
                  ) : <div key={index} />)}
                </div>
              )}
            </header>

            <ul key={shownSide} className={cn("grid grid-cols-2 gap-3 transition-[opacity,scale] duration-[180ms] ease-out sm:grid-cols-[repeat(auto-fill,minmax(152px,1fr))] motion-reduce:transition-none", leaving && "scale-[0.97] opacity-0")}>
              {shown.map((item, index) => <ItemCard key={`${item.name}:${item.teamScope}:${index}`} item={item} index={index} />)}
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
