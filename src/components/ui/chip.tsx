/** Pill filter chip (map chips, star filters, toggles). Active: raised surface and white text. */
import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

export function Chip({ active = false, className, ...props }: ComponentProps<"button"> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "press inline-flex h-[30px] shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium whitespace-nowrap transition-colors duration-150 [&_svg]:size-3.5",
        active ? "border-line-strong bg-line text-text" : "border-line bg-transparent text-text-muted hover:border-line-strong hover:text-text",
        className,
      )}
      {...props}
    />
  )
}
