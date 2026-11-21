import { useEffect, useRef, useState } from "react"
import { SiteLogo } from "@/components/site-logo"
import { useNavigate } from "react-router-dom"

import welcomeArt from "@/assets/home/hero-welcome.webp"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"

const KEY = "lx-welcome"

/**
 * The screen after a successful Steam sign-in (owner request 2026-11-17): the gate stands open, the player is greeted by name, and two buttons lead on.
 * It shows once for each sign-in (the sign-in leaves a mark for this tab) and any key, the buttons or Escape close it.
 */
export function WelcomeAfterLogin() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  // Leaving is not a cut: the page under it is already there, and the screen eases away over it (picture drifts, text lifts, the whole fades).
  const [leaving, setLeaving] = useState(false)
  const timer = useRef<number | null>(null)
  useEffect(() => () => { if (timer.current !== null) window.clearTimeout(timer.current) }, [])
  const leave = (to?: string) => {
    if (leaving) return
    if (to) navigate(to)
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { setOpen(false); return }
    setLeaving(true)
    timer.current = window.setTimeout(() => { setOpen(false); setLeaving(false) }, 650)
  }

  useEffect(() => {
    if (loading || !user) return
    try {
      if (window.sessionStorage.getItem(KEY) === "1") {
        window.sessionStorage.removeItem(KEY)
        setOpen(true)
      }
    } catch { /* no storage: no welcome screen */ }
  }, [loading, user])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") leave() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  if (!open || !user) return null
  const go = (to: string) => leave(to)
  return (
    <div role="dialog" aria-modal="true" aria-label="Welcome" className={cn("fixed inset-0 z-[100] flex items-center overflow-hidden bg-[#060606] transition-opacity duration-[650ms] ease-[cubic-bezier(0.4,0,0.2,1)]", leaving && "pointer-events-none opacity-0")}>
      <img src={welcomeArt} alt="" aria-hidden="true" decoding="async" draggable={false} className={cn("lx-welcome-art pointer-events-none absolute inset-0 size-full object-cover object-[60%_center] transition-transform duration-[650ms] ease-out", leaving && "scale-[1.06]")} />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(6,6,6,0.9)_0%,rgba(6,6,6,0.62)_30%,rgba(6,6,6,0.08)_58%,transparent_100%),linear-gradient(180deg,rgba(6,6,6,0.45),transparent_25%,transparent_75%,rgba(6,6,6,0.6))]" />
      <section className={cn("lx-welcome-text relative w-full max-w-[560px] px-6 py-10 transition-[opacity,translate] duration-500 ease-out sm:px-14", leaving && "-translate-y-4 opacity-0")}>
        <SiteLogo className="mb-8 h-10 w-auto" />
        <span className="flex items-center gap-2.5 text-[12px] font-semibold uppercase tracking-[0.2em] text-[var(--text-dim)]"><span aria-hidden="true" className="size-[7px] rounded-full bg-[var(--status-green)] shadow-[0_0_10px_var(--status-green)]" />Signed in with Steam</span>
        <h1 className="mt-5 text-[clamp(34px,5vw,58px)] font-bold leading-[1.02] tracking-[-0.03em] text-[var(--text)]">Welcome,<br /><span className="text-[var(--text-dim)]">{user.username}.</span></h1>
        <p className="mt-5 max-w-[360px] text-[15px] leading-relaxed text-[var(--text-muted)]">The gate is open. Pick up where you left off.</p>
        <div className="mt-8 flex flex-wrap gap-3.5">
          <button type="button" autoFocus onClick={() => go("/play/5x5")} className="lx-primary-button lx-hover-blue inline-flex h-[50px] items-center rounded-xl px-7 text-[15px] font-bold">Play now</button>
          <button type="button" onClick={() => go("/")} className="inline-flex h-[50px] items-center rounded-xl border border-white/30 px-6 text-[15px] font-semibold text-[var(--text)] transition-colors hover:border-white/70 hover:bg-white/[0.06]">Go to Home</button>
        </div>
      </section>
    </div>
  )
}
