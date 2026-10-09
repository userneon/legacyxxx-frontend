import { useCallback, useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"

/**
 * A page's tab that never shows in the address: /wallet stays /wallet whichever tab is open. The tab is kept in the browser's history entry,
 * so a refresh and the Back button still land on it. Older addresses (/wallet/history, /clans?tab=appearance) open the right tab and
 * are then cleaned up. `tabs` maps each tab to the name it had in those addresses (the first tab's is "").
 */
export function usePathTab<T extends string>(base: string, tabs: Record<T, string>, fallback: T): [T, (next: T) => void] {
  const location = useLocation()
  const navigate = useNavigate()
  const entries = Object.entries(tabs) as Array<[T, string]>
  const rest = location.pathname.startsWith(`${base}/`) ? location.pathname.slice(base.length + 1).replace(/\/+$/, "") : ""
  const query = new URLSearchParams(location.search)
  const legacy = query.get("tab")
  const stated = (location.state as { tab?: string } | null)?.tab
  const fromHistory = entries.find(([value]) => value === stated)?.[0]
  const fromAddress = entries.find(([, slug]) => slug !== "" && (slug === rest || (rest === "" && slug === legacy)))?.[0]
  // Held here as well, so a click shows at once; the history entry is only for a refresh or Back.
  const [chosen, setChosen] = useState<T | null>(null)
  const tab = chosen ?? fromHistory ?? fromAddress ?? fallback

  // An older address: clean it, keeping the tab.
  const dirty = (rest !== "" && fromAddress !== undefined) || (rest === "" && legacy !== null && location.pathname.replace(/\/+$/, "") === base)
  useEffect(() => {
    if (!dirty) return
    const cleaned = new URLSearchParams(location.search)
    cleaned.delete("tab")
    const text = cleaned.toString()
    navigate(`${base}${text ? `?${text}` : ""}`, { replace: true, state: { tab } })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty, location.pathname, location.search])

  const setTab = useCallback(
    (next: T) => {
      setChosen(next)
      navigate(`${location.pathname}${location.search}`, { replace: true, state: { tab: next } })
    },
    [location.pathname, location.search, navigate],
  )
  return [tab, setTab]
}
