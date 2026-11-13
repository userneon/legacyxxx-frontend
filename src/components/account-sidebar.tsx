/**
 * The right-hand sidebar (owner request 2026-11-13, "dual sidebar, remove the top bar, two sidebars without a toggle"). It holds what the top bar held:
 * who you are (avatar, name, rank and EXP), your FOL$ balance, notifications, Profile / Settings / Discord, the live player counts and the Tutorial.
 * Always open on a wide window; between 560 and 1100 px it narrows to a column of icons; a phone keeps the small top bar instead.
 * Every number comes from the API (the same requests the old top bar made); a part whose data is missing is left out, never shown as a made-up zero.
 */
import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { ChevronRight, LogOut, Plus, Settings, Undo2, User } from "lucide-react"

import { competitiveService, serversService, walletService } from "@/api"
import type { Wallet } from "@/api"
import type { CompetitiveProfile, HomeStats, PageId, UserProfile } from "@/api/types"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"
import { AnimatedNumber } from "@/components/animated-number"
import { RankLabel } from "@/components/competitive-rank-badge"
import { NotificationsMenu } from "@/components/notifications-menu"
import { ProfileBlock } from "@/components/profile-block"
import { SiteTourButton } from "@/components/site-tour"
import { FuseButton } from "@/components/fuse-button"
import { SteamIcon } from "@/components/steam-login-gate"
import { DiscordIcon } from "@/components/discord-strip"
import { cn } from "@/lib/utils"

const rowClass = "flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium text-[var(--text-2)] transition-colors hover:bg-[var(--raised)] hover:text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-solid)]/60"
const labelClass = "px-2.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-dim)]"

const MODES: Array<{ key: "5x5" | "fun" | "pro"; label: string; page: PageId }> = [
  { key: "5x5", label: "5x5 Matches", page: "play-5vs5" },
  { key: "fun", label: "Fun Mode", page: "play-fun" },
  { key: "pro", label: "Pro League", page: "play-proleague" },
]

export function AccountSidebar({ onNavigate }: { onNavigate: (page: PageId) => void }) {
  return (
    <aside aria-label="Account" className="hidden h-svh shrink-0 p-2 pl-0 min-[560px]:flex min-[560px]:w-[76px] min-[1100px]:w-[288px]">
      <div className="lx-side-panel flex min-h-0 w-full flex-col overflow-y-auto overflow-x-hidden rounded-[14px] scrollbar-hidden">
        {/* Narrow window: the account as icons, stacked. */}
        <div className="flex flex-col items-center gap-2 py-3 min-[1100px]:hidden [&>div]:flex-col [&_a[aria-label^=Wallet]]:h-auto [&_a[aria-label^=Wallet]]:flex-col [&_a[aria-label^=Wallet]]:gap-0.5 [&_a[aria-label^=Wallet]]:px-1 [&_a[aria-label^=Wallet]]:py-1.5 [&_a[aria-label^=Wallet]]:text-[11px] [&_button[aria-label=Tutorial]>span]:hidden [&_button[aria-label=Tutorial]]:px-0 [&_button[aria-label=Tutorial]]:size-9 [&_button[aria-label=Tutorial]]:justify-center">
          <ProfileBlock onNavigate={onNavigate} />
          <SiteTourButton />
        </div>
        <div className="hidden min-h-full flex-col gap-5 p-3 min-[1100px]:flex">
          <AccountFull onNavigate={onNavigate} />
        </div>
      </div>
    </aside>
  )
}

