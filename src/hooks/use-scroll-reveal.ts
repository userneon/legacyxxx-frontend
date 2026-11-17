import { useEffect } from "react"

/**
 * Blocks that are still below the fold when a page opens appear one after another as you scroll down to them (owner request 2026-11-17).
 * What is already on screen is left alone (the entrance animation handles it). Late content (data that arrives after the page) is picked up too.
 * A block gets `lx-rv` (hidden, a little lower) until it comes into view, then `lx-rv-in` (eases up); the classes are dropped when done, so the block's own transitions are not touched.
 */
const TARGETS = [
  ".lx-stack > *", ".lx-rows > *", "[data-reveal]",
  "section", "article", "ul > li", "tbody > tr", "ol > li",
].join(",")
const SKIP = "[data-slot-card], [data-catalog-item-id], [role=dialog], [data-slot=popover-content], [data-pagebar], .lx-no-reveal"
const MAX_TARGETS = 300

export function useScrollReveal(sectionKey: string) {
  useEffect(() => {
    let page: HTMLElement | null = null
    let observer: IntersectionObserver | null = null
    let mutations: MutationObserver | null = null
    let timer = 0
    let batch = 0
    let batchTimer = 0

    const scan = () => {
      if (!page || !observer) return
      const viewport = window.innerHeight
      let count = 0
      for (const node of Array.from(page.querySelectorAll<HTMLElement>(TARGETS))) {
        if (node.dataset.rv || node.closest(SKIP) || node.matches(SKIP)) continue
        if (++count > MAX_TARGETS) break
        node.dataset.rv = "1"
        const rect = node.getBoundingClientRect()
        if (rect.height === 0 || rect.top < viewport - 24) continue
        if (getComputedStyle(node).position === "sticky" || getComputedStyle(node).position === "fixed") continue
        node.classList.add("lx-rv")
        observer.observe(node)
      }
    }

    const start = window.setTimeout(() => {
      page = document.querySelector<HTMLElement>(".page-enter:not(.page-leave)")
      if (!page) return
      observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const node = entry.target as HTMLElement
          observer?.unobserve(node)
          // Blocks that come in together follow one another.
          const delay = Math.min(batch, 5) * 90
          batch += 1
          window.clearTimeout(batchTimer)
          batchTimer = window.setTimeout(() => { batch = 0 }, 160)
          node.style.setProperty("--rv-delay", `${delay}ms`)
          node.classList.add("lx-rv-in")
          window.setTimeout(() => { node.classList.remove("lx-rv", "lx-rv-in"); node.style.removeProperty("--rv-delay") }, delay + 950)
        }
      }, { threshold: 0.08, rootMargin: "0px 0px -6% 0px" })
      scan()
      mutations = new MutationObserver(() => { window.clearTimeout(timer); timer = window.setTimeout(scan, 120) })
      mutations.observe(page, { childList: true, subtree: true })
    }, 700)

    return () => {
      window.clearTimeout(start)
      window.clearTimeout(timer)
      window.clearTimeout(batchTimer)
      observer?.disconnect()
      mutations?.disconnect()
      page?.querySelectorAll(".lx-rv").forEach((node) => node.classList.remove("lx-rv", "lx-rv-in"))
    }
  }, [sectionKey])
}
