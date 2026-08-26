import { UserRound } from "lucide-react"

import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

// LEGACY-X visual system: user profiles never expose a staff role. Staff roles live only in the isolated Staff Panel.
export function ProfileIdentityIcon({ className }: { className?: string }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} aria-label="Player identity" className={cn("inline-flex size-6 shrink-0 items-center justify-center rounded-md border border-white/[0.1] bg-black/20 text-white/70", className)}>
            <UserRound className="size-3.5" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={6}>Player identity</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
