import { get, type CallOptions } from "./client"
import type { KillFeedEntry } from "./types"

/** Live kill feed held in API memory (never stored). Poll with the last cursor to get only newer kills. */
export const killfeedService = {
  async since(cursor: number, options?: CallOptions): Promise<{ entries: KillFeedEntry[]; cursor: number }> {
    const response = await get<{ entries?: KillFeedEntry[]; cursor?: number }>("/api/v1/public/killfeed", { after: cursor || undefined }, { ...options, skipAuth: true })
    return { entries: Array.isArray(response.entries) ? response.entries : [], cursor: typeof response.cursor === "number" ? response.cursor : cursor }
  },
}
