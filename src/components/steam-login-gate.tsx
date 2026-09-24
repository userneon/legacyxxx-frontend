import { Lock } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"

/** Shown instead of a page that needs a Steam session. */
export function SteamLoginGate({ pageName, description }: { pageName: string; description?: string }) {
  const { loginWithSteam } = useAuth()
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <section className="flex w-full max-w-sm flex-col items-center gap-4 rounded-xl border border-line-soft bg-card px-6 py-8 text-center animate-fade-in">
        <span className="flex size-11 items-center justify-center rounded-xl border border-line bg-raised text-text-muted">
          <Lock className="size-5" aria-hidden />
        </span>
        <div className="flex flex-col gap-1">
          <h1 className="m-0 text-[17px] font-semibold text-text">Sign in to open {pageName}</h1>
          <p className="m-0 text-[13px] text-text-muted">{description ?? "Steam handles the sign-in; Legacy-X never sees your password."}</p>
        </div>
        <SteamLoginButton onClick={loginWithSteam} />
      </section>
    </div>
  )
}

/** "Sign in with Steam" with the real Steam logo. */
export function SteamLoginButton({ onClick, className, label = "Sign in with Steam", size = "lg" }: { onClick: () => void; className?: string; label?: string; size?: "sm" | "lg" }) {
  return (
    <Button type="button" onClick={onClick} size={size === "lg" ? "lg" : "sm"} className={cn("gap-2.5", className)}>
      <img src="/steam-logo.webp" alt="" width={20} height={20} className={cn("shrink-0 rounded-full", size === "lg" ? "size-5" : "size-4")} />
      {label}
    </Button>
  )
}
