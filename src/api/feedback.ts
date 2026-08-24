import { get, post, type CallOptions } from "./client"
import type { CreateFeedbackRequest, FeedbackEntry } from "./types"

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

  async submitFeedback(payload: CreateFeedbackRequest, options?: CallOptions): Promise<FeedbackEntry> {
    const response = await post<FeedbackEntry | { feedback?: FeedbackEntry }>("/api/v1/feedback", payload, options)
    if ("id" in response) return response
    if (response.feedback?.id) return response.feedback
    throw { status: 500, code: "invalid_response", message: "The review could not be confirmed. Please refresh and try again." }
  },
}
