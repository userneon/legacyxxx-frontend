"use client"

import * as React from "react"
import { CheckIcon } from "lucide-react"
import { Checkbox as CheckboxPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer size-[18px] shrink-0 rounded-md border border-[#3a3a3a] bg-transparent transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/50 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-[#ececf0] data-[state=checked]:bg-[#ececf0] data-[state=checked]:text-[#0b0b0d]",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none"
      >
        <CheckIcon className="size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
