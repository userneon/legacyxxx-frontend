/**
 * The Creator kit, personalised in the browser: the creator's name (and code) is written onto the pictures of public/creator-kit/ in the places the kit's
 * generator (scripts/make-creator-kit.mjs) left free (`slots.json`). Nothing is sent anywhere: the pictures are drawn on a canvas and handed over as downloads.
 */
export type Slot = { x: number; y: number; w: number; h: number }
export type Slots = Record<string, Record<string, Slot>>
export type Personal = { name: string; code: string }

const BASE = "/creator-kit"
const FONT = '"Exo 2", system-ui, sans-serif'

/** What may be written: no control characters, one space between words, 24 letters at most. */
export const cleanName = (raw: string) => raw.replace(/[\u0000-\u001f\u007f\u200b-\u200f\u2028-\u202f\u2060-\u206f\ufeff]/g, "").replace(/\s+/g, " ").trim().slice(0, 24)
export const cleanCode = (raw: string) => raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 8)

/** Whether this picture changes with a name or a code. */
export const takesPersonal = (file: string, slots: Slots) => Boolean(slots[file])

async function loadImage(file: string): Promise<HTMLImageElement> {
  const image = new Image()
  image.src = `${BASE}/${file}`
  await image.decode()
  return image
}

/** The biggest size (down to `min`) at which `text` fits `width`. */
function fit(ctx: CanvasRenderingContext2D, text: string, weight: number, size: number, min: number, width: number, spacing = 0) {
  let px = size
  for (; px > min; px -= 2) {
    ctx.font = `${weight} ${px}px ${FONT}`
    ;(ctx as unknown as { letterSpacing: string }).letterSpacing = `${Math.round(px * spacing)}px`
    if (ctx.measureText(text).width <= width) break
  }
  return px
}

/** One picture with the name and code written on it; null when the picture has no place for them (then it is handed over as it is). */
export async function personalise(file: string, personal: Personal, slots: Slots): Promise<Blob | null> {
  const spots = slots[file]
  const name = cleanName(personal.name)
  const code = cleanCode(personal.code)
  if (!spots || (!name && !code)) return null
  if (document.fonts) await Promise.all([document.fonts.load(`700 40px ${FONT}`), document.fonts.load(`500 40px ${FONT}`)]).catch(() => undefined)
  const image = await loadImage(file)
  const canvas = document.createElement("canvas")
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  const ctx = canvas.getContext("2d")
  if (!ctx) return null
  ctx.drawImage(image, 0, 0)
  ctx.textBaseline = "middle"
  const spacing = (value: number) => ((ctx as unknown as { letterSpacing: string }).letterSpacing = `${value}px`)
  let drew = false

  if (spots.name && name) {
    const slot = spots.name
    const px = fit(ctx, name, 700, 44, 22, slot.w)
    ctx.fillStyle = "#fafafa"
    ctx.textAlign = "left"
    ctx.fillText(name, slot.x, slot.y + slot.h / 2 + 1)
    spacing(0)
    drew = px > 0
  }
  if (spots.code && code) {
    const slot = spots.code
    ctx.fillStyle = "#fafafa"
    ctx.textAlign = "center"
    const px = fit(ctx, code, 700, 52, 24, slot.w - 24, 0.18)
    // Centred without the trailing space after the last letter.
    ctx.fillText(code, slot.x + slot.w / 2 + (px * 0.18) / 2, slot.y + slot.h / 2 + 1)
    spacing(0)
    drew = true
  }
  if (spots.by && name) {
    const slot = spots.by
    const isCard = file.includes("end-card")
    const lead = isCard ? "Content Creator · " : "by "
    const size = Math.max(18, Math.round(slot.h * (isCard ? 0.78 : 0.95)))
    ctx.font = `500 ${size}px ${FONT}`
    spacing(isCard ? 2 : 0)
    const leadWidth = ctx.measureText(lead).width
    const px = fit(ctx, name, 700, size, 14, Math.max(80, slot.w - leadWidth))
    ctx.font = `500 ${size}px ${FONT}`
    ctx.fillStyle = "#a3a3a3"
    const nameWidth = (() => { ctx.font = `700 ${px}px ${FONT}`; return ctx.measureText(name).width })()
    ctx.font = `500 ${size}px ${FONT}`
    const total = leadWidth + nameWidth
    const startX = isCard ? slot.x + slot.w / 2 - total / 2 : slot.x
    ctx.textAlign = "left"
    ctx.fillText(lead, startX, slot.y + slot.h / 2)
    ctx.font = `700 ${px}px ${FONT}`
    ctx.fillStyle = "#fafafa"
    ctx.fillText(name, startX + leadWidth, slot.y + slot.h / 2)
    spacing(0)
    drew = true
  }
  if (!drew) return null
  return await new Promise<Blob | null>((resolve) => canvas.toBlob((blob) => resolve(blob), "image/png"))
}

export async function loadSlots(): Promise<Slots> {
  const response = await fetch(`${BASE}/slots.json`)
  if (!response.ok) throw new Error("The kit's layout file is missing")
  return (await response.json()) as Slots
}

export async function fetchBytes(file: string): Promise<Uint8Array> {
  const response = await fetch(`${BASE}/${file}`)
  if (!response.ok) throw new Error(`Could not load ${file}`)
  return new Uint8Array(await response.arrayBuffer())
}
