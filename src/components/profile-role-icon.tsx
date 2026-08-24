import { Code2, Crown, Gamepad2, Palette, Shield, ShieldCheck } from "lucide-react"

import type { UserProfile } from "@/api/types"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

type ProfileRole = UserProfile["role"]

const ROLE_META: Record<ProfileRole, { className: string; icon: typeof Crown }> = {
  Owner: { className: "text-amber-200", icon: Crown },
  Founder: { className: "text-amber-200", icon: Crown },
  Manager: { className: "text-sky-200", icon: Shield },
  Admin: { className: "text-sky-200", icon: ShieldCheck },
  Player: { className: "text-white/70", icon: Gamepad2 },
  Designer: { className: "text-fuchsia-200", icon: Palette },
  Developer: { className: "text-emerald-200", icon: Code2 },
}

// LEGACY-X visual system: Profile role is a quiet icon-only identity signal; full role text appears only on hover/focus.
export function ProfileRoleIcon({ role = "Player", className }: { role?: ProfileRole; className?: string }) {
  const meta = ROLE_META[role]
  const Icon = meta.icon

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0} aria-label={`Profile role: ${role}`} className={cn("inline-flex size-6 shrink-0 items-center justify-center rounded-md border border-white/[0.1] bg-black/20", meta.className, className)}>
            <Icon className="size-3.5" />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={6}>{role}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
