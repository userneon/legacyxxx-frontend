import * as React from "react"
import { Switch as SwitchPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

/** On: white track with a dark thumb. Off: --line track. */
function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-transparent transition-colors duration-150 outline-none disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-accent data-[state=unchecked]:bg-line",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-4 rounded-full ring-0 transition-transform duration-150 ease-out data-[state=checked]:translate-x-[18px] data-[state=checked]:bg-accent-contrast data-[state=unchecked]:translate-x-0.5 data-[state=unchecked]:bg-text-muted"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
