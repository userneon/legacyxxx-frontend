import { Wallet, ShieldCheck, UserRound } from "lucide-react"

import { cn } from "@/lib/utils"
import type { PageId, UserProfile } from "@/api/types"
import { useAuth } from "@/hooks/use-auth"

interface ProfileBlockProps {
  onNavigate: (page: PageId) => void
}

export function ProfileBlock({ onNavigate }: ProfileBlockProps) {
  const { user } = useAuth()
  const balance = user?.balance ?? 0

  return (
    <div className="flex items-center gap-2">
      {/* Wallet block */}
      <button
        onClick={() => onNavigate("wallet")}
        className={cn(
          "flex items-center gap-2 rounded-lg px-3 py-2",
          "bg-chart-2/10 border border-chart-2/25",
          "transition-all duration-200 hover:bg-chart-2/15 hover:border-chart-2/40",
          "group"
        )}
      >
        <Wallet className="size-4 text-chart-2 transition-transform group-hover:scale-110" />
        <span className="text-sm font-semibold tabular-nums text-muted-foreground">
          {balance > 0 ? balance.toLocaleString() : "—"}
        </span>
        <ShieldCheck className="size-3.5 text-chart-2/70" />
      </button>

      {/* Avatar block */}
      <button
        onClick={() => onNavigate("profile")}
        className={cn(
          "glass-strong flex size-10 items-center justify-center rounded-lg",
          "transition-all hover:glow-accent",
          "relative overflow-hidden"
        )}
        aria-label={user ? user.username : "Guest - sign in"}
      >
        {user ? <UserAvatar user={user} /> : <GuestAvatar />}
      </button>
    </div>
  )
}

function UserAvatar({ user }: { user: UserProfile }) {
  if (user.avatar && user.avatar.startsWith("http")) {
    return (
      <img
        src={user.avatar}
        alt={user.username}
        className="size-full object-cover"
      />
    )
  }
  const initials = (user.avatar || user.username || "?").slice(0, 1).toUpperCase()
  return (
    <div className="flex size-full items-center justify-center bg-gradient-to-br from-primary/80 to-primary text-primary-foreground">
      <span className="text-sm font-bold">{initials}</span>
    </div>
  )
}

function GuestAvatar() {
  return (
    <div className="flex size-full items-center justify-center bg-secondary text-muted-foreground">
      <UserRound className="size-5" />
    </div>
  )
}
