import { get, post, put, type CallOptions } from "./client"

/** Avatar frames, name colours and name glows (backend GET /cosmetics). Purely visual: nothing here changes gameplay or EXP. */
export interface FrameItem {
  id: string
  name: string
  nameMn: string
  /** free: everyone; coin: bought once with LX; achievement: earned, never sold. */
  unlock: "free" | "coin" | "achievement"
  price: number
  /** How an achievement frame is earned. */
  requirement: string
  owned: boolean
  /** Name colour items: the #rrggbb the name is painted with. */
  color?: string
  /** Name glow items: the #rrggbb of the glow around the name. */
  glow?: string
  /** The finished effect (chrome, gold, neon, flame ...) the website draws for this item. */
  fx?: string
  /** 1 common, 2 rare, 3 epic, 4 legendary (the ones that are earned). Absent from an older API. */
  rarity?: number
  featured?: boolean
  /** How many players own it; null for free items. */
  owners?: number | null
}

export type CosmeticKind = "frame" | "name_color" | "name_glow"

/** How a player's name is painted: plain colours from the API, never a style string. */
export interface NameStyle {
  color: string | null
  glow: string | null
  colorFx?: string | null
  glowFx?: string | null
}

export interface Cosmetics {
  /** How many players there are (for "owned by" shares). */
  players?: number | null
  equippedFrame: string | null
  equippedNameColor?: string | null
  equippedNameGlow?: string | null
  frames: FrameItem[]
  nameColors?: FrameItem[]
  nameGlows?: FrameItem[]
}

export const cosmeticsService = {
  async getMine(options?: CallOptions): Promise<Cosmetics> {
    return get<Cosmetics>("/api/v1/cosmetics", undefined, options)
  },
  async buy(id: string, options?: CallOptions): Promise<{ owned: boolean }> {
    return post<{ owned: boolean }>(`/api/v1/cosmetics/${encodeURIComponent(id)}/buy`, undefined, options)
  },
  /** Wear one, or take it off with null. */
  async equip(kind: CosmeticKind, item: string | null, options?: CallOptions): Promise<{ kind: CosmeticKind; item: string | null }> {
    return put<{ kind: CosmeticKind; item: string | null }>("/api/v1/cosmetics/equip", { kind, item }, options)
  },
}
