import { describe, expect, it } from "vitest"

import { CS2_MAP_KEYS, cs2MapLabel, normalizeCs2MapKey } from "./cs2-map-art"

describe("map keys", () => {
  it("knows the night maps and Shoots", () => {
    expect(normalizeCs2MapKey("de_ancient_night")).toBe("de_ancient_night")
    expect(normalizeCs2MapKey("Ancient Night")).toBe("de_ancient_night")
    expect(normalizeCs2MapKey("ar_shoots")).toBe("ar_shoots")
    expect(normalizeCs2MapKey("ar_shoots_night")).toBe("ar_shoots_night")
    expect(cs2MapLabel("ar_shoots_night")).toBe("Shoots Night")
    expect(CS2_MAP_KEYS).toContain("de_ancient_night")
  })
  it("keeps the old maps working", () => {
    expect(normalizeCs2MapKey("de_dust2")).toBe("de_dust2")
    expect(normalizeCs2MapKey("Dust II")).toBe("de_dust2")
    expect(normalizeCs2MapKey("ancient")).toBe("de_ancient")
    expect(cs2MapLabel("de_ancient")).toBe("Ancient")
  })
})
