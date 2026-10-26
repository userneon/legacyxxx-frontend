import { get, post, put, type CallOptions } from "./client"

/** How long a bought cosmetic is rented for; "forever" is yours for good. */
export type CosmeticDuration = "1d" | "7d" | "30d" | "forever"
export const COSMETIC_DURATIONS: Array<{ value: CosmeticDuration; label: string }> = [
  { value: "1d", label: "1 day" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "forever", label: "Forever" },
]

/** Avatar frames, name colours and name glows (backend GET /cosmetics). Purely visual: nothing here changes gameplay or EXP. */
export interface FrameItem {
  id: string
  name: string
  nameMn: string
  /** free: everyone; coin: bought once with LX; achievement: earned, never sold. */
  unlock: "free" | "coin" | "achievement"
  /** Staff switched it off after you bought it: still yours to wear, no longer sold. */
  retired?: boolean
  /** The 30-day price. */
  price: number
  /** The price of each rental length (items sold with LX). */
  prices?: Record<CosmeticDuration, number>
  /** When a rented item runs out (ISO); absent when it is yours for good. */
  expiresAt?: string
  /** How an achievement frame is earned. */
  requirement: string
  owned: boolean
  /** Name colour items: the #rrggbb the name is painted with. */
  color?: string
  /** Smoke colour items with two colours (a gradient): the second one. */
  color2?: string
  /** Name glow items: the #rrggbb of the glow around the name. */
  glow?: string
  /** The finished effect (chrome, gold, neon, flame ...) the website draws for this item. */
  fx?: string
  /** A design the player colours themselves (owner request 2026-10-26): `color` / `glow` (and `color2`) is their pick, or grey until they pick. */
  custom?: boolean
  /** The design takes a second colour too (the dual smoke). */
  twoColours?: boolean
  /** 1 common, 2 rare, 3 epic, 4 legendary (the ones that are earned). Absent from an older API. */
  rarity?: number
  featured?: boolean
  /** How many players own it; null for free items. */
  owners?: number | null
}

export type CosmeticKind = "frame" | "name_color" | "name_glow" | "banner" | "title" | "smoke_color" | "grenade_trail" | "grenade_light" | "flash_effect"

/** How a player's name is painted: plain colours from the API, never a style string. */
export interface NameStyle {
  color: string | null
  glow: string | null
  colorFx?: string | null
  glowFx?: string | null
}

/** The five kinds of grenade a trail or light can be worn on separately (the molotov and the incendiary share "fire"). */
export type Nade = "he" | "flash" | "smoke" | "fire" | "decoy"
export type NadeSlotKind = "grenade_trail" | "grenade_light"
/** Grenades that wear something other than the default; null means nothing on that grenade. A grenade that is absent follows the default. */
export type NadeSlots = Partial<Record<Nade, Partial<Record<NadeSlotKind, string | null>>>>

export interface Cosmetics {
  /** How many players there are (for "owned by" shares). */
  players?: number | null
  equippedFrame: string | null
  equippedNameColor?: string | null
  equippedNameGlow?: string | null
  equippedBanner?: string | null
  equippedTitle?: string | null
  equippedSmokeColor?: string | null
  equippedGrenadeTrail?: string | null
  equippedGrenadeLight?: string | null
  equippedFlashEffect?: string | null
  nadeSlots?: NadeSlots
  frames: FrameItem[]
  nameColors?: FrameItem[]
  nameGlows?: FrameItem[]
  /** Profile banners and titles (the Genesis pack's are earned, never sold). */
  banners?: FrameItem[]
  titles?: FrameItem[]
  /** The colour of your own smoke grenades in game. */
  smokeColors?: FrameItem[]
  /** The colour of the line your own grenades draw in the air in game. */
  grenadeTrails?: FrameItem[]
  grenadeLights?: FrameItem[]
  flashEffects?: FrameItem[]
}

export const cosmeticsService = {
  async getMine(options?: CallOptions): Promise<Cosmetics> {
    return get<Cosmetics>("/api/v1/cosmetics", undefined, options)
  },
  async buy(id: string, duration: CosmeticDuration = "30d", options?: CallOptions): Promise<{ owned: boolean; expiresAt: string | null }> {
    return post<{ owned: boolean; expiresAt: string | null }>(`/api/v1/cosmetics/${encodeURIComponent(id)}/buy`, { duration }, options)
  },
  /** Pick the colour (and the dual smoke's second one) of a design you own. */
  async saveCustom(item: string, color: string, color2?: string | null, options?: CallOptions): Promise<{ kind: CosmeticKind; item: string; color: string }> {
    return put<{ kind: CosmeticKind; item: string; color: string }>("/api/v1/cosmetics/custom", color2 ? { item, color, color2 } : { item, color }, options)
  },
  /** Wear a trail or light on one kind of grenade: an item, null for nothing, or `inherit` to follow the default again. */
  async setNadeSlot(nade: Nade, kind: NadeSlotKind, item: string | null | "inherit", options?: CallOptions): Promise<{ nade: Nade; kind: NadeSlotKind }> {
    return put<{ nade: Nade; kind: NadeSlotKind }>("/api/v1/cosmetics/nade-slot", item === "inherit" ? { nade, kind, inherit: true } : { nade, kind, item }, options)
  },
  /** Wear one, or take it off with null. */
  async equip(kind: CosmeticKind, item: string | null, options?: CallOptions): Promise<{ kind: CosmeticKind; item: string | null }> {
    return put<{ kind: CosmeticKind; item: string | null }>("/api/v1/cosmetics/equip", { kind, item }, options)
  },
}
