import type { ReactNode } from "react"
import { LoaderCircle } from "lucide-react"

import { useAuth } from "@/hooks/use-auth"
import { SteamLoginGate } from "@/components/steam-login-gate"

export function ProtectedPage({ pageName, children, description }: { pageName: string; children: ReactNode; description?: string }) {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center" role="status" aria-label="Loading">
        <LoaderCircle className="size-5 animate-spin text-text-dim" aria-hidden />
      </div>
    )
  }
  if (!isAuthenticated) return <SteamLoginGate pageName={pageName} description={description} />
  return <>{children}</>
}
