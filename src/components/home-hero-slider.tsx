/**
 * The Home hero as a slider (owner request 2026-10-26: "slides, smooth 60fps, like an advert"): six slides, each a map picture behind one
 * headline, one line, a button and (where it has one) a real status from the API. Everything that moves is a transform or an opacity, so
 * it stays on the compositor: the slides slide, the progress bar is a scaleX animation, no layout or paint per frame. It plays by itself
 * (a bar under it shows the time left), pauses while the pointer or focus is on it or the tab is hidden, never plays for
 * prefers-reduced-motion, and can be moved by the arrows, the bars, the arrow keys or a swipe.
 */
import { useCallback, useEffect, useRef, useState, type ComponentType, type PointerEvent as ReactPointerEvent } from "react"
import { ChevronLeft, ChevronRight, Gem, Play, ShieldCheck, Trophy, Users } from "lucide-react"

import type { PageId } from "@/api/types"
import { AnimatedNumber } from "@/components/animated-number"
import { KnifeIcon } from "@/components/knife-icon"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import ancient from "@/assets/maps/de_ancient.webp"
import dust2 from "@/assets/maps/de_dust2.webp"
import inferno from "@/assets/maps/de_inferno.webp"
import mirage from "@/assets/maps/de_mirage.webp"
import nuke from "@/assets/maps/de_nuke.webp"
import overpass from "@/assets/maps/de_overpass.webp"
import rankedArt from "@/assets/home/mode-ranked.webp"
import proArt from "@/assets/home/mode-pro.webp"
import eventsArt from "@/assets/home/mode-events.webp"

const SLIDE_MS = 7000

interface Slide {
  id: string
  kicker: string
  /** The headline in two lines; `accent` is the word shown in the brand colour. */
  lines: [string, string]
  accent: string
  body: string
  cta: { label: string; page: PageId }
  more?: { label: string; page: PageId }
  bg: string
  /** Key art (an agent) or, for the slides without one, a large line icon. */
  art: { image: string } | { icon: ComponentType<{ className?: string }> }
}

const SLIDES: Slide[] = [
  { id: "ranked", kicker: "Ranked 5v5", lines: ["Play ranked.", "Climb to Legacy."], accent: "Legacy.", body: "Every match on our servers counts toward your rank.", cta: { label: "Play now", page: "play-5vs5" }, more: { label: "See the ladder", page: "leaders" }, bg: mirage, art: { image: rankedArt } },
  { id: "skins", kicker: "Skinchanger", lines: ["Your skins.", "On our servers."], accent: "skins.", body: "Pick weapons, knives and gloves on the site, then type !rs in game.", cta: { label: "Open Skinchanger", page: "skinchanger" }, bg: inferno, art: { icon: KnifeIcon } },
  { id: "shop", kicker: "Shop", lines: ["Make it", "yours."], accent: "yours.", body: "Frames, name looks, smoke and grenade trails, in the colours you choose.", cta: { label: "Open the Shop", page: "shop" }, bg: ancient, art: { icon: Gem } },
  { id: "clans", kicker: "Clans", lines: ["Bring your", "clan."], accent: "clan.", body: "Level up together, fight Clan Wars and keep a bank for your members.", cta: { label: "Find a clan", page: "clan" }, bg: dust2, art: { image: proArt } },
  { id: "events", kicker: "Tournaments", lines: ["Compete in", "events."], accent: "events.", body: "5v5 tournaments on LEGACY-X servers.", cta: { label: "See events", page: "play-tournaments" }, bg: nuke, art: { image: eventsArt } },
  { id: "fair", kicker: "Fair play", lines: ["Play", "fair."], accent: "fair.", body: "Penalties are public and can be appealed. A player check always needs your consent.", cta: { label: "See penalties", page: "penalties" }, bg: overpass, art: { icon: ShieldCheck } },
]

interface HomeHeroSliderProps {
  onNavigate: (page: PageId) => void
  stats: Array<{ label: string; value: number | undefined; flagship: boolean }>
  statsLoading: boolean
  /** The tournament line of the Tournaments slide (state or next start), null while unknown. */
  tournamentText: string | null
  /** "N playing now" for the ranked slide, null while unknown. */
  rankedText: string | null
}

