import { get, type CallOptions } from "./client"
import type { PenaltyEntry, PenaltyFilters, PenaltyStats } from "./types"

/**
 * Moderation service. Lists penalties (bans/comms/gags), exposes aggregate
 * penalty stats, and supports filtering by type and free-text query.
 */
export const moderationService = {
  async getPenalties(filters?: PenaltyFilters, options?: CallOptions): Promise<PenaltyEntry[]> {
    return get<PenaltyEntry[]>(
      "/api/v1/moderation/penalties",
      { type: filters?.type, query: filters?.query },
      options,
    )
  },

  async getPenalty(penaltyId: string, options?: CallOptions): Promise<PenaltyEntry> {
    return get<PenaltyEntry>(`/api/v1/penalties/${penaltyId}`, undefined, options)
  },

  async getStats(options?: CallOptions): Promise<PenaltyStats> {
    return get<PenaltyStats>("/api/v1/moderation/penalties/stats", undefined, options)
  },
}