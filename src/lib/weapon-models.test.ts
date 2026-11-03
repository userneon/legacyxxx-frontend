import { describe, expect, it } from "vitest"

import { weaponModelFor, type WeaponModelManifest } from "./weapon-models"

const slot = (x: number) => ({ position: [x, 0, 0] as [number, number, number], normal: [0, 0, 1] as [number, number, number], up: [0, 1, 0] as [number, number, number] })
const manifest: WeaponModelManifest = {
  version: 1,
  weapons: {
    "7": { model: "ak47.glb", reach: 0.06, slots: [0, 1, 2, 3, 4].map(slot), charm: slot(-1), skins: { "180": "ak47-180.webp" } },
    "9": { model: "../evil.glb", reach: 0.06, slots: [0, 1, 2, 3, 4].map(slot), charm: null },
    "10": { model: "awp.glb", reach: 0.06, slots: [0, 1].map(slot), charm: null },
  },
}

describe("weaponModelFor", () => {
  it("finds the model, its slots and the skin's texture", () => {
    const choice = weaponModelFor(manifest, { weapon_defindex: 7, paint_id: 180 })
    expect(choice?.modelUrl).toBe("/models/weapons/ak47.glb")
    expect(choice?.textureUrl).toBe("/models/weapons/ak47-180.webp")
    expect(choice?.slots).toHaveLength(5)
    expect(choice?.charm?.position[0]).toBe(-1)
  })
  it("keeps the model's own materials for a skin with no texture", () => {
    expect(weaponModelFor(manifest, { weapon_defindex: 7, paint_id: 1 })?.textureUrl).toBeNull()
    expect(weaponModelFor(manifest, { weapon_defindex: 7, paint_id: null })?.textureUrl).toBeNull()
  })
  it("has nothing for an unlisted gun, no manifest, an unsafe file or fewer than five slots", () => {
    expect(weaponModelFor(manifest, { weapon_defindex: 1, paint_id: 1 })).toBeNull()
    expect(weaponModelFor(null, { weapon_defindex: 7, paint_id: 1 })).toBeNull()
    expect(weaponModelFor(manifest, { weapon_defindex: 9, paint_id: 1 })).toBeNull()
    expect(weaponModelFor(manifest, { weapon_defindex: 10, paint_id: 1 })).toBeNull()
    expect(weaponModelFor(manifest, { weapon_defindex: null, paint_id: 1 })).toBeNull()
  })
})
