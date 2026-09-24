import { get, type CallOptions } from "./client"
import type { SearchPlayersResult } from "./types"

/** Player search for Explore. */
export const searchService = {
  async searchPlayers(query: string, options?: CallOptions): Promise<SearchPlayersResult> {
    return get<SearchPlayersResult>("/api/v1/search/players", { query }, options)
  },
}
