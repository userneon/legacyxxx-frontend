import { useEffect, useRef, useState } from "react"
import { ArrowUpRight, Check, Crown, HandHeart } from "lucide-react"
import { toast } from "sonner"

import "./owner-panel.css"
import { profileOverviewService, type ProfileOverview } from "@/api/profile-overview"
import { AnimatedNumber } from "@/components/animated-number"
import { useAuth } from "@/hooks/use-auth"
import { describeLink } from "@/lib/profile-links"
import { cn } from "@/lib/utils"

/** Eight sparks fly out of the button when respect is given. */
const SPARKS = Array.from({ length: 8 }, (_, index) => ({ angle: index * 45 + 22, delay: (index % 3) * 30 }))

/**
 * What the Owner's profile shows under the header: the Respect count with a button to give one, and the Owner's links
 * (Instagram, Facebook, Discord and any other site). Each part appears only when the API sends it.
 */
export function OwnerPanel({ overview }: { overview: ProfileOverview }) {
  const { isAuthenticated, loginWithSteam } = useAuth()
  const [respect, setRespect] = useState(overview.respect ?? null)
  const [busy, setBusy] = useState(false)
  const [burst, setBurst] = useState(0)
  const [pop, setPop] = useState(0)
  const first = useRef(true)
  useEffect(() => setRespect(overview.respect ?? null), [overview.respect])
  // The count pops each time it changes, but not on the first paint.
  useEffect(() => {
    if (first.current) { first.current = false; return }
    setPop((value) => value + 1)
  }, [respect?.count])

  const links = (overview.links ?? []).flatMap((link) => {
    const described = describeLink(link)
    return described ? [described] : []
  })
  if (!respect && links.length === 0) return null

  const ownProfile = overview.viewer.isOwner
  const toggle = async () => {
    if (!respect || busy) return
    if (!isAuthenticated) { loginWithSteam(); return }
    const wanted = !respect.given
    const before = respect
    if (wanted) setBurst((value) => value + 1)
    setRespect({ given: wanted, count: Math.max(0, respect.count + (wanted ? 1 : -1)) })
    setBusy(true)
    try {
      setRespect(await profileOverviewService.setRespect(overview.user.id, wanted))
    } catch {
      setRespect(before)
      toast.error("Could not save your respect", { description: "Try again in a moment." })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section aria-label={`${overview.user.username}'s respect and links`} className="lx-swap-in relative mx-auto w-full max-w-3xl overflow-hidden rounded-2xl border border-[var(--glass-line)] bg-[var(--glass-fill)] shadow-[var(--glass-highlight)]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--line-strong)] to-transparent" />
      {respect && (
        <div className="relative flex flex-col items-center gap-4 px-6 pb-8 pt-9 text-center">
          <div aria-hidden="true" className="lx-op-glow" />
          <span className="relative inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-dim)]">
            <Crown className="size-3.5" aria-hidden="true" />
            Owner of LEGACY-X
          </span>
          <span className="relative flex items-end justify-center gap-2.5">
            <span key={pop} className={cn("text-[64px] font-black leading-none text-[var(--text)] [text-shadow:0_0_48px_color-mix(in_oklab,var(--brand)_40%,transparent)] max-sm:text-[52px]", pop > 0 && "lx-op-pop")}>
              <AnimatedNumber value={respect.count} durationMs={800} />
            </span>
            <span className="pb-2 text-sm font-medium text-[var(--text-dim)]">{respect.count === 1 ? "respect" : "respects"}</span>
          </span>
          {ownProfile ? (
            <span className="relative text-[13px] text-[var(--text-dim)]">Players give you respect from your profile.</span>
          ) : (
            <span className="relative">
              <button
                type="button"
                onClick={() => void toggle()}
                aria-pressed={respect.given}
                disabled={busy}
                title={isAuthenticated ? undefined : "Sign in with Steam to give respect"}
                className={cn(
                  "relative inline-flex h-11 items-center gap-2 rounded-xl px-6 text-sm font-semibold transition-[background-color,border-color,transform] duration-150 active:scale-[0.96] disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60",
                  respect.given ? "border border-[var(--line-strong)] bg-[var(--raised)] text-[var(--text)] hover:border-[var(--text-faint)]" : "lx-primary-button",
                )}
              >
                {respect.given ? <Check className="size-4" /> : <HandHeart className="size-[18px]" />}
                {respect.given ? "Respect given" : "Give respect"}
              </button>
              {burst > 0 && (
                <span key={burst} aria-hidden="true" className="pointer-events-none absolute inset-0">
                  <span className="lx-op-ring" />
                  {SPARKS.map((spark) => <span key={spark.angle} className="lx-op-spark" style={{ "--a": `${spark.angle}deg`, "--delay": `${spark.delay}ms` } as React.CSSProperties} />)}
                </span>
              )}
            </span>
          )}
        </div>
      )}
      {links.length > 0 && (
        <div className={cn("px-5 pb-6 pt-5", respect && "border-t border-[var(--line-soft)]")}>
          <ul className={cn("grid gap-2.5", links.length === 1 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2")}>
            {links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative flex items-center gap-3.5 overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--panel)]/60 p-3 pr-4 text-left transition-[border-color,background-color,translate] duration-200 hover:-translate-y-0.5 hover:border-[var(--line-strong)] hover:bg-[var(--raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60"
                >
                  <span aria-hidden="true" className="absolute inset-y-3 left-0 w-0.5 origin-center scale-y-0 rounded-r-full bg-[var(--text)] opacity-0 transition-[scale,opacity] duration-300 group-hover:scale-y-100 group-hover:opacity-70" />
                  {link.logo ? (
                    <img src={link.logo} alt="" width={40} height={40} className="size-10 shrink-0 rounded-[10px]" />
                  ) : (
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-[var(--raised)] text-[var(--text-muted)] transition-colors group-hover:text-[var(--text)]">
                      <link.Icon className="size-[18px]" aria-hidden="true" />
                    </span>
                  )}
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-sm font-semibold text-[var(--text)]">{link.label}</span>
                    <span className="truncate text-xs text-[var(--text-dim)]">{link.detail}</span>
                  </span>
                  <ArrowUpRight className="size-4 shrink-0 text-[var(--text-faint)] transition-[translate,color] duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[var(--text)]" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
