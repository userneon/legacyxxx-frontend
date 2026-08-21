import { get, type CallOptions } from "./client"
import type { CommunityContent } from "./types"

/**
 * Community service. Provides the creators and partners shown on the Home
 * page's community section.
 */
export const communityService = {
  async getContent(options?: CallOptions): Promise<CommunityContent> {
    return get<CommunityContent>("/api/v1/community/content", undefined, options)
  },
}