/**
 * Avatar frame art (public/frames/<id>.webp, 256px, transparent middle). `opening` is the share of the frame's width
 * the picture may fill: the avatar sits behind the art, so a little overlap is hidden by the ornaments.
 */
const OPENING: Record<string, number> = {
  "red-dragon": 0.4,
  "crimson-thorns": 0.68,
  "blood-moon": 0.6,
  "oni-samurai": 0.54,
  "frost-ring": 0.69,
  "violet-moon": 0.63,
  "golden-crown": 0.61,
  "emerald-dragon": 0.65,
  "shattered-glass": 0.5,
  "inferno": 0.56,
  "ghost-skull": 0.55,
  "raven-wing": 0.34,
  "sakura-silk": 0.54,
  "cyber-violet": 0.66,
  "white-lily": 0.51,
  "eclipse": 0.55,
}

export function frameArt(id: string | null | undefined): { src: string; opening: number } | null {
  if (!id || !(id in OPENING)) return null
  return { src: `/frames/${id}.webp`, opening: OPENING[id] }
}
