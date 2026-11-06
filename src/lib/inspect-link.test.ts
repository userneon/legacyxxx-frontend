import { describe, expect, it } from "vitest"
import { inspectHex } from "./inspect-link"

describe("inspectHex", () => {
  it("matches a link the ChainSkins viewer accepted (AK-47 Redline, one sticker)", () => {
    const hex = inspectHex({ defindex: 7, paintId: 282, wear: 0.01, seed: 5, stickers: [{ slot: 0, id: 1, offsetX: 0.1, offsetY: 0.05 }] })
    expect(hex).toBe("001807209A02388AAE8FE10340053004620E080010013DCDCCCC3D45CDCC4C3D03DE1EDE")
  })
  it("adds StatTrak, a name and a charm", () => {
    const hex = inspectHex({ defindex: 7, paintId: 282, wear: 0.1, seed: 1, statTrakCount: 12, nameTag: "Hi", charm: { id: 5, offsetZ: 0.1, seed: 9 } })
    expect(hex).toMatch(/^00[0-9A-F]+$/)
    expect(hex.length % 2).toBe(0)
    expect(hex).toContain("5A024869") // field 11 (name), length 2, "Hi"
  })
})
