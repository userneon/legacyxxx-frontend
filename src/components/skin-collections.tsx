import { useState } from "react"
import { Download, Search, Share2, ThumbsUp, Trash2, X } from "lucide-react"
import { toast } from "sonner"

import { skinchangerService, type SkinCollection, type SkinCollectionDetailItem, type SkinCollectionSort } from "@/api"
import type { ApiError } from "@/api/types"
import { QueryState } from "@/components/query-state"
import { OptimizedImage } from "@/components/optimized-image"
import { PageTabs, pageSearchClass } from "@/components/page-tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { useApiQuery } from "@/hooks/use-api-query"
import { rarityStyles } from "@/lib/cs2-rarity"
import { cn } from "@/lib/utils"

const SORTS: Array<{ value: SkinCollectionSort; label: string }> = [
  { value: "popular", label: "Popular" },
  { value: "new", label: "New" },
  { value: "mine", label: "Mine" },
]

/** Says what went wrong, so a server that has not been updated yet is not mistaken for a broken page. */
function loadFailure(error: ApiError) {
  if (error.status === 404) return "Could not load collections: the server does not have them yet (404). Update the backend, then retry."
  if (error.status === 0) return "Could not load collections: the server could not be reached. Check the connection and retry."
  const detail = error.message && error.message.length < 140 ? `: ${error.message}` : ""
  return `Could not load collections (${error.status})${detail}`
}

const SLOT_LABEL: Record<string, string> = { weapon: "Weapon", knife: "Knife", glove: "Gloves", agent: "Agent", music_kit: "Music kit", pin: "Pin" }
const SCOPE_LABEL: Record<string, string> = { t: "T", ct: "CT" }

function wearLabel(wear: number) {
  return wear < 0.07 ? "Factory New" : wear < 0.15 ? "Minimal Wear" : wear < 0.38 ? "Field-Tested" : wear < 0.45 ? "Well-Worn" : "Battle-Scarred"
}

