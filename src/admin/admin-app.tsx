import { Suspense, lazy, useEffect } from "react"
import { Navigate, Route, Routes, useLocation } from "react-router-dom"

import { ExternalRedirect } from "@/components/external-redirect"
import { ProtectedPage } from "@/components/protected-page"
import { SITE_URL } from "@/lib/sites"

const StaffPage = lazy(() => import("@/pages/staff").then((module) => ({ default: module.StaffPage })))

/** The pages a staff tab links to (a player's profile, a clan, the Penalties list) are on the website. */
function Site() {
  const location = useLocation()
  return <ExternalRedirect to={`${SITE_URL}${location.pathname}${location.search}`} />
}

/** The staff site: the Staff page draws its own frame (menu, top bar, bottom bar on a phone, see admin-shell.tsx). Everything else a staff link points at opens on the website. */
export function AdminApp() {
  useEffect(() => {
    document.title = "Staff · LEGACY-X"
    // Square corners and the monospace labels (admin.css) reach dialogs and sheets too, because they render outside the page.
    document.documentElement.classList.add("adm")
    return () => document.documentElement.classList.remove("adm")
  }, [])

  return (
    <Suspense fallback={<div className="min-h-svh" aria-hidden="true" />}>
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
  )
}
