import { get, put, type CallOptions } from "./client"
import type {
  FaceitProfileData,
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
    const payload = await get<UserProfile | { profile: UserProfile }>(`/api/v1/profile/${userId ?? "me"}`, undefined, options)
    return "profile" in payload ? payload.profile : payload
  },

  async updateProfile(
    payload: Partial<Pick<UserProfile, "username" | "avatar">>,
    options?: CallOptions,
  ): Promise<UserProfile> {
    const response = await put<UserProfile | { profile: UserProfile }>("/api/v1/profile/me", payload, options)
    return "profile" in response ? response.profile : response
  },

  async getStats(userId?: string, options?: CallOptions): Promise<ProfileStats> {
    const payload = await get<ProfileStats | { stats: ProfileStats }>(`/api/v1/profile/${userId ?? "me"}/stats`, undefined, options)
    return "stats" in payload ? payload.stats : payload
  },

  async getRecentMatches(userId?: string, options?: CallOptions): Promise<ProfileRecentMatch[]> {
    const payload = await get<ProfileRecentMatch[] | { data: ProfileRecentMatch[] }>(`/api/v1/profile/${userId ?? "me"}/matches`, undefined, options)
    return Array.isArray(payload) ? payload : payload.data
  },

  async updateLinks(links: ProfileLink[], options?: CallOptions): Promise<ProfileLink[]> {
    const payload: ProfileLinksPayload = { links }
    const res = await put<ProfileLinksPayload>("/api/v1/profile/me/links", payload, options)
    return res.links
  },

  async getFaceitProfile(userId?: string, options?: CallOptions): Promise<FaceitProfileData> {
    return get<FaceitProfileData>(`/api/v1/profile/${userId ?? "me"}/faceit`, undefined, options)
  },

  async linkFaceitProfile(nickname: string, options?: CallOptions): Promise<{ username: string; elo: number; level: number }> {
    const response = await put<{ faceit: { nickname: string; elo: number; level: number } }>("/api/v1/profile/me/faceit", { nickname }, options)
    return { username: response.faceit.nickname, elo: response.faceit.elo, level: response.faceit.level }
  },

  async getPenalties(userId?: string, options?: CallOptions): Promise<PenaltyEntry[]> {
    const payload = await get<PenaltyEntry[] | { penalties: PenaltyEntry[] }>(`/api/v1/profile/${userId ?? "me"}/penalties`, undefined, options)
    return Array.isArray(payload) ? payload : payload.penalties
  },
}
