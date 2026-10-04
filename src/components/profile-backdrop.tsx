import { Suspense, lazy, useEffect, useState } from "react"

// three.js and its post-processing load only when a profile is opened.
const GridScan = lazy(() => import("@/components/grid-scan").then((module) => ({ default: module.GridScan })))

/** How long the grid takes to fade in and out when a profile opens or closes. */
const FADE_MS = 600

/**
 * The page backdrop while a profile is open: the Grid Scan fills the whole window behind the glass panels and fades away
 * again when the visitor leaves. It follows the pointer a little, runs at a lower resolution and frame rate than a
 * foreground effect would, and never takes input.
 */
export function ProfileBackdrop({ active }: { active: boolean }) {
  // `mounted` keeps the layer alive while it fades out; `visible` drives the opacity.
  const [mounted, setMounted] = useState(active)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (active) {
      setMounted(true)
      const frame = requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)))
      return () => cancelAnimationFrame(frame)
    }
    setVisible(false)
    const timer = window.setTimeout(() => setMounted(false), FADE_MS)
    return () => window.clearTimeout(timer)
  }, [active])

  if (!mounted) return null
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-[1] overflow-hidden transition-opacity ease-out" style={{ opacity: visible ? 1 : 0, transitionDuration: `${FADE_MS}ms` }}>
      <Suspense fallback={null}>
        <GridScan
          trackWindow
          sensitivity={0.3}
          maxPixelRatio={1}
          maxFps={30}
          linesColor="#2a2a2a"
          scanColor="#ff3d6e"
          scanOpacity={0.26}
          gridScale={0.1}
          lineJitter={0.06}
          scanDirection="pingpong"
          scanDuration={3.2}
          scanDelay={1.5}
          scanGlow={0.3}
          chromaticAberration={0}
          noiseIntensity={0.012}
          bloomIntensity={0.1}
          bloomThreshold={0.1}
          bloomSmoothing={0.4}
        />
      </Suspense>
    </div>
  )
}
