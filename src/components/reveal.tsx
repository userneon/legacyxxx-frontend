import { useEffect, useState } from "react"

import { cn } from "@/lib/utils"

/**
 * A part that shows up after the page has loaded (join requests, unban requests, pings) opens smoothly instead of pushing
 * everything below it down at once. The height grows from 0 (grid rows 0fr → 1fr) and fades in; off for reduced motion.
 */
export function Reveal({ children, className }: { children: React.ReactNode; className?: string }) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setOpen(true))
    return () => window.cancelAnimationFrame(frame)
  }, [])
  return (
    <div className={cn("grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none", open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0", className)}>
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  )
}
