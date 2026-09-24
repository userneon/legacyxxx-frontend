import { Lock, ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"

interface SteamLoginGateProps {
  /** The page the player was trying to open, so the gate can say what signing in opens. */
  pageName: string
}

export function SteamLoginGate({ pageName }: SteamLoginGateProps) {
  const { loginWithSteam } = useAuth()

  return (
    <div className="flex min-h-[calc(100dvh-3.5rem)] items-center justify-center px-4 py-10 sm:px-6">
      <section className="query-state-in relative w-full max-w-md overflow-hidden rounded-xl border border-[var(--line-soft)] bg-[var(--card-surface)] p-6 text-center sm:p-8">

        <div className="relative">
          <span className="mx-auto flex size-12 items-center justify-center rounded-[14px] border border-[var(--line)] bg-[var(--raised)] text-[var(--text-muted)]">
            <Lock className="size-5" />
          </span>

          <h1 className="mt-5 text-base font-semibold text-[var(--text)]">Sign in to open {pageName}</h1>
          <p className="mx-auto mt-2 max-w-xs text-[13px] leading-[1.5] text-[var(--text-muted)]">
            Your Legacy-X account is your Steam account.
          </p>

          <SteamLoginButton onClick={loginWithSteam} className="mt-6 w-full sm:w-auto" />

          <p className="mt-5 flex items-center justify-center gap-1.5 text-[11px] leading-4 text-[var(--text-dim)]">
            <ShieldCheck className="size-3.5 shrink-0" />
            Steam handles the sign-in. LEGACY-X never sees your password.
          </p>
        </div>
      </section>
    </div>
  )
}

/** Primary (white) sign-in button with the Steam mark — the accent is white, never Steam blue. */
export function SteamLoginButton({ onClick, className, label = "Sign in with Steam" }: { onClick: () => void; className?: string; label?: string }) {
  return (
    <Button type="button" onClick={onClick} className={cn("h-10 min-w-[176px] gap-2 rounded-lg bg-[var(--accent-solid)] px-4 text-sm font-semibold text-[var(--accent-on)] transition-opacity hover:bg-[var(--accent-solid)] hover:opacity-90 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60", className)}>
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
