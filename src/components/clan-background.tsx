import { Suspense, lazy } from "react"

import type { ClanLook, ClanPageEffect } from "@/api"

const SlatsBackground = lazy(() => import("@/components/reactbits/micro-slats"))
const WavesBackground = lazy(() => import("@/components/reactbits/pattern-waves"))
const DotsBackground = lazy(() => import("@/components/reactbits/dot-field"))
const AuroraBackground = lazy(() => import("@/components/reactbits/aurora"))
const ThreadsBackground = lazy(() => import("@/components/reactbits/threads"))
const ParticlesBackground = lazy(() => import("@/components/reactbits/particles"))
const LightningBackground = lazy(() => import("@/components/reactbits/lightning"))
const RaysBackground = lazy(() => import("@/components/reactbits/light-rays"))
const LinesBackground = lazy(() => import("@/components/reactbits/waves"))
const PlasmaBackground = lazy(() => import("@/components/reactbits/plasma"))

/** Hex to rgba, for the dot field's colours. Only called with values that already passed the #rrggbb check. */
function rgba(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

/** The colour as 0..1 channels (Threads) and as a hue in degrees (Lightning). */
function channels(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}
function hueOf(hex: string) {
  const [r, g, b] = channels(hex)
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min
  if (d === 0) return 0
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return (h * 60 + 360) % 360
}

/** How bright each animated background is: the busy ones are dimmed so text stays readable. */
export const EFFECT_OPACITY: Record<ClanPageEffect, number> = { slats: 0.45, waves: 0.8, dots: 0.8, aurora: 0.7, threads: 0.7, particles: 0.8, lightning: 0.55, rays: 0.9, lines: 0.5, plasma: 0.4 }

/** One animated (or gradient) clan background filling its parent. The same piece paints the clan page and the Shop preview. */
export function ClanBackground({ page, calm }: { page: NonNullable<ClanLook["page"]>; calm?: boolean }) {
  const effect = calm ? null : page.effect ?? null
  const color = page.from
  const base = page.to
  return (
    <div className="size-full" style={effect ? { opacity: EFFECT_OPACITY[effect] ?? 0.6, backgroundColor: base } : { backgroundImage: `radial-gradient(130% 80% at 50% 0%, ${page.from}, ${page.to} 78%)`, opacity: 0.45 }}>
      {effect && (
        <Suspense fallback={null}>
          {effect === "slats" && <SlatsBackground color={color} glintColor={color} backgroundColor={base} interactive={false} />}
          {effect === "waves" && <WavesBackground color={color} backgroundColor={base} interactive={false} />}
          {effect === "dots" && <div className="size-full" style={{ background: base }}><DotsBackground dotSpacing={18} gradientFrom={rgba(color, 0.95)} gradientTo={rgba(color, 0.6)} glowColor={base} /></div>}
          {effect === "aurora" && <AuroraBackground colorStops={[color, "#ffffff", color]} amplitude={1} blend={0.6} />}
          {effect === "threads" && <ThreadsBackground color={channels(color)} amplitude={1} distance={0} enableMouseInteraction={false} />}
          {effect === "particles" && <ParticlesBackground particleColors={[color, "#ffffff"]} particleCount={300} particleBaseSize={160} moveParticlesOnHover={false} alphaParticles />}
          {effect === "lightning" && <LightningBackground hue={hueOf(color)} />}
          {effect === "rays" && <RaysBackground raysColor={color} raysOrigin="top-center" followMouse={false} />}
          {effect === "lines" && <LinesBackground lineColor={rgba(color, 0.6)} backgroundColor="transparent" />}
          {effect === "plasma" && <PlasmaBackground color={color} mouseInteractive={false} />}
        </Suspense>
      )}
    </div>
  )
}
