import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Clock, LoaderCircle, PenLine, RotateCcw, ShieldCheck, Star, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { feedbackService } from "@/api"
import type { ApiError, FeedbackEntry } from "@/api/types"
import { useApiQuery } from "@/hooks/use-api-query"
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
          className={Math.round(value) >= star ? "fill-[var(--accent-solid)] text-[var(--accent-solid)]" : "fill-[var(--line)] text-[var(--line)]"}
        />
      ))}
    </span>
  )
}

function ReviewCard({ entry, own, fresh, onOpenProfile }: { entry: FeedbackEntry; own: boolean; fresh: boolean; onOpenProfile: (steamId: string) => void }) {
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
      className={cn(
        "flex flex-col gap-3 rounded-xl border bg-[var(--card-surface)] px-5 py-[18px]",
        own ? "border-[var(--accent-solid)]/35" : "border-[var(--line-soft)]",
        fresh && "animate-in fade-in-0 slide-in-from-top-1 duration-200 motion-reduce:animate-none",
      )}
    >
      {own && <span className="text-[11px] font-semibold tracking-[0.4px] text-[var(--text)]">YOUR REVIEW</span>}
      {entry.steamId ? (
        <button
          type="button"
          onClick={() => onOpenProfile(entry.steamId!)}
          aria-label={`Open ${entry.name} profile`}
          className="flex min-w-0 items-center gap-3 rounded-lg transition-opacity duration-150 hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60"
        >
          {author}
        </button>
      ) : (
        <div className="flex min-w-0 items-center gap-3">{author}</div>
      )}
      <div className="flex flex-col gap-1">
        <p ref={message} className={cn("whitespace-pre-wrap break-words text-[13px] leading-6 text-[var(--text-2)]", !expanded && "line-clamp-4")}>{entry.message}</p>
        {(clamped || expanded) && (
          <button type="button" onClick={() => setExpanded((open) => !open)} className="self-start text-xs font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text)]">
            {expanded ? "Show less" : "Read more"}
          </button>
        )}
      </div>
    </article>
  )
}

function CardSkeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[var(--line-soft)] bg-[var(--card-surface)] px-5 py-[18px]" aria-hidden="true">
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
        overlayClassName="bg-black/55 backdrop-blur-[10px] data-[state=open]:duration-200 data-[state=closed]:duration-150"
        className="w-[520px] max-w-[calc(100%-2rem)] gap-0 rounded-2xl border-[var(--line)] bg-[var(--panel)] p-0 shadow-[0_24px_60px_rgba(0,0,0,0.6)] data-[state=open]:zoom-in-[0.98] data-[state=open]:duration-[250ms] data-[state=closed]:duration-150 sm:max-w-[520px]"
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
                  className="flex size-9 items-center justify-center rounded-lg transition-colors hover:bg-[var(--raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60"
                >
                  <Star className={cn("size-6 transition-colors duration-150", shown >= star ? "fill-[var(--accent-solid)] text-[var(--accent-solid)]" : "text-[var(--text-faint)]")} />
                </button>
              ))}
              <span className="ml-2 text-[13px] text-[var(--text-muted)]">{RATING_WORDS[shown]}</span>
            </div>
          </div>
          <label className="flex flex-col gap-2">
            <span className="flex justify-between text-xs text-[var(--text-muted)]">
              <span>Your review</span>
              <span className="tabular-nums">{message.length} / {MAX_LENGTH}</span>
            </span>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value.slice(0, MAX_LENGTH))}
              maxLength={MAX_LENGTH}
              rows={5}
              placeholder="Servers, community, staff, anything that stood out…"
              className="resize-none rounded-[10px] border border-[var(--line)] bg-[var(--card-surface)] p-3 text-sm leading-6 text-[var(--text)] outline-none transition-colors placeholder:text-[var(--text-dim)] focus:border-[var(--line-strong)]"
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
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--accent-solid)] px-[18px] text-[13px] font-semibold text-[var(--accent-on)] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60 disabled:opacity-50"
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
  const [params, setParams] = useSearchParams()
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
        <div className="flex shrink-0 flex-col gap-4 px-6 pb-3.5 pt-6">
          <div className="flex flex-col gap-1">
            <h1 className="flex items-center gap-2 text-[22px] font-semibold leading-[1.2] tracking-[-0.3px] text-[var(--text)]">
              Reviews
              {loading && reviews.length > 0 && <LoaderCircle aria-label="Updating" className="size-4 animate-spin text-[var(--text-dim)]" />}
            </h1>
            <span className="text-[13px] leading-[1.2] text-[var(--text-muted)]">What players say about Legacy-X.</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div role="tablist" aria-label="Filter by rating" className="flex flex-wrap gap-1.5">
              {(["all", "5", "4", "3", "2", "1"] as const).map((value) => {
                const active = rating === value
                return (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => update({ rating: value === "all" ? null : value })}
                    className={cn(
                      "flex h-[30px] items-center gap-1 rounded-full border px-3 text-xs font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60",
                      active ? "border-[var(--line-strong)] bg-[var(--line)] text-[var(--text)]" : "border-[var(--line)] text-[var(--text-muted)] hover:text-[var(--text)]",
                    )}
                  >
                    {value === "all" ? "All" : <>{value} <Star className="size-3 fill-current" /></>}
                  </button>
                )
              })}
            </div>
            <Segmented
              ariaLabel="Sort"
              size="sm"
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

        <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-1 max-lg:overflow-visible">
          <div className="flex max-w-[760px] flex-col gap-3">
            {loading && reviews.length === 0 ? (
              Array.from({ length: 5 }, (_, index) => <CardSkeleton key={index} />)
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
              visible.map((entry) => <ReviewCard key={entry.id} entry={entry} own={isMine(entry)} fresh={entry.id === freshId} onOpenProfile={onProfileNavigate} />)
            )}
          </div>
        </div>
      </section>

      <aside aria-label="Summary" className="scrollbar-hidden flex w-[340px] shrink-0 flex-col gap-5 overflow-y-auto border-l border-[var(--line-soft)] p-6 max-lg:w-full max-lg:overflow-visible max-lg:border-l-0 max-lg:border-t">
        <div className="flex items-center gap-3.5">
          <span className="text-4xl font-semibold leading-none tabular-nums text-[var(--text)]">{average.toFixed(1)}</span>
          <span className="flex flex-col gap-2">
            <Stars value={average} size={16} />
            <span className="text-xs text-[var(--text-dim)]">{total.toLocaleString()} review{total === 1 ? "" : "s"}</span>
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
                  "flex h-8 items-center gap-2.5 rounded-lg px-2 transition-colors duration-150 hover:bg-[var(--raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60",
                  pressed && "bg-[var(--raised)]",
                )}
              >
                <span className="flex w-[22px] shrink-0 items-center gap-[3px] text-xs tabular-nums text-[var(--text-muted)]">
                  {bucket.score}
                  <Star className="size-2.5 fill-current" />
                </span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--line-soft)]">
                  <span className={cn("block h-full rounded-full transition-[width] duration-300", pressed ? "bg-[var(--accent-solid)]" : "bg-[var(--text-muted)]")} style={{ width: `${bucket.share}%` }} />
                </span>
                <span className="w-6 shrink-0 text-right text-xs tabular-nums text-[var(--text-dim)]">{bucket.count}</span>
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
                className="flex h-10 items-center justify-center gap-2 rounded-lg bg-[var(--accent-solid)] text-sm font-semibold text-[var(--accent-on)] transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60"
              >
                <PenLine className="size-4" />
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
