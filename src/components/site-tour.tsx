/**
 * The Tutorial button in the top bar (owner request 2026-10-26) and the tour it starts: a short walk through the site, one step per
 * part of the sidebar and the top bar. A step lights up the real control (found by its label) and says in a line or two what it is for;
 * a control that is not on this screen (signed out, a hidden feature, a phone where the sidebar is a sheet) is skipped, or on a phone
 * described in the middle of the screen. Plain text only: nothing here is a number from the API.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { ChevronLeft, ChevronRight, CircleHelp, X } from "lucide-react"

import { cn } from "@/lib/utils"

interface Step {
  /** CSS selector of the control to light up; none for a step told in the middle of the screen. */
  target?: string
  title: string
  body: string
  /** The sidebar is a sheet on a phone: its steps are then told in the middle instead of being skipped. */
  sidebar?: boolean
}

const STEPS: Step[] = [
  { title: "Welcome to LEGACY-X", body: "A short tour of the site: where to play, change your skins, spend LX and find people. Use the arrow keys or the buttons, and Esc to stop at any time." },
  { target: 'nav button[aria-label="Home"]', sidebar: true, title: "Home", body: "Who is online right now, the best players, and the game modes with a Play now button." },
  { target: 'nav button[aria-label="Play"]', sidebar: true, title: "Play", body: "Pick a mode (5x5, Fun, Pro League, Tournaments), see its servers live and press Connect or Quick play. Pro League needs a sign-in and a high enough rank." },
  { target: 'nav button[aria-label="Skinchanger"]', sidebar: true, title: "Skinchanger", body: "Choose your weapon skins, knives and gloves on the site. In game, type !rs to load the change." },
  { target: 'nav button[aria-label="Compare"]', sidebar: true, title: "Compare", body: "Put two players, or two clans, side by side and see who is ahead on each stat." },
  { target: 'nav button[aria-label="Shop"]', sidebar: true, title: "Shop", body: "Spend LX on frames, name looks, smoke, grenade trails and clan looks. You pick the colours yourself, and everything you own is worn from your profile." },
  { target: 'nav button[aria-label="Leaders"]', sidebar: true, title: "Leaders", body: "The ladders: top players, clans and Discord boosters." },
  { target: 'nav button[aria-label="Community"]', sidebar: true, title: "Community", body: "Clans to join or start, the staff team, and the content creators." },
  { target: 'nav button[aria-label="Penalties"]', sidebar: true, title: "Penalties", body: "Who is banned or muted, and why. If a penalty is yours, you can ask staff to lift it from here." },
  { target: 'nav button[aria-label="Reviews"]', sidebar: true, title: "Reviews", body: "What players say about the community, and a place to write your own." },
  { target: 'nav button[aria-label="Explore"]', sidebar: true, title: "Explore", body: "Search any player by name or Steam ID and open their profile." },
  { target: 'header [aria-label^="Wallet"]', title: "Your wallet", body: "Your LX. You earn it by playing ranked matches and spend it in the Shop; tap it to see where it came from or to top up." },
  { target: 'header [aria-label^="Notifications"]', title: "Notifications", body: "Penalties, clan news and messages from staff land here. Tap one to open what it is about." },
  { target: 'button[aria-label="Open the community chat"]', title: "Community chat", body: "Everyone can read the chat. Sign in to write." },
  { title: "That is the tour", body: "You can start it again from the Tutorial button in the top bar whenever you like." },
]

const PAD = 6
const CARD_WIDTH = 330

/** The element a step lights up, when it is on screen. */
function findTarget(step: Step): HTMLElement | null {
  if (!step.target) return null
  const element = document.querySelector<HTMLElement>(step.target)
  if (!element) return null
  const box = element.getBoundingClientRect()
  return box.width > 0 && box.height > 0 ? element : null
}

/** Whether a step can be told here: it has no target, its target is on screen, or it is a sidebar step on a phone. */
function usable(step: Step): boolean {
  return !step.target || findTarget(step) !== null || Boolean(step.sidebar && window.innerWidth < 560)
}

export function SiteTourButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Tutorial"
        className="inline-flex h-9 shrink-0 items-center gap-2 rounded-[10px] border border-[var(--line)] px-3 text-[13px] font-semibold text-[var(--text-2)] transition-colors hover:border-[var(--line-strong)] hover:bg-[var(--raised)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]"
      >
        <CircleHelp className="size-4" aria-hidden="true" />
        <span className="max-sm:hidden">Tutorial</span>
      </button>
      {open && <SiteTour onClose={() => setOpen(false)} />}
    </>
  )
}

