import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

import { queueService, type QueueMode, type QueueStatus } from "@/api/queue"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"

/** The player's matchmaking state, asked every 2 s while signed in (every second once a match is found, when the Accept clock runs). */
export function useQueue() {
  const { isAuthenticated } = useAuth()
  const { data, refetch } = useApiQuery<QueueStatus>((signal) => queueService.status({ signal }), { enabled: isAuthenticated, queryKey: isAuthenticated ? "queue-status" : "queue-status-off", keepPreviousData: true })
  const [busy, setBusy] = useState(false)
  const state = data?.state ?? "idle"
  useEffect(() => {
    if (!isAuthenticated) return
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") refetch() }, state === "found" || state === "preparing" ? 1000 : 2000)
    return () => window.clearInterval(timer)
  }, [isAuthenticated, state, refetch])
  const run = useCallback(async (action: () => Promise<unknown>) => {
    setBusy(true)
    try { await action() } catch (error) { toast.error("Could not do that", { description: (error instanceof Error && error.message ? error.message : "Try again in a moment.") }) } finally { setBusy(false); refetch() }
  }, [refetch])
  return {
    status: data ?? null,
    busy,
    join: (mode: QueueMode) => run(() => queueService.join(mode)),
    leave: () => run(() => queueService.leave()),
    accept: (matchId: string) => run(() => queueService.accept(matchId)),
    invite: (userId: string) => run(() => queueService.partyInvite(userId)),
    acceptInvite: (partyId: string) => run(() => queueService.partyAccept(partyId)),
    declineInvite: (partyId: string) => run(() => queueService.partyDecline(partyId)),
    leaveParty: () => run(() => queueService.partyLeave()),
    kick: (userId: string) => run(() => queueService.partyKick(userId)),
  }
}
