import { useCallback, useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom"

/**
 * A page tab kept in the address as the tab's own name: /wallet, /wallet/history, /wallet/earn. A refresh, the Back button and a pasted link
 * all land on the same tab. `tabs` maps each tab to its name in the address (the first tab's is ""). An older ?tab=history link is moved
 * to the new form.
 */
export function usePathTab<T extends string>(base: string, tabs: Record<T, string>, fallback: T): [T, (next: T) => void] {
  const location = useLocation()
  const navigate = useNavigate()
  const rest = location.pathname.startsWith(`${base}/`) ? location.pathname.slice(base.length + 1).replace(/\/+$/, "") : ""
  const entries = Object.entries(tabs) as Array<[T, string]>
  const tab = entries.find(([, slug]) => slug !== "" && slug === rest)?.[0] ?? fallback

  const addressOf = useCallback(
    (next: T, search: string) => {
      const query = new URLSearchParams(search)
      query.delete("tab")
      const text = query.toString()
      return `${base}${tabs[next] ? `/${tabs[next]}` : ""}${text ? `?${text}` : ""}`
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [base, JSON.stringify(tabs)],
  )

  // /wallet?tab=history -> /wallet/history
  useEffect(() => {
    const legacy = new URLSearchParams(location.search).get("tab")
    if (!legacy || location.pathname.replace(/\/+$/, "") !== base) return
    const match = entries.find(([, slug]) => slug === legacy)
    navigate(match ? addressOf(match[0], location.search) : addressOf(fallback, location.search), { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search])

  const setTab = useCallback((next: T) => navigate(addressOf(next, location.search), { replace: true }), [addressOf, location.search, navigate])
  return [tab, setTab]
}
