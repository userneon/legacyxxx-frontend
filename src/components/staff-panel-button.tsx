import { Link } from "react-router-dom"
import { ShieldCheck } from "lucide-react"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useStaff } from "@/hooks/use-staff"
import { cn } from "@/lib/utils"

/** Pending reports + review queue, hidden at zero. */
export function useStaffBadgeCount() {
  const { badge } = useStaff()
  return badge?.total ?? 0
}

/**
 * Header shortcut to /panel for staff. Renders nothing until /users/me has answered, and nothing for
 * players. It only decides visibility: the panel and its API check permissions themselves.
 */
export function StaffPanelButton({ className }: { className?: string }) {
  const { ready, staff, can } = useStaff()
  const count = useStaffBadgeCount()
  if (!ready || !staff || !can("panel.access")) return null

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to="/panel"
          aria-label="Staff Panel"
          className={cn(
            "glass-strong relative flex size-10 items-center justify-center rounded-lg",
            "transition-all hover:glow-accent",
            className,
          )}
        >
          <ShieldCheck className="size-[18px] text-amber-300" />
          {count > 0 && (
            <span className="absolute -top-1 -right-1 flex min-w-4 items-center justify-center rounded-full bg-amber-300 px-1 text-[10px] font-bold leading-4 text-black tabular-nums">
              {count > 99 ? "99+" : count}
            </span>
          )}
        </Link>
      </TooltipTrigger>
      <TooltipContent>Staff Panel</TooltipContent>
    </Tooltip>
  )
}
