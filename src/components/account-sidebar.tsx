/**
 * The right-hand sidebar (owner requests 2026-11-13: "dual sidebar, remove the top bar, two sidebars without a toggle", then "always closed").
 * It holds what the top bar held, as a column of icons that never opens wider: the FOL$ balance (to the Wallet), the avatar (its menu has Profile,
 * Settings, Discord and Sign out), the notifications bell and the Tutorial. A phone keeps the small top bar instead (no sidebars on screen there).
 * The numbers are the API's, from the same requests the top bar made; a part whose data is missing is left out, never shown as a made-up zero.
 */
import type { PageId } from "@/api/types"
import { useAuth } from "@/hooks/use-auth"
import { ProfileBlock } from "@/components/profile-block"
import { SiteTourButton } from "@/components/site-tour"
import { SteamIcon } from "@/components/steam-login-gate"

export function AccountSidebar({ onNavigate }: { onNavigate: (page: PageId) => void }) {
  const { user, loading, loginWithSteam } = useAuth()
  return (
    <aside aria-label="Account" className="hidden h-svh w-[76px] shrink-0 p-2 pl-0 min-[560px]:flex">
      <div className="lx-side-panel scrollbar-hidden flex min-h-0 w-full flex-col items-center overflow-y-auto overflow-x-hidden rounded-[14px] py-3">
        <div className="flex flex-col items-center gap-2 [&>div]:flex-col [&_a[aria-label^=Wallet]]:h-auto [&_a[aria-label^=Wallet]]:flex-col [&_a[aria-label^=Wallet]]:gap-0.5 [&_a[aria-label^=Wallet]]:px-1 [&_a[aria-label^=Wallet]]:py-1.5 [&_a[aria-label^=Wallet]]:text-[11px]">
          {/* Signed out: a round Steam button (the wide "Sign in with Steam" pill does not fit the column). */}
          {!user && !loading ? (
            <button type="button" onClick={loginWithSteam} aria-label="Sign in with Steam" title="Sign in with Steam" className="lx-primary-button grid size-10 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/50">
              <SteamIcon className="size-[18px]" />
            </button>
          ) : (
            <ProfileBlock onNavigate={onNavigate} />
          )}
        </div>
        <div className="mt-auto [&_button[aria-label=Tutorial]>span]:hidden [&_button[aria-label=Tutorial]]:size-9 [&_button[aria-label=Tutorial]]:justify-center [&_button[aria-label=Tutorial]]:px-0">
          <SiteTourButton />
        </div>
      </div>
    </aside>
  )
}
