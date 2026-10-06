import { API_BASE_URL, MOCK_API, del, get, post, put, type CallOptions } from "./client"
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

  /** Sends the clan's logo (PNG only) or banner (PNG, JPEG or GIF). The server checks the real file type. */
  async uploadArt(clanId: string, kind: ClanArtKind, file: Blob, options?: CallOptions): Promise<ClanDetail> {
    return put<ClanDetail>(`/api/v1/clans/${clanId}/${kind}`, file, options)
  },

  async removeArt(clanId: string, kind: ClanArtKind, options?: CallOptions): Promise<void> {
    await del<void>(`/api/v1/clans/${clanId}/${kind}`, options)
  },

  async removeMember(clanId: string, userId: string, options?: CallOptions): Promise<void> {
    await del<void>(`/api/v1/clans/${clanId}/members/${userId}`, options)
  },

  async deleteClan(clanId: string, options?: CallOptions): Promise<void> {
    await del<void>(`/api/v1/clans/${clanId}`, options)
  },
}
export type ClanArtKind = "logo" | "banner"

/** What a clan picture may be; the same limits the server enforces. */
export const CLAN_ART_RULES: Record<ClanArtKind, { types: string[]; maxBytes: number; hint: string }> = {
  logo: { types: ["image/png"], maxBytes: 256 * 1024, hint: "PNG, up to 256 KB" },
  banner: { types: ["image/png", "image/jpeg", "image/gif"], maxBytes: 900 * 1024, hint: "PNG, JPEG or GIF, up to 900 KB" },
}

/** Why a chosen file cannot be used, or null when it can. */
export function clanArtProblem(kind: ClanArtKind, file: File): string | null {
  const rule = CLAN_ART_RULES[kind]
  if (!rule.types.includes(file.type)) return kind === "logo" ? "The logo must be a PNG." : "The banner must be a PNG, JPEG or GIF."
  if (file.size > rule.maxBytes) return `That file is too big. ${rule.hint}.`
  return null
}

/** The address of a clan picture the API sent, or null. A path from the API gets the API origin in front. */
export function clanArtSrc(value: string | null | undefined): string | null {
  if (!value) return null
  if (value.startsWith("/api/")) return `${API_BASE_URL}${value}`
  return MOCK_API && value.startsWith("data:image/") ? value : null
}
