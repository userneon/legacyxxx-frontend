import { memo, useEffect, useRef } from "react"

/**
 * Background beams (the shadcn/Aceternity "Background Beams" effect): faint curved lines that fan across the
 * page with a soft light travelling along a few of them. Pure SVG, no animation library; the light is moved by a small throttled loop. The light is
 * white only, so it stays inside the neutral palette.
 */
const PATH_COUNT = 40
const LIT_EVERY = 4
// The light stops while the page is scrolling and for this long after: repainting it every frame made scrolling choppy.
const SCROLL_IDLE_MS = 180
const FRAME_MS = 1000 / 15

const paths = Array.from({ length: PATH_COUNT }, (_, i) => {
  const a = i * 5
  const b = i * 6
  return `M-${380 - a} -${189 + b}C-${380 - a} -${189 + b} -${312 - a} ${216 - b} ${152 - a} ${343 - b}C${616 - a} ${470 - b} ${684 - a} ${875 - b} ${684 - a} ${875 - b}`
})

// Deterministic spread so every load looks the same and nothing needs Math.random during render.
const timing = (i: number) => ({ dur: 16 + ((i * 7) % 11), begin: -((i * 5) % 17) })

/** Progress 0..1 of a beam's light at time `t` seconds; the same ease-in-out the SMIL version used. */
const lightAt = (t: number, dur: number, begin: number) => {
  const p = (((t - begin) % dur) + dur) % dur / dur
  return p * p * (3 - 2 * p)
}

function BackgroundBeamsBase() {
  const svg = useRef<SVGSVGElement>(null)
  useEffect(() => {
    const root = svg.current
    if (!root) return
    const lights = [...root.querySelectorAll<SVGLinearGradientElement>("linearGradient[data-dur]")].map((el) => ({ el, dur: Number(el.dataset.dur), begin: Number(el.dataset.begin) }))
    const place = (t: number) => {
      for (const { el, dur, begin } of lights) {
        const e = lightAt(t, dur, begin)
        el.setAttribute("x1", `${e * 100}%`)
        el.setAttribute("x2", `${e * 105}%`)
        el.setAttribute("y1", `${e * 100}%`)
        el.setAttribute("y2", `${e * 120}%`)
      }
    }
    const still = window.matchMedia("(prefers-reduced-motion: reduce)")
    place(0)
    if (still.matches) return
    // Repainting the whole fan is the costly part, and the light moves slowly: 15 repaints a second look the
    // same as 60 and leave the page its frames. It also rests while the page scrolls.
    let frame = 0
    let last = 0
    let scrolling = false
    let timer = 0
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick)
      if (scrolling || document.hidden || now - last < FRAME_MS) return
      last = now
      place(now / 1000)
    }
    // scroll does not bubble, so listen in the capture phase to also catch the page panel's own scrolling.
    const onScroll = () => {
      scrolling = true
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        scrolling = false
      }, SCROLL_IDLE_MS)
    }
    window.addEventListener("scroll", onScroll, { capture: true, passive: true })
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("scroll", onScroll, { capture: true })
      window.clearTimeout(timer)
    }
  }, [])
  const frame = "absolute inset-0 size-full"
  const svgProps = { viewBox: "0 0 696 316", fill: "none", preserveAspectRatio: "xMidYMid slice", xmlns: "http://www.w3.org/2000/svg" } as const
  // Two layers inside one wrapper: the 40 faint lines never change, so the browser paints them once and
  // only the small layer holding the moving light is repainted.
  return (
    <div aria-hidden="true" className="lx-beams pointer-events-none fixed inset-0 -z-[1] overflow-hidden">
      <div className="absolute inset-0">
        <svg className={frame} {...svgProps}>
          <g transform="translate(400 90)">
            {paths.map((d, i) => (
              <path key={`base-${i}`} d={d} stroke="white" strokeOpacity="0.09" strokeWidth="0.5" />
            ))}
          </g>
        </svg>
        <svg ref={svg} className={frame} {...svgProps}>
          <g transform="translate(400 90)">
            {paths.map((d, i) =>
              i % LIT_EVERY === 0 ? <path key={`lit-${i}`} d={d} stroke={`url(#beam-${i})`} strokeOpacity="0.9" strokeWidth="0.8" /> : null,
            )}
          </g>
          <defs>
            {paths.map((_, i) => {
              if (i % LIT_EVERY !== 0) return null
              const { dur, begin } = timing(i)
              return (
                <linearGradient key={`grad-${i}`} id={`beam-${i}`} gradientUnits="userSpaceOnUse" x1="0%" x2="0%" y1="0%" y2="0%" data-dur={dur} data-begin={begin}>
                  <stop stopColor="white" stopOpacity="0" />
                  <stop stopColor="white" stopOpacity="0.9" />
                  <stop offset="32.5%" stopColor="white" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="white" stopOpacity="0" />
                </linearGradient>
              )
            })}
          </defs>
        </svg>
      </div>
    </div>
  )
}

export const BackgroundBeams = memo(BackgroundBeamsBase)
