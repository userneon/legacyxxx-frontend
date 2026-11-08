import { describe, expect, it } from "vitest"

import { eventDays, eventGreeting, knownEventTheme } from "./site-events"

describe("site events", () => {
  it("says a greeting only for a theme it knows", () => {
    expect(eventGreeting("halloween")).toBe("Happy Halloween")
    expect(eventGreeting("tsagaan-sar")).toBe("Сар шинийн мэнд")
    expect(eventGreeting(null)).toBeNull()
  })
  it("ignores a theme from a newer API", () => {
    expect(knownEventTheme("new-year")).toBe("new-year")
    expect(knownEventTheme("easter")).toBeNull()
  })
  it("writes the days as typed", () => {
    expect(eventDays("2026-10-25", "2026-11-01")).toBe("25 Oct to 1 Nov")
    expect(eventDays("2027-01-01", "2027-01-01")).toBe("1 Jan")
  })
})
