/**
 * Builds a CS2 inspect link (the hex payload of `csgo_econ_action_preview`) from a craft, so the ChainSkins 3D viewer
 * can draw the gun with its real sticker and charm shaders. It is the game's own protobuf (`CEconItemPreviewDataBlock`)
 * plus the checksum the game and that viewer check. Nothing here is stored or sent anywhere except in the viewer's URL.
 */
export interface InspectSticker { slot: number; id: number; wear?: number; scale?: number; rotation?: number; offsetX?: number; offsetY?: number }
export interface InspectCharm { id: number; offsetX?: number; offsetY?: number; offsetZ?: number; seed?: number }
export interface InspectCraft {
  defindex: number
  paintId: number
  wear: number
  seed: number
  statTrakCount?: number | null
  nameTag?: string
  stickers?: InspectSticker[]
  charm?: InspectCharm | null
}

const varint = (value: number | bigint): number[] => {
  let n = BigInt(value)
  const out: number[] = []
  while (n >= 128n) { out.push(Number(n & 127n) | 128); n >>= 7n }
  out.push(Number(n))
  return out
}
const tag = (field: number, wire: number) => varint((field << 3) | wire)
const int = (field: number, value: number) => [...tag(field, 0), ...varint(Math.max(0, Math.round(value)))]
const float32 = (field: number, value: number) => {
  const view = new DataView(new ArrayBuffer(4))
  view.setFloat32(0, value, true)
  return [...tag(field, 5), ...new Uint8Array(view.buffer)]
}
const bytes = (field: number, data: number[]) => [...tag(field, 2), ...varint(data.length), ...data]

let table: Uint32Array | null = null
const crc32 = (data: number[]) => {
  if (!table) {
    table = new Uint32Array(256)
    for (let i = 0; i < 256; i++) { let c = i; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; table[i] = c >>> 0 }
  }
  let crc = 0xffffffff
  for (const byte of data) crc = table[(crc ^ byte) & 0xff]! ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

const stickerBlock = (s: InspectSticker) => [
  ...int(1, s.slot), ...int(2, s.id),
  ...(s.wear ? float32(3, s.wear) : []), ...(s.scale != null && s.scale !== 1 ? float32(4, s.scale) : []), ...(s.rotation ? float32(5, s.rotation) : []),
  ...float32(7, s.offsetX ?? 0), ...float32(8, s.offsetY ?? 0),
]
const charmBlock = (c: InspectCharm) => [
  ...int(1, 0), ...int(2, c.id),
  ...float32(7, c.offsetX ?? 0), ...float32(8, c.offsetY ?? 0), ...float32(9, c.offsetZ ?? 0), ...int(10, c.seed ?? 0),
]

/** The upper-case hex string the viewer takes as `inspect=`. */
export function inspectHex(craft: InspectCraft): string {
  const wearBits = new DataView(new ArrayBuffer(4))
  wearBits.setFloat32(0, craft.wear, true)
  const statTrak = craft.statTrakCount != null
  const body: number[] = [
    ...int(3, craft.defindex), ...int(4, craft.paintId),
    ...int(7, wearBits.getUint32(0, true)), ...int(8, craft.seed),
    ...int(6, statTrak ? 9 : 4),
  ]
  if (statTrak) body.push(...int(9, 0), ...int(10, craft.statTrakCount!))
  const name = craft.nameTag?.trim()
  if (name) { const text = [...new TextEncoder().encode(name)]; body.push(...bytes(11, text)) }
  for (const sticker of craft.stickers ?? []) body.push(...bytes(12, stickerBlock(sticker)))
  if (craft.charm) body.push(...bytes(20, charmBlock(craft.charm)))
  const payload = [0, ...body]
  const crc = BigInt(crc32(payload))
  const checksum = Number(((crc & 0xffffn) ^ (BigInt(body.length) * crc)) & 0xffffffffn)
  const out = [...payload, (checksum >>> 24) & 255, (checksum >>> 16) & 255, (checksum >>> 8) & 255, checksum & 255]
  return out.map((byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase()
}
