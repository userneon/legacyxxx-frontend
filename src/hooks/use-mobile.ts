import * as React from "react"

const MOBILE_BREAKPOINT = 560

/**
 * Whether the window is narrow enough for the sidebar to become a sheet.
 *
 * It listens for plain resizes as well as the media query, because an embedded or emulated
 * viewport (the desktop app's panel, dev tools) can change width without firing a query change —
 * and a stale `true` here leaves the page with no sidebar at all until a reload.
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    window.addEventListener("resize", onChange)
    onChange()
    return () => {
      mql.removeEventListener("change", onChange)
      window.removeEventListener("resize", onChange)
    }
  }, [])

  return !!isMobile
}
