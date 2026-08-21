import { get, put, type CallOptions } from "./client"
import type {
  PenaltyEntry,
  ProfileLink,
  ProfileLinksPayload,
  ProfileRecentMatch,
  ProfileStats,
  UserProfile,
} from "./types"

/**
 * Profile service. Reads and updates the currently authenticated user's
 * profile, aggregate stats, recent match history, and user-specific penalties.
 */
export const profileService = {
  async getProfile(userId?: string, options?: CallOptions): Promise<UserProfile> {
    return get<UserProfile>(`/profile/${userId ?? "me"}`, undefined, options)
  },

  async updateProfile(
    payload: Partial<Pick<UserProfile, "username" | "avatar">>,
    options?: CallOptions,
  ): Promise<UserProfile> {
    return put<UserProfile>("/profile/me", payload, options)
  },

  async getStats(userId?: string, options?: CallOptions): Promise<ProfileStats> {
    return get<ProfileStats>(`/profile/${userId ?? "me"}/stats`, undefined, options)
  },

  async getRecentMatches(userId?: string, options?: CallOptions): Promise<ProfileRecentMatch[]> {
    return get<ProfileRecentMatch[]>(`/profile/${userId ?? "me"}/matches`, undefined, options)
  },

  async updateLinks(links: ProfileLink[], options?: CallOptions): Promise<ProfileLink[]> {
    const payload: ProfileLinksPayload = { links }
    const res = await put<ProfileLinksPayload>("/profile/me/links", payload, options)
    return res.links
  },

  async getPenalties(userId?: string, options?: CallOptions): Promise<PenaltyEntry[]> {
    return get<PenaltyEntry[]>(`/profile/${userId ?? "me"}/penalties`, undefined, options)
  },
}