export function HomeHeroSlider({ onNavigate, stats, statsLoading, tournamentText, rankedText }: HomeHeroSliderProps) {
  const [index, setIndex] = useState(0)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [still, setStill] = useState(false)
  const swipe = useRef<{ x: number; y: number } | null>(null)
  const count = SLIDES.length

  const go = useCallback((next: number) => setIndex(((next % count) + count) % count), [count])

  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden)
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)")
    const onMotion = () => setStill(motion.matches)
    onVisibility()
    onMotion()
    document.addEventListener("visibilitychange", onVisibility)
    motion.addEventListener("change", onMotion)
    return () => { document.removeEventListener("visibilitychange", onVisibility); motion.removeEventListener("change", onMotion) }
  }, [])

  const paused = hovered || focused || hidden
  const status = (id: string): { text: string; live: boolean } | null => {
    if (id === "ranked" && rankedText) return { text: rankedText, live: true }
    if (id === "events" && tournamentText) return { text: tournamentText, live: false }
    return null
  }

  const onPointerDown = (event: ReactPointerEvent) => {
    swipe.current = (event.target as HTMLElement).closest("a,button") ? null : { x: event.clientX, y: event.clientY }
  }
  const onPointerUp = (event: ReactPointerEvent) => {
    const start = swipe.current
    swipe.current = null
    if (!start) return
    const dx = event.clientX - start.x
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(event.clientY - start.y) * 1.5) go(index + (dx < 0 ? 1 : -1))
  }

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Highlights"
      data-paused={paused}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false) }}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") { event.preventDefault(); go(index + 1) }
        else if (event.key === "ArrowLeft") { event.preventDefault(); go(index - 1) }
      }}
      className="lx-glass lx-slider relative overflow-hidden rounded-xl"
    >
      <h1 className="sr-only">LEGACY-X, the Mongolian CS2 community</h1>
      <div aria-hidden="true" className="lx-hero-glow pointer-events-none absolute -inset-10" />
      <div aria-hidden="true" className="lx-hero-grid pointer-events-none absolute inset-0" />

      <div className="relative h-[430px] touch-pan-y @2xl:h-[380px]" onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={() => { swipe.current = null }}>
        {SLIDES.map((slide, i) => {
          const state = i === index ? "active" : i === (index - 1 + count) % count ? "before" : "after"
          const line = status(slide.id)
          const Icon = "icon" in slide.art ? slide.art.icon : null
          return (
            <div
              key={slide.id}
              data-state={state}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}`}
              aria-hidden={state !== "active"}
              inert={state !== "active"}
              className="lx-slide absolute inset-0 overflow-hidden"
            >
              <img src={slide.bg} alt="" aria-hidden="true" decoding="async" className="lx-slide-bg pointer-events-none absolute inset-0 h-full w-full object-cover opacity-30" />
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[var(--card-surface)] via-[var(--card-surface)]/70 to-transparent" />
              <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[var(--card-surface)]/80 to-transparent" />

              <div className="lx-slide-art pointer-events-none absolute inset-y-0 right-0 flex w-[46%] items-end justify-center max-md:w-[58%] max-md:opacity-40">
                {Icon ? (
                  <span className="mb-10 grid size-[240px] place-items-center rounded-full border border-[var(--line)] bg-[var(--card-surface)]/60 text-[var(--text-2)] max-md:size-[170px]">
                    <Icon className="size-[46%]" />
                  </span>
                ) : "image" in slide.art ? (
                  <img src={slide.art.image} alt="" aria-hidden="true" decoding="async" className="h-[108%] w-auto max-w-none object-contain object-bottom" />
                ) : null}
              </div>

              <div className="lx-slide-text relative z-10 flex h-full max-w-[640px] flex-col justify-center gap-4 p-8 @2xl:p-12">
                <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--card-surface)]/70 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                  <span className="size-1.5 rounded-full bg-[var(--brand-bright)]" />
                  {slide.kicker}
                </span>
                <h2 className="text-[32px] font-bold leading-[1.05] tracking-normal text-[var(--text)] min-[420px]:text-4xl md:text-5xl min-[1440px]:text-6xl">
                  {slide.lines.map((text) => (
                    <span key={text} className="block">
                      {text.includes(slide.accent) ? <>{text.slice(0, text.indexOf(slide.accent))}<span className="lx-brand-text">{slide.accent}</span></> : text}
                    </span>
                  ))}
                </h2>
                <p className="max-w-md text-[15px] leading-relaxed text-[var(--text-2)]">{slide.body}</p>
                {line && (
                  <span className="flex items-center gap-1.5 text-[13px] text-[var(--text-muted)]">
                    {line.live && <span className="lx-live-dot size-1.5 rounded-full bg-[var(--status-green)]" />}
                    {line.text}
                  </span>
                )}
                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <button type="button" onClick={() => onNavigate(slide.cta.page)} className="lx-primary-button inline-flex h-11 items-center gap-2 rounded-lg px-5 text-[13px] font-semibold">
                    {slide.id === "ranked" && <Play className="size-3.5 fill-current" aria-hidden="true" />}
                    {slide.id === "clans" && <Users className="size-4" aria-hidden="true" />}
                    {slide.id === "events" && <Trophy className="size-4" aria-hidden="true" />}
                    {slide.cta.label}
                  </button>
                  {slide.more && <button type="button" onClick={() => onNavigate(slide.more!.page)} className="inline-flex h-11 items-center rounded-lg border border-[var(--line)] px-4 text-[13px] font-medium text-[var(--text-2)] transition-colors hover:border-[var(--line-strong)] hover:bg-[var(--raised)]">{slide.more.label}</button>}
                </div>
              </div>
            </div>
          )
        })}

        <button type="button" onClick={() => go(index - 1)} aria-label="Previous slide" className="lx-slider-arrow absolute left-3 top-1/2 z-20 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-[var(--line)] bg-[var(--card-surface)]/80 text-[var(--text-2)] transition-colors hover:bg-[var(--raised)] max-md:hidden"><ChevronLeft className="size-5" aria-hidden="true" /></button>
        <button type="button" onClick={() => go(index + 1)} aria-label="Next slide" className="lx-slider-arrow absolute right-3 top-1/2 z-20 grid size-10 -translate-y-1/2 place-items-center rounded-full border border-[var(--line)] bg-[var(--card-surface)]/80 text-[var(--text-2)] transition-colors hover:bg-[var(--raised)] max-md:hidden"><ChevronRight className="size-5" aria-hidden="true" /></button>
      </div>

      <div className="relative z-10 flex flex-col gap-4 border-t border-[var(--line-soft)] px-6 pb-4 pt-4 @2xl:px-10 @3xl:flex-row @3xl:items-center @3xl:justify-between">
        <dl className="grid grid-cols-3 @3xl:flex">
          {stats.map((stat, n) => (
            <div key={stat.label} className={cn("flex min-w-0 flex-col-reverse justify-end gap-1.5 pr-2 @sm:pr-5 @3xl:pr-8", n > 0 && "border-l border-[var(--line)] pl-3 @sm:pl-5 @3xl:pl-8")}>
              <dt className="flex items-center gap-1.5 text-[10px] font-medium uppercase leading-tight tracking-wide text-[var(--text-muted)] @sm:whitespace-nowrap @sm:text-[11px]">
                {stat.flagship && Boolean(stat.value) && <span className="lx-live-dot size-1.5 shrink-0 rounded-full bg-[var(--status-green)]" />}
                {stat.label}
              </dt>
              <dd className={cn("text-xl font-semibold leading-none @2xl:text-[28px]", stat.flagship ? "text-[var(--brand-bright)]" : "text-[var(--text)]")}>
                {statsLoading && stat.value === undefined ? <Skeleton className="h-5 w-10 @2xl:h-7 @2xl:w-12" /> : <AnimatedNumber value={stat.value} />}
              </dd>
            </div>
          ))}
        </dl>
        <div role="tablist" aria-label="Choose a slide" className="flex items-center gap-2 @3xl:w-[340px]">
          {SLIDES.map((slide, i) => (
            <button key={slide.id} type="button" role="tab" aria-selected={i === index} aria-label={`${slide.kicker}, slide ${i + 1}`} onClick={() => go(i)} className="group relative flex h-6 flex-1 items-center">
              <span className="relative block h-[3px] w-full overflow-hidden rounded-full bg-[var(--line)] transition-colors group-hover:bg-[var(--line-strong)]">
                {i < index || (i === index && still) ? (
                  <span className="absolute inset-0 rounded-full bg-[var(--accent-solid)]" />
                ) : i === index ? (
                  <span key={`${index}-${still}`} className="lx-slide-progress absolute inset-0 origin-left rounded-full bg-[var(--accent-solid)]" style={{ animationDuration: `${SLIDE_MS}ms` }} onAnimationEnd={() => go(index + 1)} />
                ) : null}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
