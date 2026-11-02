import { describe, expect, it } from "vitest"

import { daysLeft, endingSoon, outfitTotal, rarityOf, readSaved, SAVED_KEY } from "./shop-logic"

const NOW = Date.parse("2026-11-02T12:00:00Z")

describe("rarityOf", () => {
  it("maps 1 to 4 and keeps odd values inside the ladder", () => {
    expect(rarityOf(1).label).toBe("Standard")
    expect(rarityOf(4).label).toBe("Prime")
    expect(rarityOf(9).label).toBe("Prime")
    expect(rarityOf(0).label).toBe("Standard")
    expect(rarityOf(undefined).label).toBe("Standard")
  })
})

describe("daysLeft", () => {
  it("counts whole days up, none when there is no end, 0 once past", () => {
    expect(daysLeft("2026-11-05T12:00:00Z", NOW)).toBe(3)
    expect(daysLeft("2026-11-02T13:00:00Z", NOW)).toBe(1)
    expect(daysLeft("2026-11-01T12:00:00Z", NOW)).toBe(0)
    expect(daysLeft(null, NOW)).toBeNull()
    expect(daysLeft("not a date", NOW)).toBeNull()
  })
})

describe("endingSoon", () => {
  it("lists owned items that run out within the week, soonest first", () => {
    const list = endingSoon([
      { id: "a", owned: true, expiresAt: "2026-11-08T12:00:00Z" },
      { id: "b", owned: true, expiresAt: "2026-11-03T12:00:00Z" },
      { id: "c", owned: true, expiresAt: "2026-12-30T12:00:00Z" },
      { id: "d", owned: false, expiresAt: "2026-11-03T12:00:00Z" },
      { id: "e", owned: true, expiresAt: null },
    ], 7, NOW)
    expect(list.map((item) => item.id)).toEqual(["b", "a"])
  })
})

describe("outfitTotal", () => {
  it("adds only what is not owned and says whether the balance covers it", () => {
    expect(outfitTotal([{ price: 400 }, { price: 300, owned: true }, { price: 100 }], 1000)).toEqual({ total: 500, left: 500, affordable: true })
    expect(outfitTotal([{ price: 400 }], 100)).toEqual({ total: 400, left: -300, affordable: false })
    expect(outfitTotal([{ price: 400 }], null)).toEqual({ total: 400, left: null, affordable: true })
  })
})

describe("readSaved", () => {
  it("returns only a list of text ids and survives bad storage", () => {
    expect(readSaved({ getItem: (key) => (key === SAVED_KEY ? JSON.stringify(["x", 3, "y"]) : null) })).toEqual(["x", "y"])
    expect(readSaved({ getItem: () => "{broken" })).toEqual([])
    expect(readSaved({ getItem: () => JSON.stringify({ a: 1 }) })).toEqual([])
    expect(readSaved(null)).toEqual([])
  })
})
