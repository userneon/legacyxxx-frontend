import { useCallback, useEffect, useRef, useState } from "react"

import { cachedPerkCatalogue, loadPerkCatalogue, type PerkCatalogue } from "@/api/perks"

const RETRY_AFTER_MS = [2000, 5000]

/**
 * The ranks on sale: what was seen this session is shown at once and refreshed, a failed ask is tried again twice on its own (a slow or dropped answer used to leave
 * the Ranks out for good), and only then does `failed` say so with a way to retry.
 */
export function usePerkCatalogue() {
  const [catalogue, setCatalogue] = useState<PerkCatalogue | null>(() => cachedPerkCatalogue())
  const [failed, setFailed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [round, setRound] = useState(0)
  const stopped = useRef(false)

  useEffect(() => {
    stopped.current = false
    const controller = new AbortController()
    let timer = 0
    setFailed(false)
    setLoading(true)
    const attempt = (n: number) => {
      loadPerkCatalogue({ signal: controller.signal }).then((fresh) => {
        if (stopped.current) return
        setCatalogue(fresh)
        setLoading(false)
      }).catch(() => {
        if (stopped.current || controller.signal.aborted) return
        if (n < RETRY_AFTER_MS.length) timer = window.setTimeout(() => attempt(n + 1), RETRY_AFTER_MS[n])
        else { setFailed(true); setLoading(false) }
      })
    }
    attempt(0)
    return () => { stopped.current = true; controller.abort(); window.clearTimeout(timer) }
  }, [round])

  const retry = useCallback(() => setRound((value) => value + 1), [])
  return { catalogue, loading, failed: failed && !catalogue, retry }
}
