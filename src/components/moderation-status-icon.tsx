import { Ban, MessageSquareOff, ShieldCheck, VolumeX } from "lucide-react"

import type { ModerationStatus } from "@/api/types"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

const STATUS_META: Record<ModerationStatus, { label: string; className: string; icon: typeof ShieldCheck }> = {
  Clear: { label: "Clear", className: "text-emerald-300", icon: ShieldCheck },
  Banned: { label: "Banned", className: "text-red-300", icon: Ban },
  Muted: { label: "Muted", className: "text-white/65", icon: VolumeX },
  Gag: { label: "Gag", className: "text-white/65", icon: MessageSquareOff },
}

// LEGACY-X visual system: profile moderation state stays icon-only; the full status appears only in an explicit tooltip.
export function ModerationStatusIcon({ status = "Clear", className }: { status?: ModerationStatus; className?: string }) {
  const meta = STATUS_META[status]
  const Icon = meta.icon

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} aria-label={`Moderation status: ${meta.label}`} className={cn("inline-flex size-6 shrink-0 items-center justify-center rounded-md border border-white/[0.1] bg-black/20", meta.className, className)}>
            <Icon className="size-3.5" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={6}>{meta.label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
