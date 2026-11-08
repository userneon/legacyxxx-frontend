/**
 * Ring frames (owner request 2026-11-08, "animated frames from other component sites"): light, pure-CSS rings round the round avatar, in two styles:
 * `gradient` (a colour wheel turning round the avatar, with a soft glow, like a gradient avatar ring) and `beam` (a thin ring with one bright arc
 * running round it, like a border beam). They are drawn by CSS only (`.lx-ring` in index.css), so, unlike the Crystal Orb, they can be live in every list.
 * The colours are the frames' own (palette-exempt); the catalogue rows are in the API's `supabase/legacy_x_ring_frames.sql`.
 */
export type RingStyle = "gradient" | "beam"
export interface RingFrameDef {
  style: RingStyle
  /** Three colours of the ring, brightest last; the beam uses the first for its tail and the last for its head. */
  colors: [string, string, string]
}

export const RING_FRAMES: Record<string, RingFrameDef> = {
  "ring-aurora": { style: "gradient", colors: ["#8b5cf6", "#2dd4bf", "#a78bfa"] }, // palette-exempt
  "ring-ember": { style: "gradient", colors: ["#ef4444", "#f59e0b", "#fca5a5"] }, // palette-exempt
  "ring-frost": { style: "gradient", colors: ["#7dd3fc", "#e0f2fe", "#a5b4fc"] }, // palette-exempt
  "ring-jade": { style: "gradient", colors: ["#22c55e", "#14b8a6", "#bbf7d0"] }, // palette-exempt
  "beam-white": { style: "beam", colors: ["#525252", "#d4d4d4", "#ffffff"] },
  "beam-violet": { style: "beam", colors: ["#4c1d95", "#8b5cf6", "#ddd6fe"] }, // palette-exempt
  "beam-crimson": { style: "beam", colors: ["#7f1d1d", "#ef4444", "#fecaca"] }, // palette-exempt
  "beam-gold": { style: "beam", colors: ["#78350f", "#f59e0b", "#fde68a"] }, // palette-exempt
}

export const isRingFrame = (id: string | null | undefined): boolean => Boolean(id && Object.hasOwn(RING_FRAMES, id))
