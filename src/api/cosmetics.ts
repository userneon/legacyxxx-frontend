import { del, get, post, put, type CallOptions } from "./client"

/** How long a bought cosmetic is rented for (owner request 2026-11-02: 1, 7 or 30 days for every item, nothing for good). */
export type CosmeticDuration = "1d" | "7d" | "30d"
export const COSMETIC_DURATIONS: Array<{ value: CosmeticDuration; label: string }> = [
  { value: "1d", label: "1 day" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
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
  /** Switched off for the public, shown only to a QA tester so they can try it. */
  testing?: boolean
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
  /** A smoke: the picture it sheds, one of SMOKE_MOTIFS (absent for the plain glowing dot). */
  motif?: string
  /** True once the player has picked a colour for this design: the first pick is free, every change after it costs `customChangePrice`. */
  picked?: boolean
  /** 1 common, 2 rare, 3 epic, 4 legendary (the ones that are earned). Absent from an older API. */
  rarity?: number
  featured?: boolean
  /** How many players own it; null for free items. */
  owners?: number | null
}

export type CosmeticKind = "frame" | "background" | "profile_customize" | "name_color" | "name_glow" | "banner" | "title" | "smoke_color" | "grenade_trail" | "grenade_light" | "flash_effect" | "model_knife" | "model_deagle" | "model_ak47" | "discord_role"

/** The kinds that are a custom weapon model (owner request 2026-11-06). */
export const MODEL_KINDS = ["model_knife", "model_deagle", "model_ak47"] as const
export type ModelKind = (typeof MODEL_KINDS)[number]
export const isModelKind = (kind: string): kind is ModelKind => (MODEL_KINDS as readonly string[]).includes(kind)

/** How a player's name is painted: plain colours from the API, never a style string. */
export interface NameStyle {
  color: string | null
  glow: string | null
  colorFx?: string | null
  glowFx?: string | null
  /** Profile customize (Normal, Gradient or Glow), its second colour and the font. */
  mode?: string
  color2?: string | null
  font?: string
}

/** What a player set under Profile customize. */
export interface ProfileLook {
  mode: "normal" | "gradient" | "glow"
  font: "default" | "display" | "mono"
  color: string | null
  color2: string | null
  glow: string | null
}

/** The five kinds of grenade a trail or light can be worn on separately (the molotov and the incendiary share "fire"). */
export type Nade = "he" | "flash" | "smoke" | "fire" | "decoy"
export type NadeSlotKind = "grenade_trail" | "grenade_light"
/** Grenades that wear something other than the default; null means nothing on that grenade. A grenade that is absent follows the default. */
export type NadeSlots = Partial<Record<Nade, Partial<Record<NadeSlotKind, string | null>>>>

/** The pictures a smoke can shed (our own set, no uploads); the plain glowing dot is no picture at all. */
export const SMOKE_MOTIFS = ["star", "heart", "diamond", "bolt", "sparkle"] as const
export type SmokeMotif = (typeof SMOKE_MOTIFS)[number]

export interface Cosmetics {
  /** What changing the colour of a design you own costs (FOL$); the first pick is free. */
  customChangePrice?: number
  /** True for a QA tester: everything is theirs and the ranks switch on for free. */
  qa?: boolean
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
  /** The weapon models worn: one for a knife, one for the Desert Eagle, one for the AK-47. */
  equippedModelKnife?: string | null
  equippedModelDeagle?: string | null
  equippedModelAk47?: string | null
  nadeSlots?: NadeSlots
  frames: FrameItem[]
  /** The React Bits backgrounds for profiles, and the knobs this player saved for each (keyed by item id). */
  backgrounds?: FrameItem[]
  equippedBackground?: string | null
  backgroundLooks?: Record<string, import("@/lib/backgrounds").BgLook>
  /** The Profile customize product (one item), what this player set with it and their own banner picture. */
  profileCustomize?: FrameItem[]
  profileLook?: ProfileLook | null
  profileBanner?: string | null
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
  /** Custom weapon models sold for LX (game server). */
  modelKnives?: FrameItem[]
  modelDeagles?: FrameItem[]
  modelAk47s?: FrameItem[]
  /** Discord roles sold for FOL$ (the bot gives the role while the rental runs; only a player with Discord linked can rent one). */
  discordRoles?: FrameItem[]
}

export const cosmeticsService = {
  async getMine(options?: CallOptions): Promise<Cosmetics> {
    return get<Cosmetics>("/api/v1/cosmetics", undefined, options)
  },
  async buy(id: string, duration: CosmeticDuration = "30d", options?: CallOptions): Promise<{ owned: boolean; expiresAt: string | null; undoSeconds?: number }> {
    return post<{ owned: boolean; expiresAt: string | null; undoSeconds?: number }>(`/api/v1/cosmetics/${encodeURIComponent(id)}/buy`, { duration }, options)
  },
  /** Take back a purchase made a few seconds ago: the LX return whole (the API refuses it once the window has passed). */
  async undoBuy(id: string, options?: CallOptions): Promise<{ undone: boolean }> {
    return post<{ undone: boolean }>(`/api/v1/cosmetics/${encodeURIComponent(id)}/undo-buy`, {}, options)
  },
  /** Pick the colour (and the dual smoke's second one) of a design you own. */
  async saveCustom(item: string, pick: { color: string; color2?: string | null; fx?: string | null }, options?: CallOptions): Promise<{ kind: CosmeticKind; item: string; color: string; motif?: string | null; charged: number }> {
    return put<{ kind: CosmeticKind; item: string; color: string; motif?: string | null; charged: number }>("/api/v1/cosmetics/custom", { item, color: pick.color, ...(pick.color2 ? { color2: pick.color2 } : {}), ...(pick.fx ? { fx: pick.fx } : {}) }, options)
  },
  /** Wear a trail or light on one kind of grenade: an item, null for nothing, or `inherit` to follow the default again. */
  async setNadeSlot(nade: Nade, kind: NadeSlotKind, item: string | null | "inherit", options?: CallOptions): Promise<{ nade: Nade; kind: NadeSlotKind }> {
    return put<{ nade: Nade; kind: NadeSlotKind }>("/api/v1/cosmetics/nade-slot", item === "inherit" ? { nade, kind, inherit: true } : { nade, kind, item }, options)
  },
  /** Wear one, or take it off with null. */
  /** Save the knobs of a background you own. */
  async saveBackgroundLook(item: string, look: import("@/lib/backgrounds").BgLook, options?: CallOptions): Promise<{ item: string; look: import("@/lib/backgrounds").BgLook | null }> {
    return put<{ item: string; look: import("@/lib/backgrounds").BgLook | null }>("/api/v1/cosmetics/background-look", { item, look }, options)
  },
  /** Save the name style (needs Profile customize to be running). */
  async saveProfileLook(look: ProfileLook, options?: CallOptions): Promise<{ look: ProfileLook }> {
    return put<{ look: ProfileLook }>("/api/v1/cosmetics/profile-look", { mode: look.mode, font: look.font, color: look.color, color2: look.color2, glow: look.glow }, options)
  },
  /** Upload your banner picture (PNG, JPEG, GIF or WebP, up to 5 MB). */
  async uploadProfileBanner(file: Blob, options?: CallOptions): Promise<{ banner: string }> {
    return put<{ banner: string }>("/api/v1/cosmetics/profile-banner", file, options)
  },
  async removeProfileBanner(options?: CallOptions): Promise<void> {
    await del<void>("/api/v1/cosmetics/profile-banner", options)
  },
  async equip(kind: CosmeticKind, item: string | null, options?: CallOptions): Promise<{ kind: CosmeticKind; item: string | null }> {
    return put<{ kind: CosmeticKind; item: string | null }>("/api/v1/cosmetics/equip", { kind, item }, options)
  },
}

/** What a profile banner picture may be; the same limits the server enforces. */
export const PROFILE_BANNER_RULES = { types: ["image/png", "image/jpeg", "image/gif", "image/webp"], maxBytes: 5 * 1024 * 1024, hint: "PNG, JPEG, GIF or WebP, up to 5 MB, best 1500×400" }

/** Why a chosen file cannot be used as a profile banner, or null when it can. */
export function profileBannerProblem(file: File): string | null {
  if (!PROFILE_BANNER_RULES.types.includes(file.type)) return "The banner must be a PNG, JPEG, GIF or WebP."
  if (file.size > PROFILE_BANNER_RULES.maxBytes) return `That file is too big. ${PROFILE_BANNER_RULES.hint}.`
  return null
}
