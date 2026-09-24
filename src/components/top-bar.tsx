/** Floating top bar: kill feed · divider · notifications · avatar (docs/design/shell). */
import { Menu } from "lucide-react"

import { KillFeed } from "@/components/kill-feed"
import { NotificationsMenu } from "@/components/notifications-menu"
import { ProfileMenu } from "@/components/profile-menu"
import { SteamLoginButton } from "@/components/steam-login-gate"
import { useSidebar } from "@/components/ui/sidebar"
import { useAuth } from "@/hooks/use-auth"

export function TopBar() {
  const { user, loading, loginWithSteam } = useAuth()
  const { isMobile, setOpenMobile } = useSidebar()

  return (
    <header className="z-20 flex h-14 shrink-0 items-center gap-4 rounded-[14px] border border-line-soft bg-panel pr-2 pl-4">
      {isMobile && (
        <button
          type="button"
          onClick={() => setOpenMobile(true)}
          aria-label="Open navigation"
          className="-ml-2 flex size-9 shrink-0 items-center justify-center rounded-lg text-text-muted transition-colors duration-150 hover:bg-raised hover:text-text"
        >
          <Menu className="size-[18px]" aria-hidden />
        </button>
      )}
      <KillFeed />
      <span aria-hidden className="h-6 w-px shrink-0 bg-line" />
      {user ? (
        <>
          <NotificationsMenu />
          <ProfileMenu />
        </>
      ) : loading ? (
        <span className="size-9 shrink-0 rounded-[10px] border border-line-strong bg-line animate-shimmer" aria-hidden />
      ) : (
        <SteamLoginButton onClick={loginWithSteam} size="sm" className="h-9" />
      )}
    </header>
  )
}
