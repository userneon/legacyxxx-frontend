import { memo, useEffect, useRef } from "react"

/**
 * Background beams (the shadcn/Aceternity "Background Beams" effect): faint curved lines that fan across the
 * page with a soft light gliding along a few of them. Pure SVG. The lines never change, so the browser paints
 * them once; the light is a CSS dash animation on its own small layer, which runs at the full frame rate
 * instead of being stepped by a script. The light is white only, so it stays inside the neutral palette.
 */
const PATH_COUNT = 40
const LIT_EVERY = 3
// The light rests while the page is scrolling and for this long after, so scrolling keeps its frames.
const SCROLL_IDLE_MS = 180

const paths = Array.from({ length: PATH_COUNT }, (_, i) => {
  const a = i * 5
  const b = i * 6
  return `M-${380 - a} -${189 + b}C-${380 - a} -${189 + b} -${312 - a} ${216 - b} ${152 - a} ${343 - b}C${616 - a} ${470 - b} ${684 - a} ${875 - b} ${684 - a} ${875 - b}`
})

// Deterministic spread so every load looks the same and nothing needs Math.random during render.
const timing = (i: number) => ({ dur: 18 + ((i * 7) % 9), delay: -((i * 5) % 17) })

function BackgroundBeamsBase() {
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = root.current
    if (!el) return
    let timer = 0
    // scroll does not bubble, so listen in the capture phase to also catch the page panel's own scrolling.
    const onScroll = () => {
      el.dataset.resting = "1"
      window.clearTimeout(timer)
      timer = window.setTimeout(() => delete el.dataset.resting, SCROLL_IDLE_MS)
    }
    window.addEventListener("scroll", onScroll, { capture: true, passive: true })
    return () => {
      window.removeEventListener("scroll", onScroll, { capture: true })
      window.clearTimeout(timer)
    }
  }, [])
  const frame = "absolute inset-0 size-full"
  const svgProps = { viewBox: "0 0 696 316", fill: "none", preserveAspectRatio: "xMidYMid slice", xmlns: "http://www.w3.org/2000/svg" } as const
  // Two layers inside one wrapper: the 40 faint lines are painted once, only the layer holding the light moves.
  return (
    <div ref={root} aria-hidden="true" className="lx-beams pointer-events-none fixed inset-0 -z-[1] overflow-hidden">
      <div className="absolute inset-0">
        <svg className={frame} {...svgProps}>
          <g transform="translate(400 90)">
            {paths.map((d, i) => (
              <path key={`base-${i}`} d={d} stroke="white" strokeOpacity="0.09" strokeWidth="0.5" />
            ))}
          </g>
        </svg>
        <svg className={frame} {...svgProps}>
          <defs>
            <linearGradient id="lx-beam-fade">
              <stop stopColor="white" stopOpacity="0" />
              <stop offset="50%" stopColor="white" stopOpacity="0.7" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </linearGradient>
          </defs>
          <g transform="translate(400 90)">
            {paths.map((d, i) => {
              if (i % LIT_EVERY !== 0) return null
              const { dur, delay } = timing(i)
              return <path key={`lit-${i}`} className="lx-beam-lit" style={{ "--d": `${dur}s`, "--b": `${delay}s` } as React.CSSProperties} d={d} pathLength={1} stroke="url(#lx-beam-fade)" strokeWidth="0.8" />
            })}
          </g>
        </svg>
      </div>
    </div>
  )
}

export const BackgroundBeams = memo(BackgroundBeamsBase)
