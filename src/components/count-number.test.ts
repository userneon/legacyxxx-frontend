import { describe, expect, it } from "vitest"

import { CountNumber } from "./count-number"

describe("CountNumber", () => {
  it("is a component", () => {
    expect(typeof CountNumber).toBe("function")
  })
})