/** One item of a collection: picture, name, where it goes and how it is set up. */
function DetailRow({ item }: { item: SkinCollectionDetailItem }) {
  const accent = item.rarity ? rarityStyles[item.rarity]?.accent : undefined
  const extras = [
    item.wear !== null && wearLabel(item.wear),
    item.statTrak && "StatTrak™",
    item.stickers > 0 && `${item.stickers} sticker${item.stickers > 1 ? "s" : ""}`,
    item.hasCharm && "Charm",
  ].filter(Boolean) as string[]
  return (
    <li className="relative flex items-center gap-3 overflow-hidden rounded-[10px] border border-[var(--line-soft)] bg-[var(--card-surface)] py-2 pl-3 pr-3">
      {accent && <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[3px]" style={{ background: accent }} />}
      <div className="flex h-12 w-[76px] shrink-0 items-center justify-center">
        <OptimizedImage src={item.imageUrl ?? ""} width={120} height={64} alt="" className="max-h-12 w-full object-contain" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-[var(--text)]">{item.name}</p>
        <p className="truncate text-[11px] text-[var(--text-dim)]">{extras.length ? extras.join(" · ") : item.rarity ?? "Default settings"}</p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1 text-[11px] text-[var(--text-faint)]">
        <span>{SLOT_LABEL[item.slot] ?? item.slot}</span>
        {SCOPE_LABEL[item.teamScope] && <span className="rounded-md border border-[var(--line)] px-1.5 py-px font-semibold text-[var(--text-muted)]">{SCOPE_LABEL[item.teamScope]}</span>}
      </div>
    </li>
  )
}

function daysAgo(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  return days < 1 ? "today" : days === 1 ? "yesterday" : `${days} days ago`
}

/** Community collections: loadouts other players shared. Applying one replaces your whole loadout. */
export function SkinCollections({ onApplied }: { onApplied: () => void }) {
  const [sort, setSort] = useState<SkinCollectionSort>("popular")
  const [query, setQuery] = useState("")
  const [target, setTarget] = useState<SkinCollection | null>(null)
  const [viewing, setViewing] = useState<SkinCollection | null>(null)
  const [removing, setRemoving] = useState<SkinCollection | null>(null)
  const [applying, setApplying] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [shareName, setShareName] = useState("")
  const [shareNote, setShareNote] = useState("")
  const [busy, setBusy] = useState(false)
  const { data, loading, error, refetch } = useApiQuery(
    (signal) => skinchangerService.getCollections({ sort, query: query.trim() || undefined }, { signal }),
    { queryKey: `collections:${sort}:${query.trim()}` },
  )
  const collections = data?.collections ?? []
  const { data: detail, loading: detailLoading, error: detailError, refetch: refetchDetail } = useApiQuery(
    (signal) => skinchangerService.getCollection(viewing!.id, { signal }),
    { enabled: Boolean(viewing), queryKey: `collection:${viewing?.id ?? ""}` },
  )

  const failure = (error: unknown, fallback: string) => {
    const message = (error as Partial<ApiError> | null)?.message
    toast.error(message && message.length < 140 ? message : fallback)
  }

  const apply = async () => {
    if (!target) return
    setApplying(true)
    try {
      const result = await skinchangerService.applyCollection(target.id)
      toast.success(result.skipped > 0 ? `${target.name} applied. ${result.skipped} unavailable items were skipped.` : `${target.name} applied`)
      setTarget(null)
      onApplied()
    } catch (error) {
      failure(error, "Could not apply the collection. Please try again.")
    } finally {
      setApplying(false)
    }
  }

  const share = async () => {
    setBusy(true)
    try {
      await skinchangerService.shareCollection({ name: shareName.trim(), description: shareNote.trim() })
      toast.success("Your loadout is shared")
      setSharing(false)
      setShareName("")
      setShareNote("")
      setSort("mine")
      refetch()
    } catch (error) {
      failure(error, "Could not share your loadout. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!removing) return
    setBusy(true)
    try {
      await skinchangerService.removeCollection(removing.id)
      setRemoving(null)
      refetch()
    } catch (error) {
      failure(error, "Could not remove the collection. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  const toggleLike = async (collection: SkinCollection) => {
    try {
      await skinchangerService.likeCollection(collection.id, !collection.liked)
      refetch()
    } catch (error) {
      failure(error, "Could not save your like. Please try again.")
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
        <QueryState loading={false} error={{ ...error, message: loadFailure(error) }} empty={false} onRetry={refetch} />
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
              <button type="button" onClick={() => setViewing(collection)} aria-label={`See everything in ${collection.name}`} className="grid grid-cols-4 gap-1.5 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/50">
                {(collection.itemCount > 4 ? collection.items.slice(0, 3) : collection.items).map((item, index) => {
                  const accent = item.rarity ? rarityStyles[item.rarity]?.accent : undefined
                  return (
                    <div key={`${item.name}:${index}`} title={item.name} className="relative flex h-[58px] items-center justify-center overflow-hidden rounded-lg border border-[var(--line-soft)] bg-[var(--card-surface)]">
                      <OptimizedImage src={item.imageUrl ?? ""} width={120} height={64} alt={item.name} className="max-h-[46px] w-[88%] object-contain" />
                      {accent && <span aria-hidden="true" className="absolute bottom-0 left-0 h-[2px] w-full" style={{ background: accent }} />}
                    </div>
                  )
                })}
                {collection.itemCount > 4 && (
                  <div className="flex h-[58px] items-center justify-center rounded-lg border border-[var(--line-soft)] text-[13px] font-semibold text-[var(--text-dim)]">+{collection.itemCount - 3}</div>
                )}
              </button>
              <div className="min-w-0">
                <h3 className="truncate text-[15px] font-semibold text-[var(--text)]"><button type="button" onClick={() => setViewing(collection)} className="max-w-full truncate hover:underline focus-visible:outline-none focus-visible:underline">{collection.name}</button></h3>
                <p className="mt-0.5 line-clamp-1 text-[13px] text-[var(--text-dim)]">{collection.description}</p>
                <p className="mt-1.5 text-[11px] text-[var(--text-faint)]">
                  by <span className="text-[var(--text-muted)]">{collection.author.username}</span> · {collection.itemCount} items · {daysAgo(collection.createdAt)}
                </p>
              </div>
              <div className="mt-auto flex items-center gap-3 border-t border-[var(--line-soft)] pt-3">
<button type="button" disabled={collection.mine} onClick={() => void toggleLike(collection)} aria-pressed={collection.liked} aria-label={collection.liked ? "Remove like" : "Like"} className={cn("inline-flex items-center gap-1.5 text-[13px] transition-colors enabled:hover:text-[var(--text)] disabled:cursor-default", collection.liked ? "text-[var(--text)]" : "text-[var(--text-dim)]")}>
                  <ThumbsUp className={cn("size-3.5", collection.liked && "fill-current")} />
                  {collection.likes}
                </button>
                <span className="inline-flex items-center gap-1.5 text-[13px] text-[var(--text-dim)]">
                  <Download className="size-3.5" />
                  {collection.applies}
                </span>
                {collection.mine && (
                  <button type="button" onClick={() => setRemoving(collection)} aria-label={`Remove ${collection.name}`} className="ml-auto inline-flex size-8 items-center justify-center rounded-lg text-[var(--text-dim)] transition-colors hover:bg-[var(--raised)] hover:text-[var(--text)]">
                    <Trash2 className="size-4" />
                  </button>
                )}
                <button type="button" onClick={() => setTarget(collection)} className={cn("lx-primary-button inline-flex h-8 items-center rounded-lg px-4 text-[13px] font-semibold", !collection.mine && "ml-auto")}>
                  Apply
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Sheet open={Boolean(viewing)} onOpenChange={(open) => { if (!open) setViewing(null) }}>
        <SheetContent
          side="right"
          showCloseButton={false}
          overlayClassName="lx-sheet-overlay bg-[rgba(10,10,10,0.55)] data-[state=open]:duration-300 data-[state=closed]:duration-200"
          className="lx-sheet inset-y-2 right-2 h-auto w-[460px] max-w-[calc(100%-16px)] gap-0 overflow-hidden rounded-2xl border border-[var(--line)] p-0 data-[state=open]:duration-[450ms] data-[state=open]:ease-[cubic-bezier(0.22,1,0.36,1)] data-[state=closed]:duration-[250ms] data-[state=closed]:ease-[cubic-bezier(0.4,0,1,1)] sm:max-w-[460px]"
        >
          {viewing && (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex items-start gap-3 border-b border-[var(--line-soft)] p-[18px]">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <SheetTitle className="truncate text-lg font-bold tracking-[-0.2px] text-[var(--text)]">{viewing.name}</SheetTitle>
                  <SheetDescription className="text-[13px] text-[var(--text-dim)]">{viewing.description || "No description."}</SheetDescription>
                  <p className="mt-1 text-[11px] text-[var(--text-faint)]">
                    by <span className="text-[var(--text-muted)]">{viewing.author.username}</span> · {viewing.itemCount} items · {daysAgo(viewing.createdAt)} · {viewing.likes} likes · {viewing.applies} applies
                  </p>
                </div>
                <button type="button" onClick={() => setViewing(null)} aria-label="Close" className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-[var(--line)] text-[var(--text-muted)] transition-colors hover:border-[var(--line-strong)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/50">
                  <X className="size-4" />
                </button>
              </div>
              <div className="scrollbar-hidden flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-[18px]">
                {detailError ? (
                  <QueryState loading={false} error={{ ...detailError, message: loadFailure(detailError).replace("collections", "this collection") }} empty={false} onRetry={refetchDetail} />
                ) : detailLoading || !detail ? (
                  Array.from({ length: Math.min(viewing.itemCount, 8) }, (_, index) => <Skeleton key={index} className="h-[64px] rounded-[10px] bg-[var(--glass-fill)]" />)
                ) : (
                  <ul className="flex flex-col gap-2">{detail.collection.items.map((item, index) => <DetailRow key={`${item.name}:${item.teamScope}:${index}`} item={item} />)}</ul>
                )}
              </div>
              <div className="border-t border-[var(--line-soft)] p-[18px]">
                <button type="button" onClick={() => { setTarget(viewing); setViewing(null) }} className="lx-primary-button inline-flex h-10 w-full items-center justify-center rounded-lg text-[13px] font-semibold">Apply to my loadout</button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={Boolean(target)} onOpenChange={(open) => { if (!open && !applying) setTarget(null) }}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Replace your loadout?</AlertDialogTitle>
            <AlertDialogDescription>
              {target ? `Applying ${target.name} by ${target.author.username} replaces everything you have equipped now with its ${target.itemCount} items, for both teams. This can't be undone.` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={applying}>Keep my loadout</AlertDialogCancel>
            <AlertDialogAction disabled={applying} onClick={(event) => { event.preventDefault(); void apply() }}>Replace</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(removing)} onOpenChange={(open) => { if (!open && !busy) setRemoving(null) }}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {removing?.name}?</AlertDialogTitle>
            <AlertDialogDescription>It disappears for everyone. Players who already applied it keep their loadout.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Keep it</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={(event) => { event.preventDefault(); void remove() }}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={sharing} onOpenChange={(open) => { if (!busy) setSharing(open) }}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Share my loadout</AlertDialogTitle>
            <AlertDialogDescription>What you have equipped now becomes a collection anyone can apply. You can share up to 5.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-2.5">
            <input value={shareName} onChange={(event) => setShareName(event.target.value)} maxLength={40} placeholder="Collection name" aria-label="Collection name" className="h-10 rounded-lg border border-[var(--line)] bg-transparent px-3 text-[13px] text-[var(--text)] outline-none placeholder:text-[var(--text-dim)] focus:border-[var(--text-faint)]" />
            <textarea value={shareNote} onChange={(event) => setShareNote(event.target.value)} maxLength={120} rows={2} placeholder="Description (optional)" aria-label="Description" className="resize-none rounded-lg border border-[var(--line)] bg-transparent px-3 py-2.5 text-[13px] text-[var(--text)] outline-none placeholder:text-[var(--text-dim)] focus:border-[var(--text-faint)]" />
            <span className="text-right text-[11px] text-[var(--text-faint)]">{shareNote.length}/120</span>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={busy || shareName.trim().length < 3} onClick={(event) => { event.preventDefault(); void share() }}>Share</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
