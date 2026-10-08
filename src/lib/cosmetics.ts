/**
 * Avatar frame art (public/frames/<id>.webp, 256px, transparent middle), measured from the art itself.
 * `opening` is the share of the frame's width the picture may fill (a rounded square drawn in front of the art, sized to
 * the frame's inner border so none of it is covered); `dx` / `dy` move it to the middle of that opening, which is not
 * always the middle of the image (both are shares of the frame's width).
 */
interface FrameArt {
  opening: number
  dx: number
  dy: number
}

const FRAMES: Record<string, FrameArt> = {
  "red-dragon": { opening: 0.41, dx: 0.09, dy: 0.049 },
  "crimson-thorns": { opening: 0.63, dx: -0.006, dy: 0.039 },
  "blood-moon": { opening: 0.57, dx: -0.002, dy: 0.066 },
  "oni-samurai": { opening: 0.53, dx: 0.02, dy: -0.014 },
  "frost-ring": { opening: 0.65, dx: 0.023, dy: -0.004 },
  "violet-moon": { opening: 0.61, dx: 0.041, dy: 0.018 },
  "golden-crown": { opening: 0.6, dx: -0.012, dy: 0.016 },
  "emerald-dragon": { opening: 0.57, dx: 0.078, dy: 0.074 },
  "shattered-glass": { opening: 0.52, dx: 0.07, dy: 0.025 },
  "inferno": { opening: 0.53, dx: 0.012, dy: -0.004 },
  "ghost-skull": { opening: 0.53, dx: 0.062, dy: 0 },
  "raven-wing": { opening: 0.54, dx: -0.061, dy: -0.045 },
  "sakura-silk": { opening: 0.56, dx: -0.006, dy: -0.02 },
  "cyber-violet": { opening: 0.6, dx: 0.025, dy: 0.004 },
  "white-lily": { opening: 0.47, dx: 0.01, dy: -0.053 },
  "eclipse": { opening: 0.5, dx: -0.002, dy: 0.018 },
}

export function frameArt(id: string | null | undefined): ({ src: string } & FrameArt) | null {
  if (!id || !(id in FRAMES)) return null
  return { src: `/frames/${id}.webp`, ...FRAMES[id] }
}
