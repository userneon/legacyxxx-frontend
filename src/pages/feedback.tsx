import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Star, Send } from "lucide-react"

import { cn } from "@/lib/utils"
import { feedbackService } from "@/api"
import type { FeedbackEntry } from "@/api/types"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useApiQuery } from "@/hooks/use-api-query"
import { QueryState } from "@/components/query-state"
import { PlayerAvatar } from "@/components/player-avatar"

export function FeedbackPage() {
  const navigate = useNavigate()
  const { data: existingFeedback, loading, error, refetch } = useApiQuery<FeedbackEntry[]>((signal) =>
    feedbackService.getFeedback({ signal }),
  )

  const [feedback, setFeedback] = useState<FeedbackEntry[]>([])
  const [rating, setRating] = useState(0)
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const allFeedback = [...feedback, ...(existingFeedback ?? [])]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || rating === 0) return

    setSubmitting(true)
    try {
      const entry = await feedbackService.submitFeedback({ rating, message: message.trim() })
      setFeedback([entry, ...feedback])
      setMessage("")
      setRating(0)
    } catch {
      // Error is surfaced via the query state; submission failure is non-fatal here.
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Submit form */}
      <form onSubmit={handleSubmit} className="glass rounded-xl p-6 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label id="feedback-rating-label">How was your experience?</Label>
          <div className="flex flex-col gap-2">
            <div role="radiogroup" aria-labelledby="feedback-rating-label" className="grid grid-cols-5 gap-2 sm:max-w-md">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={rating === value}
                aria-label={`${value} out of 5`}
                onClick={() => setRating(value)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowRight" || event.key === "ArrowUp") {
                    event.preventDefault()
                    setRating(Math.min(5, value + 1))
                  }
                  if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
                    event.preventDefault()
                    setRating(Math.max(1, value - 1))
                  }
                }}
                className={cn(
                  "relative flex h-11 items-center justify-center rounded-lg border text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  rating === value
                    ? "border-primary bg-primary/15 text-primary shadow-[0_0_18px_hsl(var(--primary)/0.18)]"
                    : "border-border bg-secondary/40 text-muted-foreground hover:border-primary/50 hover:bg-secondary/70 hover:text-foreground"
                )}
              >
                {value}
                {rating === value && <span aria-hidden="true" className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-chart-2 shadow-[0_0_8px_hsl(var(--chart-2))]" />}
              </button>
            ))}
            </div>
            <div className="flex max-w-md justify-between text-xs font-medium text-muted-foreground"><span>Not satisfied</span><span>Excellent</span></div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="feedback-message">Your Feedback</Label>
          <Textarea
            id="feedback-message"
            placeholder="Tell us what you think..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            required
          />
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={!message.trim() || rating === 0 || submitting}>
            <Send className="size-3.5" />
            Submit Feedback
          </Button>
        </div>
      </form>

      {/* Feedback list */}
      <QueryState
        loading={loading}
        error={error}
        empty={!loading && !error && allFeedback.length === 0}
        emptyMessage="No feedback yet. Be the first to share your thoughts!"
        onRetry={refetch}
      />

      {!loading && !error && allFeedback.length > 0 && (
        <div className="flex flex-col gap-3">
          {allFeedback.map((entry) => (
            <div key={entry.id} className="glass rounded-xl p-4 hover-lift transition-all">
              <div className="flex items-start justify-between gap-4">
                {entry.steamId ? (
                  <button
                    type="button"
                    onClick={() => navigate(`/profile/${entry.steamId}`)}
                    className="group flex items-center gap-3 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label={`Open ${entry.name}'s profile`}
                  >
                    <PlayerAvatar avatar={entry.avatar} name={entry.name} className="size-10 rounded-full text-sm transition-transform group-hover:scale-105" />
                    <div>
                      <div className="text-sm font-medium group-hover:text-primary group-hover:underline">{entry.name}</div>
                      <div className="text-xs text-muted-foreground">{entry.date}</div>
                    </div>
                  </button>
                ) : (
                  <div className="flex items-center gap-3">
                    <PlayerAvatar avatar={entry.avatar} name={entry.name} className="size-10 rounded-full text-sm" />
                    <div><div className="text-sm font-medium">{entry.name}</div><div className="text-xs text-muted-foreground">{entry.date}</div></div>
                  </div>
                )}
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={cn(
                        "size-3.5",
                        entry.rating >= star
                          ? "fill-chart-4 text-chart-4"
                          : "text-muted-foreground/50"
                      )}
                    />
                  ))}
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-3">{entry.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
