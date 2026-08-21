import { get, type CallOptions } from "./client"
import type {
  SearchClansResult,
  SearchPlayersResult,
  SearchRequest,
} from "./types"

/**
 * Search service. Powers the Explore page's players/clans search. The kind
 * parameter selects which index to query.
 */
export const searchService = {
  async search(
    request: SearchRequest,
    options?: CallOptions,
  ): Promise<SearchPlayersResult | SearchClansResult> {
    if (request.kind === "players") {
      return get<SearchPlayersResult>("/api/v1/search/players", { query: request.query }, options)
    }
    return get<SearchClansResult>("/api/v1/search/clans", { query: request.query }, options)
  },

  async searchPlayers(query: string, options?: CallOptions): Promise<SearchPlayersResult> {
    return get<SearchPlayersResult>("/api/v1/search/players", { query }, options)
  },

  async searchClans(query: string, options?: CallOptions): Promise<SearchClansResult> {
    return get<SearchClansResult>("/api/v1/search/clans", { query }, options)
  },
}