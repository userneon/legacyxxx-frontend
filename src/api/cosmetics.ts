import { get, post, put, type CallOptions } from "./client"

/** Avatar frames (backend GET /cosmetics). Purely visual: nothing here changes gameplay or EXP. */
export interface FrameItem {
  id: string
  name: string
  nameMn: string
  /** free: everyone; coin: bought once with coins; achievement: earned, never sold. */
  unlock: "free" | "coin" | "achievement"
  price: number
  /** How an achievement frame is earned. */
  requirement: string
  owned: boolean
}

export interface Cosmetics {
  equippedFrame: string | null
  frames: FrameItem[]
}

export const cosmeticsService = {
  async getMine(options?: CallOptions): Promise<Cosmetics> {
    return get<Cosmetics>("/api/v1/cosmetics", undefined, options)
  },
  async buy(id: string, options?: CallOptions): Promise<{ owned: boolean }> {
    return post<{ owned: boolean }>(`/api/v1/cosmetics/${encodeURIComponent(id)}/buy`, undefined, options)
  },
  /** Wear a frame, or take it off with null. */
  async equip(frame: string | null, options?: CallOptions): Promise<{ equippedFrame: string | null }> {
    return put<{ equippedFrame: string | null }>("/api/v1/cosmetics/equip", { frame }, options)
  },
}
