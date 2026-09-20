import { UserRound } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PageId, UserProfile } from "@/api/types"
import { useAuth } from "@/hooks/use-auth"
import { NotificationsMenu } from "@/components/notifications-menu"

interface ProfileBlockProps {
  onNavigate: (page: PageId) => void
}

export function ProfileBlock({ onNavigate }: ProfileBlockProps) {
  const { user, loginWithSteam } = useAuth()

  return (
    <div className="flex items-center gap-2">
      <NotificationsMenu />

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