function SiteTour({ onClose }: { onClose: () => void }) {
  const [index, setIndex] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [, setTick] = useState(0)
  const nextRef = useRef<HTMLButtonElement>(null)
  const step = STEPS[index]
  const last = index === STEPS.length - 1

  const go = useCallback((direction: 1 | -1) => {
    setIndex((current) => {
      let next = current + direction
      while (next >= 0 && next < STEPS.length && !usable(STEPS[next])) next += direction
      return next < 0 || next >= STEPS.length ? current : next
    })
  }, [])

  // Light up the control of this step (and bring it into view); follow it when the window changes.
  useLayoutEffect(() => {
    const element = findTarget(step)
    element?.scrollIntoView({ block: "nearest", inline: "nearest" })
    const measure = () => setRect(findTarget(step)?.getBoundingClientRect() ?? null)
    measure()
    const redraw = () => { measure(); setTick((value) => value + 1) }
    window.addEventListener("resize", redraw)
    window.addEventListener("scroll", redraw, true)
    return () => { window.removeEventListener("resize", redraw); window.removeEventListener("scroll", redraw, true) }
  }, [step])

  useEffect(() => {
    nextRef.current?.focus()
  }, [index])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onClose() }
      else if (event.key === "ArrowRight") { event.preventDefault(); if (last) onClose(); else go(1) }
      else if (event.key === "ArrowLeft") { event.preventDefault(); go(-1) }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [go, last, onClose])

  // The card sits beside the lit control (to its right for the sidebar, under it for the top bar, above it for the chat), kept on screen.
  const height = 190
  const margin = 12
  let left = Math.round((window.innerWidth - CARD_WIDTH) / 2)
  let top = Math.round((window.innerHeight - height) / 2)
  if (rect) {
    const fitsRight = rect.right + PAD + 16 + CARD_WIDTH + margin <= window.innerWidth
    if (rect.left < 300 && fitsRight) {
      left = rect.right + PAD + 16
      top = rect.top + rect.height / 2 - height / 2
    } else if (rect.top > window.innerHeight / 2) {
      left = rect.right - CARD_WIDTH
      top = rect.top - PAD - 16 - height
    } else {
      left = rect.right - CARD_WIDTH
      top = rect.bottom + PAD + 16
    }
    left = Math.min(Math.max(margin, left), window.innerWidth - CARD_WIDTH - margin)
    top = Math.min(Math.max(margin, top), window.innerHeight - height - margin)
  } else {
    left = Math.min(Math.max(margin, left), Math.max(margin, window.innerWidth - CARD_WIDTH - margin))
  }
  const position = STEPS.filter(usable).indexOf(step) + 1
  const total = STEPS.filter(usable).length

  return createPortal(
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label="Site tutorial">
      {/* Clicks outside the card end the tour; the dim layer is the lit control's own shadow, so the control itself stays bright. */}
      <div className="absolute inset-0" onClick={onClose} />
      {rect ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute rounded-[12px] border border-[var(--text-2)] shadow-[0_0_0_9999px_rgba(0,0,0,0.62)] transition-[left,top,width,height] duration-300 motion-reduce:transition-none"
          style={{ left: rect.left - PAD, top: rect.top - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }}
        />
      ) : (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-black/60" />
      )}
      <div
        className={cn("absolute flex flex-col gap-3 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[0_18px_44px_rgba(0,0,0,0.55)] transition-[left,top] duration-300 motion-reduce:transition-none")}
        style={{ left, top, width: Math.min(CARD_WIDTH, window.innerWidth - margin * 2) }}
      >
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-dim)]">{position} / {total}</span>
          <span className="flex-1" />
          <button type="button" onClick={onClose} aria-label="Close the tutorial" className="grid size-7 place-items-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--raised)] hover:text-[var(--text)]"><X className="size-4" aria-hidden="true" /></button>
        </div>
        <div className="flex flex-col gap-1.5">
          <h2 className="text-[15px] font-semibold text-[var(--text)]">{step.title}</h2>
          <p className="text-[13px] leading-relaxed text-[var(--text-muted)]">{step.body}</p>
        </div>
        <div className="flex items-center justify-between gap-2">
          <button type="button" onClick={() => go(-1)} disabled={index === 0} className="inline-flex h-9 items-center gap-1 rounded-lg border border-[var(--line)] px-3 text-[13px] font-medium text-[var(--text-2)] transition-colors enabled:hover:bg-[var(--raised)] disabled:opacity-40"><ChevronLeft className="size-4" aria-hidden="true" />Back</button>
          <button ref={nextRef} type="button" onClick={() => (last ? onClose() : go(1))} className="lx-primary-button inline-flex h-9 items-center gap-1 rounded-lg px-4 text-[13px] font-semibold">{last ? "Done" : "Next"}{!last && <ChevronRight className="size-4" aria-hidden="true" />}</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
