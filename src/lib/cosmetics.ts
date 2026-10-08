/**
 * Avatar frame art (public/frames/<id>.webp, 256px, transparent middle). `opening` is the share of the frame's width
 * the picture may fill: the picture is a rounded square a little larger than the clear middle and sits behind the art, so only the ornaments' edges overlap it.
 */
const OPENING: Record<string, number> = {
  "red-dragon": 0.5,
  "crimson-thorns": 0.76,
  "blood-moon": 0.68,
  "oni-samurai": 0.6,
  "frost-ring": 0.77,
  "violet-moon": 0.71,
  "golden-crown": 0.68,
  "emerald-dragon": 0.73,
  "shattered-glass": 0.71,
  "inferno": 0.63,
  "ghost-skull": 0.61,
  "raven-wing": 0.5,
  "sakura-silk": 0.6,
  "cyber-violet": 0.74,
  "white-lily": 0.57,
  "eclipse": 0.61,
}

export function frameArt(id: string | null | undefined): { src: string; opening: number } | null {
  if (!id || !(id in OPENING)) return null
  return { src: `/frames/${id}.webp`, opening: OPENING[id] }
}
