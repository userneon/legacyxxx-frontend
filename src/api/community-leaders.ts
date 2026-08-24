import { get, type CallOptions } from "./client"
import type { CommunityPlayer } from "./types"

/** Rank-free community performance list. It intentionally exposes no XP, level, rating or ordinal rank. */
export const communityLeadersService = {
  async getLeaders(options?: CallOptions): Promise<CommunityPlayer[]> {
    return get<CommunityPlayer[]>("/api/v1/community/leaders", undefined, options)
  },
}
