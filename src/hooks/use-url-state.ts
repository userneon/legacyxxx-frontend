/** Filters, tabs, search and drawers live in the URL query string, so reload and back/forward keep them. */
import { useCallback } from "react"
import { useSearchParams } from "react-router-dom"

export function useUrlState<T extends string = string>(key: string, fallback: NoInfer<T>, allowed?: readonly T[]): [T, (value: T) => void] {
  const [params, setParams] = useSearchParams()
  const raw = params.get(key)
  const value = raw !== null && (!allowed || (allowed as readonly string[]).includes(raw)) ? (raw as T) : fallback
  const setValue = useCallback(
    (next: T) => {
      setParams(
        (current) => {
          const updated = new URLSearchParams(current)
          if (next === fallback || next === "") updated.delete(key)
          else updated.set(key, next)
          return updated
        },
        { replace: true },
      )
    },
    [key, fallback, setParams],
  )
  return [value, setValue]
}
