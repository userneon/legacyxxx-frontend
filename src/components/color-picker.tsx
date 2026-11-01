import { useEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils"

/* Our own colour picker (owner request 2026-11-01, replaces the browser's): a square for saturation and brightness, a hue strip and a hex field. */

type Hsv = { h: number; s: number; v: number }

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value))

export function hexToHsv(hex: string): Hsv {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!match) return { h: 0, s: 0, v: 0.8 }
  const n = parseInt(match[1], 16)
  const r = ((n >> 16) & 255) / 255
  const g = ((n >> 8) & 255) / 255
  const b = (n & 255) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  return { h, s: max === 0 ? 0 : d / max, v: max }
}

export function hsvToHex({ h, s, v }: Hsv): string {
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
  const part = (value: number) => Math.round((value + m) * 255).toString(16).padStart(2, "0")
  return `#${part(r)}${part(g)}${part(b)}`
}

/** Drag anywhere on `children` and report the pointer's position as 0..1 on both axes. */
function Surface({ onMove, className, style, label, children }: { onMove: (x: number, y: number) => void; className?: string; style?: React.CSSProperties; label: string; children?: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const report = (event: React.PointerEvent) => {
    const box = ref.current?.getBoundingClientRect()
    if (!box) return
    onMove(clamp((event.clientX - box.left) / box.width), clamp((event.clientY - box.top) / box.height))
  }
  return (
    <div
      ref={ref}
      role="presentation"
      aria-label={label}
      className={cn("relative touch-none select-none", className)}
      style={style}
      onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); report(event) }}
      onPointerMove={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) report(event) }}
    >
      {children}
    </div>
  )
}

/** The picker body: shows `value` and calls `onChange` with a "#rrggbb" string while it is dragged or typed. */
export function ColorPicker({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(value))
  const [text, setText] = useState(value)
  // Follow a colour chosen elsewhere (a swatch), but keep the hue while a grey or black has none of its own.
  useEffect(() => {
    if (value.toLowerCase() === hsvToHex(hsv)) return
    const next = hexToHsv(value)
    setHsv((current) => ({ h: next.s === 0 || next.v === 0 ? current.h : next.h, s: next.s, v: next.v }))
    setText(value)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
  const apply = (next: Hsv) => {
    setHsv(next)
    const hex = hsvToHex(next)
    setText(hex)
    onChange(hex)
  }
  return (
    <div className="flex w-[216px] flex-col gap-3">
      <Surface label="Saturation and brightness" onMove={(x, y) => apply({ ...hsv, s: x, v: 1 - y })} className="h-[140px] cursor-crosshair rounded-lg" style={{ backgroundColor: `hsl(${hsv.h} 100% 50%)`, backgroundImage: "linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, transparent)" }}>
        <span aria-hidden="true" className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgb(0_0_0/0.5)]" style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, background: hsvToHex(hsv) }} />
      </Surface>
      {/* palette-exempt: the hue strip */}
      <Surface label="Hue" onMove={(x) => apply({ ...hsv, h: x * 360 })} className="h-3 cursor-pointer rounded-full" style={{ backgroundImage: "linear-gradient(to right, hsl(0 100% 50%), hsl(60 100% 50%), hsl(120 100% 50%), hsl(180 100% 50%), hsl(240 100% 50%), hsl(300 100% 50%), hsl(360 100% 50%))" }}>
        <span aria-hidden="true" className="pointer-events-none absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgb(0_0_0/0.5)]" style={{ left: `${(hsv.h / 360) * 100}%`, background: `hsl(${hsv.h} 100% 50%)` }} />
      </Surface>
      <label className="flex items-center gap-2 text-[12px] text-[var(--text-dim)]">
        <span aria-hidden="true" className="size-7 shrink-0 rounded-md border border-[var(--line-strong)]" style={{ background: hsvToHex(hsv) }} />
        <input
          value={text}
          onChange={(event) => {
            const raw = event.target.value.startsWith("#") ? event.target.value : `#${event.target.value}`
            setText(raw.slice(0, 7))
            if (/^#[0-9a-f]{6}$/i.test(raw)) { const next = hexToHsv(raw); setHsv((current) => ({ h: next.s === 0 || next.v === 0 ? current.h : next.h, s: next.s, v: next.v })); onChange(raw.toLowerCase()) }
          }}
          onBlur={() => setText(hsvToHex(hsv))}
          aria-label="Hex colour"
          spellCheck={false}
          maxLength={7}
          className="h-8 min-w-0 flex-1 rounded-lg border border-[var(--line)] bg-[var(--raised)] px-2 font-mono text-[12px] uppercase text-[var(--text)] outline-none focus:border-[var(--line-strong)]"
        />
      </label>
    </div>
  )
}
