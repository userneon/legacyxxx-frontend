import { describe, expect, it } from "vitest"

import { isServerAddress, steamRunUrl } from "./steam-connect"

describe("isServerAddress", () => {
  it("accepts ip:port and host:port, nothing else", () => {
    expect(isServerAddress("1.2.3.4:27015")).toBe(true)
    expect(isServerAddress(" play.legacyx.cc:27016 ")).toBe(true)
    expect(isServerAddress("1.2.3.4")).toBe(false)
    expect(isServerAddress("steam://connect/1.2.3.4:27015")).toBe(false)
    expect(isServerAddress("1.2.3.4:27015/pw")).toBe(false)
    expect(isServerAddress(null)).toBe(false)
  })
})

describe("steamRunUrl", () => {
  it("starts CS2 with +connect in its launch options", () => {
    expect(steamRunUrl("1.2.3.4:27015")).toBe("steam://rungameid/730//+connect%201.2.3.4:27015")
  })
})
