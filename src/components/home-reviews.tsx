import { useState } from "react"
import { ChevronsLeft, ChevronsRight, Star } from "lucide-react"

import { cn } from "@/lib/utils"
import { feedbackService } from "@/api"
import type { FeedbackEntry } from "@/api/types"
import { useApiQuery } from "@/hooks/use-api-query"
import { QueryState } from "@/components/query-state"
import { PlayerAvatar } from "@/components/player-avatar"

const PAGE_SIZE = 3

function ratingLabel(average: number) {
  if (average >= 4.5) return "Excellent"
  if (average >= 3.5) return "Good"
  if (average >= 2.5) return "Average"
  if (average >= 1.5) return "Poor"
  return "Bad"
}

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

function ReviewCard({ entry }: { entry: FeedbackEntry }) {
  return (
    <article className="glass flex min-w-0 flex-col rounded-2xl p-4">
      <div className="flex items-center gap-3">
        <PlayerAvatar avatar={entry.avatar} name={entry.name} className="size-10 rounded-md text-sm" />
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-sky-400">{entry.name}</div>
          <div className="mt-0.5 flex items-center gap-1.5">
            <Stars value={entry.rating} className="size-3.5" />
            <span className="text-xs font-medium tabular-nums">{entry.rating.toFixed(1)}</span>
          </div>
        </div>
      </div>
      <p className="mt-3 line-clamp-4 min-h-20 flex-1 rounded-lg bg-background/50 px-3 py-2.5 text-xs leading-5 text-muted-foreground">{entry.message}</p>
      <div className="mt-2 text-center text-[11px] text-muted-foreground/70 tabular-nums">{reviewDate(entry.date)}</div>
    </article>
  )
}

/** Home "Our reviews": score summary plus the latest reviews, three at a time. */
export function HomeReviews({ onWriteReview }: { onWriteReview: () => void }) {
  const [page, setPage] = useState(0)
  const { data, loading, error, refetch } = useApiQuery<FeedbackEntry[]>((signal) => feedbackService.getFeedback({ signal }))

  const reviews = [...(data ?? [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  const total = reviews.length
  const average = total ? reviews.reduce((sum, entry) => sum + entry.rating, 0) / total : 0
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const current = Math.min(page, pageCount - 1)
  const shown = reviews.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE)
  const from = total ? current * PAGE_SIZE + 1 : 0
  const to = current * PAGE_SIZE + shown.length

  return (
    <section className="scroll-reveal flex flex-col gap-4" aria-label="Our reviews">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl tracking-wide text-foreground/90">Our reviews</h2>
        {pageCount > 1 && (
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setPage(current - 1)} disabled={current === 0} aria-label="Newer reviews" className="flex size-10 items-center justify-center rounded-full bg-secondary/70 text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-35">
              <ChevronsLeft className="size-4" />
            </button>
            <span className="min-w-12 text-center font-display text-xl text-sky-400 tabular-nums" aria-live="polite">{from}-{to}</span>
            <button type="button" onClick={() => setPage(current + 1)} disabled={current >= pageCount - 1} aria-label="Older reviews" className="flex size-10 items-center justify-center rounded-full bg-secondary/70 text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-35">
              <ChevronsRight className="size-4" />
            </button>
          </div>
        )}
      </div>

      {loading || error ? (
        <QueryState loading={loading} error={error} empty={false} onRetry={refetch} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="glass flex flex-col justify-between gap-4 rounded-2xl p-5">
            {total > 0 ? (
              <div>
                <div className="flex items-center gap-4">
                  <span className="font-display text-4xl text-sky-400 tabular-nums">{average.toFixed(2)}</span>
                  <div>
                    <div className="font-semibold">{ratingLabel(average)}</div>
                    <div className="text-[11px] text-muted-foreground">Based on {total.toLocaleString()} review{total === 1 ? "" : "s"}</div>
                  </div>
                </div>
                <div className="mt-4"><Stars value={average} className="size-5" /></div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No reviews yet. Be the first to share your thoughts!</p>
            )}
            <button type="button" onClick={onWriteReview} className="h-11 rounded-lg bg-secondary/70 text-sm font-medium transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              Write a review
            </button>
          </div>
          {shown.map((entry) => <ReviewCard key={entry.id} entry={entry} />)}
        </div>
      )}
    </section>
  )
}
