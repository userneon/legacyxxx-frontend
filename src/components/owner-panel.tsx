import { useEffect, useState } from "react"
import { Check, ExternalLink, HandHeart } from "lucide-react"
import { toast } from "sonner"

import { profileOverviewService, type ProfileOverview } from "@/api/profile-overview"
import { AnimatedNumber } from "@/components/animated-number"
import { useAuth } from "@/hooks/use-auth"
import { describeLink } from "@/lib/profile-links"
import { cn } from "@/lib/utils"

/**
 * What the Owner's profile shows under the header: a Respect button with the number of respects, and the Owner's links
 * (Instagram, Facebook, Discord and any other site). Each part appears only when the API sends it.
 */
export function OwnerPanel({ overview }: { overview: ProfileOverview }) {
  const { isAuthenticated, loginWithSteam } = useAuth()
  const [respect, setRespect] = useState(overview.respect ?? null)
  const [busy, setBusy] = useState(false)
  useEffect(() => setRespect(overview.respect ?? null), [overview.respect])

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
    <section aria-label={`${overview.user.username}'s links and respect`} className="lx-swap-in mx-auto flex w-full max-w-2xl flex-col items-center gap-6 rounded-xl border border-[var(--glass-line)] bg-[var(--glass-fill)] p-7 text-center">
      {respect && (
        <div className="flex flex-col items-center gap-3">
          <span className="flex items-baseline gap-2">
            <span key={respect.count} className="lx-swap-in text-[44px] font-black leading-none text-[var(--text)]"><AnimatedNumber value={respect.count} durationMs={700} /></span>
            <span className="text-sm font-medium text-[var(--text-dim)]">{respect.count === 1 ? "respect" : "respects"}</span>
          </span>
          {ownProfile ? (
            <span className="text-[13px] text-[var(--text-dim)]">Players give you respect from your profile.</span>
          ) : (
            <button
              type="button"
              onClick={() => void toggle()}
              aria-pressed={respect.given}
              disabled={busy}
              title={isAuthenticated ? undefined : "Sign in with Steam to give respect"}
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-lg px-5 text-sm font-semibold transition-[background-color,border-color,transform] duration-150 active:scale-[0.97] disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60",
                respect.given ? "border border-[var(--line-strong)] bg-[var(--raised)] text-[var(--text)] hover:border-[var(--text-faint)]" : "lx-primary-button",
              )}
            >
              {respect.given ? <Check className="size-4" /> : <HandHeart className="size-4" />}
              {respect.given ? "Respect given" : "Give respect"}
            </button>
          )}
        </div>
      )}
      {respect && links.length > 0 && <span aria-hidden="true" className="h-px w-24 bg-[var(--line)]" />}
      {links.length > 0 && (
        <ul className="flex flex-wrap items-center justify-center gap-2">
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--panel)]/70 px-3.5 text-[13px] text-[var(--text)] transition-colors hover:border-[var(--line-strong)] hover:bg-[var(--raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60"
              >
                <link.Icon className="size-4 text-[var(--text-muted)]" aria-hidden="true" />
                {link.label}
                <ExternalLink className="size-3 text-[var(--text-faint)] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
