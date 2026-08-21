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
    const payload = await get<UserProfile | { profile: UserProfile }>(`/profile/${userId ?? "me"}`, undefined, options)
    return "profile" in payload ? payload.profile : payload
  },

  async updateProfile(
    payload: Partial<Pick<UserProfile, "username" | "avatar">>,
    options?: CallOptions,
  ): Promise<UserProfile> {
    const response = await put<UserProfile | { profile: UserProfile }>("/profile/me", payload, options)
    return "profile" in response ? response.profile : response
  },

  async getStats(userId?: string, options?: CallOptions): Promise<ProfileStats> {
    const payload = await get<ProfileStats | { stats: ProfileStats }>(`/profile/${userId ?? "me"}/stats`, undefined, options)
    return "stats" in payload ? payload.stats : payload
  },

  async getRecentMatches(userId?: string, options?: CallOptions): Promise<ProfileRecentMatch[]> {
    const payload = await get<ProfileRecentMatch[] | { data: ProfileRecentMatch[] }>(`/profile/${userId ?? "me"}/matches`, undefined, options)
    return Array.isArray(payload) ? payload : payload.data
  },

  async updateLinks(links: ProfileLink[], options?: CallOptions): Promise<ProfileLink[]> {
    const payload: ProfileLinksPayload = { links }
    const res = await put<ProfileLinksPayload>("/profile/me/links", payload, options)
    return res.links
  },

  async getPenalties(userId?: string, options?: CallOptions): Promise<PenaltyEntry[]> {
    const payload = await get<PenaltyEntry[] | { penalties: PenaltyEntry[] }>(`/profile/${userId ?? "me"}/penalties`, undefined, options)
    return Array.isArray(payload) ? payload : payload.penalties
  },
}
