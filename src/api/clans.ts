import { del, get, post, put, type CallOptions } from "./client"
import type {
  ClanCard,
  ClanDetail,
  ClanMember,
  CreateClanRequest,
  TeamMember,
} from "./types"

/**
 * Clans service. Lists clans for browsing, fetches a single clan's detail
 * (including members), supports creating/joining/leaving a clan, and
 * exposes the staff team roster shown on the clan page.
 */
export const clansService = {
  async getClans(options?: CallOptions): Promise<ClanCard[]> {
    return get<ClanCard[]>("/clans", undefined, options)
  },

  async getClan(clanId: string, options?: CallOptions): Promise<ClanDetail> {
    return get<ClanDetail>(`/clans/${clanId}`, undefined, options)
  },

  async getClanMembers(clanId: string, options?: CallOptions): Promise<ClanMember[]> {
    return get<ClanMember[]>(`/clans/${clanId}/members`, undefined, options)
  },

  async createClan(payload: CreateClanRequest, options?: CallOptions): Promise<ClanDetail> {
    return post<ClanDetail>("/clans", payload, options)
  },

  async updateClan(
    clanId: string,
    payload: Partial<CreateClanRequest>,
    options?: CallOptions,
  ): Promise<ClanDetail> {
    return put<ClanDetail>(`/clans/${clanId}`, payload, options)
  },

  async joinClan(clanId: string, options?: CallOptions): Promise<void> {
    await post<void>(`/clans/${clanId}/join`, undefined, options)
  },

  async leaveClan(clanId: string, options?: CallOptions): Promise<void> {
    await post<void>(`/clans/${clanId}/leave`, undefined, options)
  },

  async deleteClan(clanId: string, options?: CallOptions): Promise<void> {
    await del<void>(`/clans/${clanId}`, options)
  },

  async getTeam(options?: CallOptions): Promise<TeamMember[]> {
    return get<TeamMember[]>("/clans/team", undefined, options)
  },
}
