import discordLogo from "@/assets/social/discord.png"
import facebookLogo from "@/assets/social/facebook.png"
import instagramLogo from "@/assets/social/instagram.png"
import { Camera, Globe, MessageCircle, ThumbsUp, Video, type LucideIcon } from "lucide-react"

/** A link a player (here: the Owner) shows on their profile. The label is optional; the address decides the icon. */
export interface ProfileLink {
  url: string
  label?: string
}

export interface DescribedLink {
  href: string
  label: string
  /** A second line under the name: the handle (@name) or the address. */
  detail: string
  Icon: LucideIcon
  /** The site's own logo, when we have it; otherwise the tile shows Icon. */
  logo?: string
}

const KINDS: Array<{ hosts: string[]; label: string; Icon: LucideIcon; logo?: string }> = [
  { hosts: ["instagram.com"], label: "Instagram", Icon: Camera, logo: instagramLogo },
  { hosts: ["facebook.com", "fb.com", "fb.me", "m.me"], label: "Facebook", Icon: ThumbsUp, logo: facebookLogo },
  { hosts: ["discord.gg", "discord.com", "discordapp.com"], label: "Discord", Icon: MessageCircle, logo: discordLogo },
  { hosts: ["youtube.com", "youtu.be"], label: "YouTube", Icon: Video },
  { hosts: ["twitch.tv"], label: "Twitch", Icon: Video },
  { hosts: ["tiktok.com"], label: "TikTok", Icon: Video },
  { hosts: ["x.com", "twitter.com"], label: "X", Icon: Globe },
  { hosts: ["t.me", "telegram.me"], label: "Telegram", Icon: MessageCircle },
  { hosts: ["steamcommunity.com"], label: "Steam", Icon: Globe },
  { hosts: ["github.com"], label: "GitHub", Icon: Globe },
]

/**
 * Turns an address into something safe to show: only https links, a known site gets its own name and icon, any other site
 * shows its host name. Anything that is not a plain https address is dropped, so a profile can never carry a javascript:
 * or data: link.
 */
export function describeLink(link: ProfileLink): DescribedLink | null {
  let url: URL
  try {
    url = new URL(link.url)
  } catch {
    return null
  }
  if (url.protocol !== "https:" || !url.hostname.includes(".")) return null
  const host = url.hostname.toLowerCase().replace(/^(www|m)\./, "")
  const kind = KINDS.find((entry) => entry.hosts.some((known) => host === known || host.endsWith(`.${known}`)))
  const custom = link.label?.trim().slice(0, 32)
  const segments = url.pathname.split("/").filter(Boolean)
  const handleSites = ["instagram.com", "x.com", "twitter.com", "tiktok.com", "github.com", "twitch.tv", "t.me"]
  const detail = handleSites.some((site) => host === site) && segments[0]
    ? `@${segments[0].replace(/^@/, "")}`
    : `${host}${segments.length ? `/${segments.join("/")}` : ""}`
  return { href: url.toString(), label: custom || kind?.label || host, detail: detail.length > 30 ? `${detail.slice(0, 29)}…` : detail, Icon: kind?.Icon ?? Globe, logo: kind?.logo }
}
