import type { PageId } from "@/api/types"
import { isPageEnabled } from "@/lib/features"

export const PAGE_ROUTES: Record<PageId, string> = {
  home: "/",
  "play-5vs5": "/play/5x5",
  "play-fun": "/play/fun",
  "play-proleague": "/play/pro",
  "play-tournaments": "/tournaments",
  leaders: "/leaders",
  clan: "/clan",
  skinchanger: "/skinchanger",
  compare: "/compare",
  penalties: "/penalties",
  explore: "/explore",
  feedback: "/reviews",
  profile: "/profile",
  settings: "/settings",
}

export const ROUTE_PAGES: Record<string, PageId> = Object.fromEntries(
  Object.entries(PAGE_ROUTES).map(([page, route]) => [route, page as PageId]),
)

/** One name per page: the sidebar label, the page heading and the browser tab title all use it. */
export const PAGE_TITLES: Record<PageId, string> = {
  home: "Home",
  "play-5vs5": "5x5 Matches",
  "play-fun": "Fun Mode",
  "play-proleague": "Pro League",
  "play-tournaments": "Tournaments",
  leaders: "Leaders",
  clan: "Clans",
  skinchanger: "Skinchanger",
  compare: "Compare",
  penalties: "Penalties",
  explore: "Explore",
  feedback: "Reviews",
  profile: "Profile",
  settings: "Settings",
}

function matchPage(pathname: string): PageId {
  if (pathname.startsWith("/players/")) return "profile"
  if (pathname.startsWith("/profile/")) return "profile"
  if (pathname.startsWith("/clan/")) return "clan"
  if (pathname === "/clans" || pathname.startsWith("/clans/")) return "clan"
  if (pathname === "/search") return "explore"
  if (pathname === "/feedback") return "feedback"
  // Older addresses of the Play pages keep working.
  if (pathname === "/play/5vs5") return "play-5vs5"
  if (pathname === "/play/proleague") return "play-proleague"
  if (pathname.startsWith("/servers/")) return "play-5vs5"
  return ROUTE_PAGES[pathname] ?? "home"
}

export function routeToPage(pathname: string): PageId {
  // A disabled feature has no route, so its address falls through to the home page — and so must the
  // page title in the header.
  const page = matchPage(pathname)
  return isPageEnabled(page) ? page : "home"
}

export function pageToRoute(page: PageId): string {
  if (!isPageEnabled(page)) return "/"
  return PAGE_ROUTES[page] ?? "/"
}

const SITE_NAME = "LEGACY-X"
const HOME_DOCUMENT_TITLE = "LEGACY-X — Official CS2 Community"

/** Browser tab title: "Leaders · LEGACY-X"; Home keeps the full site title. */
export function documentTitle(title?: string | null) {
  return title ? `${title} · ${SITE_NAME}` : HOME_DOCUMENT_TITLE
}
