import { createElement } from "react"
import { createRoot } from "react-dom/client"

import CrystalizedBall from "@/components/reactbits/crystalized-ball"
import { ORB_BALL, resolveLook, type FrameLook } from "@/lib/frame-look"

/**
 * A still picture of a Crystal Orb. A page may hold only a handful of live WebGL canvases, so every orb that is not on a profile or in
 * the Shop is drawn from one of these: the orb is run for a moment in a hidden canvas, copied to an image and put away. One at a time,
 * and each distinct look only once (the picture is kept for the session).
 */
const SIZE = 192
const SETTLE_MS = 1600

const done = new Map<string, string>()
const waiting = new Map<string, Promise<string | null>>()
let queue: Promise<unknown> = Promise.resolve()

export const orbKey = (look: FrameLook | null | undefined) => JSON.stringify(resolveLook(look))

function render(look: FrameLook | null | undefined): Promise<string | null> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") return resolve(null)
    const host = document.createElement("div")
    host.setAttribute("aria-hidden", "true")
    host.style.cssText = `position:fixed;left:-9999px;top:0;width:${SIZE}px;height:${SIZE}px;pointer-events:none`
    document.body.appendChild(host)
    const root = createRoot(host)
    const finish = (url: string | null) => {
      root.unmount()
      host.remove()
      resolve(url)
    }
    try {
      root.render(createElement(CrystalizedBall, { ...resolveLook(look), size: ORB_BALL, theme: "dark", interactive: false, intro: false, keepBuffer: true }))
    } catch {
      return finish(null)
    }
    window.setTimeout(() => {
      try {
        const canvas = host.querySelector("canvas")
        finish(canvas ? canvas.toDataURL("image/png") : null)
      } catch {
        finish(null)
      }
    }, SETTLE_MS)
  })
}

/** The still picture of this look (a data address), or null when it could not be made. */
export function orbSnapshot(look: FrameLook | null | undefined): Promise<string | null> {
  const key = orbKey(look)
  const cached = done.get(key)
  if (cached) return Promise.resolve(cached)
  const pending = waiting.get(key)
  if (pending) return pending
  const job = queue.then(() => render(look)).then((url) => {
    waiting.delete(key)
    if (url) done.set(key, url)
    return url
  })
  queue = job.catch(() => undefined)
  waiting.set(key, job)
  return job
}

/** The picture if it is already made (no waiting). */
export const orbSnapshotNow = (look: FrameLook | null | undefined) => done.get(orbKey(look)) ?? null
