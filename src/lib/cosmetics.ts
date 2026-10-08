/**
 * Avatar frame art (public/frames/<id>.webp, 256px, transparent middle). `opening` is the share of the frame's width
 * the picture may fill: the picture is a rounded square drawn in front of the art, sized to the frame's inner border so none of it is covered.
 */
const OPENING: Record<string, number> = {
  "red-dragon": 0.41,
  "crimson-thorns": 0.62,
  "blood-moon": 0.56,
  "oni-samurai": 0.49,
  "frost-ring": 0.63,
  "violet-moon": 0.58,
  "golden-crown": 0.56,
  "emerald-dragon": 0.6,
  "shattered-glass": 0.58,
  "inferno": 0.52,
  "ghost-skull": 0.5,
  "raven-wing": 0.41,
  "sakura-silk": 0.49,
  "cyber-violet": 0.61,
  "white-lily": 0.47,
  "eclipse": 0.5,
}

export function frameArt(id: string | null | undefined): { src: string; opening: number } | null {
  if (!id || !(id in OPENING)) return null
  return { src: `/frames/${id}.webp`, opening: OPENING[id] }
}
