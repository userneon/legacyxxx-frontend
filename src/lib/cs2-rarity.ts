/**
 * Official CS2 rarity colours.
 *
 * They are game data, not part of the LEGACY-X palette, so they only ever appear as a thin
 * indicator on a skin tile or an equipped card — never as a surface. The colour check skips
 * this file for that reason (see scripts/check-no-blue.mjs).
 */
export const rarityStyles: Record<string, { rank: number; accent: string }> = {
  Covert: { rank: 1, accent: "#eb4b4b" },
  Classified: { rank: 2, accent: "#d32ce6" },
  Restricted: { rank: 3, accent: "#8847ff" },
  "Mil-Spec Grade": { rank: 4, accent: "#4b69ff" },
  "Industrial Grade": { rank: 5, accent: "#5e98d9" },
  "Consumer Grade": { rank: 6, accent: "#b0c3d9" },
  Contraband: { rank: 7, accent: "#e4ae39" },
  Extraordinary: { rank: 8, accent: "#eb4b4b" },
}
