/**
 * The platforms' own marks for link buttons (owner request 2026-10-26): lucide has no brand icons, so each is a small inline glyph in
 * `currentColor` (the site stays neutral; the brand colours are not used). Discord and Steam reuse the marks the site already has.
 */
import { DiscordIcon } from "@/components/discord-strip"
import { SteamIcon } from "@/components/steam-login-gate"

export type BrandPlatform = "discord" | "facebook" | "youtube" | "twitch" | "kick" | "instagram" | "tiktok" | "steam"

const svg = { viewBox: "0 0 24 24", fill: "currentColor", "aria-hidden": true } as const

export function BrandIcon({ platform, className }: { platform: BrandPlatform; className?: string }) {
  switch (platform) {
    case "discord": return <DiscordIcon className={className} />
    case "steam": return <SteamIcon className={className} />
    case "youtube":
      return <svg {...svg} className={className}><path fillRule="evenodd" d="M6 5h12a4 4 0 0 1 4 4v6a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V9a4 4 0 0 1 4-4zm4 4.5v5l4.5-2.5z" /></svg>
    case "facebook":
      return <svg {...svg} className={className}><path fillRule="evenodd" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1.5 20v-8h2.4l.4-3h-2.8V9.3c0-.9.3-1.4 1.5-1.4h1.5V5.2C15.8 5.1 14.9 5 13.9 5c-2.2 0-3.7 1.300-3.700 3.800V11H7.800v3h2.400v8z" /></svg>
    case "instagram":
      return (
        <svg {...svg} fill="none" stroke="currentColor" strokeWidth="2" className={className}>
          <rect x="3" y="3" width="18" height="18" rx="5" />
          <circle cx="12" cy="12" r="4" />
          <circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none" />
        </svg>
      )
    case "twitch":
      return <svg {...svg} className={className}><path fillRule="evenodd" d="M4 3 3 7v12h5v3h3l3-3h4l5-5V3H4zm7 4h2v5h-2zm5 0h2v5h-2z" /></svg>
    case "kick":
      return <svg {...svg} className={className}><path d="M3 3h6v5h2V6h2V3h8v6h-2v2h-2v2h2v2h2v6h-8v-3h-2v-2h-2v5H3z" /></svg>
    case "tiktok":
      return <svg {...svg} className={className}><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" /></svg>
  }
}
