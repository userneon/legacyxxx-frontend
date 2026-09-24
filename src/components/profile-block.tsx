import { useState } from "react"
import { LogOut, Settings, User, UserRound } from "lucide-react"

import { cn } from "@/lib/utils"
import { competitiveService } from "@/api"
import type { CompetitiveProfile, PageId, UserProfile } from "@/api/types"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { RankLabel } from "@/components/competitive-rank-badge"
import { NotificationsMenu } from "@/components/notifications-menu"

interface ProfileBlockProps {
  onNavigate: (page: PageId) => void
}

const menuItemClass = "flex h-10 w-full items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium transition-colors duration-150 hover:bg-[var(--raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-solid)]/60"

export function ProfileBlock({ onNavigate }: ProfileBlockProps) {
  const { user, loginWithSteam, logout } = useAuth()
  const [open, setOpen] = useState(false)

  const { data: competitive } = useApiQuery<CompetitiveProfile>(
    (signal) => competitiveService.getPlayer(user!.id, { signal }),
    { enabled: Boolean(user?.id), queryKey: `profile-menu:${user?.id ?? "guest"}` },
  )

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={loginWithSteam}
          className="flex h-9 items-center rounded-lg border border-[var(--line-strong)] bg-[var(--raised)] px-3 text-xs font-medium text-[var(--text-2)] transition-colors hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60"
        >
          Sign in with Steam
        </button>
      </div>
    )
  }

  const exp = competitive?.current_exp ?? 0
  const floor = competitive?.current_rank_min_exp ?? 0
  const next = competitive?.next_rank_min_exp ?? null
  const percent = next ? Math.max(0, Math.min(100, ((exp - floor) / Math.max(1, next - floor)) * 100)) : 100

  return (
    <div className="flex items-center gap-2">
      <NotificationsMenu />

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          aria-haspopup="menu"
          aria-label={user.username}
          className="size-9 shrink-0 overflow-hidden rounded-[10px] border border-[var(--line-strong)] bg-[var(--line)] transition-colors hover:border-[var(--text-dim)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60"
        >
          <Avatar user={user} />
        </PopoverTrigger>

        <PopoverContent align="end" sideOffset={8} role="menu" className="w-[280px] overflow-hidden rounded-[14px] border-[var(--line-soft)] bg-[var(--panel)] p-0 shadow-[0_16px_40px_rgba(0,0,0,0.5)]">
          <div className="flex flex-col gap-3 border-b border-[var(--line-soft)] p-4">
            <div className="flex items-center gap-3">
              <span className="size-11 shrink-0 overflow-hidden rounded-xl border border-[var(--line-strong)] bg-[var(--line)]"><Avatar user={user} /></span>
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <div className="truncate text-sm font-semibold text-[var(--text)]" title={user.username}>{user.username}</div>
                {competitive && <RankLabel rankId={competitive.rank_id} rankName={competitive.rank_name} imageKey={competitive.rank_image_key} currentExp={competitive.current_exp} size={16} nameClassName="text-xs" />}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="h-1 overflow-hidden rounded-full bg-[var(--line-soft)]">
                <div className="h-full rounded-full bg-[var(--accent-solid)] transition-[width] duration-500" style={{ width: `${percent}%` }} />
              </div>
              <div className="flex justify-between text-[11px] tabular-nums text-[var(--text-dim)]">
                <span>{exp.toLocaleString()} EXP</span>
                <span>{next ? `${next.toLocaleString()} · ${competitive?.next_rank_name}` : "Top rank"}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col p-1.5">
            <button type="button" role="menuitem" className={cn(menuItemClass, "text-[var(--text)]")} onClick={() => { setOpen(false); onNavigate("profile") }}>
              <User className="size-4" />
              Profile
            </button>
            <button type="button" role="menuitem" className={cn(menuItemClass, "text-[var(--text)]")} onClick={() => { setOpen(false); onNavigate("settings") }}>
              <Settings className="size-4" />
              Settings
            </button>
          </div>
          <div className="border-t border-[var(--line-soft)] p-1.5">
            <button type="button" role="menuitem" className={cn(menuItemClass, "text-[var(--text-muted)] hover:text-[var(--text)]")} onClick={() => { setOpen(false); void logout() }}>
              <LogOut className="size-4" />
              Sign out
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

function Avatar({ user }: { user: UserProfile }) {
  if (user.avatar && user.avatar.startsWith("http")) {
    return <img src={user.avatar} alt="" className="size-full object-cover" />
  }
  const initial = (user.username || "?").slice(0, 1).toUpperCase()
  return (
    <span className="flex size-full items-center justify-center text-sm font-semibold text-[var(--text-2)]">
      {initial || <UserRound className="size-4" />}
    </span>
  )
}
