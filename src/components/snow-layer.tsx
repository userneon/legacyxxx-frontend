import { useEffect, useRef } from "react"

import { useActiveEvent } from "@/hooks/use-active-event"
import { useWebsitePreferences } from "@/lib/preferences"
import { flakeCount, isWinterSeason } from "@/lib/winter"

interface Flake { x: number; y: number; r: number; speed: number; sway: number; freq: number; phase: number; alpha: number; age: number; landed: number }
/** The top edge of a card, in window pixels, kept up to date in place so a flake that landed on it can follow a scroll. */
interface Ledge { left: number; right: number; top: number }

/** The boxes that count as cards on every page (the flat-outline fills, the Shop's glass, the solid grey boxes). */
const CARD_SELECTOR = '.lx-glass, .glass, [class*="glass-fill"], .lx-shop-glass, .lx-shop-tile, [class*="bg-[var(--card-surface)]"]'

/** Floating things (tooltips, menus, dialogs, the rail and the header) never wear snow, whatever their class names say. */
const NO_SNOW_INSIDE = '[data-radix-popper-content-wrapper], [role="tooltip"], [role="dialog"], [role="menu"], [role="listbox"], nav, header, [data-slot="tooltip-content"], [data-slot="popover-content"]'

/** Cards already judged, so each is measured once. */
const judged = new WeakSet<Element>()

/**
 * Marks a box that is a real card (wide and tall enough, rounded, in flow, with no ::before of its own) with `data-snow`, which is what index/event-themes.css
 * draws the snow cap on. A box that is not positioned gets `position: relative` unless something inside is absolutely placed against it.
 */
function markCard(element: HTMLElement) {
  if (judged.has(element)) return
  const rect = element.getBoundingClientRect()
  if (rect.width === 0 && rect.height === 0) return // not laid out yet: ask again next time
  judged.add(element)
  if (element.closest(NO_SNOW_INSIDE)) return
  if (rect.width < 120 || rect.height < 56) return
  const style = getComputedStyle(element)
  if (style.position === "absolute" || style.position === "fixed") return
  if ((parseFloat(style.borderTopLeftRadius) || 0) < 8) return
  const before = getComputedStyle(element, "::before").content
  if (before && before !== "none" && before !== "normal") return
  if (style.position === "static") {
    const anchored = Array.from(element.querySelectorAll<HTMLElement>("*")).slice(0, 120).some((child) => (child as HTMLElement).offsetParent === element && getComputedStyle(child).position === "absolute")
    if (anchored) return
    element.style.position = "relative"
  }
  element.dataset.snow = "1"
}

/** How long a flake rests on a card before it melts away, in seconds. */
const MELT = 1.8
/** The share of flakes that meet a card's top edge and stay on it; the others fall past. */
const LAND_SHARE = 0.55

/** One soft white dot, drawn once and stamped for every flake. */
function makeSprite(): HTMLCanvasElement {
  const size = 64
  const sprite = document.createElement("canvas")
  sprite.width = size
  sprite.height = size
  const ctx = sprite.getContext("2d")
  if (ctx) {
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    gradient.addColorStop(0, "rgba(255,255,255,1)") // palette-exempt
    gradient.addColorStop(0.35, "rgba(240,247,255,0.85)") // palette-exempt
    gradient.addColorStop(1, "rgba(235,244,255,0)") // palette-exempt
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, size, size)
  }
  return sprite
}

function newFlake(width: number, height: number, anywhere: boolean): Flake {
  // Depth decides everything: far flakes are small, slow and faint; near ones are bigger, quicker and brighter.
  const depth = Math.random() ** 1.6
  return {
    x: Math.random() * width,
    y: anywhere ? Math.random() * height : -12,
    r: 0.9 + depth * 1.9,
    speed: 22 + depth * 70,
    sway: 6 + Math.random() * 22,
    freq: 0.4 + Math.random() * 0.9,
    phase: Math.random() * Math.PI * 2,
    alpha: 0.25 + depth * 0.45,
    age: anywhere ? 9 : 0,
    landed: 0,
  }
}

/**
 * Winter snow over the whole website: a lot of soft flakes in three depths that sway and drift with a slow wind. It runs from November to
 * February (Ulaanbaatar calendar) and during a New Year holiday, can be switched off in Settings, stays still-and-hidden for reduced motion
 * and pauses while the tab is hidden. `<html data-winter="on">` also lets the cards carry a little snow on their top edge (index.css).
 */
