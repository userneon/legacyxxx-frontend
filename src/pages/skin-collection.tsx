import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Layers, ThumbsUp, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { skinchangerService, type SkinCollectionDetail, type SkinCollectionDetailItem } from "@/api"
import type { ApiError } from "@/api/types"
import { QueryState } from "@/components/query-state"
import { OptimizedImage } from "@/components/optimized-image"
import { PlayerAvatar } from "@/components/player-avatar"
import { TeamIcon } from "@/components/team-icon"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { SLOT_LABEL, daysAgo, loadFailure, wearLabel } from "@/components/skin-collections"
import { useApiQuery } from "@/hooks/use-api-query"
import { rarityStyles } from "@/lib/cs2-rarity"
import { setSkinchangerView } from "@/lib/skinchanger-view"
import { cn } from "@/lib/utils"

const TEAM_SECTIONS: Array<{ scope: string; label: string }> = [
  { scope: "t", label: "T side" },
  { scope: "ct", label: "CT side" },
  { scope: "all", label: "Both teams" },
]

/** One item as a card: a big picture on a floor tinted by its rarity, then its name and how it is set up. */
function ItemCard({ item }: { item: SkinCollectionDetailItem }) {
  const accent = item.rarity ? rarityStyles[item.rarity]?.accent : undefined
  const extras = [
    item.wear !== null && wearLabel(item.wear),
    item.statTrak && "StatTrak™",
    item.stickers > 0 && `${item.stickers} sticker${item.stickers > 1 ? "s" : ""}`,
    item.hasCharm && "Charm",
  ].filter(Boolean) as string[]
  return (
    <li className="lx-layer flex flex-col overflow-hidden rounded-[10px] border border-[var(--glass-line)] bg-[var(--glass-fill)] transition-colors duration-300 hover:border-[var(--line-strong)]">
      <div className="relative flex h-[132px] items-center justify-center bg-[var(--card-surface)] px-4">
        <OptimizedImage src={item.imageUrl ?? ""} width={320} height={180} alt="" className="max-h-[104px] w-full object-contain" />
        {accent && <span aria-hidden="true" className="absolute bottom-0 left-0 h-[2px] w-full" style={{ background: accent }} />}
        <span className="absolute left-2.5 top-2.5 text-[10px] font-semibold uppercase tracking-[1px] text-[var(--text-dim)]">{SLOT_LABEL[item.slot] ?? item.slot}</span>
        {(item.teamScope === "t" || item.teamScope === "ct") && <TeamIcon side={item.teamScope} className="absolute right-2.5 top-2.5 size-5" />}
      </div>
      <div className="flex min-w-0 flex-col gap-0.5 p-3">
        <p className="truncate text-[13px] font-semibold text-[var(--text)]">{item.name}</p>
        <p className="truncate text-[11px] text-[var(--text-dim)]">{extras.length ? extras.join(" · ") : item.rarity ?? "Default settings"}</p>
      </div>
    </li>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-0.5 px-5 first:pl-0 max-sm:px-3">
      <span className="text-[22px] font-semibold leading-none text-[var(--text)]">{value}</span>
      <span className="text-[11px] text-[var(--text-dim)]">{label}</span>
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

  const sections = collection
    ? TEAM_SECTIONS.map((section) => ({
        ...section,
        items: collection.items.filter((item) => (item.teamScope === "t" || item.teamScope === "ct" ? item.teamScope : "all") === section.scope),
      })).filter((section) => section.items.length > 0)
    : []

  return (
    <div className="scrollbar-hidden flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 pb-8 pt-5">
      <button type="button" onClick={back} className="inline-flex w-fit items-center gap-1.5 rounded-lg text-[13px] text-[var(--text-muted)] transition-colors hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60">
        <ArrowLeft className="size-4" />
        Collections
      </button>

      {error ? (
        <QueryState loading={false} error={{ ...error, message: loadFailure(error).replace("collections", "this collection") }} empty={false} onRetry={refetch} />
      ) : loading || !collection ? (
        <div className="flex flex-col gap-6" aria-hidden="true">
          <Skeleton className="h-[188px] rounded-xl bg-[var(--glass-fill)]" />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }, (_, index) => <Skeleton key={index} className="h-[200px] rounded-[10px] bg-[var(--glass-fill)]" />)}
          </div>
        </div>
      ) : (
        <>
          <header className="lx-layer flex flex-col gap-5 rounded-xl border border-[var(--glass-line)] bg-[var(--glass-fill)] p-6">
            <div className="flex flex-wrap items-start gap-x-6 gap-y-4">
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <h1 className="font-display text-[26px] font-bold leading-tight tracking-[-0.3px] text-[var(--text)] [overflow-wrap:anywhere]">{collection.name}</h1>
                <p className="max-w-[60ch] text-[14px] text-[var(--text-muted)]">{collection.description || "No description."}</p>
                <Link to={`/profile/${encodeURIComponent(collection.author.steamId)}`} className="mt-1 flex w-fit items-center gap-2 rounded-lg text-[13px] text-[var(--text-dim)] transition-colors hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60">
                  <PlayerAvatar avatar={collection.author.avatar} name={collection.author.username} className="size-7 rounded-full" />
                  <span>by <span className="font-medium text-[var(--text-2)]">{collection.author.username}</span> · {daysAgo(collection.createdAt)}</span>
                </Link>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {collection.mine && (
                  <button type="button" onClick={() => setRemoving(true)} aria-label={`Remove ${collection.name}`} className="inline-flex size-10 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--raised)] text-[var(--text-muted)] transition-colors hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60">
                    <Trash2 className="size-4" />
                  </button>
                )}
                <button type="button" disabled={collection.mine} onClick={() => void toggleLike()} aria-pressed={collection.liked} className={cn("inline-flex h-10 items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--raised)] px-3.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60 disabled:cursor-default", collection.liked ? "text-[var(--text)]" : "text-[var(--text-muted)] enabled:hover:text-[var(--text)]")}>
                  <ThumbsUp className={cn("size-4", collection.liked && "fill-current")} />
                  {collection.liked ? "Liked" : "Like"}
                </button>
                <button type="button" onClick={() => setTarget(true)} className="lx-primary-button inline-flex h-10 items-center rounded-lg px-5 text-[13px] font-semibold">
                  Apply to my loadout
                </button>
              </div>
            </div>
            <div className="flex divide-x divide-[var(--line-soft)] border-t border-[var(--line-soft)] pt-5">
              <Stat label="Items" value={collection.itemCount} />
              <Stat label="Likes" value={collection.likes} />
              <Stat label="Applied" value={collection.applies} />
            </div>
          </header>

          {sections.map((section) => (
            <section key={section.scope} aria-label={section.label} className="flex flex-col gap-3">
              <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[1.2px] text-[var(--text-dim)]">
                {section.scope === "all" ? <Layers className="size-4" /> : <TeamIcon side={section.scope as "t" | "ct"} className="size-5" />}
                {section.label}
                <span className="font-medium text-[var(--text-faint)]">{section.items.length}</span>
              </h2>
              <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                {section.items.map((item, index) => <ItemCard key={`${item.name}:${item.teamScope}:${index}`} item={item} />)}
              </ul>
            </section>
          ))}
        </>
      )}

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
