import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"

import { adminService, type Badge, type StaffIdentity } from "@/api/admin"
import { useAuth } from "@/hooks/use-auth"

/**
 * Staff status from /users/me. The UI only uses it to decide what to show; every action is checked
 * again by the API, so a stale or edited value here can never grant anything.
 */
interface StaffContextValue {
  /** True once /users/me has answered (or the visitor is signed out). Nothing staff-related renders before. */
  ready: boolean
  staff: StaffIdentity | null
  can: (permission: string) => boolean
  badge: Badge | null
  refreshBadge: () => void
  refresh: () => void
}

const StaffContext = createContext<StaffContextValue | null>(null)
const BADGE_POLL_MS = 60_000

export function StaffProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const [staff, setStaff] = useState<StaffIdentity | null>(null)
  const [ready, setReady] = useState(false)
  const [badge, setBadge] = useState<Badge | null>(null)
  const [token, setToken] = useState(0)

  useEffect(() => {
    if (loading) return
    if (!user) {
      setStaff(null)
      setBadge(null)
      setReady(true)
      return
    }
    const controller = new AbortController()
    setReady(false)
    adminService.me({ signal: controller.signal })
      .then((me) => { setStaff(me.staff); setReady(true) })
      .catch(() => { if (!controller.signal.aborted) { setStaff(null); setReady(true) } })
    return () => controller.abort()
  }, [user?.id, loading, token])

  const permissions = useMemo(() => new Set(staff?.permissions ?? []), [staff])
  const can = useCallback((permission: string) => permissions.has(permission), [permissions])

  const loadBadge = useCallback(() => {
    if (!staff || !permissions.has("panel.access")) return
    adminService.badge().then(setBadge).catch(() => {})
  }, [staff, permissions])

  useEffect(() => {
    if (!staff) return
    loadBadge()
    const interval = window.setInterval(loadBadge, BADGE_POLL_MS)
    return () => window.clearInterval(interval)
  }, [staff, loadBadge])

  const value = useMemo<StaffContextValue>(() => ({
    ready,
    staff,
    can,
    badge,
    refreshBadge: loadBadge,
    refresh: () => setToken((t) => t + 1),
  }), [ready, staff, can, badge, loadBadge])

  return <StaffContext.Provider value={value}>{children}</StaffContext.Provider>
}

export function useStaff() {
  const context = useContext(StaffContext)
  if (!context) throw new Error("useStaff must be used inside StaffProvider")
  return context
}
