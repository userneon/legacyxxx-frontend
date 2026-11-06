import { describe, expect, it } from "vitest"

import { weaponModelFor, WEAPON_KEYS, type WeaponModelManifest } from "./weapon-models"

const manifest: WeaponModelManifest = {
  models: ["weapon_ak47", "weapon_glock"],
  paints: { weapon_ak47: ["180", "44"], weapon_glock: ["38"] },
  formats: { weapon_ak47: { "44": "webp" } },
}

describe("weaponModelFor", () => {
  it("finds the model, its slots and the skin's textures", () => {
    const choice = weaponModelFor(manifest, { weapon_defindex: 7, paint_id: 180 })
    expect(choice?.key).toBe("weapon_ak47")
    expect(choice?.modelUrl).toContain("%5Bmodels%5D/weapon_ak47.glb")
    expect(choice?.textureUrls?.[0]).toContain("%5Btextures%5D/weapon_ak47/180.png")
    expect(choice?.textureUrls?.[1]).toContain("180_metal.png")
    expect(choice?.projectors).toHaveLength(5)
  })
  it("uses the source's own file type for a webp texture", () => {
    expect(weaponModelFor(manifest, { weapon_defindex: 7, paint_id: 44 })?.textureUrls?.[0]).toMatch(/44\.webp$/)
  })
  it("keeps the model's own materials for a skin with no texture", () => {
    expect(weaponModelFor(manifest, { weapon_defindex: 7, paint_id: 1 })?.textureUrls).toBeNull()
    expect(weaponModelFor(manifest, { weapon_defindex: 7, paint_id: null })?.textureUrls).toBeNull()
  })
  it("gives a gun with no slot data five generic slots", () => {
    expect(weaponModelFor(manifest, { weapon_defindex: 4, paint_id: 38 })?.projectors).toHaveLength(5)
  })
  it("has nothing for an unlisted gun, an unknown definition index or no manifest", () => {
    expect(weaponModelFor(manifest, { weapon_defindex: 9, paint_id: 1 })).toBeNull()
    expect(weaponModelFor(manifest, { weapon_defindex: 999, paint_id: 1 })).toBeNull()
    expect(weaponModelFor(null, { weapon_defindex: 7, paint_id: 1 })).toBeNull()
    expect(weaponModelFor(manifest, { weapon_defindex: null, paint_id: 1 })).toBeNull()
  })
  it("names only guns", () => {
    expect(Object.values(WEAPON_KEYS).every((key) => key.startsWith("weapon_") && !key.includes("knife"))).toBe(true)
  })
})
