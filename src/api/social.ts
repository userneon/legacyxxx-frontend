import { get, type CallOptions } from "./client"

/** LEGACY-X's TikTok page as the server last read it. Followers and videos are null when TikTok did not give them (never guessed). */
export interface TikTokStats {
  url: string
  handle: string
  followers: number | null
  videos: number | null
  updatedAt: string | null
}

export const socialService = {
  /** Public. Null when the server has no TikTok page set (TIKTOK_URL). */
  async getTikTok(options?: CallOptions): Promise<TikTokStats | null> {
    const response = await get<{ tiktok: TikTokStats | null }>("/api/v1/public/social/tiktok", undefined, options)
    return response.tiktok ?? null
  },
}
