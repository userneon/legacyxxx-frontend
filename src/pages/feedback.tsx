import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { Clock, LoaderCircle, PenLine, RotateCcw, ShieldCheck, Star, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { PAGE_TITLES } from "@/lib/routes"
import { feedbackService } from "@/api"
import type { ApiError, FeedbackEntry } from "@/api/types"
import { useApiQuery } from "@/hooks/use-api-query"
import { useViewParams } from "@/hooks/use-view-params"
import { useAuth } from "@/hooks/use-auth"
import { PlayerAvatar } from "@/components/player-avatar"
import { formatRelativeTime } from "@/components/relative-time"
import { SteamLoginButton } from "@/components/steam-login-gate"
import { Segmented } from "@/components/segmented"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"

type SortKey = "newest" | "highest" | "lowest"
type RatingFilter = "all" | "5" | "4" | "3" | "2" | "1"

const WEEK = 7 * 24 * 60 * 60 * 1000
const MAX_LENGTH = 500
const MIN_LENGTH = 10
const RATING_WORDS = ["", "Bad", "Poor", "Okay", "Good", "Great"]

const readSort = (value: string | null): SortKey => (value === "highest" || value === "lowest" ? value : "newest")
const readRating = (value: string | null): RatingFilter => (value && ["1", "2", "3", "4", "5"].includes(value) ? (value as RatingFilter) : "all")

function fullDate(value: string) {
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? date.toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" }) : value
}

/** Feeds the pointer position to a card's spotlight (--mx / --my). */

/** "3d 4h" until a moment in the future. */
function countdown(target: number, now: number) {
  const minutes = Math.max(1, Math.round((target - now) / 60_000))
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  return days > 0 ? `${days}d ${hours}h` : hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`
}

/** Read-only stars; filled white up to the rating. */
function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="flex shrink-0 gap-0.5" role="img" aria-label={`${value.toFixed(1)} out of 5`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          aria-hidden="true"
          style={{ width: size, height: size }}
          className={Math.round(value) >= star ? "fill-[var(--star)] text-[var(--star)]" : "fill-[var(--line)] text-[var(--line)]"}
        />
      ))}
    </span>
  )
}

function ReviewCard({ entry, own, fresh, index, onOpenProfile }: { entry: FeedbackEntry; own: boolean; fresh: boolean; index: number; onOpenProfile: (steamId: string) => void }) {
  const message = useRef<HTMLParagraphElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [clamped, setClamped] = useState(false)
  useLayoutEffect(() => {
    const node = message.current
    if (node && !expanded) setClamped(node.scrollHeight > node.clientHeight + 1)
  }, [entry.message, expanded])

  const author = (
    <>
      <PlayerAvatar avatar={entry.avatar} name={entry.name} className="size-9 shrink-0 rounded-[10px] text-xs" />
      <span className="flex min-w-0 flex-1 flex-col gap-1.5 text-left">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-[13px] font-medium text-[var(--text)]">{entry.name}</span>
          {entry.steamId && (
            <span className="flex shrink-0 items-center gap-1 text-[11px] text-[var(--status-green)]">
              <ShieldCheck className="size-3" />
              Verified player
            </span>
          )}
        </span>
        <span className="flex items-center gap-2">
          <Stars value={entry.rating} size={13} />
          <span className="text-xs text-[var(--text-dim)]" title={fullDate(entry.date)}>{formatRelativeTime(new Date(entry.date))}</span>
        </span>
      </span>
    </>
  )
  return (
    <article
      style={{ animationDelay: `${fresh ? 0 : Math.min(index, 10) * 50}ms` }}
      className={cn(
        "lx-fx-card group relative flex flex-col gap-3 overflow-hidden rounded-xl border bg-[var(--glass-fill)] px-5 py-[18px]",
        own ? "border-[var(--line-strong)] bg-[linear-gradient(160deg,color-mix(in_oklab,var(--brand)_10%,var(--card-surface)),var(--card-surface)_55%)]" : "border-[var(--line-soft)]",
      )}
    >
      {own && (
        <span className="relative w-fit rounded-full border border-[var(--line-strong)] bg-[var(--raised)] px-2 py-0.5 text-[10px] font-bold tracking-[0.6px] text-[var(--text-2)]">YOUR REVIEW</span>
      )}
      {entry.steamId ? (
        <button
          type="button"
          onClick={() => onOpenProfile(entry.steamId!)}
          aria-label={`Open ${entry.name} profile`}
          className="relative flex min-w-0 items-center gap-3 rounded-lg transition-opacity duration-150 hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/50"
        >
          {author}
        </button>
      ) : (
        <div className="relative flex min-w-0 items-center gap-3">{author}</div>
      )}
      <div className="relative flex flex-col gap-1">
        <p ref={message} className={cn("whitespace-pre-wrap break-words text-[13px] leading-6 text-[var(--text-2)]", !expanded && "line-clamp-4")}>{entry.message}</p>
        {(clamped || expanded) && (
          <button type="button" onClick={() => setExpanded((open) => !open)} className="self-start text-xs font-medium text-[var(--text-2)] transition-colors hover:text-[var(--text)]">
            {expanded ? "Show less" : "Read more"}
          </button>
        )}
      </div>
    </article>
  )
}

function CardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[var(--glass-line)] bg-[var(--glass-fill)] px-5 py-[18px]" aria-hidden="true">
      <div className="flex items-center gap-3">
        <Skeleton className="size-9 rounded-[10px] bg-[var(--line-soft)]" />
        <div className="flex flex-1 flex-col gap-[7px]">
          <Skeleton className="h-2.5 w-[120px] rounded-full bg-[var(--line)]" />
          <Skeleton className="h-2 w-[140px] rounded-full bg-[var(--line-soft)]" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-2.5 w-[96%] rounded-full bg-[var(--raised)]" />
        <Skeleton className="h-2.5 w-[88%] rounded-full bg-[var(--raised)]" />
        <Skeleton className="h-2.5 w-[62%] rounded-full bg-[var(--raised)]" />
      </div>
    </div>
  )
}

function WriteDialog({ open, onClose, onPosted }: { open: boolean; onClose: () => void; onPosted: (entry: FeedbackEntry) => void }) {
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const shown = hover || rating
  const canPost = rating > 0 && message.trim().length >= MIN_LENGTH && !submitting

  useEffect(() => {
    if (open) return
    // Reset after the close animation, so the dialog never visibly empties while it fades.
    const timer = window.setTimeout(() => { setRating(0); setHover(0); setMessage(""); setError("") }, 200)
    return () => window.clearTimeout(timer)
  }, [open])

  const post = async () => {
    if (!canPost) return
    setSubmitting(true)
    setError("")
    try {
      const entry = await feedbackService.submitFeedback({ rating, message: message.trim() })
      onPosted(entry)
    } catch (caught) {
      const apiError = caught as Partial<ApiError>
      if (apiError.reason === "weekly_cooldown") {
        const date = apiError.retryAt ? new Date(apiError.retryAt) : null
        setError(date && Number.isFinite(date.getTime()) ? `You can post your next review on ${date.toLocaleString()}.` : "You can post one review per week.")
      } else if (apiError.code === "unauthorized") {
        setError("Sign in with Steam to post a review.")
      } else {
        setError("Your review couldn't be posted. Please try again.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogContent
        showCloseButton={false}
        overlayClassName="lx-blur-overlay bg-black/55 backdrop-blur-[10px]"
        className="w-[520px] max-w-[calc(100%-2rem)] gap-0 rounded-2xl border-[var(--line)] bg-[var(--panel)] p-0 shadow-[0_24px_60px_rgba(0,0,0,0.6)] lx-blur-panel sm:max-w-[520px]"
      >
        <div className="flex h-14 items-center justify-between border-b border-[var(--line-soft)] pl-5 pr-3">
          <DialogTitle className="text-base font-semibold text-[var(--text)]">Write a review</DialogTitle>
          <button type="button" onClick={onClose} aria-label="Close" className="flex size-8 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--raised)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60">
            <X className="size-4" />
          </button>
        </div>
        <DialogDescription className="sr-only">Rate Legacy-X and describe your experience.</DialogDescription>
        <div className="flex flex-col gap-[18px] p-5">
          <div className="flex flex-col gap-2">
            <span className="text-xs text-[var(--text-muted)]">Your rating</span>
            <div role="radiogroup" aria-label="Rating" className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  role="radio"
                  aria-checked={rating === star}
                  aria-label={star === 1 ? "1 star" : `${star} stars`}
                  onMouseEnter={() => setHover(star)}
                  onFocus={() => setHover(star)}
                  onBlur={() => setHover(0)}
                  onClick={() => setRating(star)}
                  className="flex size-9 items-center justify-center rounded-lg transition-colors hover:bg-[var(--raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/50"
                >
                  <Star
                    className={cn(
                      "size-6 transition-[color,fill,scale] duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                      shown >= star ? "scale-110 fill-[var(--star)] text-[var(--star)]" : "scale-100 fill-transparent text-[var(--text-faint)]",
                    )}
                    style={{ transitionDelay: shown >= star ? `${star * 25}ms` : "0ms" }}
                  />
                </button>
              ))}
              <span key={shown} className="lx-swap-in ml-2 text-[13px] font-medium text-[var(--text-2)]">{RATING_WORDS[shown]}</span>
            </div>
          </div>
          <label className="flex flex-col gap-2">
            <span className="flex justify-between text-xs text-[var(--text-muted)]">
              <span>Your review</span>
              <span>{message.length} / {MAX_LENGTH}</span>
            </span>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value.slice(0, MAX_LENGTH))}
              maxLength={MAX_LENGTH}
              rows={5}
              placeholder="Servers, community, staff, anything that stood out…"
              className="resize-none rounded-[10px] border border-[var(--line)] bg-[var(--glass-fill)] p-3 text-sm leading-6 text-[var(--text)] outline-none transition-[border-color,box-shadow] duration-300 placeholder:text-[var(--text-dim)] focus:border-[var(--text-dim)] focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--brand)_18%,transparent)]"
            />
          </label>
          <span className="text-xs text-[var(--text-dim)]">Posted publicly with your Steam name. One review per week.</span>
          {error && <p role="alert" className="text-xs text-[var(--text-2)]">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-[var(--line-soft)] px-5 py-3.5">
          <button type="button" onClick={onClose} className="h-9 rounded-lg border border-[var(--line)] px-4 text-[13px] font-medium text-[var(--text)] transition-colors hover:border-[var(--line-strong)] hover:bg-[var(--raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void post()}
            disabled={!canPost}
            className="lx-primary-button inline-flex h-9 items-center gap-1.5 rounded-lg px-[18px] text-[13px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/50 disabled:pointer-events-none disabled:opacity-40 disabled:saturate-50"
          >
            {submitting && <LoaderCircle className="size-3.5 animate-spin" />}
            Post review
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function FeedbackPage({ onProfileNavigate }: { onProfileNavigate: (steamId: string) => void }) {
  const { user, isAuthenticated, loginWithSteam } = useAuth()
  const [params, setParams] = useViewParams()
  const sort = readSort(params.get("sort"))
  const rating = readRating(params.get("rating"))
  const [writing, setWriting] = useState(false)
  const [freshId, setFreshId] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const { data, loading, error, refetch } = useApiQuery<FeedbackEntry[]>((signal) => feedbackService.getFeedback({ signal }))
  const [posted, setPosted] = useState<FeedbackEntry[]>([])
  // A just-posted review shows immediately, before the refetch lands.
  const reviews = useMemo(() => {
    const byId = new Map((data ?? []).map((entry) => [entry.id, entry]))
    for (const entry of posted) if (!byId.has(entry.id)) byId.set(entry.id, entry)
    return Array.from(byId.values())
  }, [data, posted])

  const update = (changes: Record<string, string | null>) => {
    setParams((current) => {
      const next = new URLSearchParams(current)
      for (const [key, value] of Object.entries(changes)) {
        if (value) next.set(key, value)
        else next.delete(key)
      }
      return next
    }, { replace: true })
  }

  // Average and distribution always come from the full list, not the filtered one.
  const total = reviews.length
  const average = total ? reviews.reduce((sum, entry) => sum + entry.rating, 0) / total : 0
  const distribution = [5, 4, 3, 2, 1].map((score) => {
    const count = reviews.filter((entry) => Math.round(entry.rating) === score).length
    return { score, count, share: total ? (count / total) * 100 : 0 }
  })

  const isMine = (entry: FeedbackEntry) => Boolean(user?.steamId && entry.steamId === user.steamId)
  const mine = reviews.filter(isMine).sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
  const nextAllowed = mine[0] ? Date.parse(mine[0].date) + WEEK : null
  const onCooldown = nextAllowed !== null && nextAllowed > now

  const visible = useMemo(() => {
    const list = reviews.filter((entry) => rating === "all" || Math.round(entry.rating) === Number(rating))
    list.sort((a, b) => {
      if (sort === "highest") return b.rating - a.rating || Date.parse(b.date) - Date.parse(a.date)
      if (sort === "lowest") return a.rating - b.rating || Date.parse(b.date) - Date.parse(a.date)
      return Date.parse(b.date) - Date.parse(a.date)
    })
    // Your own review is pinned first.
    return [...list.filter(isMine), ...list.filter((entry) => !isMine(entry))]
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviews, rating, sort, user?.steamId])

  const onPosted = (entry: FeedbackEntry) => {
    setPosted((current) => [...current, { ...entry, steamId: entry.steamId ?? user?.steamId, avatar: entry.avatar ?? user?.avatar, name: entry.name || user?.username || "You" }])
    setFreshId(entry.id)
    setWriting(false)
    refetch()
  }

  return (
    <div className="flex min-h-0 flex-1 max-lg:flex-col max-lg:overflow-y-auto">
      <section aria-label="Reviews" className="flex min-w-0 flex-1 flex-col max-lg:min-h-0">
        <div className="shrink-0 px-6 pb-1 pt-6">
          <section aria-label="Reviews" className="relative overflow-hidden rounded-xl border border-[var(--glass-line)] bg-[var(--glass-fill)]">
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--line-strong)] to-transparent" />
            <div className="relative z-10 flex flex-col gap-5 p-7">
              <div className="flex min-w-0 flex-col gap-2.5">
                <h1 className="flex items-center gap-2.5 text-[34px] font-bold leading-[1.1] tracking-[-0.6px] text-[var(--text)]">
                  <span aria-hidden="true" className="h-7 w-1 rounded-full bg-[var(--text-faint)]" />
                  {PAGE_TITLES["feedback"]}
                  {loading && reviews.length > 0 && <LoaderCircle aria-label="Updating" className="size-4 animate-spin text-[var(--text-dim)]" />}
                </h1>
                <span className="text-[14px] text-[var(--text-2)]">What players say about Legacy-X.</span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <Segmented
                  ariaLabel="Filter by rating"
                  value={rating}
                  onChange={(value) => update({ rating: value === "all" ? null : value })}
                  options={(["all", "5", "4", "3", "2", "1"] as const).map((value) => ({
                    value,
                    label: value === "all" ? "All" : <>{value}<Star className="size-3 fill-[var(--star)] text-[var(--star)]" /></>,
                  }))}
                  className="scrollbar-hidden max-w-full overflow-x-auto"
                />
                <Segmented
                  ariaLabel="Sort"
                  value={sort}
                  onChange={(value) => update({ sort: value === "newest" ? null : value })}
                  options={[
                    { value: "newest", label: "Newest" },
                    { value: "highest", label: "Highest" },
                    { value: "lowest", label: "Lowest" },
                  ]}
                />
              </div>
            </div>
          </section>
        </div>

        {/* pt-4 leaves room for the 5px hover lift: the scroll area clips anything above its top. */}
        <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-4 max-lg:overflow-visible">
          {/* Two columns that fill top to bottom (masonry), so short and long reviews pack without gaps. */}
          <div>
            {loading && reviews.length === 0 ? (
              <div className="columns-1 gap-3 md:columns-2">
                {Array.from({ length: 6 }, (_, index) => <div key={index} className="mb-3 break-inside-avoid"><CardSkeleton /></div>)}
              </div>
            ) : error && reviews.length === 0 ? (
              <p className="flex items-center justify-center gap-3 py-10 text-[13px] text-[var(--text-dim)]">
                Could not load the reviews.
                <button type="button" onClick={refetch} className="inline-flex items-center gap-1.5 text-[var(--text-2)] transition-colors hover:text-[var(--text)]">
                  <RotateCcw className="size-3.5" />
                  Retry
                </button>
              </p>
            ) : visible.length === 0 ? (
              <p className="py-10 text-center text-[13px] text-[var(--text-dim)]">{total === 0 ? "No reviews yet." : "No review with this rating yet."}</p>
            ) : (
              // Keyed on the filters so the cards cascade in again after every change.
              <div key={`${rating}:${sort}`} className="columns-1 gap-3 md:columns-2">
                {visible.map((entry, index) => (
                  <div key={entry.id} className="mb-3 break-inside-avoid">
                    <ReviewCard entry={entry} index={index} own={isMine(entry)} fresh={entry.id === freshId} onOpenProfile={onProfileNavigate} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <aside aria-label="Summary" className="scrollbar-hidden flex w-[340px] shrink-0 flex-col gap-5 overflow-y-auto border-l border-[var(--line-soft)] p-6 max-lg:w-full max-lg:overflow-visible max-lg:border-l-0 max-lg:border-t">
        <div className="lx-swap-in relative flex items-center gap-4 overflow-hidden rounded-xl border border-[var(--line-strong)] bg-[var(--glass-fill)] p-5">
          <span className="lx-brand-text relative text-5xl font-bold leading-none tracking-[-1.5px]">{average.toFixed(1)}</span>
          <span className="relative flex flex-col gap-2">
            <Stars value={average} size={17} />
            <span className="text-xs text-[var(--text-muted)]">{total.toLocaleString()} review{total === 1 ? "" : "s"}</span>
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="mb-1.5 text-xs text-[var(--text-dim)]">Tap a row to filter</span>
          {distribution.map((bucket) => {
            const pressed = rating === String(bucket.score)
            return (
              <button
                key={bucket.score}
                type="button"
                aria-pressed={pressed}
                onClick={() => update({ rating: pressed ? null : String(bucket.score) })}
                className={cn(
                  "flex h-8 items-center gap-2.5 rounded-lg px-2 transition-colors duration-300 hover:bg-[var(--raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/50",
                  pressed && "bg-[var(--raised)] ring-1 ring-inset ring-[var(--line-strong)]",
                )}
              >
                <span className="flex w-[22px] shrink-0 items-center gap-[3px] text-xs text-[var(--text-muted)]">
                  {bucket.score}
                  <Star className="size-2.5 fill-[var(--star)] text-[var(--star)]" />
                </span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--line-soft)]">
                  <span className={cn("block h-full rounded-full transition-[width,background-color] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]", pressed ? "bg-[var(--star)]" : "bg-[var(--star)]/55")} style={{ width: `${bucket.share}%` }} />
                </span>
                <span className="w-6 shrink-0 text-right text-xs text-[var(--text-dim)]">{bucket.count}</span>
              </button>
            )
          })}
        </div>

        <div className="flex flex-col gap-2.5 border-t border-[var(--line-soft)] pt-[18px]">
          {!isAuthenticated ? (
            <>
              <span className="text-[13px] leading-[1.5] text-[var(--text-muted)]">Sign in with Steam to write a review.</span>
              <SteamLoginButton onClick={loginWithSteam} label="Sign in with Steam" />
            </>
          ) : onCooldown ? (
            <>
              <button type="button" disabled className="flex h-10 items-center justify-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--raised)] text-sm font-medium text-[var(--text-dim)]">
                <Clock className="size-4" />
                Next review in {countdown(nextAllowed!, now)}
              </button>
              <span className="text-xs text-[var(--text-dim)]">One review per week keeps the page honest.</span>
            </>
          ) : (
            <>
              <span className="text-[13px] leading-[1.5] text-[var(--text-muted)]">Played on our servers? Tell others what it's like.</span>
              <button
                type="button"
                onClick={() => setWriting(true)}
                className="lx-primary-button group flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/50"
              >
                <PenLine className="size-4 transition-[rotate] duration-300 group-hover:-rotate-12" />
                Write a review
              </button>
            </>
          )}
        </div>
      </aside>

      <WriteDialog open={writing} onClose={() => setWriting(false)} onPosted={onPosted} />
    </div>
  )
}
