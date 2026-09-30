import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"
import fbiAgents from "@/assets/fbi-agents.webp"

interface SteamLoginGateProps {
  /** The page the player was trying to open, so the gate can say what signing in opens. */
  pageName: string
}

/** Shown in place of a page that needs an account: what it is, and the one button that opens it. */
export function SteamLoginGate({ pageName }: SteamLoginGateProps) {
  const { loginWithSteam } = useAuth()

  // No backdrop of its own: the app's Dust II backdrop already shows through the glass panel, the same
  // as on every other page. The FBI squad (owner-supplied art, cropped to the upper body) sits inside
  // the card, faint, rising from its bottom edge and fading out towards the top so the text stays readable.
  // Scaled so the two outer agents' bodies (x 94-549 of the 609px art) meet the card's side edges.
  return (
    <div className="relative flex min-h-[calc(100dvh-5rem)] flex-1 items-center justify-center overflow-hidden px-4 py-10 sm:px-6">
      {/* Wrapped: the page's section stagger animates direct children to full opacity. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="size-full bg-[radial-gradient(50%_48%_at_50%_50%,rgb(255_255_255/0.06),transparent_70%)]" />
      </div>

      <section className="lx-swap-in relative w-full max-w-[380px] overflow-hidden rounded-xl border border-[var(--glass-line)] bg-[rgb(255_255_255/0.06)] p-7 text-center shadow-[inset_0_1px_0_rgb(255_255_255/0.08),0_24px_48px_-20px_rgb(0_0_0/0.7)] sm:p-8">
        <img
          src={fbiAgents}
          alt=""
          aria-hidden="true"
          draggable={false}
          className="pointer-events-none absolute bottom-0 left-[-20.6%] w-[133.8%] max-w-none opacity-[0.22] [mask-image:linear-gradient(to_top,black_45%,transparent_100%)]"
        />
        <div className="relative">
        <img src="/logolegacyx.webp" alt="" aria-hidden="true" className="mx-auto mb-4 size-10" />
        <h1 className="text-xl font-semibold tracking-[-0.3px] text-[var(--text)]">Sign in to open {pageName}</h1>
        <p className="mx-auto mt-2 max-w-[300px] text-[13px] leading-[1.55] text-[var(--text-muted)]">
          Your LEGACY-X account is your Steam account.
        </p>
        <SteamLoginButton onClick={loginWithSteam} className="mt-6 h-11 w-full text-[15px]" />
        <p className="mt-4 text-[11px] leading-4 text-[var(--text-dim)]">Steam handles the password. LEGACY-X never sees it.</p>
        </div>
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

/** The Steam mark (Simple Icons, CC0). */
export function SteamIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0zM7.54 18.21l-1.473-.61c.262.543.714.999 1.314 1.25 1.297.539 2.793-.076 3.332-1.375.263-.63.264-1.319.005-1.949s-.75-1.121-1.377-1.383c-.624-.26-1.29-.249-1.878-.03l1.523.63c.956.4 1.409 1.5 1.009 2.455-.397.957-1.497 1.41-2.454 1.012H7.54zm11.415-9.303c0-1.662-1.353-3.015-3.015-3.015-1.665 0-3.015 1.353-3.015 3.015 0 1.665 1.35 3.015 3.015 3.015 1.663 0 3.015-1.35 3.015-3.015zm-5.273-.005c0-1.252 1.013-2.266 2.265-2.266 1.249 0 2.266 1.014 2.266 2.266 0 1.251-1.017 2.265-2.266 2.265-1.253 0-2.265-1.014-2.265-2.265z" />
    </svg>
  )
}
