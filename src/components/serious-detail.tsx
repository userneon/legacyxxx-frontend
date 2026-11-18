import { useMemo } from "react"

/**
 * The quiet pages (Staff, Creators, Team, Discord: no agent picture, owner decision 2026-11-18) get small details instead: very faint contour lines like the ones on the Wallet card
 * fading out toward the bottom, a thin gold line along the top edge, and tiny crosshair marks in the corners. All of it is low in contrast, so nothing competes with the page.
 */
function contours() {
  const lines: string[] = []
  const W = 1440
  for (let i = 0; i < 16; i += 1) {
    const base = 40 + i * 24
    const phase = i * 0.55
    const points: string[] = []
    for (let x = 0; x <= W; x += 24) {
      const t = x / W
      const y = base + Math.sin(t * 5.2 + phase) * (16 + i * 0.9) + Math.sin(t * 11.3 + phase * 1.7) * 5 - t * 46
      points.push(`${x === 0 ? "M" : "L"}${x} ${y.toFixed(1)}`)
    }
    lines.push(points.join(" "))
  }
  return lines
}

export function SeriousDetail() {
  const lines = useMemo(contours, [])
  const mark = (position: string) => (
    <span aria-hidden="true" className={`absolute size-3 ${position}`}>
      <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/[0.14]" />
      <span className="absolute left-0 top-1/2 h-px w-full -translate-y-1/2 bg-white/[0.14]" />
    </span>
  )
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[clamp(360px,42vw,620px)] overflow-hidden [mask-image:linear-gradient(180deg,#000_45%,transparent)]">
      <svg viewBox="0 0 1440 460" preserveAspectRatio="xMidYMin slice" fill="none" className="absolute inset-0 size-full [mask-image:linear-gradient(90deg,transparent,#000_38%)]">
        {lines.map((d, index) => <path key={index} d={d} stroke={index % 5 === 2 ? "rgb(230 192 103)" : "rgb(150 180 255)"} strokeOpacity={index % 5 === 2 ? 0.26 : 0.17} strokeWidth="1" />)}
      </svg>
      <div className="absolute inset-0 bg-[radial-gradient(60%_70%_at_100%_0%,rgb(70_110_255/0.14),transparent_70%)]" />
      <div className="absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-[rgb(230_192_103/0.45)] to-transparent" />
      <div className="absolute inset-x-6 top-[68px] bottom-0">
        {mark("left-0 top-0 -translate-x-1/2")}
        {mark("right-0 top-0 translate-x-1/2")}
      </div>
    </div>
  )
}
