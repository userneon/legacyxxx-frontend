import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"

interface SteamLoginGateProps {
  pageName: string
}

export function SteamLoginGate({}: SteamLoginGateProps) {
  const { loginWithSteam } = useAuth()

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center bg-[#0b0b0b] px-4 py-12 sm:px-6">
      <section className="w-full max-w-[780px] text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/55">Steam Required</p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-white">Access denied!</h1>
        <div className="mt-6 flex h-[54px] items-center justify-center rounded-[14px] border border-white/[0.13] bg-black/45 px-5 text-sm font-semibold text-white/90 shadow-2xl shadow-black/40 backdrop-blur-md">
          <span className="max-w-full truncate whitespace-nowrap">Sign in with Steam to unlock this feature and continue with LEGACY-X.</span>
        </div>
        <SteamLoginButton onClick={loginWithSteam} className="mt-6" />
      </section>
    </div>
  )
}

export function SteamLoginButton({ onClick, className, label = "Login with Steam" }: { onClick: () => void; className?: string; label?: string }) {
  return (
    <Button type="button" onClick={onClick} className={cn("h-11 min-w-[176px] gap-2 border border-sky-200/30 bg-[#4a9ce6] px-5 text-white shadow-lg shadow-sky-950/30 hover:bg-[#5aa8ef] focus-visible:ring-sky-200/80", className)}>
      <SteamIcon className="size-5 shrink-0 text-white" />
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