function AccountFull({ onNavigate }: { onNavigate: (page: PageId) => void }) {
  const { user, loading, loginWithSteam, logout } = useAuth()
  const navigate = useNavigate()
  // The same requests (and cache keys) the old top bar used, so nothing is asked twice.
  const { data: competitive } = useApiQuery<CompetitiveProfile>(
    (signal) => competitiveService.getPlayer(user!.id, { signal }),
    { enabled: Boolean(user?.id), queryKey: `profile-menu:${user?.id ?? "guest"}` },
  )
  const { data: wallet, refetch: refetchWallet } = useApiQuery<Wallet>(
    (signal) => walletService.getMine({ signal }),
    { enabled: Boolean(user), queryKey: user ? `wallet:${user.id}` : "wallet:guest" },
  )
  useEffect(() => {
    window.addEventListener("legacyx:wallet-changed", refetchWallet)
    return () => window.removeEventListener("legacyx:wallet-changed", refetchWallet)
  }, [refetchWallet])
  const { data: stats } = useApiQuery<HomeStats>((signal) => serversService.getHomeStats({ signal }), { queryKey: "account-sidebar-stats", keepPreviousData: true })

  const exp = competitive?.current_exp ?? 0
  const floor = competitive?.current_rank_min_exp ?? 0
  const next = competitive?.next_rank_min_exp ?? null
  const percent = next ? Math.max(0, Math.min(100, ((exp - floor) / Math.max(1, next - floor)) * 100)) : 100

  return (
    <>
      {!user && loading && <span aria-hidden="true" className="h-[120px] animate-pulse rounded-xl bg-[var(--raised)]" />}

      {!user && !loading && (
        <section aria-label="Sign in" className="flex flex-col gap-3 rounded-xl border border-[var(--line)] bg-[var(--raised)] p-4">
          <div>
            <div className="text-[15px] font-semibold text-[var(--text)]">Sign in</div>
            <p className="mt-1 text-xs text-[var(--text-dim)]">Your LEGACY-X account is your Steam account.</p>
          </div>
          <button type="button" onClick={loginWithSteam} className="lx-primary-button flex h-9 items-center justify-center gap-2 rounded-lg text-[13px] font-semibold">
            <SteamIcon className="size-4 shrink-0" />
            Sign in with Steam
          </button>
        </section>
      )}

      {user && (
        <>
          <section aria-label="You" className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => onNavigate("profile")} aria-label="Profile" className="size-12 shrink-0 overflow-hidden rounded-full border border-[var(--line-strong)] bg-[var(--line)] transition-colors hover:border-[var(--text-dim)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60">
                <Avatar user={user} />
              </button>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="truncate text-[15px] font-semibold text-[var(--text)]" title={user.username}>{user.username}</div>
                {competitive && <RankLabel rankId={competitive.rank_id} rankName={competitive.rank_name} imageKey={competitive.rank_image_key} currentExp={competitive.current_exp} size={16} nameClassName="text-xs" />}
              </div>
              <NotificationsMenu />
            </div>
            {competitive && (
              <div className="flex flex-col gap-1.5">
                <div className="h-1 overflow-hidden rounded-full bg-[var(--line-soft)]" role="progressbar" aria-valuenow={Math.round(percent)} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to the next rank">
                  <div className="h-full rounded-full bg-[var(--brand)] transition-[width] duration-500" style={{ width: `${percent}%` }} />
                </div>
                <div className="flex justify-between text-[11px] text-[var(--text-dim)]">
                  <span>{exp.toLocaleString()} EXP</span>
                  <span>{next ? `${next.toLocaleString()} · ${competitive.next_rank_name}` : "Top rank"}</span>
                </div>
              </div>
            )}
          </section>

          {wallet && (
            <section aria-label="Wallet" className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--raised)] p-3">
              <button type="button" onClick={() => navigate("/wallet")} className="flex min-w-0 flex-1 flex-col items-start text-left focus-visible:outline-none">
                <span className="text-[11px] font-medium text-[var(--text-dim)]">Balance</span>
                <span className="text-[20px] font-bold leading-tight text-[var(--text)]"><AnimatedNumber value={wallet.balance} durationMs={600} /> <span className="text-[12px] font-semibold text-[var(--text-dim)]">FOL$</span></span>
              </button>
              <button type="button" onClick={() => navigate("/wallet/top-up")} className="lx-primary-button flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold">
                <Plus className="size-3.5" aria-hidden="true" />
                Top up
              </button>
            </section>
          )}

          <nav aria-label="Account" className="flex flex-col gap-0.5">
            <button type="button" className={rowClass} onClick={() => onNavigate("profile")}><User className="size-4" />Profile</button>
            <button type="button" className={rowClass} onClick={() => navigate("/profile", { state: { tab: "settings" } })}><Settings className="size-4" />Settings</button>
            <button type="button" className={rowClass} onClick={() => navigate("/discord")}><DiscordIcon className="size-4" />Discord</button>
          </nav>
        </>
      )}

      {stats?.modes && (
        <section aria-label="Playing now" className="flex flex-col gap-1">
          <div className={labelClass}>Playing now</div>
          {MODES.map((mode) => {
            const players = stats.modes?.[mode.key] ?? 0
            return (
              <button key={mode.key} type="button" onClick={() => onNavigate(mode.page)} className={cn(rowClass, "justify-between")}>
                <span className="flex items-center gap-2.5">
                  <span aria-hidden="true" className={cn("size-1.5 rounded-full", players > 0 ? "bg-[var(--status-green)]" : "bg-[var(--text-faint)]")} />
                  {mode.label}
                </span>
                <span className="flex items-center gap-1 text-xs text-[var(--text-dim)]">{players}<ChevronRight className="size-3.5" aria-hidden="true" /></span>
              </button>
            )
          })}
        </section>
      )}

      <div className="mt-auto flex flex-col gap-1 border-t border-[var(--line-soft)] pt-3 [&>button]:w-full [&>button]:justify-start [&>button]:rounded-lg">
        <SiteTourButton />
        {user && (
          <FuseButton
            label="Sign out"
            doneLabel="Signing out"
            undoLabel="Undo"
            icon={<LogOut className="size-4" />}
            undoIcon={<Undo2 className="size-4" />}
            fuseColor="var(--text)"
            radius={8}
            undoWindow={3500}
            fuseThickness={1.5}
            commitOn="fuseEnd"
            settle="stay"
            onCommit={() => void logout()}
          />
        )}
      </div>
    </>
  )
}

function Avatar({ user }: { user: UserProfile }) {
  if (user.avatar && user.avatar.startsWith("http")) return <img src={user.avatar} alt="" className="size-full object-cover" />
  return <span className="flex size-full items-center justify-center text-sm font-semibold text-[var(--text-2)]">{(user.username || "?").slice(0, 1).toUpperCase()}</span>
}
