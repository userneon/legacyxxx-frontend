import { describe, expect, it } from "vitest"

import { cleanKillCount, FLAT_SLOTS, offsetAt, positionOf } from "./studio-layout"

describe("studio layout", () => {
  it("a dragged point and its offsets agree", () => {
    const anchor = FLAT_SLOTS[2]!
    const offset = offsetAt(anchor, [anchor[0] + 0.2, anchor[1] - 0.05], 2)
    expect(offset.x).toBeCloseTo(0.25, 5)
    expect(offset.y).toBeGreaterThan(0)
    const [x, y] = positionOf(anchor, offset, 2)
    expect(x).toBeCloseTo(anchor[0] + 0.2, 5)
    expect(y).toBeCloseTo(anchor[1] - 0.05, 5)
  })
  it("never goes past the game's limits", () => {
    expect(offsetAt([0.5, 0.5], [5, -5], 1)).toEqual({ x: 0.5, y: 0.5 })
    expect(offsetAt([0.5, 0.5], [-5, 5], 1)).toEqual({ x: -0.5, y: -0.5 })
  })
  it("cleans a kill count", () => {
    expect(cleanKillCount(12.6)).toBe(13)
    expect(cleanKillCount(-4)).toBe(0)
    expect(cleanKillCount(5_000_000)).toBe(999_999)
    expect(cleanKillCount(Number.NaN)).toBe(0)
  })
})

import { frameAxes, offsetOnPlane, pointOnPlane, type SlotFrame } from "./studio-layout"

describe("3D slot frames", () => {
  const frame: SlotFrame = { position: [1, 2, 3], normal: [0, 0, 1], up: [0, 1, 0.3] }
  it("builds a clean right, up and normal from a sloppy up", () => {
    const axes = frameAxes(frame)
    expect(axes.normal).toEqual([0, 0, 1])
    expect(axes.up[2]).toBeCloseTo(0, 6)
    expect(axes.right[0]).toBeCloseTo(1, 6)
  })
  it("a point and its offsets agree on the plane", () => {
    const point = pointOnPlane(frame, { x: 0.4, y: -0.25 }, 0.2)
    expect(point[0]).toBeCloseTo(1.08, 6)
    expect(point[1]).toBeCloseTo(1.95, 6)
    const offset = offsetOnPlane(frame, point, 0.2)
    expect(offset.x).toBeCloseTo(0.4, 6)
    expect(offset.y).toBeCloseTo(-0.25, 6)
  })
  it("reads sideways and up with their own reach", () => {
    const point = pointOnPlane(frame, { x: 0.4, y: 0.2 }, [1, 0.25])
    expect(point[0]).toBeCloseTo(1.4, 6)
    expect(point[1]).toBeCloseTo(2.05, 6)
    const offset = offsetOnPlane(frame, point, [1, 0.25])
    expect(offset.x).toBeCloseTo(0.4, 6)
    expect(offset.y).toBeCloseTo(0.2, 6)
  })
  it("stays inside the game's limits", () => {
    expect(offsetOnPlane(frame, [100, 100, 3], 0.2)).toEqual({ x: 0.5, y: 0.5 })
  })
})
