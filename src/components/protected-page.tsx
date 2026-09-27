import type { ReactNode } from "react"

import { useAuth } from "@/hooks/use-auth"
import { SteamLoginGate } from "@/components/steam-login-gate"

interface ProtectedPageProps {
  pageName: string
  children: ReactNode
}

export function ProtectedPage({ pageName, children }: ProtectedPageProps) {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-12">
        <div className="size-7 animate-spin rounded-full border-2 border-[var(--brand)]/20 border-t-[var(--brand-bright)] shadow-[0_0_16px_-4px_var(--brand)]" />
        <span className="text-sm text-[var(--text-muted)]">Loading…</span>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <SteamLoginGate pageName={pageName} />
  }

  return <>{children}</>
}
