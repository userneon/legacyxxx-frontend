import { useEffect, useRef } from "react"

import { useActiveEvent } from "@/hooks/use-active-event"
import { useWebsitePreferences } from "@/lib/preferences"
import { flakeCount, isWinterSeason } from "@/lib/winter"

interface Flake { x: number; y: number; r: number; speed: number; sway: number; freq: number; phase: number; alpha: number }

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
    r: 1 + depth * 3,
    speed: 22 + depth * 70,
    sway: 6 + Math.random() * 22,
    freq: 0.4 + Math.random() * 0.9,
    phase: Math.random() * Math.PI * 2,
    alpha: 0.3 + depth * 0.5,
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
    if (calm || !node) return () => { delete root.dataset.winter }
    const ctx = node.getContext("2d")
    if (!ctx) return () => { delete root.dataset.winter }

    const sprite = makeSprite()
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let width = 0
    let height = 0
    let flakes: Flake[] = []
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
        flake.y += flake.speed * dt
        flake.x += (wind * (flake.r / 5) + Math.cos(t * flake.freq + flake.phase) * flake.sway) * dt
        if (flake.y > height + 12 || flake.x < -20 || flake.x > width + 20) {
          Object.assign(flake, newFlake(width, height, false))
          if (flake.x < 0 || flake.x > width) flake.x = Math.random() * width
        }
        ctx.globalAlpha = flake.alpha
        const size = flake.r * 2.6
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
      document.removeEventListener("visibilitychange", onVisibility)
      delete root.dataset.winter
    }
  }, [on])

  if (!on) return null
  return <canvas ref={canvas} aria-hidden="true" className="lx-snow pointer-events-none fixed left-0 top-0 z-[20]" />
}
