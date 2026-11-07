import { describe, expect, it } from "vitest"

import { crc32, makeZip } from "./zip-store"

describe("zip-store", () => {
  it("computes the standard CRC-32", () => {
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926)
  })
  it("writes a readable archive: signatures, sizes, names and the end record", async () => {
    const zip = makeZip([{ name: "a.txt", data: new TextEncoder().encode("hello") }, { name: "dir/b.bin", data: new Uint8Array([1, 2, 3]) }])
    const bytes = new Uint8Array(await zip.arrayBuffer())
    const view = new DataView(bytes.buffer)
    expect(view.getUint32(0, true)).toBe(0x04034b50)
    expect(view.getUint32(18, true)).toBe(5)
    const end = bytes.length - 22
    expect(view.getUint32(end, true)).toBe(0x06054b50)
    expect(view.getUint16(end + 10, true)).toBe(2)
    const centralOffset = view.getUint32(end + 16, true)
    expect(view.getUint32(centralOffset, true)).toBe(0x02014b50)
    expect(view.getUint32(centralOffset + 16, true)).toBe(crc32(new TextEncoder().encode("hello")))
    expect(new TextDecoder().decode(bytes.slice(30, 35))).toBe("a.txt")
  })
})
