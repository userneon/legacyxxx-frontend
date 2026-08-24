import type { PageId } from "@/api/types"

export const PAGE_ROUTES: Record<PageId, string> = {
  home: "/",
  "play-5vs5": "/play/5vs5",
  "play-fun": "/play/fun",
  "play-proleague": "/play/proleague",
  "play-tournaments": "/tournaments",
  leaders: "/leaders",
  clan: "/clan",
  shop: "/shop",
  skinchanger: "/skinchanger",
  penalties: "/penalties",
  explore: "/explore",
  feedback: "/reviews",
  profile: "/profile",
  wallet: "/wallet",
}

export const ROUTE_PAGES: Record<string, PageId> = Object.fromEntries(
  Object.entries(PAGE_ROUTES).map(([page, route]) => [route, page as PageId]),
)

export const PAGE_TITLES: Record<PageId, string> = {
  home: "Home",
  "play-5vs5": "5vs5 Matches",
  "play-fun": "Fun Mode",
  "play-proleague": "Pro League",
  "play-tournaments": "Tournaments",
  leaders: "Leaders",
  clan: "Clan",
  shop: "Shop",
  skinchanger: "Skinchanger",
  penalties: "Penalties",
  explore: "Explore",
  feedback: "Reviews",
  profile: "Profile",
  wallet: "Wallet",
}

export function routeToPage(pathname: string): PageId {
  if (pathname.startsWith("/players/")) return "profile"
  if (pathname.startsWith("/clan/")) return "clan"
  if (pathname.startsWith("/clans/")) return "clan"
  if (pathname === "/search") return "explore"
  if (pathname === "/feedback") return "feedback"
  if (pathname.startsWith("/servers/")) return "play-5vs5"
  return ROUTE_PAGES[pathname] ?? "home"
}

export function pageToRoute(page: PageId): string {
  return PAGE_ROUTES[page] ?? "/"
}
