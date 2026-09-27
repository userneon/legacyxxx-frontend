import { Lock, Paintbrush, ShieldCheck, Swords, Trophy } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { cs2MapArtwork } from "@/lib/cs2-map-art"
import { cn } from "@/lib/utils"

interface SteamLoginGateProps {
  /** The page the player was trying to open, so the gate can say what signing in opens. */
  pageName: string
}

/** What one Steam sign-in opens across the site. */
const PERKS = [
  { icon: Trophy, title: "Rank & stats", text: "Your EXP, rank and match history" },
  { icon: Paintbrush, title: "Skinchanger", text: "Your loadout on every server" },
  { icon: Swords, title: "Pro League & events", text: "Ranked queues and tournaments" },
]

export function SteamLoginGate({ pageName }: SteamLoginGateProps) {
  const { loginWithSteam } = useAuth()
  const art = cs2MapArtwork("de_dust2")

  return (
    <div className="relative flex min-h-[calc(100dvh-5rem)] flex-1 items-center justify-center overflow-hidden px-4 py-10 sm:px-6">
      {/* Backdrop: slow-drifting map art under the crimson glow and grid, like the page heroes. */}
      {art && (
        <div aria-hidden="true" className="lx-map-drift pointer-events-none absolute inset-0">
          <img src={art} alt="" className="lx-map-img size-full object-cover opacity-[0.14]" />
        </div>
      )}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_45%,transparent,var(--panel)_85%)]" />
      <div aria-hidden="true" className="lx-hero-glow pointer-events-none absolute -inset-10 opacity-80" />
      <div aria-hidden="true" className="lx-hero-grid pointer-events-none absolute inset-0" />

      <section className="lx-swap-in relative w-full max-w-[460px] overflow-hidden rounded-2xl border border-[var(--brand)]/30 bg-[var(--card-surface)]/85 p-7 text-center shadow-[0_30px_80px_-30px_var(--brand)] backdrop-blur-xl sm:p-9">
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--brand-bright)] to-transparent" />

        {/* Lock inside a slowly turning crimson ring. */}
        <span className="relative mx-auto flex size-16 items-center justify-center">
          <span aria-hidden="true" className="lx-gate-ring absolute inset-0 rounded-[20px]" />
          <span className="relative flex size-[58px] items-center justify-center rounded-[17px] bg-[var(--card-surface)] text-[var(--brand-bright)] shadow-[inset_0_0_20px_-6px_var(--brand)]">
            <Lock className="size-6" />
          </span>
        </span>

        <h1 className="mt-6 text-xl font-bold tracking-[-0.3px] text-[var(--text)]">
          Sign in to open <span className="lx-brand-text">{pageName}</span>
        </h1>
        <p className="mx-auto mt-2 max-w-xs text-[13px] leading-[1.55] text-[var(--text-muted)]">
          Your Legacy-X account is your Steam account. One click, no password here.
        </p>

        <SteamLoginButton onClick={loginWithSteam} className="mt-6 h-11 w-full text-[15px]" />

        <ul className="mt-7 grid gap-2 text-left sm:grid-cols-3">
          {PERKS.map((perk, index) => (
            <li
              key={perk.title}
              style={{ animationDelay: `${180 + index * 70}ms` }}
              className="lx-swap-in flex items-center gap-3 rounded-xl border border-[var(--line-soft)] bg-[var(--panel)]/70 p-3 sm:flex-col sm:items-start sm:gap-2"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--brand)]/15 text-[var(--brand-bright)] ring-1 ring-inset ring-[var(--brand)]/30">
                <perk.icon className="size-4" />
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-xs font-semibold text-[var(--text)]">{perk.title}</span>
                <span className="text-[11px] leading-[1.4] text-[var(--text-dim)]">{perk.text}</span>
              </span>
            </li>
          ))}
        </ul>

        <p className="mt-6 flex items-center justify-center gap-1.5 text-[11px] leading-4 text-[var(--text-dim)]">
          <ShieldCheck className="size-3.5 shrink-0 text-[var(--status-green)]" />
          Steam handles the sign-in. LEGACY-X never sees your password.
        </p>
      </section>
    </div>
  )
}

/** Primary (crimson) sign-in button with the Steam mark, matching the top bar — never Steam blue. */
export function SteamLoginButton({ onClick, className, label = "Sign in with Steam" }: { onClick: () => void; className?: string; label?: string }) {
  return (
    <Button type="button" onClick={onClick} className={cn("lx-brand-button h-10 min-w-[176px] gap-2 rounded-lg px-4 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-[var(--brand-bright)]/60", className)}>
      <SteamIcon className="size-[18px] shrink-0" />
      {label}
    </Button>
  )
}

export function SteamIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 0C5.4 0 .1 5.3 0 11.8l6.4 2.6c.5-.7 1.4-1.1 2.3-1.1h.2l2.8-4.1v-.1c0-2.5 2-4.6 4.6-4.6 2.5 0 4.6 2 4.6 4.6 0 2.5-2 4.6-4.6 4.6h-.1l-4 2.9v.1c0 1.7-1.4 3.1-3.1 3.1-1.5 0-2.7-1-3-2.4L.3 15.3C1.8 20.3 6.5 24 12 24c6.6 0 12-5.4 12-12S18.6 0 12 0zm-4.5 18.4l-1.5-.6c.3.6.7 1 1.4 1.3 1.4.6 3-.1 3.6-1.5.3-.7.3-1.4 0-2.1-.3-.7-.8-1.2-1.5-1.5-.7-.3-1.4-.3-2 0l1.5.6c1 .4 1.5 1.6 1.1 2.6-.4 1-1.6 1.5-2.6 1.1zm9.9-7.2c0-1.7-1.4-3.1-3.1-3.1-1.7 0-3.1 1.4-3.1 3.1 0 1.7 1.4 3.1 3.1 3.1 1.7 0 3.1-1.4 3.1-3.1zm-5.5 0c0-1.3 1.1-2.4 2.4-2.4 1.3 0 2.4 1.1 2.4 2.4 0 1.3-1.1 2.4-2.4 2.4-1.3 0-2.4-1.1-2.4-2.4z" />
    </svg>
  )
}
