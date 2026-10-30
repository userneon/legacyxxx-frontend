import { del, get, post, put, type CallOptions } from "./client"
import type { CreateFeedbackRequest, FeedbackEntry, FeedbackReaction } from "./types"

/**
 * Feedback service. Lists published feedback entries and submits new
 * feedback (rating + message) authored by the current user.
 */
export const feedbackService = {
  async getFeedback(options?: CallOptions): Promise<FeedbackEntry[]> {
    const response = await get<FeedbackEntry[] | { feedback?: FeedbackEntry[] }>("/api/v1/feedback", undefined, options)
    if (Array.isArray(response)) return response
    return Array.isArray(response.feedback) ? response.feedback : []
  },

  /** Whether the site's waiting times (one review a week, clan limits) are on yet; they start at the launch. Unknown counts as on. */
  async getCooldownsActive(options?: CallOptions): Promise<boolean> {
    try {
      const response = await get<{ cooldowns?: boolean }>("/api/v1/public/features", undefined, options)
      return response.cooldowns !== false
    } catch {
      return true
    }
  },

  /** Sets (or with null takes back) the signed-in player's one reaction on a review; answers with the new counts. */
  async react(feedbackId: string, reaction: FeedbackReaction | null, options?: CallOptions): Promise<Pick<FeedbackEntry, "reactions" | "myReaction">> {
    return put<Pick<FeedbackEntry, "reactions" | "myReaction">>(`/api/v1/feedback/${feedbackId}/reaction`, { reaction }, options)
  },

  async submitFeedback(payload: CreateFeedbackRequest, options?: CallOptions): Promise<FeedbackEntry> {
    const response = await post<FeedbackEntry | { feedback?: FeedbackEntry }>("/api/v1/feedback", payload, options)
    if ("id" in response) return response
    if (response.feedback?.id) return response.feedback
    throw { status: 500, code: "invalid_response", message: "The review could not be confirmed. Please refresh and try again." }
  },

  /** The author changes their own review. */
  async updateFeedback(feedbackId: string, payload: CreateFeedbackRequest, options?: CallOptions): Promise<FeedbackEntry> {
    return put<FeedbackEntry>(`/api/v1/feedback/${feedbackId}`, payload, options)
  },

  /** The author (or an Owner or Manager) removes a review. */
  async removeFeedback(feedbackId: string, options?: CallOptions): Promise<void> {
    await del<void>(`/api/v1/feedback/${feedbackId}`, options)
  },

  /** Staff (Admin and above) answer a review; writing again changes the answer. */
  async setReply(feedbackId: string, message: string, options?: CallOptions): Promise<FeedbackEntry> {
    return put<FeedbackEntry>(`/api/v1/feedback/${feedbackId}/reply`, { message }, options)
  },

  async removeReply(feedbackId: string, options?: CallOptions): Promise<FeedbackEntry> {
    return del<FeedbackEntry>(`/api/v1/feedback/${feedbackId}/reply`, options)
  },
}
