import { describe, expect, it } from "vitest"

import { cleanKillCount, FLAT_SLOTS, offsetAt, positionOf } from "./studio-layout"

describe("studio layout", () => {
  it("a dragged point and its offsets agree", () => {
    const anchor = FLAT_SLOTS[2]!
    const offset = offsetAt(anchor, [anchor[0] + 0.06, anchor[1] - 0.05], 2)
    expect(offset.x).toBeCloseTo(0.5, 5)
    expect(offset.y).toBeGreaterThan(0)
    const [x, y] = positionOf(anchor, offset, 2)
    expect(x).toBeCloseTo(anchor[0] + 0.06, 5)
    expect(y).toBeCloseTo(anchor[1] - 0.05, 5)
  })
  it("never goes past the game's limits", () => {
    expect(offsetAt([0.5, 0.5], [5, -5], 1)).toEqual({ x: 1, y: 1 })
    expect(offsetAt([0.5, 0.5], [-5, 5], 1)).toEqual({ x: -1, y: -1 })
  })
  it("cleans a kill count", () => {
    expect(cleanKillCount(12.6)).toBe(13)
    expect(cleanKillCount(-4)).toBe(0)
    expect(cleanKillCount(5_000_000)).toBe(999_999)
    expect(cleanKillCount(Number.NaN)).toBe(0)
  })
})
