import { useEffect, useState } from "react"

import { playStatusService, type PlayStatus } from "@/api/play-status"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"

export interface PlayGate {
  /** Why Connect and Quick play are inactive, or null when the player may join. */
  reason: string | null
  /** True for a player blocked for leaving matches (as opposed to not being signed in). */
  cooldown: boolean
}

/** "24 min", or "under a minute" for the last seconds. */
export function minutesLeft(until: string, now: number): string {
  const minutes = Math.ceil((new Date(until).getTime() - now) / 60_000)
  return minutes <= 1 ? "under a minute" : `${minutes} min`
}

/**
 * Whether the player may join a server right now. A visitor who is not signed in is removed by the game servers within seconds,
 * and so is a player blocked for leaving matches too often, so the buttons say so instead of sending them in. If the status
 * cannot be read the buttons stay on: the servers decide anyway.
 */
export function usePlayGate(): PlayGate {
  const { isAuthenticated, loading } = useAuth()
  const { data } = useApiQuery<PlayStatus>((signal) => playStatusService.get({ signal }), {
    enabled: isAuthenticated,
    queryKey: isAuthenticated ? "play-status" : "play-status-off",
  })
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!data?.cooldown) return
    const timer = window.setInterval(() => setNow(Date.now()), 15_000)
    return () => window.clearInterval(timer)
  }, [data?.cooldown])

  if (loading) return { reason: "Checking your account…", cooldown: false }
  if (!isAuthenticated) return { reason: "Sign in with Steam to play", cooldown: false }
  if (data?.cooldown && new Date(data.cooldown.until).getTime() > now) {
    return { reason: `You left matches too often. You can play again in ${minutesLeft(data.cooldown.until, now)}.`, cooldown: true }
  }
  return { reason: null, cooldown: false }
}
