import { BALL_PRESETS, type Motion, type ParticleShape, type Preset, type PresetValues } from "@/components/reactbits/crystalized-ball"

/** What a player sets on their Crystal Orb frame (the same fields the API stores, see the API's frameLook.ts). Every field is optional: a missing one is the preset's own. */
export interface FrameLook {
  preset?: Preset
  color?: string
  motion?: Motion
  particleShape?: ParticleShape
  glow?: number
  haze?: number
  strands?: number
  crackle?: number
  flares?: number
  sparks?: number
  particleCount?: number
  fill?: number
  depth?: number
  twinkle?: number
  sway?: number
  speed?: number
  dustSpeed?: number
  interactive?: boolean
  hoverStrength?: number
  intro?: boolean
}

export const ORB_ID = "crystal-orb"
/** The ball is this share of the orb's box (the rest is room for its glow, which the canvas would cut flat at the box edge), and the avatar fills this share of the ball. */
export const ORB_BALL = 0.78
export const ORB_AVATAR = 0.92 * ORB_BALL
export const ORB_DEFAULT_PARTICLES = 6000
/** The most particles an orb draws (owner request 2026-11-02, the API holds the same limit); an older look with more is drawn with this many. */
export const ORB_MAX_PARTICLES = 8000
export const ORB_PRESETS: Preset[] = ["plasma", "aurora", "nebula", "ember", "frost", "solar", "eclipse", "abyss"]
export const ORB_MOTIONS: Motion[] = ["rise", "fall", "drift", "orbit"]
export const ORB_SHAPES: ParticleShape[] = ["square", "round"]

/** The values a look really draws with: the preset's, with the player's own on top. */
export function resolveLook(look: FrameLook | null | undefined): PresetValues & { preset: Preset; speed: number; interactive: boolean; hoverStrength: number; intro: boolean } {
  const preset = look?.preset ?? "plasma"
  const base = BALL_PRESETS[preset]
  const own = Object.fromEntries(Object.entries(look ?? {}).filter(([, value]) => value !== undefined))
  // 6,000 particles unless the player picks more (the presets use 15,000 to 18,000, which is heavy for a profile; owner request 2026-11-02).
  return { ...base, speed: 1, interactive: true, hoverStrength: 0.7, intro: true, ...own, preset, particleCount: Math.min(ORB_MAX_PARTICLES, typeof (own as { particleCount?: unknown }).particleCount === "number" ? (own as { particleCount: number }).particleCount : ORB_DEFAULT_PARTICLES) } as PresetValues & { preset: Preset; speed: number; interactive: boolean; hoverStrength: number; intro: boolean }
}

/** The knobs that are plain numbers: label, range and step, as the React Bits page has them. */
export const ORB_SLIDERS: Array<{ key: keyof FrameLook; label: string; min: number; max: number; step: number }> = [
  { key: "glow", label: "Glow", min: 0, max: 1, step: 0.05 },
  { key: "haze", label: "Haze", min: 0, max: 1, step: 0.05 },
  { key: "strands", label: "Strands", min: 1, max: 12, step: 1 },
  { key: "crackle", label: "Crackle", min: 0, max: 1, step: 0.05 },
  { key: "flares", label: "Flares", min: 0, max: 1, step: 0.05 },
  { key: "sparks", label: "Sparks", min: 0, max: 1, step: 0.05 },
  { key: "particleCount", label: "Particles", min: 2000, max: ORB_MAX_PARTICLES, step: 1000 },
  { key: "fill", label: "Fill", min: 0, max: 1, step: 0.05 },
  { key: "depth", label: "Depth", min: 0, max: 1, step: 0.05 },
  { key: "twinkle", label: "Twinkle", min: 0, max: 1, step: 0.05 },
  { key: "speed", label: "Speed", min: 0, max: 3, step: 0.1 },
  { key: "dustSpeed", label: "Dust Speed", min: 0, max: 3, step: 0.1 },
  { key: "sway", label: "Sway", min: 0, max: 1, step: 0.05 },
  { key: "hoverStrength", label: "Hover Strength", min: 0, max: 1, step: 0.05 },
]
