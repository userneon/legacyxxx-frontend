import { useEffect, useState } from "react"

import { LINKS } from "@/lib/links"

/**
 * The address players download the checker from, or null when there is no file yet (never a dead link). A link set at build
 * time is used as it is; otherwise the site's own /downloads/LegacyX-Checker.zip is used only if it really is a file (a missing
 * file would otherwise answer with the website's own page).
 */
export function useCheckerLink(enabled = true): string | null {
  const [link, setLink] = useState<string | null>(LINKS.checkerDownload)
  useEffect(() => {
    if (!enabled || LINKS.checkerDownload) return
    const controller = new AbortController()
    fetch(LINKS.checkerDownloadDefault, { method: "HEAD", signal: controller.signal })
      .then((response) => {
        const type = response.headers.get("content-type") ?? ""
        if (response.ok && !type.includes("text/html")) setLink(new URL(LINKS.checkerDownloadDefault, window.location.origin).toString())
      })
      .catch(() => undefined)
    return () => controller.abort()
  }, [enabled])
  return link
}
