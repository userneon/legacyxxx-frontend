import { createElement } from "react"
import { createRoot } from "react-dom/client"

import { BackgroundScene, bgById, cleanBgLook } from "@/lib/backgrounds"

/**
 * A still picture of a profile background, for the Shop's tiles: a list of dozens cannot hold dozens of live WebGL canvases, so each background is run
 * once in a hidden canvas (one at a time, with its intro off), copied to an image and kept for the session. The copy needs the canvas to keep its
 * picture after it is drawn, which these components do not ask for, so for the moment they are created every WebGL context is made with that on.
 */
const W = 320
const H = 180
const SETTLE_MS = 1800

const done = new Map<string, string>()
const waiting = new Map<string, Promise<string | null>>()
let queue: Promise<unknown> = Promise.resolve()

export const bgKey = (id: string, look?: unknown) => id + JSON.stringify(look ?? {})
export const bgSnapshotNow = (id: string, look?: unknown) => done.get(bgKey(id, look)) ?? null

/** True when a picture has nothing drawn (all black or clear): such a copy is thrown away rather than kept as the tile's picture. */
function isBlank(canvas: HTMLCanvasElement): boolean {
  try {
    const probe = document.createElement("canvas")
    probe.width = 16
    probe.height = 9
    const context = probe.getContext("2d", { willReadFrequently: true })
    if (!context) return false
    context.drawImage(canvas, 0, 0, 16, 9)
    const data = context.getImageData(0, 0, 16, 9).data
    let lit = 0
    for (let i = 0; i < data.length; i += 4) lit += data[i] + data[i + 1] + data[i + 2]
    return lit < 16 * 9 * 3 * 3
  } catch {
    return false
  }
}

function render(id: string, look?: unknown): Promise<string | null> {
  return new Promise((resolve) => {
    const def = bgById(id)
    if (!def || typeof document === "undefined") return resolve(null)
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, attributes?: unknown) {
      if (type === "webgl" || type === "webgl2") return original.call(this, type, { ...(attributes as object | undefined), preserveDrawingBuffer: true })
      return original.call(this, type, attributes as never)
    } as typeof original
    const host = document.createElement("div")
    host.setAttribute("aria-hidden", "true")
    // On screen but invisible: these components stop drawing when they are not in view, so a box parked far off screen would stay black.
    host.style.cssText = `position:fixed;left:0;top:0;width:${W}px;height:${H}px;pointer-events:none;opacity:0;z-index:-1`
    document.body.appendChild(host)
    const root = createRoot(host)
    const finish = (url: string | null) => {
      HTMLCanvasElement.prototype.getContext = original
      root.unmount()
      host.remove()
      resolve(url)
    }
    try {
      root.render(createElement(BackgroundScene, { id, look: { ...cleanBgLook(def, look), intro: false } }))
    } catch {
      return finish(null)
    }
    window.setTimeout(() => {
      try {
        const canvas = host.querySelector("canvas")
        finish(canvas && !isBlank(canvas) ? canvas.toDataURL("image/jpeg", 0.8) : null)
      } catch {
        finish(null)
      }
    }, SETTLE_MS)
  })
}

/** The still picture of this background (a data address), or null when it could not be made. */
export function bgSnapshot(id: string, look?: unknown): Promise<string | null> {
  const key = bgKey(id, look)
  const cached = done.get(key)
  if (cached) return Promise.resolve(cached)
  const pending = waiting.get(key)
  if (pending) return pending
  const job = queue.then(() => render(id, look)).then((url) => {
    waiting.delete(key)
    if (url) done.set(key, url)
    return url
  })
  queue = job.catch(() => undefined)
  waiting.set(key, job)
  return job
}
