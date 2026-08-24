import { Wallet, UserRound } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PageId, UserProfile } from "@/api/types"
import { useAuth } from "@/hooks/use-auth"

interface ProfileBlockProps {
  onNavigate: (page: PageId) => void
}

export function ProfileBlock({ onNavigate }: ProfileBlockProps) {
  const { user, loginWithSteam } = useAuth()

  return (
    <div className="flex items-center gap-2">
      {/* Wallet block */}
      <button
        onClick={() => onNavigate("wallet")}
        className={cn(
          "flex items-center gap-2 rounded-lg px-3 py-2",
          "border border-white/[0.1] bg-white/[0.04]",
          "transition-all duration-200 hover:bg-white/[0.08] hover:border-white/[0.18]",
          "group"
        )}
        aria-label="Open Wallet"
      >
        <Wallet className="size-4 text-white/70 transition-transform group-hover:scale-105" />
        <span className="text-sm font-semibold text-white/82">Wallet</span>
      </button>

      {/* Avatar block */}
      <button
        onClick={() => user ? onNavigate("profile") : loginWithSteam()}
        className={cn(
          "glass-strong flex size-10 items-center justify-center rounded-lg",
          "transition-all hover:glow-accent",
          "relative overflow-hidden"
        )}
        aria-label={user ? user.username : "Sign in with Steam"}
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
