import { useEffect, useRef } from "react"

/**
 * Clan page backgrounds drawn on a 2D canvas (owner request 2026-10-26, "more animated clan backgrounds"): light enough for any
 * phone, one colour (the clan's) on its base. Each scene draws one frame from the time; the loop pauses while the tab is hidden.
 */
export type CanvasSceneName = "starfield" | "matrix" | "orbs" | "grid" | "embers" | "vortex" | "hex"

type Rgb = [number, number, number]
type Draw = (g: CanvasRenderingContext2D, w: number, h: number, t: number, color: Rgb, base: Rgb, state: Record<string, unknown>) => void

const rgba = ([r, g, b]: Rgb, a: number) => `rgba(${r},${g},${b},${a})`
const hex = (value: string): Rgb => {
  const n = Number.parseInt(/^#[0-9a-f]{6}$/i.test(value) ? value.slice(1) : "ffffff", 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const seeded = (seed: number) => { const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x) }
/** A soft fade of the base colour over the last frame, so moving things leave short trails. */
const fade = (g: CanvasRenderingContext2D, w: number, h: number, base: Rgb, amount: number) => { g.fillStyle = rgba(base, amount); g.fillRect(0, 0, w, h) }

const scenes: Record<CanvasSceneName, Draw> = {
  /** Warp: stars rush out of the middle towards the viewer. */
  starfield(g, w, h, t, color, base, state) {
    const stars = (state.stars ??= Array.from({ length: 420 }, (_, i) => ({ x: seeded(i) * 2 - 1, y: seeded(i + 999) * 2 - 1, z: seeded(i + 77) }))) as Array<{ x: number; y: number; z: number }>
    fade(g, w, h, base, 0.35)
    const cx = w / 2, cy = h / 2, scale = Math.max(w, h) * 0.6
    for (const star of stars) {
      const before = star.z
      star.z -= 0.006
      if (star.z <= 0.02) { star.z = 1; continue }
      const x0 = cx + (star.x / before) * scale * 0.3, y0 = cy + (star.y / before) * scale * 0.3
      const x1 = cx + (star.x / star.z) * scale * 0.3, y1 = cy + (star.y / star.z) * scale * 0.3
      const near = 1 - star.z
      g.strokeStyle = near > 0.85 ? rgba([255, 255, 255], near) : rgba(color, near)
      g.lineWidth = 0.6 + near * 2.2
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke()
    }
    void t
  },

  /** Code rain: columns of glyphs falling, a bright head and a fading tail. */
  matrix(g, w, h, _t, color, base, state) {
    const size = 16
    const columns = Math.ceil(w / size)
    const drops = (state.drops ??= Array.from({ length: columns }, (_, i) => seeded(i) * -h / size)) as number[]
    while (drops.length < columns) drops.push(-Math.random() * 20)
    fade(g, w, h, base, 0.12)
    g.font = `${size - 2}px ui-monospace, monospace`
    const glyphs = "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄ0123456789LXLEGACY"
    for (let i = 0; i < columns; i++) {
      const y = drops[i] * size
      g.fillStyle = rgba([255, 255, 255], 0.9)
      g.fillText(glyphs[Math.floor(Math.random() * glyphs.length)], i * size, y)
      g.fillStyle = rgba(color, 0.85)
      g.fillText(glyphs[Math.floor(Math.random() * glyphs.length)], i * size, y - size)
      drops[i] += 0.35 + seeded(i + 5) * 0.35
      if (y > h + size * 4 && Math.random() > 0.97) drops[i] = -Math.random() * 10
    }
  },

  /** Glowing orbs drifting slowly like a lava lamp, their light adding up where they meet. */
  orbs(g, w, h, t, color, base) {
    g.fillStyle = rgba(base, 1); g.fillRect(0, 0, w, h)
    g.save(); g.globalCompositeOperation = "lighter"
    for (let i = 0; i < 7; i++) {
      const x = w * (0.5 + 0.38 * Math.sin(t * 0.00017 * (1 + i * 0.13) + i * 1.7))
      const y = h * (0.5 + 0.36 * Math.cos(t * 0.00013 * (1 + i * 0.11) + i * 2.3))
      const r = Math.min(w, h) * (0.22 + 0.1 * Math.sin(t * 0.0004 + i))
      const blob = g.createRadialGradient(x, y, 0, x, y, r)
      blob.addColorStop(0, rgba(i % 3 === 0 ? [255, 255, 255] : color, i % 3 === 0 ? 0.28 : 0.5))
      blob.addColorStop(1, rgba(color, 0))
      g.fillStyle = blob; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill()
    }
    g.restore()
  },

  /** Retro grid: a glowing horizon and a floor of lines rolling towards the viewer. */
  grid(g, w, h, t, color, base) {
    g.fillStyle = rgba(base, 1); g.fillRect(0, 0, w, h)
    const horizon = h * 0.42
    const glow = g.createLinearGradient(0, horizon - h * 0.3, 0, horizon + 4)
    glow.addColorStop(0, rgba(color, 0)); glow.addColorStop(1, rgba(color, 0.45))
    g.fillStyle = glow; g.fillRect(0, horizon - h * 0.3, w, h * 0.3 + 4)
    const sun = g.createRadialGradient(w / 2, horizon, 0, w / 2, horizon, h * 0.22)
    sun.addColorStop(0, rgba([255, 255, 255], 0.55)); sun.addColorStop(0.4, rgba(color, 0.5)); sun.addColorStop(1, rgba(color, 0))
    g.fillStyle = sun; g.beginPath(); g.arc(w / 2, horizon, h * 0.22, Math.PI, 0); g.fill()
    g.strokeStyle = rgba(color, 0.8); g.lineWidth = 1.2; g.shadowColor = rgba(color, 1); g.shadowBlur = 8
    for (let i = -14; i <= 14; i++) { g.beginPath(); g.moveTo(w / 2 + i * w * 0.02, horizon); g.lineTo(w / 2 + i * w * 0.2, h); g.stroke() }
    const roll = (t * 0.0005) % 1
    for (let i = 0; i < 14; i++) {
      const p = (i + roll) / 14
      const y = horizon + (h - horizon) * p * p
      g.globalAlpha = p; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke()
    }
    g.globalAlpha = 1; g.shadowBlur = 0
  },

  /** Embers rising from below, swaying and fading as they cool. */
  embers(g, w, h, t, color, base, state) {
    const sparks = (state.sparks ??= Array.from({ length: 170 }, (_, i) => ({ seed: i, life: seeded(i) }))) as Array<{ seed: number; life: number }>
    fade(g, w, h, base, 0.25)
    const floor = g.createLinearGradient(0, h, 0, h * 0.55)
    floor.addColorStop(0, rgba(color, 0.18)); floor.addColorStop(1, rgba(color, 0))
    g.fillStyle = floor; g.fillRect(0, h * 0.55, w, h * 0.45)
    g.save(); g.globalCompositeOperation = "lighter"
    for (const spark of sparks) {
      spark.life += 0.0025 + seeded(spark.seed + 3) * 0.003
      if (spark.life > 1) spark.life -= 1
      const x = seeded(spark.seed + 11) * w + Math.sin(t * 0.0015 + spark.seed) * 18 * spark.life
      const y = h - spark.life * h * (0.7 + seeded(spark.seed + 7) * 0.4)
      const heat = 1 - spark.life
      const r = 1 + heat * 2.6
      g.fillStyle = rgba(heat > 0.75 ? [255, 255, 255] : color, heat * 0.9)
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill()
    }
    g.restore()
  },

  /** A spiral galaxy turning slowly round the middle. */
  vortex(g, w, h, t, color, base, state) {
    const dust = (state.dust ??= Array.from({ length: 650 }, (_, i) => ({ arm: i % 3, d: Math.pow(seeded(i), 0.7), off: (seeded(i + 31) - 0.5) * 0.6 }))) as Array<{ arm: number; d: number; off: number }>
    fade(g, w, h, base, 0.2)
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.62
    const core = g.createRadialGradient(cx, cy, 0, cx, cy, R * 0.35)
    core.addColorStop(0, rgba([255, 255, 255], 0.35)); core.addColorStop(1, rgba(color, 0))
    g.fillStyle = core; g.beginPath(); g.arc(cx, cy, R * 0.35, 0, Math.PI * 2); g.fill()
    for (const p of dust) {
      const angle = p.arm * (Math.PI * 2 / 3) + p.d * 5 + p.off + t * 0.00025 * (1.6 - p.d)
      const x = cx + Math.cos(angle) * p.d * R * 1.4, y = cy + Math.sin(angle) * p.d * R * 0.8
      g.fillStyle = rgba(p.d < 0.2 ? [255, 255, 255] : color, 0.9 - p.d * 0.6)
      g.fillRect(x, y, 1.6, 1.6)
    }
  },

  /** A honeycomb that lights up in waves running out from the middle. */
  hex(g, w, h, t, color, base) {
    g.fillStyle = rgba(base, 1); g.fillRect(0, 0, w, h)
    const s = 22, dx = s * Math.sqrt(3), dy = s * 1.5
    g.lineWidth = 1.2
    for (let row = -1; row * dy < h + s; row++) {
      for (let col = -1; col * dx < w + dx; col++) {
        const x = col * dx + (row % 2 ? dx / 2 : 0), y = row * dy
        const dist = Math.hypot(x - w / 2, y - h / 2) / Math.max(w, h)
        const pulse = Math.max(0, Math.sin(dist * 18 - t * 0.003)) ** 6
        g.beginPath()
        for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; g.lineTo(x + Math.cos(a) * (s - 2), y + Math.sin(a) * (s - 2)) }
        g.closePath()
        g.strokeStyle = rgba(color, 0.18 + pulse * 0.7)
        g.stroke()
        if (pulse > 0.3) { g.fillStyle = rgba(color, pulse * 0.25); g.fill() }
      }
    }
  },
}

export default function CanvasScene({ scene, color, base = "#000000" }: { scene: CanvasSceneName; color: string; base?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    const g = canvas?.getContext("2d")
    if (!canvas || !g) return
    const state: Record<string, unknown> = {}
    const fg = hex(color), bg = hex(base)
    let frame = 0
    const fit = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5)
      canvas.width = Math.max(1, Math.floor(canvas.clientWidth * ratio))
      canvas.height = Math.max(1, Math.floor(canvas.clientHeight * ratio))
      g.setTransform(ratio, 0, 0, ratio, 0, 0)
      g.fillStyle = rgba(bg, 1); g.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight)
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(canvas)
    const tick = (time: number) => {
      if (!document.hidden) scenes[scene](g, canvas.clientWidth, canvas.clientHeight, time, fg, bg, state)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(frame); observer.disconnect() }
  }, [scene, color, base])
  return <canvas ref={ref} aria-hidden="true" className="block size-full" />
}
