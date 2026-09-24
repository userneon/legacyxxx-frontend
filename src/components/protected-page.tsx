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
      <div className="flex flex-col items-center justify-center gap-3 p-12">
        <div className="size-6 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <SteamLoginGate pageName={pageName} />
  }

  return <>{children}</>
}
