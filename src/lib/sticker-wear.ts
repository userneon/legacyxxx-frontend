/**
 * A sticker worn exactly as the game wears it (owner request 2026-11-13, "do it the way the game scratches, not fake"). The game's own sticker shader
 * (csgo_weapon_sticker, as ported by the MIT-licensed ChainSkins viewer, github.com/ChainSkins/cs2-3d-viewer, `src/lib/materials/sticker-glsl.ts`) wears a
 * sticker with three things: the game's shared scratch texture (`g_tStickerScratches`), the sticker's own colour texture whose alpha channel is the
 * game's wear profile, and two numbers per sticker (`g_vWearBiasSticker0`, `g_fWearScratchesSticker0`). All four are Valve's files and numbers, served by
 * the viewer's asset host (CORS open); this file reads them and runs the shader's wear block over every pixel, giving the worn picture as a canvas.
 * Anything that fails to load returns null and the caller keeps its own approximation.
 */
const ASSETS = "https://3dassets.chainskins.net/"
const SIZE = 256

interface StickerIndex { scratches: string; byIndex: Map<number, string> }
interface StickerData { id: string; color: string; paper: boolean; wearBias: [number, number]; scratches: number }

let indexRequest: Promise<StickerIndex> | null = null
const dataRequests = new Map<number, Promise<StickerData | null>>()
const imageRequests = new Map<string, Promise<ImageData | null>>()
const wornCache = new Map<string, Promise<HTMLCanvasElement | null>>()

const webp = (path: string) => ASSETS + path.replace(/\.png$/i, ".webp")

function loadIndex(): Promise<StickerIndex> {
  indexRequest ??= fetch(`${ASSETS}extracted/viewer/stickers.json`)
    .then((response) => (response.ok ? response.json() : Promise.reject(new Error("index"))))
    .then((json: { scratches: string; stickers: Array<[string, string, string | null, string, number]> }) => ({ scratches: json.scratches, byIndex: new Map(json.stickers.map((entry) => [entry[4], entry[0]])) }))
  indexRequest.catch(() => { indexRequest = null })
  return indexRequest
}

function loadData(kit: number): Promise<StickerData | null> {
  let request = dataRequests.get(kit)
  if (!request) {
    request = loadIndex()
      .then((index) => {
        const id = index.byIndex.get(kit)
        if (!id) return null
        return fetch(`${ASSETS}extracted/viewer/stickers/${encodeURIComponent(id)}.json`).then((response) => (response.ok ? response.json() : null))
      })
      .then((json) => (json ? ({ id: json.id, color: json.color, paper: Boolean(json.paper), wearBias: json.wearBias ?? [2, 1], scratches: typeof json.scratches === "number" ? json.scratches : 1 } satisfies StickerData) : null))
      .catch(() => null)
    dataRequests.set(kit, request)
  }
  return request
}

function loadPixels(path: string): Promise<ImageData | null> {
  let request = imageRequests.get(path)
  if (!request) {
    request = new Promise<ImageData | null>((resolve) => {
      const image = new Image()
      image.crossOrigin = "anonymous"
      image.onload = () => {
        const canvas = document.createElement("canvas")
        canvas.width = SIZE
        canvas.height = SIZE
        const context = canvas.getContext("2d", { willReadFrequently: true })
        if (!context) return resolve(null)
        context.drawImage(image, 0, 0, SIZE, SIZE)
        resolve(context.getImageData(0, 0, SIZE, SIZE))
      }
      image.onerror = () => resolve(null)
      image.src = webp(path)
    })
    imageRequests.set(path, request)
  }
  return request
}

const clamp01 = (value: number) => Math.min(1, Math.max(0, value))
const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = clamp01((x - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}
const toLinear = (value: number) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
const toSrgb = (value: number) => (value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055)

/** The sticker (by its kit index, the catalogue item's `weapon_defindex`) at a wear from 0 to 1, as the game draws it; null when it cannot be built. */
export function wornSticker(kit: number, wear: number): Promise<HTMLCanvasElement | null> {
  const key = `${kit}:${wear.toFixed(2)}`
  let request = wornCache.get(key)
  if (!request) {
    request = (async () => {
      const [index, data] = await Promise.all([loadIndex(), loadData(kit)])
      if (!data) return null
      const [color, scratch] = await Promise.all([loadPixels(data.color), loadPixels(index.scratches)])
      if (!color || !scratch) return null
      const canvas = document.createElement("canvas")
      canvas.width = SIZE
      canvas.height = SIZE
      const context = canvas.getContext("2d")
      if (!context) return null
      const out = context.createImageData(SIZE, SIZE)
      const [biasX, biasY] = data.wearBias
      const ut = clamp01(wear)
      const ni = data.paper ? 0.5 : (biasY * (biasY > 0 ? 0.5 : 0.25) + 0.5) * 0.5
      const exponent = biasX * biasX
      for (let i = 0; i < SIZE * SIZE; i += 1) {
        const o = i * 4
        const a = color.data[o + 3]! / 255
        let alpha = clamp01(a * 12.75)
        let r = toLinear(color.data[o]! / 255)
        let g = toLinear(color.data[o + 1]! / 255)
        let b = toLinear(color.data[o + 2]! / 255)
        const qf = 1 - Math.min(data.scratches, scratch.data[o]! / 255)
        const qg = qf + (qf * 0.5 - qf) * wear
        const ts = clamp01(ut - clamp01((a - 0.0784314) * 1.0851064) ** exponent)
        if (data.paper) {
          const e = clamp01(ts * 2) + biasY * ut
          const mixFactor = smoothstep(e, e + 0.1, qg)
          const paper = 0.7 + (0.2 + 0.4 * qg - 0.7) * ut
          r = paper + (r - paper) * mixFactor
          g = paper + (g - paper) * mixFactor
          b = paper + (b - paper) * mixFactor
        }
        const us = clamp01(ts * (1 + ni) - ni)
        const darken = 1 + (qg - 1) * ut * 0.3
        r *= darken
        g *= darken
        b *= darken
        alpha *= smoothstep(us, us + 0.1, qg)
        out.data[o] = Math.round(clamp01(toSrgb(r)) * 255)
        out.data[o + 1] = Math.round(clamp01(toSrgb(g)) * 255)
        out.data[o + 2] = Math.round(clamp01(toSrgb(b)) * 255)
        out.data[o + 3] = Math.round(alpha * 255)
      }
      context.putImageData(out, 0, 0)
      return canvas
    })().catch(() => null)
    wornCache.set(key, request)
  }
  return request
}
