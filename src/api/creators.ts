import { del, get, post, put, type CallOptions } from "./client"

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

/** The hosts each platform's links may point to, as the API checks them. */
const PLATFORM_HOSTS: Record<CreatorPlatform, string[]> = {
  twitch: ["twitch.tv"],
  youtube: ["youtube.com", "youtu.be"],
  tiktok: ["tiktok.com"],
  kick: ["kick.com"],
  facebook: ["facebook.com", "fb.com", "fb.gg"],
  instagram: ["instagram.com"],
}

/** What a player pasted, as the https link it means ("www.tiktok.com/@name" and "http://…" included). */
export function withHttps(value: string): string {
  const text = value.trim()
  if (!text) return text
  if (/^http:\/\//i.test(text)) return `https://${text.slice(7)}`
  if (text.includes("://")) return text
  return `https://${text.replace(/^\/+/, "")}`
}

/** The first problem with a channel link (null when it is fine): the platform's own address, not another site's. */
export function creatorLinkProblem(platform: CreatorPlatform, value: string): string | null {
  const label = CREATOR_PLATFORMS.find((entry) => entry.id === platform)?.label ?? platform
  let host: string
  try {
    const url = new URL(withHttps(value))
    if (url.protocol !== "https:") return `${label}: use an https link`
    host = url.hostname.toLowerCase()
  } catch {
    return `${label}: that is not a link`
  }
  return PLATFORM_HOSTS[platform].some((allowed) => host === allowed || host.endsWith(`.${allowed}`)) ? null : `${label}: the link must be on ${PLATFORM_HOSTS[platform][0]}`
}

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

export interface CreatorApplicationInput {
  bio: string
  links: CreatorLinks
}

/** Where the signed-in player stands: already a creator, waiting, or turned down (and when they may ask again). */
export interface MyCreatorApplication {
  isCreator: boolean
  /** A creator's own line about themselves, to edit; null for everyone else. */
  about?: string | null
  application: { status: "pending" | "approved" | "declined"; note: string; createdAt: string; decidedAt: string | null } | null
  canApplyAgainAt: string | null
}

export interface StaffCreatorApplication {
  id: string
  bio: string
  links: CreatorLinks
  createdAt: string
  player: { steamId: string; username: string; avatar: string | null }
}

export const creatorsService = {
  list: (options?: CallOptions) => get<{ creators: Creator[] }>("/api/v1/public/creators", undefined, options),
  /** Owners and Managers only (the API checks). */
  save: (steamId: string, input: CreatorInput, options?: CallOptions) => put<{ ok: true; label: string }>(`/api/v1/staffpanel/creators/${encodeURIComponent(steamId)}`, input, options),
  apply: (input: CreatorApplicationInput, options?: CallOptions) => post<{ id: string; status: "pending" }>("/api/v1/creators/applications", input, options),
  /** A creator changes their own About line. */
  saveAbout: (bio: string, options?: CallOptions) => put<{ about: string }>("/api/v1/creators/me/about", { bio }, options),
  myApplication: (options?: CallOptions) => get<MyCreatorApplication>("/api/v1/creators/applications/me", undefined, options),
  /** Owners and Managers only (the API checks). */
  applications: (options?: CallOptions) => get<{ applications: StaffCreatorApplication[] }>("/api/v1/staff/creators/applications", undefined, options),
  decide: (id: string, body: { decision: "approve" | "decline"; tier?: CreatorTier; note?: string }, options?: CallOptions) => put<{ id: string; status: "approved" | "declined" }>(`/api/v1/staff/creators/applications/${encodeURIComponent(id)}`, body, options),
  remove: (steamId: string, options?: CallOptions) => del<{ ok: true }>(`/api/v1/staffpanel/creators/${encodeURIComponent(steamId)}`, options),
}
