import { useEffect, useRef, useState, type ImgHTMLAttributes } from "react"

import { cn } from "@/lib/utils"

/**
 * A picture that never pops in (owner request 2026-11-17: "pictures should not jump or cut in"): it stays invisible until it is fully loaded and decoded,
 * then fades up, so the page does not show a hole that fills a moment later. A picture already in the cache shows at once.
 */
export function ArtImage({ className, onLoad, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const ref = useRef<HTMLImageElement>(null)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const node = ref.current
    if (node?.complete && node.naturalWidth > 0) setReady(true)
  }, [])
  return (
    <img
      ref={ref}
      {...props}
      onLoad={(event) => { setReady(true); onLoad?.(event) }}
      className={cn("transition-opacity duration-500 ease-out motion-reduce:transition-none", ready ? "opacity-100" : "opacity-0", className)}
    />
  )
}
