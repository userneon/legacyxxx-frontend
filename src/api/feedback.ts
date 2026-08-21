import { get, post, type CallOptions } from "./client"
import type { CreateFeedbackRequest, FeedbackEntry } from "./types"

/**
 * Feedback service. Lists published feedback entries and submits new
 * feedback (rating + message) authored by the current user.
 */
export const feedbackService = {
  async getFeedback(options?: CallOptions): Promise<FeedbackEntry[]> {
    return get<FeedbackEntry[]>("/feedback", undefined, options)
  },

  async submitFeedback(payload: CreateFeedbackRequest, options?: CallOptions): Promise<FeedbackEntry> {
    return post<FeedbackEntry>("/feedback", payload, options)
  },
}
