import pine from "@/assets/frames/ny-pine.webp"
import frost from "@/assets/frames/ny-frost.webp"
import santa from "@/assets/frames/ny-santa.webp"
import midnight from "@/assets/frames/ny-midnight.webp"

/**
 * Picture frames round the square avatar (owner 2026-11-18: four New Year frames, "all square"). Each is a transparent picture with an empty window; `hole` is that window as
 * fractions of the picture (left, top, width, height), measured from the pictures, so the avatar's own box can be made to sit exactly in it and the decorations (a bow, a hat,
 * snowflakes) overflow the box a little. The catalogue rows are in the API's supabase/legacy_x_ny_frames.sql.
 */
export interface ArtFrameDef { src: string; hole: { x: number; y: number; w: number; h: number }; accent: string }

const f = (x0: number, y0: number, x1: number, y1: number) => ({ x: x0 / 512, y: y0 / 512, w: (x1 - x0) / 512, h: (y1 - y0) / 512 })

export const ART_FRAMES: Record<string, ArtFrameDef> = {
  "frame-ny-pine": { src: pine, hole: f(73, 86, 430, 443), accent: "#3f7a45" }, // palette-exempt: the art's own colours
  "frame-ny-frost": { src: frost, hole: f(79, 77, 433, 432), accent: "#8fd0f0" }, // palette-exempt
  "frame-ny-santa": { src: santa, hole: f(83, 85, 437, 435), accent: "#d23a3a" }, // palette-exempt
  "frame-ny-midnight": { src: midnight, hole: f(74, 61, 437, 425), accent: "#c9a24a" }, // palette-exempt
}

export const isArtFrame = (id: string | null | undefined): boolean => Boolean(id && Object.hasOwn(ART_FRAMES, id))
