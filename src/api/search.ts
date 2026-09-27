import { get, type CallOptions } from "./client"
import type {
  CommunityPlayer,
  ModerationStatus,
  SearchClansResult,
  SearchPlayersResult,
  SearchRequest,
} from "./types"

/** The API sends numeric columns as strings (Postgres numeric) and may leave fields null. */
function toNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const MODERATION_STATUSES: ModerationStatus[] = ["Banned", "Muted", "Gag", "Clear"]

/** One search result in the shape the page renders: real numbers, a name, a known status. */
function normalizePlayer(raw: Record<string, unknown>): CommunityPlayer {
  const text = (value: unknown) => (typeof value === "string" && value.trim() ? value : undefined)
  const steamId = text(raw.steamId) ?? text(raw.steam_id)
  const status = raw.moderationStatus as ModerationStatus
  return {
    id: text(raw.id) ?? text(raw.user_id),
    steamId,
    name: text(raw.name) ?? text(raw.username) ?? text(raw.nickname) ?? steamId ?? "Unknown player",
    kills: toNumber(raw.kills),
    deaths: toNumber(raw.deaths),
    kd: toNumber(raw.kd ?? raw.kd_ratio),
    headshots: toNumber(raw.headshots),
    matches: toNumber(raw.matches),
    wins: toNumber(raw.wins),
    playedHours: toNumber(raw.playedHours ?? raw.played_hours),
    lastPlayed: text(raw.lastPlayed) ?? text(raw.last_played) ?? "",
    avatar: text(raw.avatar) ?? "",
    moderationStatus: MODERATION_STATUSES.includes(status) ? status : "Clear",
  }
}

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
    const response = await get<{ players?: unknown } | unknown[]>("/api/v1/search/players", { query }, options)
    const rows = Array.isArray(response) ? response : Array.isArray(response?.players) ? response.players : []
    return { players: rows.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object").map(normalizePlayer) }
  },

  async searchClans(query: string, options?: CallOptions): Promise<SearchClansResult> {
    return get<SearchClansResult>("/api/v1/search/clans", { query }, options)
  },
}