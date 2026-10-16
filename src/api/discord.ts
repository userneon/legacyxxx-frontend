import { del, get, post, type CallOptions } from "./client"

/** The signed-in player's Discord link (backend /discord/link). Linking goes through Discord's own consent page. */
export interface DiscordLinkState {
  /** False until the site's Discord application is set up: the button is then disabled. */
  available: boolean
  link: { discordId: string; discordName: string; linkedAt: string } | null
}

/** A linked Discord member on Leaders → Boosters. */
export interface CommunityEntry {
  position: number
  steamId: string
  username: string
  avatar: string
  boosts: number
  boostingSince: string | null
  invites: number
}

export const discordService = {
  /** Linked members ranked by Discord boosts or by people they invited (public, only members who linked Discord). */
  async getCommunity(sort: "boosts" | "invites", options?: CallOptions): Promise<CommunityEntry[]> {
    const response = await get<{ entries: CommunityEntry[] }>("/api/v1/public/discord/community", { sort }, options)
    return response.entries ?? []
  },

  async getLink(options?: CallOptions): Promise<DiscordLinkState> {
    return get<DiscordLinkState>("/api/v1/discord/link", undefined, options)
  },

  /** The Discord address to send the player to. They come back to Settings with ?discord=linked. */
  async start(options?: CallOptions): Promise<{ url: string }> {
    return post<{ url: string }>("/api/v1/discord/link/start", undefined, options)
  },

  async unlink(options?: CallOptions): Promise<void> {
    await del<void>("/api/v1/discord/link", options)
  },
}
