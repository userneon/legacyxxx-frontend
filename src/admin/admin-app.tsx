import { Suspense, lazy, useEffect } from "react"
import { ExternalLink, LogOut } from "lucide-react"
import { Navigate, Route, Routes, useLocation } from "react-router-dom"

import { BackgroundBeams } from "@/components/background-beams"
import { ExternalRedirect } from "@/components/external-redirect"
import { ProtectedPage } from "@/components/protected-page"
import { useAuth } from "@/hooks/use-auth"
import { SITE_URL } from "@/lib/sites"

const StaffPage = lazy(() => import("@/pages/staff").then((module) => ({ default: module.StaffPage })))

/** The pages a staff tab links to (a player's profile, a clan, the Penalties list) are on the website. */
function Site() {
  const location = useLocation()
  return <ExternalRedirect to={`${SITE_URL}${location.pathname}${location.search}`} />
}

/** The staff site: a slim top bar and the Staff page. Everything else a staff link points at opens on the website. */
export function AdminApp() {
  const { user, logout } = useAuth()
  useEffect(() => { document.title = "Staff · LEGACY-X" }, [])

  return (
    <div className="flex h-svh min-w-0 flex-col gap-2 p-2">
      <BackgroundBeams />
      <header className="lx-glass-shell flex h-14 shrink-0 items-center gap-4 rounded-[14px] px-4 max-md:px-3">
        <img src="/logolegacyx.webp" alt="" aria-hidden="true" className="size-6 shrink-0" />
        <div className="flex min-w-0 flex-1 items-center gap-2 text-[13px]">
          <span className="text-base font-bold tracking-[0.3px] text-[var(--text)]">LEGACY-<span className="text-[var(--brand-bright)]">X</span></span>
          <span aria-hidden="true" className="text-[var(--text-faint)]">/</span>
          <span className="truncate font-semibold text-[var(--text)]">Staff</span>
        </div>
        <a href={SITE_URL} className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-[13px] text-[var(--text-muted)] transition-colors hover:bg-[var(--raised)] hover:text-[var(--text)]">legacyx.cc<ExternalLink className="size-3.5" /></a>
        {user && (
          <>
            <span aria-hidden="true" className="h-6 w-px shrink-0 bg-[var(--line)]" />
            <span className="max-w-[160px] truncate text-[13px] text-[var(--text-2)] max-sm:hidden" title={user.username}>{user.username}</span>
            <button type="button" onClick={() => void logout()} aria-label="Sign out" className="flex size-9 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--raised)] hover:text-[var(--text)]"><LogOut className="size-4" /></button>
          </>
        )}
      </header>
      <main className="lx-glass-shell scrollbar-hidden min-h-0 flex-1 overflow-y-auto overflow-x-clip rounded-[14px]">
        <Suspense fallback={<div className="min-h-[40vh]" aria-hidden="true" />}>
          <Routes>
            <Route path="/" element={<Navigate to="/staff" replace />} />
            <Route path="/staff/*" element={<ProtectedPage pageName="Staff"><StaffPage /></ProtectedPage>} />
            <Route path="/checks" element={<Navigate to="/staff/checks" replace />} />
            <Route path="/profile/*" element={<Site />} />
            <Route path="/clans/*" element={<Site />} />
            <Route path="/penalties" element={<Site />} />
            <Route path="*" element={<Navigate to="/staff" replace />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  )
}
