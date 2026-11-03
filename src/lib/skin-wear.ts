/** Wear bands of a CS2 skin, shared by the loadout picker and the Advanced studio. */

export const wearTiers: Array<{ label: string; short: string; from: number; to: number; color: string }> = [
  { label: "Factory New", short: "FN", from: 0, to: 0.07, color: "var(--wear-fn)" },
  { label: "Minimal Wear", short: "MW", from: 0.07, to: 0.15, color: "var(--wear-mw)" },
  { label: "Field-Tested", short: "FT", from: 0.15, to: 0.38, color: "var(--wear-ft)" },
  { label: "Well-Worn", short: "WW", from: 0.38, to: 0.45, color: "var(--wear-ww)" },
  { label: "Battle-Scarred", short: "BS", from: 0.45, to: 1, color: "var(--wear-bs)" },
]

/** Slider track: each band's colour over the part of the skin's float range it covers. */
export function wearTrack(minWear: number, maxWear: number) {
  const span = Math.max(0.0001, maxWear - minWear)
  const stops = wearTiers
    .filter((tier) => tier.to > minWear && tier.from < maxWear)
    .map((tier) => {
      const start = ((Math.max(tier.from, minWear) - minWear) / span) * 100
      const end = ((Math.min(tier.to, maxWear) - minWear) / span) * 100
      return `${tier.color} ${start.toFixed(2)}% ${end.toFixed(2)}%`
    })
  return `linear-gradient(90deg, ${stops.join(", ")})`
}

export const wearColor = (wear: number) => (wearTiers.find((tier) => wear < tier.to) ?? wearTiers[wearTiers.length - 1]!).color

export function wearName(wear: number) {
  if (wear <= 0.07) return "Factory New"
  if (wear <= 0.15) return "Minimal Wear"
  if (wear <= 0.38) return "Field-Tested"
  if (wear <= 0.45) return "Well-Worn"
  return "Battle-Scarred"
}
