import { useParams } from "react-router-dom"
import {
  Trophy,
  Crosshair,
  Target,
  Zap,
  LogOut,
  ExternalLink,
  Swords,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { competitiveService, profileService } from "@/api"
import type { CompetitiveProfile, FaceitProfileData, ProfileRecentMatch, ProfileStats, UserProfile } from "@/api/types"
import { Button } from "@/components/ui/button"
import { useApiQuery } from "@/hooks/use-api-query"
import { QueryState } from "@/components/query-state"
import { useAuth } from "@/hooks/use-auth"
import { PlayerAvatar } from "@/components/player-avatar"
import { CompetitiveRankBadge } from "@/components/competitive-rank-badge"
import { ModerationStatusIcon } from "@/components/moderation-status-icon"
import { ProfileRoleIcon } from "@/components/profile-role-icon"
import { SteamIcon } from "@/components/steam-login-gate"

interface ProfilePageProps {
  userId?: string
}

function FaceitProfileCard({ userId }: { userId?: string }) {
  const { data: faceit, loading, error } = useApiQuery<FaceitProfileData>((signal) => profileService.getFaceitProfile(userId, { signal }))

  // The FACEIT section is opt-in through a real Steam-linked FACEIT profile.
  // Do not render a placeholder, manual-link prompt, or error card otherwise.
  if (loading || error || !faceit?.linked) return null

  return (
    <section className="glass rounded-xl p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-lg bg-orange-500/10"><img src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663648835859/ymOFlGPrQuILrlBY.png" alt="FACEIT" className="size-6 object-contain" /></div>
        <div><h2 className="font-semibold">FACEIT Stats</h2><p className="text-xs text-muted-foreground">Live CS2 competitive profile</p></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-secondary/50 p-4"><div className="text-xs text-muted-foreground">FACEIT</div><a href={faceit.faceitUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex max-w-full items-center gap-1.5 truncate text-sm font-semibold text-orange-400 hover:underline"><span className="truncate">{faceit.nickname}</span><ExternalLink className="size-3.5 shrink-0" /></a><div className="mt-1 text-xs text-muted-foreground">{[faceit.country, faceit.region].filter(Boolean).join(" · ") || "CS2"}</div></div>
        <div className="rounded-lg bg-secondary/50 p-4"><div className="text-xs text-muted-foreground">ELO</div><div className="mt-2 text-xl font-bold tabular-nums">{faceit.elo.toLocaleString()}</div><div className="mt-1 text-xs text-muted-foreground">Level {faceit.level}</div></div>
        <div className="rounded-lg bg-secondary/50 p-4"><div className="text-xs text-muted-foreground">Win Rate</div><div className="mt-2 text-xl font-bold tabular-nums">{faceit.stats.winRate.toFixed(1)}%</div><div className="mt-1 text-xs text-muted-foreground">{faceit.stats.wins}/{faceit.stats.matches} wins</div></div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3 text-center text-xs"><div className="rounded-lg bg-secondary/30 px-2 py-3"><div className="text-base font-semibold tabular-nums">{faceit.stats.averageKd.toFixed(2)}</div><div className="mt-1 text-muted-foreground">Avg K/D</div></div><div className="rounded-lg bg-secondary/30 px-2 py-3"><div className="text-base font-semibold tabular-nums">{faceit.stats.averageKills.toFixed(1)}</div><div className="mt-1 text-muted-foreground">Avg Kills</div></div><div className="rounded-lg bg-secondary/30 px-2 py-3"><div className="text-base font-semibold tabular-nums">{faceit.stats.headshots.toFixed(1)}%</div><div className="mt-1 text-muted-foreground">Headshots</div></div></div>
      {faceit.recentMatches.length > 0 && <div className="mt-4 border-t border-border pt-3"><div className="mb-2 text-xs font-medium text-muted-foreground">Recent FACEIT matches</div><div className="flex flex-col gap-2">{faceit.recentMatches.slice(0, 3).map((match) => <a key={match.id} href={match.faceitUrl} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-lg bg-secondary/30 px-3 py-2 text-xs hover:bg-secondary/50"><span className="truncate font-medium">{match.competition || "FACEIT CS2"}</span><span className="ml-3 shrink-0 text-muted-foreground">{match.status || match.map || "Match"}</span></a>)}</div></div>}
    </section>
  )
}

export function ProfilePage({ userId }: ProfilePageProps) {
  const { steamId } = useParams<{ steamId: string }>()
  const effectiveUserId = userId ?? steamId
  const { logout, user: authenticatedUser } = useAuth()
  const { data: profile, loading: profileLoading, error: profileError } = useApiQuery<UserProfile>((signal) =>
    profileService.getProfile(effectiveUserId, { signal }),
  )

  const { data: stats, loading: statsLoading } = useApiQuery<ProfileStats>((signal) =>
    profileService.getStats(effectiveUserId, { signal }),
  )

  const { data: recentMatches, loading: matchesLoading } = useApiQuery<ProfileRecentMatch[]>((signal) =>
    profileService.getRecentMatches(effectiveUserId, { signal }),
  )
  const { data: competitive } = useApiQuery<CompetitiveProfile>((signal) =>
    competitiveService.getPlayer(profile!.id, { signal }),
    { enabled: Boolean(profile?.id && profile.role !== "Owner"), queryKey: profile?.id ?? "competitive-profile-pending" },
  )

  const handleLogout = () => {
    void logout()
  }

  const statItems = stats ? [
    { label: "Matches", value: stats.matches.toString(), icon: Crosshair },
    { label: "Wins", value: stats.wins.toString(), icon: Trophy },
    { label: "K/D Ratio", value: stats.kdRatio.toString(), icon: Target },
  ] : []
  const isOwner = profile?.id === authenticatedUser?.id
  const steamProfileUrl = profile && /^7656\d{13}$/.test(profile.steamId)
    ? `https://steamcommunity.com/profiles/${profile.steamId}`
    : null
  const visibleCompetitiveRank = profile?.role === "Owner" ? null : {
    rankId: competitive?.rank_id ?? 1,
    rankName: competitive?.rank_name ?? "Silver I",
    imageKey: competitive?.rank_image_key ?? "rank-01",
    currentExp: competitive?.current_exp ?? 0,
    nextRankName: competitive?.next_rank_name ?? "Silver II",
    nextRankExp: competitive?.next_rank_min_exp ?? 1_000,
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="glass shiny-slow relative overflow-hidden rounded-xl p-6">
        {profile?.steamBackground && <div className="absolute inset-0 bg-cover bg-center opacity-65" style={{ backgroundImage: `url("${profile.steamBackground}")` }} aria-hidden="true" />}
        {profile?.steamBackground && <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/85 to-background/60" aria-hidden="true" />}
        <div className="relative z-10">
          {profileLoading ? (
          <div className="flex items-center gap-5">
            <div className="size-20 rounded-2xl bg-secondary/50 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-6 w-40 rounded bg-secondary/50 animate-pulse" />
              <div className="h-4 w-56 rounded bg-secondary/50 animate-pulse" />
            </div>
          </div>
        ) : profileError ? (
          <p className="text-sm text-destructive">{profileError.message}</p>
        ) : profile ? (
          <div className="flex items-center gap-5">
            <div className="profile-avatar-frame size-20 rounded-2xl">
              <PlayerAvatar avatar={profile.avatar} name={profile.username} className="size-full rounded-2xl bg-gradient-to-br from-primary/80 to-primary text-2xl text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold tracking-tight">{profile.username}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <ProfileRoleIcon role={profile.role} />
                <ModerationStatusIcon status={profile.moderationStatus} />
              </div>
              {steamProfileUrl && <div className="mt-2"><a href={steamProfileUrl} target="_blank" rel="noreferrer" aria-label={`Open ${profile.username}'s Steam profile`} title="Open Steam profile" className="group inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-transparent text-white/55 transition-[color,opacity] hover:bg-transparent hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"><SteamIcon className="size-4 transition-opacity group-hover:opacity-100" /></a></div>}
            </div>
            {isOwner && <div className="flex">
              <Button variant="outline" size="icon" aria-label="Leave profile" title="Leave" onClick={handleLogout}>
                <LogOut className="size-4" />
              </Button>
            </div>}
          </div>
          ) : null}
        </div>
      </div>

      {profile && <FaceitProfileCard userId={effectiveUserId} />}

      {profile?.clan && (
        <section className="glass flex items-center gap-3 rounded-xl p-4">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-white/[0.1] bg-white/[0.04] text-white/75"><Swords className="size-4" /></div>
          <div className="min-w-0"><p className="text-xs text-muted-foreground">Current Clan</p><p className="mt-0.5 truncate text-sm font-semibold text-white/90">{profile.clan.name} <span className="text-white/45">[{profile.clan.tag}]</span></p></div>
        </section>
      )}

      {stats && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {statItems.map((stat) => (
            <div key={stat.label} className="glass rounded-xl p-4 hover-lift transition-all">
              <stat.icon className="size-4 text-muted-foreground" />
              <div className="mt-3 text-2xl font-bold tabular-nums">{stat.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
            </div>
          ))}
          {visibleCompetitiveRank && (
            <div className="glass rounded-xl p-4 hover-lift transition-all">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">Competitive Rank</div>
                  <div className="mt-2 text-xl font-bold tabular-nums">{visibleCompetitiveRank.currentExp.toLocaleString()} / {visibleCompetitiveRank.nextRankExp?.toLocaleString() ?? "MAX"}</div>
                </div>
                <CompetitiveRankBadge rankId={visibleCompetitiveRank.rankId} rankName={visibleCompetitiveRank.rankName} imageKey={visibleCompetitiveRank.imageKey} currentExp={visibleCompetitiveRank.currentExp} className="h-12 w-20" />
              </div>
              <div className="mt-1 truncate text-xs text-muted-foreground">{visibleCompetitiveRank.nextRankExp === null ? "Global Elite reached" : `Until ${visibleCompetitiveRank.nextRankName}`}</div>
            </div>
          )}
        </div>
      )}
      {statsLoading && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="glass rounded-xl p-4">
              <div className="size-4 rounded bg-secondary/50 animate-pulse" />
              <div className="mt-3 h-7 w-20 rounded bg-secondary/50 animate-pulse" />
              <div className="mt-1 h-3 w-16 rounded bg-secondary/50 animate-pulse" />
            </div>
          ))}
        </div>
      )}

      <div className="glass rounded-xl p-5">
        <h2 className="mb-4 font-semibold">Recent Matches</h2>
        <QueryState
          loading={matchesLoading}
          error={null}
          empty={!matchesLoading && (recentMatches ?? []).length === 0}
          emptyMessage="No recent matches yet."
        />
        {!matchesLoading && (recentMatches ?? []).length > 0 && (
          <div className="flex flex-col gap-2">
            {(recentMatches ?? []).map((match, idx) => (
              <div key={idx} className="flex items-center justify-between rounded-lg bg-secondary/50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "flex size-8 items-center justify-center rounded-lg",
                    match.result === "Win" ? "bg-chart-2/15" : "bg-destructive/15"
                  )}>
                    <Zap className={cn(
                      "size-4",
                      match.result === "Win" ? "text-chart-2" : "text-destructive"
                    )} />
                  </div>
                  <div>
                    <div className="text-sm font-medium">{match.map}</div>
                    <div className="text-xs text-muted-foreground">K/D: {match.kd}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium tabular-nums">{match.score}</span>
                  <span className={cn(
                    "rounded-md px-2 py-0.5 text-xs font-bold",
                    match.result === "Win" ? "bg-chart-2/15 text-chart-2" : "bg-destructive/15 text-destructive"
                  )}>
                    {match.result}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
