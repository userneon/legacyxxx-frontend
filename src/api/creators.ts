import { del, get, put, type CallOptions } from "./client"

/** Content creators (owner request 2026-10-12): Main Content Creator and Content Creator. */
export type CreatorTier = "main" | "creator"
export type CreatorPlatform = "twitch" | "youtube" | "tiktok" | "kick" | "facebook" | "instagram"
export type CreatorLinks = Partial<Record<CreatorPlatform, string>>

export const CREATOR_PLATFORMS: Array<{ id: CreatorPlatform; label: string; example: string }> = [
  { id: "twitch", label: "Twitch", example: "https://twitch.tv/name" },
  { id: "youtube", label: "YouTube", example: "https://youtube.com/@name" },
  { id: "tiktok", label: "TikTok", example: "https://tiktok.com/@name" },
  { id: "kick", label: "Kick", example: "https://kick.com/name" },
  { id: "facebook", label: "Facebook", example: "https://facebook.com/name" },
  { id: "instagram", label: "Instagram", example: "https://instagram.com/name" },
]

export interface Creator {
  userId: string
  steamId: string
  username: string
  avatar: string | null
  tier: CreatorTier
  label: string
  bio: string
  links: CreatorLinks
  rank: { id: number; name: string; imageKey: string | null } | null
  frame: string | null
  nameStyle: unknown
}

export interface CreatorInput {
  tier: CreatorTier
  bio: string
  links: CreatorLinks
  sort?: number
}

export const creatorsService = {
  list: (options?: CallOptions) => get<{ creators: Creator[] }>("/api/v1/public/creators", undefined, options),
  /** Owners and Managers only (the API checks). */
  save: (steamId: string, input: CreatorInput, options?: CallOptions) => put<{ ok: true; label: string }>(`/api/v1/staffpanel/creators/${encodeURIComponent(steamId)}`, input, options),
  remove: (steamId: string, options?: CallOptions) => del<{ ok: true }>(`/api/v1/staffpanel/creators/${encodeURIComponent(steamId)}`, options),
}
