import { useState } from "react"
import type { CSSProperties } from "react"
import { Star, Send } from "lucide-react"

import { cn } from "@/lib/utils"
import { feedbackService } from "@/api"
import type { ApiError, FeedbackEntry } from "@/api/types"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useApiQuery } from "@/hooks/use-api-query"
import { QueryState } from "@/components/query-state"
import { PlayerAvatar } from "@/components/player-avatar"
import { RelativeTime } from "@/components/relative-time"
import { useAuth } from "@/hooks/use-auth"
import { SteamLoginButton } from "@/components/steam-login-gate"
import { RatingSummary } from "@/components/rating-summary"

export function FeedbackPage({ onProfileNavigate }: { onProfileNavigate: (steamId: string) => void }) {
  const { isAuthenticated, loginWithSteam } = useAuth()
  const { data: existingFeedback, loading, error, refetch } = useApiQuery<FeedbackEntry[]>((signal) =>
    feedbackService.getFeedback({ signal }),
  )

  const [rating, setRating] = useState(0)
  const [message, setMessage] = useState("")
  const [hoverRating, setHoverRating] = useState(0)
  const [burst, setBurst] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")

  const allFeedback = existingFeedback ?? []

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || rating === 0) return

    setSubmitting(true)
    setSubmitError("")
    try {
      await feedbackService.submitFeedback({ rating, message: message.trim() })
      setMessage("")
      setRating(0)
      refetch()
    } catch (error) {
      const apiError = error as Partial<ApiError>
      if (apiError.reason === "weekly_cooldown") {
        const date = apiError.retryAt ? new Date(apiError.retryAt) : null
        setSubmitError(date && Number.isFinite(date.getTime()) ? `You can submit your next review after ${date.toLocaleString()}.` : "You can submit one review every 7 days.")
      } else if (apiError.code === "unauthorized") {
        setSubmitError("Please sign in with Steam before submitting a review.")
      } else {
        setSubmitError("Unable to submit feedback right now. Please try again.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className={cn("grid gap-6", allFeedback.length > 0 && "lg:grid-cols-[minmax(0,1fr)_18rem]")}>
      {/* Submit form */}
      <form onSubmit={handleSubmit} className="glass rounded-xl p-6 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label>Rating</Label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => {
              const popped = burst > 0 && star <= rating
              return (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => {
                    setRating(star)
                    setBurst((count) => count + 1)
                  }}
                  style={{ "--star-i": star - 1 } as CSSProperties}
                  className="star-rating-button relative rounded-md p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/80 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {/* Re-keying on every click restarts the cascade even when the same star is clicked again. */}
                  <Star
                    key={popped ? burst : 0}
                    className={cn(
                      "star-rating-icon size-6",
                      popped && "star-rating-pop",
                      hoverRating >= star && "star-rating-preview",
                      (hoverRating || rating) >= star
                        ? "fill-amber-300 text-amber-300"
                        : "text-muted-foreground"
                    )}
                  />
                  {burst > 0 && rating === star && (
                    <span key={burst} className="star-burst" aria-hidden="true">
                      {Array.from({ length: 8 }, (_, i) => (
                        <span key={i} style={{ "--angle": `${i * 45}deg` } as CSSProperties} />
                      ))}
                    </span>
                  )}
                </button>
              )
            })}
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
          {isAuthenticated ? (
            <Button type="submit" disabled={!message.trim() || rating === 0 || submitting}>
              <Send className="size-3.5" />
              Submit Feedback
            </Button>
          ) : (
            <SteamLoginButton onClick={loginWithSteam} label="Login" />
          )}
        </div>
        {submitError && <p role="alert" className="text-sm text-destructive">{submitError}</p>}
      </form>

      {allFeedback.length > 0 && (
        <aside aria-label="Rating summary" className="glass flex items-center rounded-xl p-6">
          <RatingSummary ratings={allFeedback.map((entry) => entry.rating)} className="mx-auto max-w-xs" />
        </aside>
      )}
      </div>

      {/* Feedback list */}
      <QueryState
        loading={loading}
        error={error}
        empty={!loading && !error && allFeedback.length === 0}
        emptyMessage="No feedback yet. Be the first to share your thoughts!"
        onRetry={refetch}
      />

      {!loading && !error && allFeedback.length > 0 && (
        <div className="stagger-in flex flex-col gap-3">
          {allFeedback.map((entry) => (
            <div key={entry.id} className="glass rounded-xl p-4 hover-lift transition-all">
              <div className="flex items-start justify-between gap-4">
                {entry.steamId ? (
                  <button
                    type="button"
                    onClick={() => onProfileNavigate(entry.steamId!)}
                    className="group flex items-center gap-3 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    aria-label={`Open ${entry.name}'s profile`}
                  >
                    <PlayerAvatar avatar={entry.avatar} name={entry.name} className="size-10 rounded-md text-sm transition-transform group-hover:scale-105" />
                    <div>
                      <div className="text-sm font-medium group-hover:text-primary group-hover:underline">{entry.name}</div>
                      <RelativeTime value={entry.date} className="block text-xs text-muted-foreground" />
                    </div>
                  </button>
                ) : (
                  <div className="flex items-center gap-3">
                    <PlayerAvatar avatar={entry.avatar} name={entry.name} className="size-10 rounded-md text-sm" />
                    <div><div className="text-sm font-medium">{entry.name}</div><RelativeTime value={entry.date} className="block text-xs text-muted-foreground" /></div>
                  </div>
                )}
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      style={{ "--star-i": star - 1 } as CSSProperties}
                      className={cn(
                        "review-star size-3.5",
                        entry.rating >= star
                          ? "fill-amber-300 text-amber-300"
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
