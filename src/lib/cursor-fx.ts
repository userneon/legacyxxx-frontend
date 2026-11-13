/**
 * Cursor effects (owner request 2026-11-13, "holo card, tile, bento and the others"): an element with `data-fx` (and every `.lx-glass` card inside `.lx-bento`) is "hot" while the
 * pointer is over it, and gets the pointer's place as `--x` / `--y` (px from its corner); `data-fx~="tilt"` also gets `--rx` / `--ry` (a few degrees toward the pointer)
 * and `--hx` (the holo sheen's place). Everything visible is CSS (`.lx-fx-*`, `[data-hot]` in `index.css`). One passive listener, one frame at a time; not installed on touch
 * screens, and no tilt for `prefers-reduced-motion`.
 */
export function installCursorFx(): () => void {
  if (typeof window === "undefined" || window.matchMedia("(pointer: coarse)").matches) return () => {}
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)")
  const SELECTOR = "[data-fx], .lx-bento .lx-glass"
  let hot: HTMLElement | null = null
  let frame = 0
  let last: PointerEvent | null = null

  const cool = () => {
    if (!hot) return
    hot.removeAttribute("data-hot")
    for (const name of ["--rx", "--ry"]) hot.style.removeProperty(name)
    hot = null
  }
  const apply = () => {
    frame = 0
    const event = last
    if (!event) return
    const next = (event.target as Element | null)?.closest?.(SELECTOR) as HTMLElement | null
    if (next !== hot) {
      cool()
      hot = next
      hot?.setAttribute("data-hot", "")
    }
    if (!hot) return
    const box = hot.getBoundingClientRect()
    const x = event.clientX - box.left
    const y = event.clientY - box.top
    hot.style.setProperty("--x", `${x}px`)
    hot.style.setProperty("--y", `${y}px`)
    if (hot.dataset.fx?.includes("tilt") && !reduced.matches) {
      const px = x / box.width - 0.5
      const py = y / box.height - 0.5
      hot.style.setProperty("--ry", `${(px * 12).toFixed(2)}deg`)
      hot.style.setProperty("--rx", `${(-py * 9).toFixed(2)}deg`)
      hot.style.setProperty("--hx", `${(px * 100 + 50).toFixed(1)}%`)
    }
  }
  const onMove = (event: PointerEvent) => {
    last = event
    if (!frame) frame = window.requestAnimationFrame(apply)
  }
  const onLeave = () => { last = null; cool() }
  document.addEventListener("pointermove", onMove, { passive: true })
  document.documentElement.addEventListener("pointerleave", onLeave)
  return () => {
    document.removeEventListener("pointermove", onMove)
    document.documentElement.removeEventListener("pointerleave", onLeave)
    if (frame) window.cancelAnimationFrame(frame)
    cool()
  }
}
