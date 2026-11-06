/**
 * The numbers of the Advanced studio that the game reads: how many sticker slots a gun has, how far a sticker or charm may be moved from its slot
 * (the offsets the plugin stores) and how a typed StatTrak count is cleaned. The gun itself is drawn by the ChainSkins viewer, not here.
 */
export const STICKER_SLOTS = 5

/** The game reads an offset as a share of the gun and the editor keeps to -0.5 ... 0.5. */
export const OFFSET_LIMIT = 0.5

export const clampOffset = (value: number) => Math.max(-OFFSET_LIMIT, Math.min(OFFSET_LIMIT, Number.isFinite(value) ? value : 0))

/** A StatTrak kill count typed by a player: whole numbers from 0 to 999,999. */
export function cleanKillCount(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.min(999_999, Math.round(value))) : 0
}
