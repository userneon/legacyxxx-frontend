import { Component, type ReactNode } from "react"

import { AnimatedGridPattern } from "@/components/site-bg-options/animated-grid-pattern"
import { AuroraBackground } from "@/components/site-bg-options/aurora-background"
import { BackgroundBeamsWithCollision } from "@/components/site-bg-options/background-beams-with-collision"
import { BackgroundBeams } from "@/components/site-bg-options/background-beams"
import { Boxes } from "@/components/site-bg-options/background-boxes"
import { BackgroundGradientAnimation } from "@/components/site-bg-options/background-gradient-animation"
import { BackgroundLines } from "@/components/site-bg-options/background-lines"
import { DotPattern } from "@/components/site-bg-options/dot-pattern"
import { FlickeringGrid } from "@/components/site-bg-options/flickering-grid"
import { GridPattern } from "@/components/site-bg-options/grid-pattern"
import { LampContainer } from "@/components/site-bg-options/lamp"
import { LightRays } from "@/components/site-bg-options/light-rays"
import { Meteors } from "@/components/site-bg-options/meteors"
import { Particles } from "@/components/site-bg-options/particles"
import { RetroGrid } from "@/components/site-bg-options/retro-grid"
import { Ripple } from "@/components/site-bg-options/ripple"
import { ShootingStars } from "@/components/site-bg-options/shooting-stars"
import { Spotlight } from "@/components/site-bg-options/spotlight"
import { StarsBackground } from "@/components/site-bg-options/stars-background"
import { Vortex } from "@/components/site-bg-options/vortex"
import { WavyBackground } from "@/components/site-bg-options/wavy-background"

class Safe extends Component<{ children: ReactNode }, { bad: string | null }> {
  state = { bad: null as string | null }
  static getDerivedStateFromError(error: Error) { return { bad: error.message } }
  render() { return this.state.bad ? <div className="p-3 text-[11px] text-red-400">failed: {this.state.bad}</div> : this.props.children }
}

const Card = () => (
  <div className="absolute inset-x-4 bottom-4 z-20 flex h-20 flex-col gap-1.5 rounded-xl bg-[#111] p-3 text-[12px] text-[#bbb]"><b className="text-[#eee]">Operator III</b><i className="block h-1.5 w-2/3 rounded bg-[#1f1f1f]" /><i className="block h-1.5 w-2/5 rounded bg-[#1f1f1f]" /></div>
)

const OPTIONS: Array<{ name: string; from: string; node: ReactNode }> = [
  { name: "Background Beams", from: "Aceternity", node: <BackgroundBeams /> },
  { name: "Beams + Collision", from: "Aceternity", node: <BackgroundBeamsWithCollision className="absolute inset-0 !h-full !bg-[#060606] !from-transparent"><span /></BackgroundBeamsWithCollision> },
  { name: "Aurora Background", from: "Aceternity", node: <AuroraBackground className="absolute inset-0 !h-full !bg-[#060606]" showRadialGradient><span /></AuroraBackground> },
  { name: "Gradient Animation", from: "Aceternity", node: <BackgroundGradientAnimation containerClassName="!h-full" gradientBackgroundStart="rgb(6,6,10)" gradientBackgroundEnd="rgb(10,12,24)" firstColor="40,70,190" secondColor="110,60,200" thirdColor="20,110,150" fourthColor="30,40,110" fifthColor="90,50,160" pointerColor="70,90,220" size="90%" blendingValue="screen"><span /></BackgroundGradientAnimation> },
  { name: "Spotlight", from: "Aceternity", node: <Spotlight className="-top-32 left-10" fill="white" /> },
  { name: "Wavy Background", from: "Aceternity", node: <WavyBackground containerClassName="absolute inset-0 !h-full" className="hidden" colors={["#38bdf8", "#818cf8", "#c084fc", "#22d3ee", "#6366f1"]} backgroundFill="#060606" blur={8} waveOpacity={0.45} waveWidth={40}><span /></WavyBackground> },
  { name: "Background Lines", from: "Aceternity", node: <BackgroundLines className="!h-full bg-[#060606]"><span /></BackgroundLines> },
  { name: "Background Boxes", from: "Aceternity", node: <Boxes /> },
  { name: "Lamp", from: "Aceternity", node: <LampContainer className="!min-h-0 !h-full"><span /></LampContainer> },
  { name: "Stars + Shooting stars", from: "Aceternity", node: <><StarsBackground /><ShootingStars /></> },
  { name: "Vortex", from: "Aceternity", node: <Vortex className="absolute inset-0 size-full" containerClassName="absolute inset-0 size-full" backgroundColor="#060606" baseHue={225} rangeHue={40} particleCount={300}><span /></Vortex> },
  { name: "Retro Grid", from: "Magic UI", node: <RetroGrid /> },
  { name: "Flickering Grid", from: "Magic UI", node: <FlickeringGrid className="absolute inset-0 size-full" squareSize={4} gridGap={6} color="#8b8bff" maxOpacity={0.4} flickerChance={0.1} /> },
  { name: "Dot Pattern", from: "Magic UI", node: <DotPattern className="[mask-image:radial-gradient(300px_circle_at_center,white,transparent)]" /> },
  { name: "Animated Grid Pattern", from: "Magic UI", node: <AnimatedGridPattern numSquares={30} maxOpacity={0.2} duration={3} className="[mask-image:radial-gradient(400px_circle_at_center,white,transparent)]" /> },
  { name: "Grid Pattern", from: "Magic UI", node: <GridPattern width={30} height={30} className="[mask-image:radial-gradient(300px_circle_at_center,white,transparent)] stroke-white/10" /> },
  { name: "Ripple", from: "Magic UI", node: <Ripple /> },
  { name: "Particles", from: "Magic UI", node: <Particles className="absolute inset-0" quantity={90} ease={80} color="#ffffff" refresh /> },
  { name: "Meteors", from: "Magic UI", node: <Meteors number={14} /> },
  { name: "Light Rays", from: "Magic UI", node: <LightRays /> },
]

export function SiteBgPreviewPage() {
  return (
    <div className="dark fixed inset-0 z-[9999] overflow-auto bg-black p-3 pt-[72px] text-white">
      <div className="grid grid-cols-4 gap-2.5">
        {OPTIONS.map((option, index) => (
          <div key={option.name} className="relative h-[270px] overflow-hidden rounded-2xl border border-white/10 bg-[#060606]">
            <span className="absolute left-2 top-2 z-30 rounded bg-black/70 px-1.5 py-0.5 font-mono text-[11px] text-green-300">{index + 1} · {option.name} <span className="text-white/50">· {option.from}</span></span>
            <Safe>{option.node}</Safe>
            <Card />
          </div>
        ))}
      </div>
    </div>
  )
}
