/**
 * Where the two sites live (owner request 2026-10-23): the staff panel is its own site, admin.legacyx.cc, built from the same code
 * (`admin.html`, `src/admin/`). Set VITE_ADMIN_URL / VITE_SITE_URL in a build to point somewhere else.
 */
const trim = (url: string) => url.replace(/\/$/, "")

export const ADMIN_URL = trim(import.meta.env.VITE_ADMIN_URL?.trim() || (import.meta.env.PROD ? "https://admin.legacyx.cc" : "http://localhost:5200"))
export const SITE_URL = trim(import.meta.env.VITE_SITE_URL?.trim() || (import.meta.env.PROD ? "https://legacyx.cc" : "http://localhost:5173"))

/** True on the staff site itself, so a Steam sign-in there comes back there. */
export const isAdminSite = () => typeof window !== "undefined" && window.location.hostname.startsWith("admin.")
