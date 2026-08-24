import { useCallback, useEffect, useRef, useState } from "react"

import type { ApiError } from "@/api/types"

/**
 * Loading / data / error state shape returned by `useApiQuery`.
 */
export interface ApiQueryState<T> {
  data: T | null
  loading: boolean
  error: ApiError | null
}

/**
 * Options accepted by `useApiQuery`.
 */
export interface UseApiQueryOptions {
  /** Skip the initial automatic fetch. Call `refetch()` to run it. */
  enabled?: boolean
  /** Restarts the request and clears retained data when the logical query changes. */
  queryKey?: string
}

/**
 * A fetcher is any async function that returns data or throws an `ApiError`.
 * It receives an `AbortSignal` so it can cancel the underlying request when
 * the query is superseded or the component unmounts.
 */
export type ApiFetcher<T> = (signal: AbortSignal) => Promise<T>

/**
 * A cancellation-safe data-fetching hook.
 *
 * - Runs `fetcher` automatically on mount (unless `enabled` is false).
 * - Aborts in-flight requests on unmount or when `refetch` supersedes them,
 *   so a slow response never overwrites newer state.
 * - Never sets state after the owning request has been cancelled, avoiding
 *   the "setState on unmounted component" race and stale-data clobbers.
 *
 * The fetcher is expected to forward the signal to the API client (e.g.
 * `playService.getMatches({ ... }, { signal })`). If it ignores the signal,
 * the hook still guards state transitions correctly.
 */
export function useApiQuery<T>(
  fetcher: ApiFetcher<T>,
  options: UseApiQueryOptions = {},
): ApiQueryState<T> & { refetch: () => void } {
  const { enabled = true, queryKey } = options

  const [state, setState] = useState<ApiQueryState<T>>({
    data: null,
    loading: enabled,
    error: null,
  })

  // Keep the latest fetcher in a ref so the effect can depend only on
  // `enabled` and a fetch token, not on the (possibly inline) function.
  const fetcherRef = useRef(fetcher)
  useEffect(() => {
    fetcherRef.current = fetcher
  })

  // Token that identifies the current in-flight request. Any response from
  // an older request is discarded.
  const runIdRef = useRef(0)
  const previousQueryKeyRef = useRef(queryKey)
  const [fetchToken, setFetchToken] = useState(0)

  const refetch = useCallback(() => {
    setFetchToken((t) => t + 1)
  }, [])

  useEffect(() => {
    if (!enabled) {
      setState({ data: null, loading: false, error: null })
      return
    }

    const controller = new AbortController()
    const runId = ++runIdRef.current

    const didQueryChange = previousQueryKeyRef.current !== queryKey
    previousQueryKeyRef.current = queryKey
    setState((prev) => ({ data: didQueryChange ? null : prev.data, loading: true, error: null }))

    const run = async () => {
      try {
        const data = await fetcherRef.current(controller.signal)
        // Discard if superseded by a newer fetch or cancelled.
        if (controller.signal.aborted || runId !== runIdRef.current) return
        setState({ data, loading: false, error: null })
      } catch (err) {
        if (controller.signal.aborted || runId !== runIdRef.current) return
        const error = normalizeError(err)
        // An explicit cancellation is not surfaced as an error to the UI.
        if (error.code === "aborted") {
          setState((prev) => ({ data: prev.data, loading: false, error: null }))
          return
        }
        setState({ data: null, loading: false, error })
      }
    }

    void run()

    return () => {
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, fetchToken, queryKey])

  return { ...state, refetch }
}

/**
 * Normalizes a thrown value into an `ApiError`. Values thrown by the API
 * client are already `ApiError`; anything else is wrapped as a generic
 * client error so the UI always has a consistent shape to render.
 */
function normalizeError(err: unknown): ApiError {
  if (err && typeof err === "object" && "code" in err && "message" in err) {
    const candidate = err as Partial<ApiError>
    if (
      typeof candidate.code === "string" &&
      typeof candidate.message === "string" &&
      typeof candidate.status === "number"
    ) {
      return {
        status: candidate.status,
        code: candidate.code,
        message: candidate.message,
        fields: candidate.fields,
      }
    }
  }
  if (err instanceof Error && err.message) {
    return { status: 0, code: "client_error", message: err.message }
  }
  return {
    status: 0,
    code: "client_error",
    message: "An unexpected error occurred.",
  }
}
