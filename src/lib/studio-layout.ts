/**
 * Where stickers and the charm sit in the Advanced studio, and how a drag turns into the game's offsets (-1 ... 1, as the site stores them).
 * The numbers below are the one place to calibrate: the slot spots and the reach describe the weapon's side picture, and the offsets the game
 * reads are only as exact as these are, so check a result in game once and adjust here.
 */
export const STICKER_SLOTS = 5

/** The default spot of each sticker slot on a weapon's side picture, as [x, y] shares of the picture's width and height. */
export const FLAT_SLOTS: ReadonlyArray<readonly [number, number]> = [[0.34, 0.4], [0.46, 0.4], [0.58, 0.4], [0.7, 0.4], [0.82, 0.4]]
/** Where the charm hangs, same measure. */
export const FLAT_CHARM: readonly [number, number] = [0.12, 0.62]
/** One whole unit of offset moves a sticker or the charm this share of the picture's width. */
export const OFFSET_REACH = 0.12
/** The game's offset y grows upwards; the picture's y grows downwards. */
export const OFFSET_Y_UP = true

export const clampOffset = (value: number) => Math.max(-1, Math.min(1, Number.isFinite(value) ? value : 0))

export interface Offset { x: number; y: number }

/** The offsets that put something at `point` (shares of the picture) when its home is `anchor`. `aspect` is the picture's width over its height. */
export function offsetAt(anchor: readonly [number, number], point: readonly [number, number], aspect: number): Offset {
  const x = (point[0] - anchor[0]) / OFFSET_REACH
  const down = (point[1] - anchor[1]) / (OFFSET_REACH * aspect)
  return { x: clampOffset(x), y: clampOffset(OFFSET_Y_UP ? -down : down) }
}

/** The inverse: where an item with these offsets is drawn, as shares of the picture. */
export function positionOf(anchor: readonly [number, number], offset: Offset, aspect: number): [number, number] {
  const down = (OFFSET_Y_UP ? -offset.y : offset.y) * OFFSET_REACH * aspect
  return [anchor[0] + offset.x * OFFSET_REACH, anchor[1] + down]
}

/** A StatTrak kill count typed by a player: whole numbers from 0 to 999,999. */
export function cleanKillCount(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.min(999_999, Math.round(value))) : 0
}

/* ---- 3D: the same offsets, measured on a slot's own plane ------------------------------------------------------------------------------------------ */
export type Vec3 = readonly [number, number, number]
/** A slot in a model's space: where it is, which way it faces, and which way is up on it. `reach` is the model-space length of one whole unit of offset. */
export interface SlotFrame { position: Vec3; normal: Vec3; up: Vec3 }

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const norm = (a: Vec3): Vec3 => { const length = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / length, a[1] / length, a[2] / length] }

/** The slot's three axes: right, up and out of the surface. `up` is squared against the normal so a sloppy manifest still gives a clean frame. */
export function frameAxes(frame: SlotFrame): { right: Vec3; up: Vec3; normal: Vec3 } {
  const normal = norm(frame.normal)
  const lean = dot(frame.up, normal)
  const up = norm([frame.up[0] - normal[0] * lean, frame.up[1] - normal[1] * lean, frame.up[2] - normal[2] * lean])
  return { right: norm(cross(up, normal)), up, normal }
}

/** The offsets of a point in the model's space, read on the slot's plane. */
export function offsetOnPlane(frame: SlotFrame, point: Vec3, reach: number): Offset {
  const { right, up } = frameAxes(frame)
  const d: Vec3 = [point[0] - frame.position[0], point[1] - frame.position[1], point[2] - frame.position[2]]
  return { x: clampOffset(dot(d, right) / reach), y: clampOffset(dot(d, up) / reach) }
}

/** Where an item with these offsets sits in the model's space. */
export function pointOnPlane(frame: SlotFrame, offset: Offset, reach: number): Vec3 {
  const { right, up } = frameAxes(frame)
  return [0, 1, 2].map((i) => frame.position[i]! + (right[i]! * offset.x + up[i]! * offset.y) * reach) as unknown as Vec3
}
