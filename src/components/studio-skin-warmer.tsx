/**
 * Warms the viewer for every skin of the gun that is open in the Advanced studio (owner request 2026-11-06: "load all skins of the picked gun in the
 * background, so changing the skin is quick afterwards"). A third, invisible copy of the ChainSkins viewer is sent the gun with each of its other
 * skins one after another; the models and textures it fetches stay in the browser's own cache, so when the player picks that skin the real viewer
 * finds them there. Nothing is drawn and nothing is saved.
 *
 * It is polite: it starts a few seconds after the gun opened, waits while the player is changing the craft or the tab is hidden, runs one skin at
 * a time, and does not run at all on a phone, on a slow or "data saver" connection. It stops the moment the studio closes or the gun changes.
 * Whether the viewer's files are cacheable is up to the viewer: if they are not, this only costs data, so it is easy to switch off (WARM_ENABLED).
 */
import { useEffect, useRef } from "react"

import { skinchangerService, type SkinchangerCatalogItem } from "@/api/skinchanger"
import { inspectHex } from "@/lib/inspect-link"
import { REAL_VIEWER_ORIGIN } from "@/components/studio-real-preview"

const WARM_ENABLED = true
const START_AFTER_MS = 5_000
/** After the player changes something the warmer keeps still for this long, so it never competes with the picture they are waiting for. */
const QUIET_AFTER_CHANGE_MS = 6_000
const ONE_SKIN_TIMEOUT_MS = 12_000
const BETWEEN_SKINS_MS = 400
const MAX_SKINS = 300
const addressOf = (hex: string) => `${REAL_VIEWER_ORIGIN}/embed?ui=0&auto_rotate=0&inspect=${hex}`

/** A phone, a data-saver setting or a slow connection: do not spend the player's data on skins they may never open. */
export function warmingAllowed() {
  if (!WARM_ENABLED || typeof window === "undefined") return false
  if (window.matchMedia?.("(pointer: coarse)").matches) return false
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection
  if (connection?.saveData) return false
  if (connection?.effectiveType && /^(slow-2g|2g|3g)$/.test(connection.effectiveType)) return false
  return true
}

export function StudioSkinWarmer({ weapon, activeSkinId, changeKey }: { weapon: SkinchangerCatalogItem; activeSkinId: string | null; changeKey: string }) {
  const frame = useRef<HTMLIFrameElement>(null)
  const quietUntil = useRef(Date.now() + START_AFTER_MS)
  const first = useRef(true)

  // Any change of the craft (skin, sticker, wear ...) keeps the warmer quiet for a while.
  useEffect(() => {
    if (first.current) { first.current = false; return }
    quietUntil.current = Date.now() + QUIET_AFTER_CHANGE_MS
  }, [changeKey])

  useEffect(() => {
    if (!warmingAllowed() || !weapon.weapon_defindex || !weapon.weapon_class) return
    let stopped = false
    const controller = new AbortController()
    let waiting: ((outcome: "loaded" | "error") => void) | null = null

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== REAL_VIEWER_ORIGIN || event.source !== frame.current?.contentWindow) return
      const type = (event.data as { type?: unknown } | null)?.type
      if (type === "cs3d:loaded") waiting?.("loaded")
      if (type === "cs3d:error") waiting?.("error")
    }
    window.addEventListener("message", onMessage)

    const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms))
    const calm = async () => {
      while (!stopped && (document.hidden || Date.now() < quietUntil.current)) await sleep(1_000)
    }
    const untilAnswered = () => new Promise<"loaded" | "error" | "timeout">((resolve) => {
      const timer = window.setTimeout(() => { waiting = null; resolve("timeout") }, ONE_SKIN_TIMEOUT_MS)
      waiting = (outcome) => { window.clearTimeout(timer); waiting = null; resolve(outcome) }
    })

    void (async () => {
      // Every skin of this gun, a hundred at a time.
      const skins: SkinchangerCatalogItem[] = []
      for (let offset = 0; !stopped && skins.length < MAX_SKINS; offset += 100) {
        try {
          const page = await skinchangerService.getCatalog({ category: "weapon_skin", weaponClass: weapon.weapon_class ?? undefined, limit: 100, offset }, { signal: controller.signal })
          skins.push(...page.data)
          if (page.data.length < 100 || skins.length >= page.pagination.total) break
        } catch { return }
      }
      const queue = skins.filter((item) => item.paint_id && item.id !== activeSkinId)
      if (stopped || queue.length === 0) return
      const hexOf = (item: SkinchangerCatalogItem) => inspectHex({ defindex: weapon.weapon_defindex!, paintId: item.paint_id!, wear: 0.0001, seed: 0 })

      await sleep(START_AFTER_MS)
      await calm()
      if (stopped || !frame.current) return
      // The first skin opens the hidden viewer; the rest are sent to it by message.
      const opening = untilAnswered()
      frame.current.src = addressOf(hexOf(queue[0]!))
      if ((await opening) === "timeout") return
      for (const item of queue.slice(1)) {
        await sleep(BETWEEN_SKINS_MS)
        await calm()
        if (stopped) return
        const answered = untilAnswered()
        frame.current?.contentWindow?.postMessage({ type: "cs3d:load", target: { inspect: hexOf(item) }, options: { auto_rotate: false } }, REAL_VIEWER_ORIGIN)
        if ((await answered) === "timeout") return   // the viewer stopped answering: stop here, nothing is lost
      }
    })()

    return () => {
      stopped = true
      controller.abort()
      window.removeEventListener("message", onMessage)
      waiting?.("error")
    }
    // activeSkinId is read once when the warming starts; a new skin must not restart it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weapon.id])

  if (!warmingAllowed()) return null
  return (
    <iframe
      ref={frame}
      title="Preparing the other skins"
      aria-hidden="true"
      tabIndex={-1}
      referrerPolicy="no-referrer"
      sandbox="allow-scripts allow-same-origin"
      className="pointer-events-none fixed -left-[9999px] top-0 h-[180px] w-[320px] border-0 opacity-0"
    />
  )
}
