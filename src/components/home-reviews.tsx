import { ArrowRight, Quote, Star } from "lucide-react"

import { cn } from "@/lib/utils"
import { feedbackService } from "@/api"
import type { FeedbackEntry } from "@/api/types"
import { useApiQuery } from "@/hooks/use-api-query"
import { QueryState } from "@/components/query-state"
import { PlayerAvatar } from "@/components/player-avatar"
import { Skeleton } from "@/components/ui/skeleton"

/** 19.09.2026, at 14:06 */
function reviewDate(value: string) {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}, at ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className="flex gap-0.5" aria-label={`${value.toFixed(1)} out of 5`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          aria-hidden="true"
          className={cn(className, Math.round(value) >= star ? "fill-amber-300 text-amber-300" : "fill-white/10 text-white/15")}
        />
      ))}
    </span>
  )
}

/** One review on the Reviews page: author, stars and score, the message and its date. */
export function ReviewCard({ entry, onOpenProfile }: { entry: FeedbackEntry; onOpenProfile?: (steamId: string) => void }) {
  const author = (
    <>
      <PlayerAvatar avatar={entry.avatar} name={entry.name} className="size-10 rounded-md text-sm transition-transform group-hover:scale-105" />
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-sky-400 group-hover:underline">{entry.name}</div>
        <div className="mt-0.5 flex items-center gap-1.5">
          <Stars value={entry.rating} className="size-3.5" />
          <span className="text-xs font-medium tabular-nums">{entry.rating.toFixed(1)}</span>
        </div>
      </div>
    </>
  )
  return (
    <article className="glass flex min-w-0 flex-col rounded-2xl p-4">
      {entry.steamId && onOpenProfile ? (
        <button type="button" onClick={() => onOpenProfile(entry.steamId!)} aria-label={`Open ${entry.name}'s profile`} className="group flex items-center gap-3 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-primary">
          {author}
        </button>
      ) : (
        <div className="flex items-center gap-3">{author}</div>
      )}
      <p className="mt-3 line-clamp-4 min-h-20 flex-1 rounded-lg bg-background/50 px-3 py-2.5 text-xs leading-5 text-muted-foreground">{entry.message}</p>
      <div className="mt-2 text-center text-[11px] text-muted-foreground/70 tabular-nums">{reviewDate(entry.date)}</div>
    </article>
  )
}

/** Quote card in the Home strip: the words first, the author underneath. */
function QuoteCard({ entry }: { entry: FeedbackEntry }) {
  return (
    <figure className="glass flex w-72 shrink-0 flex-col justify-between gap-4 rounded-2xl p-4">
      <blockquote className="relative">
        <Quote className="absolute -left-0.5 -top-0.5 size-5 text-white/10" aria-hidden="true" />
        <p className="line-clamp-3 pl-6 text-sm leading-6 text-foreground/85">{entry.message}</p>
      </blockquote>
      <figcaption className="flex items-center gap-2.5">
        <PlayerAvatar avatar={entry.avatar} name={entry.name} className="size-7 rounded-md text-[10px]" />
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-white/70">{entry.name}</span>
        <Stars value={entry.rating} className="size-3" />
      </figcaption>
    </figure>
  )
}

const STRIP_SIZE = 10

/** Home "What players say": a slow strip of the latest reviews and a link to all of them. */
export function HomeReviews({ onWriteReview }: { onWriteReview: () => void }) {
  const { data, loading, error, refetch } = useApiQuery<FeedbackEntry[]>((signal) => feedbackService.getFeedback({ signal }))

  const reviews = [...(data ?? [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  const total = reviews.length
  const average = total ? reviews.reduce((sum, entry) => sum + entry.rating, 0) / total : 0
  const latest = reviews.slice(0, STRIP_SIZE)
  // The strip scrolls one full copy, then repeats seamlessly; a short list is not animated.
  const animated = latest.length >= 4

  return (
    <section className="scroll-reveal flex flex-col gap-3" aria-label="What players say">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">What players say</h2>
          {total > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/20 bg-amber-300/[0.08] px-2.5 py-1 text-xs text-amber-100">
              <Star className="size-3 fill-amber-300 text-amber-300" aria-hidden="true" />
              <span className="font-semibold tabular-nums">{average.toFixed(1)}</span>
              <span className="text-amber-100/60">· {total.toLocaleString()} review{total === 1 ? "" : "s"}</span>
            </span>
          )}
        </div>
        <button type="button" onClick={onWriteReview} className="group inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          {total > 0 ? "All reviews" : "Write the first review"}
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>

      {loading || error ? (
        <QueryState
          loading={loading}
          error={error}
          empty={false}
          onRetry={refetch}
          skeleton={
            <div className="flex gap-3 overflow-hidden">
              {[0, 1, 2, 3].map((index) => <Skeleton key={index} className="h-36 w-72 shrink-0 rounded-2xl bg-white/[0.05]" />)}
            </div>
          }
        />
      ) : total === 0 ? (
        <p className="glass rounded-2xl px-4 py-6 text-center text-sm text-muted-foreground">No reviews yet.</p>
      ) : (
        <div className="review-strip -mx-4 overflow-hidden px-4 [mask-image:linear-gradient(to_right,transparent,black_4%,black_96%,transparent)] @2xl:-mx-6 @2xl:px-6">
          <div className={cn("flex w-max gap-3", animated && "review-strip-track")}>
            {latest.map((entry) => <QuoteCard key={entry.id} entry={entry} />)}
            {animated && latest.map((entry) => <div key={`copy-${entry.id}`} aria-hidden="true" className="contents"><QuoteCard entry={entry} /></div>)}
          </div>
        </div>
      )}
    </section>
  )
}
