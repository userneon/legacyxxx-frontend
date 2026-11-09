import { describe, expect, it } from "vitest"

import { flakeCount, isWinterSeason } from "./winter"

describe("isWinterSeason", () => {
  it("is winter from November to February in Ulaanbaatar", () => {
    expect(isWinterSeason(new Date("2026-11-09T12:00:00Z"))).toBe(true)
    expect(isWinterSeason(new Date("2026-12-25T12:00:00Z"))).toBe(true)
    expect(isWinterSeason(new Date("2027-02-20T12:00:00Z"))).toBe(true)
  })
  it("is not winter in spring, summer or autumn", () => {
    expect(isWinterSeason(new Date("2027-03-10T12:00:00Z"))).toBe(false)
    expect(isWinterSeason(new Date("2026-07-01T12:00:00Z"))).toBe(false)
    expect(isWinterSeason(new Date("2026-10-15T12:00:00Z"))).toBe(false)
  })
  it("reads the Ulaanbaatar day, not the visitor's", () => {
    // 20:00 UTC on 31 Oct is already 1 Nov in Ulaanbaatar.
    expect(isWinterSeason(new Date("2026-10-31T20:00:00Z"))).toBe(true)
    expect(isWinterSeason(new Date("2027-02-28T17:00:00Z"))).toBe(false)
  })
})

describe("flakeCount", () => {
  it("gives a desktop many flakes and a phone fewer", () => {
    expect(flakeCount(1440, 900)).toBeGreaterThan(flakeCount(390, 844))
    expect(flakeCount(390, 844)).toBeGreaterThanOrEqual(16)
  })
  it("never goes past the cap", () => {
    expect(flakeCount(3840, 2160)).toBe(56)
  })
})
