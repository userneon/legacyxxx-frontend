import { Bird, Crosshair, Crown, Flame, Gem, Ghost, Rocket, Shield, Skull, Star, Swords, Zap, type LucideIcon } from "lucide-react"

import { cs2MapArtwork, cs2MapLabel } from "@/lib/cs2-map-art"

/** A clan picks its icon and banner from these fixed sets, so there is nothing to upload or moderate. Keys match the API. */
export const CLAN_ICONS: Record<string, LucideIcon> = {
  swords: Swords, shield: Shield, skull: Skull, crown: Crown, flame: Flame, zap: Zap,
  crosshair: Crosshair, ghost: Ghost, star: Star, rocket: Rocket, bird: Bird, gem: Gem,
}

export const CLAN_BANNER_KEYS = ["de_ancient", "de_anubis", "de_cache", "de_dust2", "de_inferno", "de_mirage", "de_nuke", "de_overpass", "de_train", "de_vertigo"] as const

export function clanIcon(key: string | null | undefined): LucideIcon | null {
  return key && Object.hasOwn(CLAN_ICONS, key) ? CLAN_ICONS[key] : null
}

export function clanBanner(key: string | null | undefined): string | null {
  return key && (CLAN_BANNER_KEYS as readonly string[]).includes(key) ? cs2MapArtwork(key) : null
}

export { cs2MapLabel as clanBannerLabel }
