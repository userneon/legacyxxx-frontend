import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"

interface SteamLoginGateProps {
  /** The page the player was trying to open, so the gate can say what signing in opens. */
  pageName: string
}

/** Shown in place of a page that needs an account: what it is, and the one button that opens it. */
export function SteamLoginGate({ pageName }: SteamLoginGateProps) {
  const { loginWithSteam } = useAuth()

  // No backdrop of its own: the app's Dust II backdrop already shows through the glass panel, the same
  // as on every other page. Only a faint light sits behind the card so it doesn't float in a void.
  return (
    <div className="relative flex min-h-[calc(100dvh-5rem)] flex-1 items-center justify-center overflow-hidden px-4 py-10 sm:px-6">
      {/* Wrapped: the page's section stagger animates direct children to full opacity. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="size-full bg-[radial-gradient(38%_42%_at_50%_48%,rgb(255_255_255/0.06),transparent_70%)]" />
      </div>

      <section className="lx-swap-in relative w-full max-w-[380px] rounded-xl border border-[var(--glass-line)] bg-[rgb(255_255_255/0.06)] p-7 text-center shadow-[inset_0_1px_0_rgb(255_255_255/0.08),0_24px_48px_-20px_rgb(0_0_0/0.7)] sm:p-8">
        <img src="/logolegacyx.webp" alt="" aria-hidden="true" className="mx-auto mb-4 size-10" />
        <h1 className="text-xl font-semibold tracking-[-0.3px] text-[var(--text)]">Sign in to open {pageName}</h1>
        <p className="mx-auto mt-2 max-w-[300px] text-[13px] leading-[1.55] text-[var(--text-muted)]">
          Your LEGACY-X account is your Steam account.
        </p>
        <SteamLoginButton onClick={loginWithSteam} className="mt-6 h-11 w-full text-[15px]" />
        <p className="mt-4 text-[11px] leading-4 text-[var(--text-dim)]">Steam handles the password. LEGACY-X never sees it.</p>
      </section>
    </div>
  )
}

/** Sign-in button in Steam's own dark style with the Steam mark, matching the top bar. */
export function SteamLoginButton({ onClick, className, label = "Sign in with Steam" }: { onClick: () => void; className?: string; label?: string }) {
  return (
    <Button type="button" onClick={onClick} className={cn("lx-steam-button h-10 min-w-[176px] gap-2 rounded-lg px-4 text-sm font-semibold focus-visible:ring-2 focus-visible:ring-[var(--brand-bright)]/60", className)}>
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