export function SnowLayer() {
  const event = useActiveEvent()
  const prefs = useWebsitePreferences()
  const on = prefs.snow && (isWinterSeason() || event?.theme === "new-year")
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const root = document.documentElement
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (!on) { delete root.dataset.winter; return }
    // The snow on the cards is still, so it stays for reduced motion; the falling flakes do not.
    root.dataset.winter = "on"
    const node = canvas.current
    const markAll = () => document.querySelectorAll<HTMLElement>(CARD_SELECTOR).forEach(markCard)
    const ctx = !calm && node ? node.getContext("2d") : null
    if (!ctx || !node) {
      // No falling flakes (reduced motion): the caps on the cards are still marked.
      markAll()
      const markTimer = window.setInterval(markAll, 700)
      let marking = 0
      const watchMarks = new MutationObserver(() => { window.clearTimeout(marking); marking = window.setTimeout(markAll, 60) })
      watchMarks.observe(document.body, { childList: true, subtree: true })
      return () => { window.clearInterval(markTimer); watchMarks.disconnect(); window.clearTimeout(marking); delete root.dataset.winter }
    }

    const sprite = makeSprite()
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let width = 0
    let height = 0
    let flakes: Flake[] = []
    const ledges = new Map<Element, Ledge>()
    let scanning = false
    const scan = () => {
      scanning = false
      const seen = new Set<Element>()
      document.querySelectorAll<HTMLElement>(CARD_SELECTOR).forEach(markCard)
      document.querySelectorAll("[data-snow]").forEach((element) => {
        const rect = element.getBoundingClientRect()
        if (rect.width < 90 || rect.top < 70 || rect.top > height - 20 || rect.right < 0 || rect.left > width) return
        seen.add(element)
        const ledge = ledges.get(element)
        if (ledge) { ledge.left = rect.left; ledge.right = rect.right; ledge.top = rect.top }
        else ledges.set(element, { left: rect.left, right: rect.right, top: rect.top })
      })
      for (const element of [...ledges.keys()]) if (!seen.has(element)) ledges.delete(element)
    }
    const scanSoon = () => { if (!scanning) { scanning = true; requestAnimationFrame(scan) } }
    const scanTimer = window.setInterval(scan, 500)
    // A card that has just been drawn gets its snow at once, not at the next tick.
    let watching = 0
    const watch = new MutationObserver(() => { window.clearTimeout(watching); watching = window.setTimeout(scan, 60) })
    watch.observe(document.body, { childList: true, subtree: true })
    document.addEventListener("scroll", scanSoon, true)
    const resize = () => {
      width = window.innerWidth
      height = window.innerHeight
      node.width = Math.round(width * dpr)
      node.height = Math.round(height * dpr)
      node.style.width = `${width}px`
      node.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const wanted = flakeCount(width, height)
      if (flakes.length > wanted) flakes.length = wanted
      while (flakes.length < wanted) flakes.push(newFlake(width, height, true))
    }
    resize()
    window.addEventListener("resize", resize)
    scan()

    let frame = 0
    let last = performance.now()
    const start = last
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      const t = (now - start) / 1000
      const wind = Math.sin(t * 0.12) * 16 + Math.sin(t * 0.37) * 6
      ctx.clearRect(0, 0, width, height)
      for (const flake of flakes) {
        flake.age += dt
        let alpha = flake.alpha * Math.min(1, flake.age / 0.9) // a new flake fades in
        let scale = 1
        if (flake.landed > 0) {
          // Resting on a card: it sinks into the snow and melts.
          flake.landed += dt
          const left = Math.max(0, 1 - flake.landed / MELT)
          alpha *= left
          scale = 0.5 + left * 0.5
          if (left <= 0) { Object.assign(flake, newFlake(width, height, false)); continue }
        } else {
          const before = flake.y
          flake.y += flake.speed * dt
          flake.x += (wind * (flake.r / 5) + Math.cos(t * flake.freq + flake.phase) * flake.sway) * dt
          if (flake.x < -20) flake.x += width + 40
          else if (flake.x > width + 20) flake.x -= width + 40
          for (const ledge of ledges.values()) {
            if (before < ledge.top && flake.y >= ledge.top && flake.x > ledge.left + 14 && flake.x < ledge.right - 14 && Math.random() < LAND_SHARE) {
              flake.landed = 0.001
              flake.y = ledge.top + 1
              break
            }
          }
          alpha *= Math.min(1, Math.max(0, (height + 12 - flake.y) / 90)) // and fades out near the bottom
          if (flake.y > height + 12) { Object.assign(flake, newFlake(width, height, false)); continue }
        }
        ctx.globalAlpha = alpha
        const size = flake.r * 2.4 * scale
        ctx.drawImage(sprite, flake.x - size / 2, flake.y - size / 2, size, size)
      }
      ctx.globalAlpha = 1
      frame = requestAnimationFrame(tick)
    }
    const run = () => { cancelAnimationFrame(frame); last = performance.now(); frame = requestAnimationFrame(tick) }
    const onVisibility = () => { if (document.hidden) cancelAnimationFrame(frame); else run() }
    document.addEventListener("visibilitychange", onVisibility)
    run()
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("resize", resize)
      window.clearInterval(scanTimer)
      watch.disconnect()
      window.clearTimeout(watching)
      document.removeEventListener("scroll", scanSoon, true)
      document.removeEventListener("visibilitychange", onVisibility)
      delete root.dataset.winter
    }
  }, [on])

  if (!on) return null
  return <canvas ref={canvas} aria-hidden="true" className="lx-snow pointer-events-none fixed left-0 top-0 z-[20]" />
}
