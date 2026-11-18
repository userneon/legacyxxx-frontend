import { Button } from "@/components/ui/button"
import { SiteLogo } from "@/components/site-logo"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"
import { ArrowLeft, Check, Lock } from "lucide-react"
import { useNavigate } from "react-router-dom"

interface SteamLoginGateProps {
  /** The page the player was trying to open, so the gate can say what signing in opens. */
  pageName: string
}

/** Shown in place of a page that needs an account: what it is, what signing in gives, and the one button that opens it. */
export function SteamLoginGate({ pageName }: SteamLoginGateProps) {
  const { loginWithSteam } = useAuth()
  const navigate = useNavigate()
  // A plain, calm sign-in (owner 2026-11-18: "make the Steam login professional"): one centred panel on the site's own background, the button, three lines on what the account gives, and the privacy note.
  return (
    <div data-lx-gate="" className="relative flex min-h-[calc(100dvh-5rem)] flex-1 items-center justify-center px-4 py-12">
      <section aria-labelledby="lx-gate-title" className="lx-swap-in relative z-10 w-full max-w-[440px] rounded-[24px] border border-white/10 bg-[rgb(12_12_14/0.72)] p-8 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)] backdrop-blur-md max-sm:p-6">
        <SiteLogo className="mb-7 h-9 w-auto" />
        <h1 id="lx-gate-title" className="text-[26px] font-bold leading-[1.15] tracking-[-0.02em] text-[var(--text)]">Sign in to open {pageName}</h1>
        <p className="mt-2.5 text-[14px] leading-relaxed text-[var(--text-muted)]">Your LXC account is your Steam account. No new password to make.</p>
        <SteamLoginButton onClick={loginWithSteam} className="mt-6 h-12 w-full rounded-xl text-[15px]" />
        <ul className="mt-7 flex flex-col gap-3 border-t border-white/10 pt-6 text-[13px] text-[var(--text-2)]">
          {PERKS.map(({ title, line }) => (
            <li key={title} className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border border-white/20 bg-white/[0.05] text-[var(--text-dim)]"><Check className="size-3.5" strokeWidth={3} /></span>
              <span className="min-w-0"><span className="block font-semibold text-[var(--text)]">{title}</span><span className="block text-[var(--text-dim)]">{line}</span></span>
            </li>
          ))}
        </ul>
        <p className="mt-6 flex items-center gap-2 text-[12px] leading-4 text-[var(--text-dim)]"><Lock className="size-3.5 shrink-0" aria-hidden="true" />Steam handles the password. LXC never sees it.</p>
        <button type="button" onClick={() => navigate("/")} className="mt-5 inline-flex items-center gap-1.5 text-[13px] text-[var(--text-dim)] transition-colors hover:text-[var(--text)]"><ArrowLeft className="size-3.5" aria-hidden="true" />Back to Home</button>
      </section>
    </div>
  )
}

const PERKS: Array<{ title: string; line: string }> = [
  { title: "Your rank and stats", line: "EXP, matches and the ladder, kept for you." },
  { title: "Shop and skins", line: "Skins, ranks and looks on your account." },
  { title: "Clans and friends", line: "Join a clan or start your own." },
]

/** Sign-in button in Steam's own dark style with the Steam mark, matching the top bar. */
export function SteamLoginButton({ onClick, className, label = "Sign in with Steam" }: { onClick: () => void; className?: string; label?: string }) {
  return (
    <Button type="button" onClick={onClick} className={cn("lx-steam-button h-9 min-w-[168px] gap-2 rounded-lg px-4 text-[13px] font-semibold focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/50", className)}>
      <SteamIcon className="size-4 shrink-0" />
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
