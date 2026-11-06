import { describe, expect, it } from "vitest"

import { clampOffset, cleanKillCount, OFFSET_LIMIT } from "./studio-layout"

describe("studio layout", () => {
  it("keeps an offset to the game's limits", () => {
    expect(clampOffset(5)).toBe(OFFSET_LIMIT)
    expect(clampOffset(-5)).toBe(-OFFSET_LIMIT)
    expect(clampOffset(0.123)).toBe(0.123)
    expect(clampOffset(Number.NaN)).toBe(0)
  })
  it("cleans a kill count", () => {
    expect(cleanKillCount(12.6)).toBe(13)
    expect(cleanKillCount(-4)).toBe(0)
    expect(cleanKillCount(5_000_000)).toBe(999_999)
    expect(cleanKillCount(Number.NaN)).toBe(0)
  })
})
