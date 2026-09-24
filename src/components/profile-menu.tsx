/**
 * Avatar → profile menu (docs/design/shell-profile-menu, profile-menu-ranks): avatar, name, rank badge and the
 * EXP bar toward the next rank; then Profile, Settings, a separator and Sign out. Staff additionally get a
 * Staff panel entry (the panel checks permissions itself).
 */
import { useNavigate } from "react-router-dom"
import { LogOut, Settings, ShieldCheck, User } from "lucide-react"

import { formatInt } from "@/lib/format"
import { rankById, rankProgress } from "@/lib/ranks"
import { PlayerAvatar } from "@/components/player-avatar"
import { RankEmblem, RankName } from "@/components/rank"
import { Skeleton } from "@/components/states"
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useAuth } from "@/hooks/use-auth"
import { useMyRank } from "@/hooks/use-my-rank"
import { useStaff } from "@/hooks/use-staff"

export function ProfileMenu() {
  const { user, logout } = useAuth()
  const { profile, loading } = useMyRank()
  const { ready, staff, can } = useStaff()
  const navigate = useNavigate()
  if (!user) return null

  const rank = rankById(profile?.rank_id)
  const progress = profile && rank ? rankProgress(profile.current_exp, rank) : null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Profile menu"
        className="shrink-0 rounded-[10px] transition-opacity duration-150 outline-none hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent/60"
      >
        <PlayerAvatar avatar={user.avatar} name={user.username} size={36} className="rounded-[10px]" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={12} className="w-[280px]">
        <DropdownMenuLabel className="flex flex-col gap-3 border-b border-line-soft p-4">
          <span className="flex items-center gap-3">
            <PlayerAvatar avatar={user.avatar} name={user.username} size={44} />
            <span className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span className="truncate text-sm font-semibold text-text" title={user.username}>{user.username}</span>
              {rank ? (
                <span className="inline-flex items-center gap-2">
                  <RankEmblem rank={rank} size={16} />
                  <RankName rank={rank} className="text-xs font-semibold" />
                </span>
              ) : loading ? (
                <Skeleton className="h-2.5 w-24" />
              ) : null}
            </span>
          </span>
          {progress && profile && (
            <span className="flex flex-col gap-1.5">
              <span className="h-1 overflow-hidden rounded-full bg-line-soft" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress.progress * 100)} aria-label="EXP toward the next rank">
                <span className="block h-full rounded-full bg-accent transition-[width] duration-200" style={{ width: `${progress.progress * 100}%` }} />
              </span>
              <span className="flex justify-between text-[11px] text-text-dim tabular-nums">
                <span>{formatInt(profile.current_exp)} EXP</span>
                <span>{progress.next ? `${formatInt(progress.next.minimumExp)} · ${progress.next.name}` : "Top rank"}</span>
              </span>
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={() => navigate("/profile")}>
            <User aria-hidden />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => navigate("/settings")}>
            <Settings aria-hidden />
            Settings
          </DropdownMenuItem>
          {ready && staff && can("panel.access") && (
            <DropdownMenuItem onSelect={() => navigate("/panel")}>
              <ShieldCheck aria-hidden />
              Staff panel
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={() => void logout()} className="text-text-muted">
            <LogOut aria-hidden />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
