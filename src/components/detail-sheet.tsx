import { useRef, type ReactNode } from "react"
import { X } from "lucide-react"

import { SheetClose, SheetContent } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

/**
 * Every detail view (owner request 2026-10-26: "all details come up from the bottom and cover the screen"): a solid panel that slides up from the
 * bottom and fills the screen but a thin strip at the top, with a grab handle (drag it down to close) and a close button. Use it inside a <Sheet>;
 * `width` keeps the content to a readable column in the middle of the wide panel. The caller still gives it a title (SheetTitle / DialogTitle).
 */
export function DetailSheetContent({ children, backdrop, width = "max-w-5xl", fill = false, className, onOpenAutoFocus, onCloseAutoFocus }: {
  children: ReactNode
  /** What the view is about as the panel's backdrop (a map picture, a state colour): drawn across the full width at the top and fading out downwards. */
  backdrop?: ReactNode
  /** The content scrolls its own parts (a list beside a preview): it gets the full height instead of one scroll for everything. */
  fill?: boolean
  /** The content column's max width class. */
  width?: string
  className?: string
  onOpenAutoFocus?: (event: Event) => void
  onCloseAutoFocus?: (event: Event) => void
}) {
  const panel = useRef<HTMLDivElement>(null)
  const close = useRef<HTMLButtonElement>(null)
  const drag = useRef<{ y: number; dy: number } | null>(null)

  const move = (dy: number, animate: boolean) => {
    const node = panel.current
    if (!node) return
    node.style.transition = animate ? "translate 250ms cubic-bezier(0.22, 1, 0.36, 1)" : "none"
    node.style.translate = dy ? `0 ${dy}px` : ""
  }

  return (
    <SheetContent
      side="bottom"
      showCloseButton={false}
      overlayClassName="lx-sheet-overlay bg-[rgba(10,10,10,0.6)] data-[state=open]:duration-300 data-[state=closed]:duration-200"
      className="lx-detail-sheet inset-x-0 top-[max(56px,9dvh)] bottom-0 h-auto gap-0 border-0 bg-transparent p-0 shadow-none data-[state=open]:duration-[480ms] data-[state=open]:ease-[cubic-bezier(0.22,1,0.36,1)] data-[state=closed]:duration-[260ms] data-[state=closed]:ease-[cubic-bezier(0.4,0,1,1)]"
      onOpenAutoFocus={onOpenAutoFocus}
      onCloseAutoFocus={onCloseAutoFocus}
    >
      <div ref={panel} className="lx-sheet relative mx-auto flex h-full w-[calc(100%-16px)] max-w-[1480px] flex-col overflow-hidden rounded-t-[24px] border border-b-0 border-[var(--line)] sm:w-[calc(100%-48px)]">
        {backdrop && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[460px] overflow-hidden [mask-image:linear-gradient(to_bottom,#000_40%,transparent)]">{backdrop}</div>
        )}
        {/* Grab handle: drag down past 120px to close; a tap does nothing. */}
        <div
          className="relative flex h-6 shrink-0 cursor-grab touch-none items-center justify-center active:cursor-grabbing"
          onPointerDown={(event) => { drag.current = { y: event.clientY, dy: 0 }; event.currentTarget.setPointerCapture(event.pointerId) }}
          onPointerMove={(event) => { if (!drag.current) return; drag.current.dy = Math.max(0, event.clientY - drag.current.y); move(drag.current.dy, false) }}
          onPointerUp={() => { const dy = drag.current?.dy ?? 0; drag.current = null; if (dy > 120) close.current?.click(); else move(0, true) }}
          onPointerCancel={() => { drag.current = null; move(0, true) }}
          aria-hidden="true"
        >
          <span className="h-1 w-10 rounded-full bg-[var(--line-strong)]" />
        </div>
        <SheetClose ref={close} aria-label="Close" className="absolute right-3 top-3 z-30 flex size-9 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--panel)] text-[var(--text-muted)] transition-colors hover:bg-[var(--raised)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60">
          <X className="size-4" />
        </SheetClose>
        {fill ? (
          <div className={cn("relative mx-auto flex min-h-0 w-full flex-1 flex-col", width, className)}>{children}</div>
        ) : (
          <div className="scrollbar-hidden relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div className={cn("mx-auto w-full pb-8", width, className)}>{children}</div>
          </div>
        )}
      </div>
    </SheetContent>
  )
}
