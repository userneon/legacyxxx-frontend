import { del, get, post, put, type CallOptions } from "./client"
import type {
  ClanCard,
  ClanDetail,
  ClanMember,
  CreateClanRequest,
  MyClanMembership,
} from "./types"

/**
 * Clans service. Lists clans for browsing, fetches a single clan's detail
 * (including members), supports creating/joining/leaving a clan, and
 * exposes the staff team roster shown on the clan page.
 */
export const clansService = {
  async getClans(options?: CallOptions): Promise<ClanCard[]> {
    return get<ClanCard[]>("/api/v1/clans", undefined, options)
  },

  async getClan(clanId: string, options?: CallOptions): Promise<ClanDetail> {
    return get<ClanDetail>(`/api/v1/clans/${clanId}`, undefined, options)
  },

  async getMine(options?: CallOptions): Promise<MyClanMembership | null> {
    const response = await get<{ membership: MyClanMembership | null }>("/api/v1/clans/me", undefined, options)
    return response.membership
  },

  async getClanMembers(clanId: string, options?: CallOptions): Promise<ClanMember[]> {
    return get<ClanMember[]>(`/api/v1/clans/${clanId}/members`, undefined, options)
  },

  async createClan(payload: CreateClanRequest, options?: CallOptions): Promise<ClanDetail> {
    return post<ClanDetail>("/api/v1/clans", payload, options)
  },

  async updateClan(
    clanId: string,
    payload: { description: string },
    options?: CallOptions,
  ): Promise<ClanDetail> {
    return put<ClanDetail>(`/api/v1/clans/${clanId}`, payload, options)
  },

  async joinClan(clanId: string, options?: CallOptions): Promise<void> {
    await post<void>(`/api/v1/clans/${clanId}/join`, undefined, options)
  },

  async leaveClan(clanId: string, options?: CallOptions): Promise<void> {
    await post<void>(`/api/v1/clans/${clanId}/leave`, undefined, options)
  },

  async removeMember(clanId: string, userId: string, options?: CallOptions): Promise<void> {
    await del<void>(`/api/v1/clans/${clanId}/members/${userId}`, options)
  },

  async deleteClan(clanId: string, options?: CallOptions): Promise<void> {
    await del<void>(`/api/v1/clans/${clanId}`, options)
  },
}