/**
 * Reviews (docs/design/reviews, reviews-filter-5, reviews-write, reviews-cooldown). Reading comes first: the list
 * with star filters and sort on the left, the summary and the one write action on the right. The cooldown is
 * computed from the viewer's latest review so nobody has to hit the weekly limit to find out.
 */
import { useEffect, useMemo, useRef, useState } from "react"
import { Clock, Send, ShieldCheck, Star } from "lucide-react"

import { feedbackService, type ApiError, type FeedbackEntry } from "@/api"
import { formatDuration } from "@/lib/format"
import { cn } from "@/lib/utils"
import { PageHeader } from "@/components/page"
import { PlayerAvatar } from "@/components/player-avatar"
import { RelativeTime } from "@/components/relative-time"
import { Stars } from "@/components/stars"
import { EmptyState, ErrorState, Skeleton } from "@/components/states"
import { SteamLoginButton } from "@/components/steam-login-gate"
import { Button } from "@/components/ui/button"
import { Chip } from "@/components/ui/chip"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Segmented } from "@/components/ui/segmented"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"
import { useUrlState } from "@/hooks/use-url-state"

type RatingFilter = "all" | "5" | "4" | "3" | "2" | "1"
type SortOrder = "newest" | "highest" | "lowest"
const WEEK_MS = 7 * 24 * 60 * 60 * 1000
const MAX_LENGTH = 500
const MIN_LENGTH = 10
const WORDS = ["", "Bad", "Poor", "Okay", "Good", "Great"]

function ReviewCard({ entry, mine = false }: { entry: FeedbackEntry; mine?: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const [clamped, setClamped] = useState(false)
  const textRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    const element = textRef.current
    if (element) setClamped(element.scrollHeight > element.clientHeight + 1)
  }, [entry.message])

  return (
    <article className={cn("flex flex-col gap-3 rounded-xl border bg-card px-5 py-[18px] animate-fade-in", mine ? "border-accent/35" : "border-line-soft")}>
      {mine && <span className="text-[11px] font-semibold tracking-[0.4px] text-text">YOUR REVIEW</span>}
      <div className="flex items-center gap-3">
        <PlayerAvatar avatar={entry.avatar} name={entry.name} size={36} />
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm font-medium text-text" title={entry.name}>{entry.name}</span>
            {entry.steamId && (
              <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-live">
                <ShieldCheck className="size-[13px]" aria-hidden />
                Verified player
              </span>
            )}
          </span>
          <span className="flex items-center gap-2">
            <Stars value={entry.rating} size={12} />
            <RelativeTime value={entry.date} className="text-xs text-text-dim" />
          </span>
        </span>
      </div>
      <p ref={textRef} className={cn("m-0 text-sm leading-[1.6] whitespace-pre-line break-words text-text-2 select-text", !expanded && "line-clamp-4")}>
        {entry.message}
      </p>
      {(clamped || expanded) && (
        <button type="button" onClick={() => setExpanded((open) => !open)} className="w-fit text-xs font-medium text-text-muted transition-colors duration-150 hover:text-text">
          {expanded ? "Show less" : "Read more"}
        </button>
      )}
    </article>
  )
}

function StarPicker({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const [hover, setHover] = useState(0)
  const shown = hover || value
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Rating" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} star${star === 1 ? "" : "s"}`}
          onMouseEnter={() => setHover(star)}
          onFocus={() => setHover(star)}
          onBlur={() => setHover(0)}
          onClick={() => onChange(star)}
          className="flex size-9 items-center justify-center rounded-lg transition-colors duration-150 hover:bg-raised"
        >
          <Star className={cn("size-[26px] transition-colors duration-150", shown >= star ? "fill-accent text-accent" : "fill-transparent text-text-faint")} aria-hidden />
        </button>
      ))}
      <span className="ml-2 text-[13px] text-text-muted" aria-live="polite">{WORDS[shown]}</span>
    </div>
  )
}

