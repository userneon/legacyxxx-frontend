import { useCallback, useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"

type Updater = URLSearchParams | ((current: URLSearchParams) => URLSearchParams)

/**
 * Page view state (filters, sort, search, the open item) with the same API as useSearchParams, but
 * kept in memory instead of the address bar, so URLs stay clean (/leaders, not /leaders?sort=kd).
 *
 * A link that still carries a query (e.g. Profile's "View all" → /penalties?q=…, or an old shared
 * link) is read once and then removed from the URL. The state belongs to the page's path, so moving
 * to another path (e.g. 5x5 → Fun Mode) starts from a clean view.
 */
export function useViewParams() {
  const location = useLocation()
  const navigate = useNavigate()
  const [store, setStore] = useState(() => ({ path: location.pathname, params: new URLSearchParams(location.search) }))

  // A query arriving in the URL seeds the view, then the URL is cleaned without adding history.
  useEffect(() => {
    if (!location.search) return
    setStore({ path: location.pathname, params: new URLSearchParams(location.search) })
    navigate({ pathname: location.pathname, hash: location.hash }, { replace: true, state: location.state })
  }, [location.pathname, location.search, location.hash, location.state, navigate])

  const params = store.path === location.pathname ? store.params : new URLSearchParams()

  // The second argument mirrors useSearchParams' options; there is no history entry to replace.
  const setParams = useCallback((next: Updater, _options?: { replace?: boolean }) => {
    setStore((current) => {
      const base = current.path === location.pathname ? new URLSearchParams(current.params) : new URLSearchParams()
      return { path: location.pathname, params: typeof next === "function" ? next(base) : next }
    })
  }, [location.pathname])

  return [params, setParams] as const
}
