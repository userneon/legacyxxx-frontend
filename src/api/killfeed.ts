import { get, type CallOptions } from "./client"
import type { KillFeedEntry, KillFeedPage } from "./types"

/** The API's kill feed shape (backend killfeed.ts): numeric cursor, `at` timestamp, nullable SteamIDs. */
interface ApiKillFeedEntry {
  eventId: string
  serverId: string
  attackerName: string
  attackerSteamId: string | null
  victimName: string
  victimSteamId: string | null
  weapon: string
  headshot: boolean
  noscope?: boolean
  blind?: boolean
  throughSmoke?: boolean
  penetrated?: boolean
  at?: string
  timestamp?: string
}

const toEntry = (entry: ApiKillFeedEntry): KillFeedEntry => ({
  eventId: entry.eventId,
  serverId: entry.serverId,
  attackerName: entry.attackerName,
  attackerSteamId: entry.attackerSteamId ?? "",
  victimName: entry.victimName,
  victimSteamId: entry.victimSteamId ?? "",
  weapon: entry.weapon,
  headshot: Boolean(entry.headshot),
  noscope: entry.noscope,
  blind: entry.blind,
  throughSmoke: entry.throughSmoke,
  penetrated: entry.penetrated,
  timestamp: entry.timestamp ?? entry.at ?? new Date().toISOString(),
})

/** Public live kill feed: the last kills reported by the game servers (never stored in the database). */
export const killFeedService = {
  async getKills(after?: string | null, options?: CallOptions): Promise<KillFeedPage> {
    const page = await get<{ entries?: ApiKillFeedEntry[]; kills?: ApiKillFeedEntry[]; cursor?: number | string | null }>(
      "/api/v1/public/killfeed",
      { after: after ?? undefined },
      { ...options, skipAuth: true },
    )
    const rows = Array.isArray(page.entries) ? page.entries : Array.isArray(page.kills) ? page.kills : []
    return { kills: rows.map(toEntry), cursor: page.cursor === null || page.cursor === undefined ? null : String(page.cursor) }
  },
}