function WriteDialog({ open, onOpenChange, onPosted }: { open: boolean; onOpenChange: (open: boolean) => void; onPosted: (entry: FeedbackEntry) => void }) {
  const [rating, setRating] = useState(0)
  const [message, setMessage] = useState("")
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const canPost = rating > 0 && message.trim().length >= MIN_LENGTH && !posting

  useEffect(() => {
    if (!open) {
      setError(null)
      setPosting(false)
    }
  }, [open])

  const post = async () => {
    if (!canPost) return
    setPosting(true)
    setError(null)
    try {
      const entry = await feedbackService.submitFeedback({ rating, message: message.trim() })
      setRating(0)
      setMessage("")
      onPosted(entry)
    } catch (caught) {
      const apiError = caught as ApiError
      if (apiError?.reason === "weekly_cooldown") {
        const wait = apiError.retryAt ? Date.parse(apiError.retryAt) - Date.now() : Number.NaN
        setError(Number.isFinite(wait) && wait > 0 ? `You can post again in ${formatDuration(wait)}. One review per week.` : "You can post one review per week.")
      } else {
        setError(apiError?.message ?? "Your review couldn't be posted. Try again.")
      }
      setPosting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 rounded-2xl border-line p-0 sm:max-w-[520px]">
        <div className="flex h-14 items-center border-b border-line-soft pr-3 pl-5">
          <DialogTitle className="text-base font-semibold text-text">Write a review</DialogTitle>
        </div>
        <DialogDescription className="sr-only">Rate Legacy-X and tell other players what stood out.</DialogDescription>
        <div className="flex flex-col gap-[18px] p-5">
          <div className="flex flex-col gap-2">
            <span className="text-xs text-text-muted">Your rating</span>
            <StarPicker value={rating} onChange={setRating} />
          </div>
          <label className="flex flex-col gap-2">
            <span className="flex justify-between text-xs text-text-muted">
              <span>Your review</span>
              <span className="tabular-nums">{message.length} / {MAX_LENGTH}</span>
            </span>
            <textarea
              value={message}
              maxLength={MAX_LENGTH}
              rows={5}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Servers, community, staff, anything that stood out…"
              className="resize-none rounded-[10px] border border-line bg-card p-3 text-sm leading-[1.5] text-text transition-colors duration-150 outline-none placeholder:text-text-dim focus:border-line-strong"
            />
          </label>
          <span className="text-xs text-text-dim">Posted publicly with your Steam name. One review per week.</span>
          {error && <p role="alert" className="m-0 text-[13px] text-text-2">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-line-soft px-5 py-3.5">
          <Button variant="outline" className="h-9 px-4" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="h-9 px-[18px]" disabled={!canPost} onClick={() => void post()}>
            <Send className="size-3.5" aria-hidden />
            {posting ? "Posting…" : "Post review"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function SummaryPanel({
  entries,
  loading,
  rating,
  onRating,
  writeArea,
}: {
  entries: FeedbackEntry[]
  loading: boolean
  rating: RatingFilter
  onRating: (value: RatingFilter) => void
  writeArea: React.ReactNode
}) {
  const total = entries.length
  const average = total ? entries.reduce((sum, entry) => sum + entry.rating, 0) / total : 0
  const distribution = [5, 4, 3, 2, 1].map((stars) => ({ stars, count: entries.filter((entry) => Math.round(entry.rating) === stars).length }))

  return (
    <aside aria-label="Summary" className="flex w-full shrink-0 flex-col gap-5 border-t border-line-soft p-6 @5xl:w-[340px] @5xl:overflow-y-auto @5xl:border-t-0 @5xl:border-l">
      <div className="flex items-center gap-3.5">
        {loading && total === 0 ? (
          <Skeleton className="h-9 w-16 bg-line" />
        ) : (
          <span className="text-4xl font-semibold tracking-[-1px] tabular-nums text-text">{total ? average.toFixed(1) : "—"}</span>
        )}
        <span className="flex flex-col gap-1.5">
          <Stars value={average} size={16} />
          <span className="text-xs text-text-dim">{total} review{total === 1 ? "" : "s"}</span>
        </span>
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="mb-1.5 text-xs text-text-dim">Tap a row to filter</span>
        {distribution.map(({ stars, count }) => {
          const active = rating === String(stars)
          return (
            <button
              key={stars}
              type="button"
              aria-pressed={active}
              onClick={() => onRating(active ? "all" : (String(stars) as RatingFilter))}
              className={cn("flex h-8 items-center gap-2.5 rounded-lg px-2 transition-colors duration-150", active ? "bg-raised" : "hover:bg-card")}
            >
              <span className="flex w-[22px] items-center gap-[3px] text-xs text-text-muted tabular-nums">
                {stars}
                <Star className="size-2.5 fill-current" aria-hidden />
              </span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line-soft">
                <span className={cn("block h-full rounded-full transition-[width] duration-200", active ? "bg-accent" : "bg-text-muted")} style={{ width: total ? `${(count / total) * 100}%` : "0%" }} />
              </span>
              <span className="w-6 text-right text-xs text-text-dim tabular-nums">{count}</span>
            </button>
          )
        })}
      </div>
      <div className="flex flex-col gap-2.5 border-t border-line-soft pt-[18px]">{writeArea}</div>
    </aside>
  )
}

export function ReviewsPage() {
  const { user, loginWithSteam } = useAuth()
  const [rating, setRating] = useUrlState<RatingFilter>("rating", "all", ["all", "5", "4", "3", "2", "1"])
  const [sort, setSort] = useUrlState<SortOrder>("sort", "newest", ["newest", "highest", "lowest"])
  const [writing, setWriting] = useState(false)
  const [posted, setPosted] = useState<FeedbackEntry | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const { data, loading, error, refetch } = useApiQuery<FeedbackEntry[]>((signal) => feedbackService.getFeedback({ signal }))

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const all = useMemo(() => {
    const entries = data ?? []
    return posted && !entries.some((entry) => entry.id === posted.id) ? [posted, ...entries] : entries
  }, [data, posted])

  const isMine = (entry: FeedbackEntry) => Boolean(user && entry.steamId && entry.steamId === user.steamId)
  const mine = all.filter(isMine).sort((a, b) => Date.parse(b.date) - Date.parse(a.date))[0] ?? null
  const nextAllowedAt = mine ? Date.parse(mine.date) + WEEK_MS : Number.NaN
  const onCooldown = Number.isFinite(nextAllowedAt) && nextAllowedAt > now

  const visible = useMemo(() => {
    const filtered = all.filter((entry) => rating === "all" || Math.round(entry.rating) === Number(rating))
    const order = [...filtered].sort((a, b) =>
      sort === "highest" ? b.rating - a.rating || Date.parse(b.date) - Date.parse(a.date)
        : sort === "lowest" ? a.rating - b.rating || Date.parse(b.date) - Date.parse(a.date)
          : Date.parse(b.date) - Date.parse(a.date),
    )
    // The viewer's own review is pinned first when it matches the filter.
    return mine && order.includes(mine) ? [mine, ...order.filter((entry) => entry !== mine)] : order
  }, [all, rating, sort, mine])

  const writeArea = !user ? (
    <>
      <SteamLoginButton onClick={loginWithSteam} className="h-10 w-full text-sm" label="Sign in with Steam to write a review" size="sm" />
    </>
  ) : onCooldown ? (
    <>
      <Button variant="outline" disabled className="h-10 w-full gap-2 border-line bg-raised text-sm text-text-dim opacity-100">
        <Clock className="size-4" aria-hidden />
        Next review in {formatDuration(nextAllowedAt - now)}
      </Button>
      <span className="text-xs text-text-dim">One review per week keeps the page honest.</span>
    </>
  ) : (
    <>
      <span className="text-[13px] text-text-muted">Played on Legacy-X? Tell others what it's like.</span>
      <Button className="h-10 w-full text-sm" onClick={() => setWriting(true)}>Write a review</Button>
    </>
  )

  return (
    <div className="@container flex h-full min-h-0 flex-col @5xl:flex-row">
      <section aria-label="Reviews" className="flex min-w-0 flex-1 flex-col @5xl:min-h-0">
        <div className="flex shrink-0 flex-col gap-4 px-4 pt-6 pb-3.5 sm:px-6">
          <PageHeader title="Reviews" subtitle="What players say about Legacy-X." />
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div role="tablist" aria-label="Filter by rating" className="flex flex-wrap gap-1.5">
              {(["all", "5", "4", "3", "2", "1"] as const).map((value) => (
                <Chip key={value} role="tab" aria-selected={rating === value} active={rating === value} onClick={() => setRating(value)}>
                  {value === "all" ? "All" : `${value} ★`}
                </Chip>
              ))}
            </div>
            <Segmented
              ariaLabel="Sort"
              size="sm"
              value={sort}
              onChange={setSort}
              options={[
                { value: "newest", label: "Newest" },
                { value: "highest", label: "Highest" },
                { value: "lowest", label: "Lowest" },
              ]}
            />
          </div>
        </div>
        <div className="px-4 pt-1 pb-6 sm:px-6 @5xl:min-h-0 @5xl:flex-1 @5xl:overflow-y-auto">
          <div key={`${rating}|${sort}`} className="flex max-w-[760px] flex-col gap-3 animate-fade-in">
            {loading && !data ? (
              Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="flex flex-col gap-3 rounded-xl border border-line-soft bg-card px-5 py-[18px]" aria-busy="true">
                  <span className="flex items-center gap-3">
                    <Skeleton className="size-9 rounded-[10px]" />
                    <span className="flex flex-col gap-2">
                      <Skeleton className="h-2.5 w-32 bg-line" />
                      <Skeleton className="h-2 w-20" />
                    </span>
                  </span>
                  <Skeleton className="h-2.5 w-[96%] bg-raised" />
                  <Skeleton className="h-2.5 w-4/5 bg-raised" />
                </div>
              ))
            ) : error && !data ? (
              <ErrorState onRetry={refetch} />
            ) : visible.length === 0 ? (
              <EmptyState>{rating === "all" ? "No reviews yet." : `No ${rating}-star reviews yet.`}</EmptyState>
            ) : (
              visible.map((entry) => <ReviewCard key={entry.id} entry={entry} mine={entry === mine} />)
            )}
          </div>
        </div>
      </section>
      <SummaryPanel entries={all} loading={loading} rating={rating} onRating={setRating} writeArea={writeArea} />
      <WriteDialog
        open={writing}
        onOpenChange={setWriting}
        onPosted={(entry) => {
          setPosted({ ...entry, steamId: entry.steamId ?? user?.steamId, avatar: entry.avatar ?? user?.avatar, name: entry.name || user?.username || "You" })
          setWriting(false)
          refetch()
        }}
      />
    </div>
  )
}
