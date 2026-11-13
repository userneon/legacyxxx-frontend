import { API_BASE_URL, del, get, getAccessToken, post, put, type CallOptions } from "./client"

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
  frameLook?: import("@/lib/frame-look").FrameLook | null
  nameStyle: unknown
  perk?: { tier: string; name: string } | null
  /** Their TikTok, proven with TikTok's own sign-in (null when not connected). */
  tiktok?: { username: string; followers: number | null } | null
}

/** A creator's connected TikTok account, as TikTok told the API. */
export interface TikTokLink { username: string; displayName: string; avatarUrl: string | null; followers: number | null; likes: number | null; videos: number | null; linkedAt: string }

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
  /** A creator's own channel links, to edit; null for everyone else. */
  links?: CreatorLinks | null
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

/** A creator's own code, what it earned and who used it (the API makes the code the first time it is asked for). */
/** The animated Creator kit (owner request 2026-11-07): the API renders the animations with the name and the code typed. */
export interface KitRenderConfig {
  enabled: boolean
  items: Array<{ id: string; label: string; ext: string; needs: "name" | "code" | "either" | "none"; heavy?: boolean }>
  dailyLimit: number
  keepHours: number
  queue: number
}
export interface KitRenderFile { id: string; label: string; ext: string; bytes: number; url: string }
export interface KitRender { id: string; status: "queued" | "rendering" | "done" | "failed"; error: string | null; createdAt: string; files: KitRenderFile[]; position?: number }

/** A rendered file, downloaded with the sign-in (it is private to its maker) and handed to the browser as a save. */
export async function downloadKitFile(file: KitRenderFile, filename: string): Promise<void> {
  const token = getAccessToken()
  const response = await fetch(`${API_BASE_URL}${file.url}`, { credentials: "include", headers: token ? { Authorization: `Bearer ${token}` } : undefined })
  if (!response.ok) throw new Error(response.status === 410 ? "The file is gone. Make it again." : "Could not download the file")
  const url = URL.createObjectURL(await response.blob())
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export interface MyReferral {
  code: string
  count: number
  earned: number
  recent: Array<{ id: string; name: string; steamId: string; avatar: string | null; at: string }>
}
/** Whether a signed-in player can enter a creator's code now, and if not, why. */
export interface ReferralStatus {
  canRedeem: boolean
  reason: "own_code" | "already_used" | "too_old" | "not_played" | "creator" | null
  used: boolean
  rewardNew: number
  windowDays: number
}

export const creatorsService = {
  list: (options?: CallOptions) => get<{ creators: Creator[] }>("/api/v1/public/creators", undefined, options),
  /** Owners and Managers only (the API checks). */
  save: (steamId: string, input: CreatorInput, options?: CallOptions) => put<{ ok: true; label: string }>(`/api/v1/staffpanel/creators/${encodeURIComponent(steamId)}`, input, options),
  apply: (input: CreatorApplicationInput, options?: CallOptions) => post<{ id: string; status: "pending" }>("/api/v1/creators/applications", input, options),
  /** A creator changes their own About line. */
  saveAbout: (bio: string, options?: CallOptions) => put<{ about: string }>("/api/v1/creators/me/about", { bio }, options),
  /** A creator changes their own channel links (at least one). */
  saveLinks: (links: CreatorLinks, options?: CallOptions) => put<{ links: CreatorLinks }>("/api/v1/creators/me/links", { links }, options),
  /** The creator's connected TikTok (null when none) and whether the website can connect one. */
  myTikTok: (options?: CallOptions) => get<{ available: boolean; link: TikTokLink | null }>("/api/v1/creators/me/tiktok", undefined, options),
  startTikTok: (options?: CallOptions) => post<{ url: string }>("/api/v1/creators/me/tiktok/start", {}, options),
  removeTikTok: (options?: CallOptions) => del<void>("/api/v1/creators/me/tiktok", options),
  myReferral: (options?: CallOptions) => get<MyReferral>("/api/v1/creators/me/referral", undefined, options),
  kitRenderConfig: (options?: CallOptions) => get<KitRenderConfig>("/api/v1/creators/kit-renders/config", undefined, options),
  startKitRender: (input: { name: string; code: string; items: string[] }, options?: CallOptions) => post<{ id: string; status: string; position: number }>("/api/v1/creators/kit-renders", input, options),
  kitRender: (id: string, options?: CallOptions) => get<KitRender>(`/api/v1/creators/kit-renders/${encodeURIComponent(id)}`, undefined, options),
  referralStatus: (options?: CallOptions) => get<ReferralStatus>("/api/v1/referral/status", undefined, options),
  redeemReferral: (code: string, options?: CallOptions) => post<{ redeemed: true; reward: number }>("/api/v1/referral/redeem", { code }, options),
  myApplication: (options?: CallOptions) => get<MyCreatorApplication>("/api/v1/creators/applications/me", undefined, options),
  /** Owners and Managers only (the API checks). */
  applications: (options?: CallOptions) => get<{ applications: StaffCreatorApplication[] }>("/api/v1/staff/creators/applications", undefined, options),
  decide: (id: string, body: { decision: "approve" | "decline"; tier?: CreatorTier; note?: string }, options?: CallOptions) => put<{ id: string; status: "approved" | "declined" }>(`/api/v1/staff/creators/applications/${encodeURIComponent(id)}`, body, options),
  remove: (steamId: string, options?: CallOptions) => del<{ ok: true }>(`/api/v1/staffpanel/creators/${encodeURIComponent(steamId)}`, options),
}
