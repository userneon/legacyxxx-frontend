import type { PageId } from "@/api/types"

export const PAGE_ROUTES: Record<PageId, string> = {
  home: "/",
  "play-5vs5": "/play/5x5",
  "play-fun": "/play/fun",
  "play-proleague": "/play/pro",
  "play-tournaments": "/tournaments",
  leaders: "/leaders",
  skinchanger: "/skinchanger",
  penalties: "/penalties",
  explore: "/explore",
  feedback: "/reviews",
  profile: "/profile",
  settings: "/settings",
}

export const PAGE_TITLES: Record<PageId, string> = {
  home: "Home",
  "play-5vs5": "5x5 Matches",
  "play-fun": "Fun Mode",
  "play-proleague": "Pro League",
  "play-tournaments": "Tournaments",
  leaders: "Leaders",
  skinchanger: "Skinchanger",
  penalties: "Penalties",
  explore: "Explore",
  feedback: "Reviews",
  profile: "Profile",
  settings: "Settings",
}

/** Old addresses that still arrive from bookmarks and external links. */
export const LEGACY_REDIRECTS: Record<string, string> = {
  "/play/5vs5": "/play/5x5",
  "/play/proleague": "/play/pro",
  "/feedback": "/reviews",
  "/search": "/explore",
}

export function routeToPage(pathname: string): PageId {
  if (pathname.startsWith("/profile")) return "profile"
  if (pathname.startsWith("/tournaments")) return "play-tournaments"
  const entry = Object.entries(PAGE_ROUTES).find(([, route]) => route === pathname)
  return (entry?.[0] as PageId | undefined) ?? "home"
}

export function pageToRoute(page: PageId): string {
  return PAGE_ROUTES[page] ?? "/"
}

/** A player's profile address: SteamID64 for others, /profile for yourself. */
export function profilePath(identity: string | null | undefined, viewer?: { id: string; steamId: string } | null): string {
  if (!identity) return "/profile"
  if (viewer && (identity === viewer.steamId || identity === viewer.id)) return "/profile"
  return `/profile/${encodeURIComponent(identity)}`
}
