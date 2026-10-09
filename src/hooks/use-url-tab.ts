import { useCallback } from "react"
import { useSearchParams } from "react-router-dom"

/**
 * A page tab kept in the address (?tab=…), so a refresh, the Back button and a pasted link all land on the same tab. The first tab has no
 * parameter, and other parameters in the address (an item, a filter) are left as they are.
 */
export function useUrlTab<T extends string>(values: readonly T[], fallback: T, key = "tab"): [T, (next: T) => void] {
  const [params, setParams] = useSearchParams()
  const raw = params.get(key)
  const tab = raw !== null && (values as readonly string[]).includes(raw) ? (raw as T) : fallback
  const setTab = useCallback(
    (next: T) => {
      setParams((current) => {
        const updated = new URLSearchParams(current)
        if (next === fallback) updated.delete(key)
        else updated.set(key, next)
        return updated
      }, { replace: true })
    },
    [fallback, key, setParams],
  )
  return [tab, setTab]
}
