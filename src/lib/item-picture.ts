import { clanArtSrc } from "@/api/clans"

/**
 * The picture of a cosmetic item (a weapon model's, for one): the address the API sends as `item.image` (staff put it there once, Staff → Shop → Cosmetics; the API serves it), drawn the same
 * everywhere the item shows (owner 2026-11-21: "fetch all the images from one place", not a file per item in the website).
 * Transition: six models still have their picture as a file in public/shop-models (taken in the game 2026-11-09, before the pictures moved into the API). A picture from the API always wins;
 * once those six are uploaded through the staff panel, delete public/shop-models and LEGACY_FILES, and the website has no picture files of its own.
 */
const LEGACY_FILES = new Set(["katana-wupie", "katana-miku", "katana-blood", "katana-dengliz", "deagle-mari", "ak-10005"])

export function itemPicture(item: { id: string; image?: string | null }): string | null {
  return clanArtSrc(item.image) ?? (LEGACY_FILES.has(item.id) ? `/shop-models/${item.id}.webp` : null)
}
