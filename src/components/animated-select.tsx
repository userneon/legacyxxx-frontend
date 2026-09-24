/**
 * LEGACY-X dropdown: the shadcn Select with open and close motion (play-dropdown-* in index.css), its
 * menu dropped below the trigger instead of over it. Used by the Play toolbar and Leaders.
 */
import { createContext, useContext, useEffect, useRef, useState, type ComponentProps } from "react"

import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectTrigger } from "@/components/ui/select"

export const dropdownTriggerClass =
  "h-9 w-[130px] gap-2 rounded-lg border-border/50 bg-secondary/45 text-xs text-foreground hover:bg-secondary/70 focus-visible:ring-1 focus-visible:ring-ring"

/** Must match the play-dropdown-close duration in index.css. */
const DROPDOWN_EXIT_MS = 170
const DropdownClosingContext = createContext(false)

// Radix Select unmounts its content the instant it closes, so hold it open while the exit animation plays.
export function AnimatedSelect(props: ComponentProps<typeof Select>) {
  const [open, setOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const exitTimer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(exitTimer.current), [])

  const handleOpenChange = (next: boolean) => {
    window.clearTimeout(exitTimer.current)
    if (next) {
      setClosing(false)
      setOpen(true)
      return
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setClosing(false)
      setOpen(false)
      return
    }
    setClosing(true)
    exitTimer.current = window.setTimeout(() => {
      setOpen(false)
      setClosing(false)
    }, DROPDOWN_EXIT_MS)
  }

  return (
    <DropdownClosingContext.Provider value={closing}>
      <Select {...props} open={open} onOpenChange={handleOpenChange} />
    </DropdownClosingContext.Provider>
  )
}

export function AnimatedSelectTrigger({ className, ...props }: ComponentProps<typeof SelectTrigger>) {
  const closing = useContext(DropdownClosingContext)
  return <SelectTrigger {...props} data-closing={closing ? "" : undefined} className={cn("play-dropdown-trigger", className)} />
}

/** Opens below the trigger (popper) rather than over it. */
export function AnimatedSelectContent({ className, position = "popper", align = "start", ...props }: ComponentProps<typeof SelectContent>) {
  const closing = useContext(DropdownClosingContext)
  return <SelectContent {...props} position={position} align={align} data-closing={closing ? "" : undefined} className={cn("play-dropdown-content", className)} />
}
