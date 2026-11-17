/**
 * Loads the page pictures (the hero pictures behind each page) in the background once the site is idle, so that opening a page finds its picture already in the cache
 * and it does not arrive late. Each one is requested once; the browser keeps it.
 */
const heroes = import.meta.glob("../assets/home/hero-*.webp", { eager: true, import: "default", query: "?url" }) as Record<string, string>

export function preloadPageArt() {
  const urls = Object.values(heroes)
  const run = () => {
    for (const url of urls) {
      const image = new Image()
      image.decoding = "async"
      image.src = url
    }
  }
  const idle = (window as unknown as { requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number }).requestIdleCallback
  if (idle) idle(run, { timeout: 4000 })
  else window.setTimeout(run, 1500)
}
