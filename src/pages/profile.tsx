import { useEffect, useState, type FormEvent } from "react"
import { useParams } from "react-router-dom"
import {
  Trophy,
  Crosshair,
  Target,
  Zap,
  TrendingUp,
  Settings,
  LogOut,
  Plus,
  Trash2,
  ExternalLink,
  Globe2,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { profileService } from "@/api"
import type { FaceitProfileData, ProfileLink, ProfileRecentMatch, ProfileStats, UserProfile } from "@/api/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useApiQuery } from "@/hooks/use-api-query"
import { QueryState } from "@/components/query-state"
import { useAuth } from "@/hooks/use-auth"
import { PlayerAvatar } from "@/components/player-avatar"
import { SteamIcon } from "@/components/steam-login-gate"

interface ProfilePageProps {
  userId?: string
}

const KNOWN_DOMAINS: Record<string, string> = {
  "facebook.com": "Facebook",
  "github.com": "GitHub",
  "instagram.com": "Instagram",
  "linkedin.com": "LinkedIn",
  "twitch.tv": "Twitch",
  "twitter.com": "Twitter",
  "x.com": "X",
  "youtube.com": "YouTube",
}

function getDomain(url: string): string {
  return new URL(url).hostname.replace(/^www\./, "")
}

function getDomainLabel(url: string): string | null {
  try {
    return KNOWN_DOMAINS[getDomain(url)] ?? null
  } catch {
    return null
  }
}

function isDiscordUrl(url: string) {
  try {
    const domain = getDomain(url)
    return domain === "discord.com" || domain.endsWith(".discord.com") || domain === "discord.gg" || domain.endsWith(".discord.gg")
  } catch {
    return false
  }
}

function ProfileLinkIcon({ url }: { url: string }) {
  const [failed, setFailed] = useState(false)
  const isKnownDomain = getDomainLabel(url) !== null

  if (!isKnownDomain || failed) {
    return <Globe2 className="size-4 text-muted-foreground" />
  }

  return (
    <img
      src={`https://www.google.com/s2/favicons?domain=${getDomain(url)}&sz=64`}
      alt=""
      className="size-4 rounded-sm"
      onError={() => setFailed(true)}
    />
  )
}

function ProfileLinks({ profile, isOwner }: { profile: UserProfile; isOwner: boolean }) {
  const [links, setLinks] = useState<ProfileLink[]>(profile.links ?? [])
  const [newUrl, setNewUrl] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    setLinks(profile.links ?? [])
  }, [profile.id, profile.links])

  const saveLinks = (nextLinks: ProfileLink[]) => {
    setLinks(nextLinks)
    void profileService.updateLinks(nextLinks).catch(() => {
      // Revert to the profile's server-side links on failure
      setLinks(profile.links ?? [])
    })
  }

  const handleAddLink = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = newUrl.trim()
    if (!value) return

    try {
      const parsed = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`)
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("Invalid protocol")

      const url = parsed.toString()
      if (isDiscordUrl(url)) {
        setError("Discord is available only through the Home community invite.")
        return
      }
      if (links.some((link) => link.url === url)) {
        setError("That link is already on your profile.")
        return
      }

      saveLinks([...links, { url }])
      setNewUrl("")
      setError("")
    } catch {
      setError("Enter a valid website address.")
    }
  }

  const visibleLinks = links.filter((link) => !isDiscordUrl(link.url))

  return (
    <section className="glass rounded-xl p-5">
      <div className="mb-4">
        <h2 className="font-semibold">Links</h2>
        <p className="mt-1 text-xs text-muted-foreground">Add your social profiles and favorite websites.</p>
      </div>

      <div className="flex flex-col gap-2">
        {visibleLinks.map((link) => {
          const domainLabel = getDomainLabel(link.url)
          return (
            <div key={link.url} className="flex items-center gap-3 rounded-lg bg-secondary/50 px-3 py-2.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-background/70">
                <ProfileLinkIcon url={link.url} />
              </div>
              <a
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 flex-1 truncate text-sm font-medium hover:text-primary hover:underline"
              >
                {domainLabel ?? getDomain(link.url)}
              </a>
              <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
              {isOwner && <Button type="button" variant="ghost" size="icon-xs" aria-label={`Remove ${link.url}`} onClick={() => saveLinks(links.filter((item) => item.url !== link.url))}><Trash2 className="size-3.5 text-muted-foreground" /></Button>}
            </div>
          )
        })}

        {visibleLinks.length === 0 && (
          <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
            No links added yet.
          </p>
        )}
      </div>

      {isOwner && <><form onSubmit={handleAddLink} className="mt-4 flex flex-col gap-2 sm:flex-row"><Input value={newUrl} onChange={(event) => { setNewUrl(event.target.value); if (error) setError("") }} placeholder="https://your-profile.com" aria-label="Website URL" type="url" /><Button type="submit" className="sm:w-auto"><Plus className="size-4" />Add Link</Button></form>{error && <p className="mt-2 text-xs text-destructive">{error}</p>}</>}
    </section>
  )
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

  const handleLogout = () => {
    void logout()
  }

  const statItems = stats ? [
    { label: "Matches", value: stats.matches.toString(), icon: Crosshair },
    { label: "Wins", value: stats.wins.toString(), icon: Trophy },
    { label: "K/D Ratio", value: stats.kdRatio.toString(), icon: Target },
    { label: "Rating", value: stats.rating.toString(), icon: TrendingUp },
  ] : []
  const isOwner = profile?.id === authenticatedUser?.id
  const steamProfileUrl = profile && /^7656\d{13}$/.test(profile.steamId)
    ? `https://steamcommunity.com/profiles/${profile.steamId}`
    : null

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
            <div className="profile-avatar-frame size-20 rounded-2xl p-[2px]">
              <PlayerAvatar avatar={profile.avatar} name={profile.username} className="size-full rounded-[14px] bg-gradient-to-br from-primary/80 to-primary text-2xl text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold tracking-tight">{profile.username}</h1>
              <p className="text-sm text-muted-foreground">{profile.role || "Player"} - Rank: {profile.rank}</p>
              {steamProfileUrl && <div className="mt-2"><a href={steamProfileUrl} target="_blank" rel="noreferrer" aria-label={`Open ${profile.username}'s Steam profile`} title="Open Steam profile" className="group inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-transparent text-white/55 transition-[color,opacity] hover:bg-transparent hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"><SteamIcon className="size-4 transition-opacity group-hover:opacity-100" /></a></div>}
            </div>
            {isOwner && <div className="flex gap-2">
              <Button variant="outline" size="icon" aria-label="Profile settings">
                <Settings className="size-4" />
              </Button>
              <Button variant="outline" size="icon" aria-label="Log out" onClick={handleLogout}>
                <LogOut className="size-4" />
              </Button>
            </div>}
          </div>
          ) : null}
        </div>
      </div>

      {profile && <FaceitProfileCard userId={effectiveUserId} />}

      {profile && <ProfileLinks profile={profile} isOwner={isOwner} />}

      {stats && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {statItems.map((stat) => (
            <div key={stat.label} className="glass rounded-xl p-4 hover-lift transition-all">
              <stat.icon className="size-4 text-muted-foreground" />
              <div className="mt-3 text-2xl font-bold tabular-nums">{stat.value}</div>
              <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
            </div>
          ))}
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
