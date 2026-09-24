/**
 * Profile (docs/design/profile, profile-lower, profile-me, profile-me-privacy, profile-owner, profile-hidden-stats,
 * profile-ranks). Same layout for every visitor: the owner gets "Profile settings" (what others can see), others get
 * "Report player", staff profiles add the Legacy-X team card. Hidden sections are omitted by the API; the page only
 * renders the "hidden by player" placeholders.
 */
import { useMemo, useState, type ReactNode } from "react"
import { Link, useParams } from "react-router-dom"
import { ChevronRight, Crown, ExternalLink, Eye, EyeOff, Flag, Link2, MessageCircle, MoreHorizontal, Play, ShieldAlert, ShieldCheck } from "lucide-react"
import { toast } from "sonner"

import {
  competitiveService,
  profileService,
  type CompetitiveProfile,
  type FaceitProfileData,
  type PenaltyEntry,
  type ProfileLoadoutShowcase,
  type ProfileSection,
  type RankedMatch,
  type UserProfile,
} from "@/api"
import { DISCORD_REPORT_URL, DISCORD_STAFF_CONTACT_URL } from "@/lib/config"
import { cs2MapArtwork, cs2MapLabel } from "@/lib/cs2-map-art"
import { formatDate, formatInt, formatPercent, formatRatio, formatSigned } from "@/lib/format"
import { RANK_TIER_COLORS, rankById, rankProgress } from "@/lib/ranks"
import { steamProfileUrl } from "@/lib/steam"
import { cn } from "@/lib/utils"
import { penaltyStatus } from "@/pages/penalties"
import { Card } from "@/components/page"
import { PlayerAvatar } from "@/components/player-avatar"
import { RankEmblem, RankName } from "@/components/rank"
import { RelativeTime } from "@/components/relative-time"
import { EmptyState, ErrorState, Skeleton } from "@/components/states"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"

const ROLE_BLURB: Record<string, string> = {
  Owner: "Runs the servers and the community.",
  Founder: "Founded Legacy-X.",
  Manager: "Manages the staff team and the servers.",
  Admin: "Keeps matches fair and handles reports.",
  Developer: "Builds the website, plugins and API.",
  Designer: "Designs the website and the brand.",
}

/* ----------------------------------------------------------------------------
 * Small building blocks
 * ------------------------------------------------------------------------- */

function HiddenCard({ label, className }: { label: string; className?: string }) {
  return (
    <div className={cn("flex h-12 items-center gap-2.5 rounded-xl border border-line-soft bg-card px-4 text-[13px] text-text-dim", className)}>
      <EyeOff className="size-4" aria-hidden />
      {label} hidden by player
    </div>
  )
}

function CardHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="m-0 text-[15px] font-semibold text-text">{title}</h2>
      {action}
    </div>
  )
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-line-soft bg-card px-4 py-3.5">
      <span className="text-xs text-text-muted">{label}</span>
      <span className="text-xl font-semibold tabular-nums text-text">{value}</span>
    </div>
  )
}

function RankPill({ rankId }: { rankId: number }) {
  const rank = rankById(rankId)
  if (!rank) return null
  return (
    <span className="inline-flex h-6 items-center gap-1.5 rounded-full border border-line bg-raised pr-2.5 pl-1">
      <RankEmblem rank={rank} size={16} />
      <RankName rank={rank} className="text-xs font-semibold" />
    </span>
  )
}

function RolePill({ role }: { role: UserProfile["role"] }) {
  if (role === "Player") return null
  if (role === "Owner") {
    return (
      <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-accent px-2.5 text-xs font-semibold text-accent-contrast">
        <Crown className="size-3.5" aria-hidden />
        Owner
      </span>
    )
  }
  return <span className="inline-flex h-6 items-center rounded-full border border-line-strong bg-raised px-2.5 text-xs font-medium text-text-2">{role}</span>
}

async function copyText(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(`${label} copied`)
  } catch {
    toast.error("Copy failed", { description: text })
  }
}

/* ----------------------------------------------------------------------------
 * Header
 * ------------------------------------------------------------------------- */

const PRIVACY_GROUPS: Array<{ label: string; sections: ProfileSection[] }> = [
  { label: "Legacy-X stats", sections: ["kd", "matches", "kills"] },
  { label: "Recent matches & maps", sections: ["recent_matches"] },
  { label: "FACEIT stats", sections: ["faceit"] },
  { label: "Loadout", sections: ["loadout"] },
]

function PrivacyPopover({ profile, onSaved }: { profile: UserProfile; onSaved: (hidden: ProfileSection[]) => void }) {
  const [hidden, setHidden] = useState<ProfileSection[]>(profile.hiddenSections ?? [])
  const [error, setError] = useState<string | null>(null)

  const toggle = async (sections: ProfileSection[], visible: boolean) => {
    const previous = hidden
    const next = visible ? hidden.filter((section) => !sections.includes(section)) : [...new Set([...hidden, ...sections])]
    setHidden(next)
    setError(null)
    try {
      const saved = await profileService.updateProfile({ hiddenSections: next })
      onSaved(saved.hiddenSections ?? next)
    } catch {
      setHidden(previous)
      setError("Couldn't save. Try again.")
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">
          <Eye className="size-3.5" aria-hidden />
          Profile settings
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[320px] p-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold text-text">What others can see</span>
          <span className="text-xs text-text-dim">Applies to everyone except you and staff.</span>
        </div>
        <div className="mt-3 flex flex-col">
          {PRIVACY_GROUPS.map((group) => {
            const visible = !group.sections.some((section) => hidden.includes(section))
            return (
              <div key={group.label} className="flex h-10 items-center justify-between gap-3 text-[13px] text-text">
                {group.label}
                <Switch checked={visible} onCheckedChange={(value) => void toggle(group.sections, value)} aria-label={`Show ${group.label}`} />
              </div>
            )
          })}
        </div>
        {error && (
          <p className="m-0 mt-1 text-xs text-text-2" role="status">
            {error}
          </p>
        )}
        <p className="m-0 mt-3 border-t border-line-soft pt-3 text-xs leading-[18px] text-text-dim">Rank, leaderboard position and penalty history are always public.</p>
      </PopoverContent>
    </Popover>
  )
}

function ProfileHeader({
  profile,
  competitive,
  isOwner,
  onPrivacySaved,
}: {
  profile: UserProfile
  competitive: CompetitiveProfile | null
  isOwner: boolean
  onPrivacySaved: (hidden: ProfileSection[]) => void
}) {
  const link = `${window.location.origin}/profile/${profile.steamId}`
  const position = competitive?.leaderboard_position
  const playing = profile.playingNow

  return (
    <>
      <div aria-hidden className="relative h-[132px] overflow-hidden bg-[linear-gradient(180deg,#1c1c1c_0%,#121212_100%)]">
        {profile.steamBackground && <img src={profile.steamBackground} alt="" className="size-full object-cover opacity-60" />}
        <span className="absolute inset-0 bg-gradient-to-b from-transparent to-panel" />
      </div>
      <header className="relative z-[1] -mt-14 flex flex-col gap-4 px-4 sm:px-6 md:flex-row md:items-end md:gap-5">
        <PlayerAvatar
          avatar={profile.steamMedia?.animatedAvatar || profile.avatar}
          name={profile.username}
          size={104}
          className={cn("border-4 border-panel", profile.role === "Owner" && "outline-2 outline-accent")}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-2.5 pb-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="m-0 truncate text-[22px] font-semibold tracking-[-0.3px] text-text" title={profile.username}>
              {profile.username}
            </h1>
            <RolePill role={profile.role} />
            {competitive && <RankPill rankId={competitive.rank_id} />}
          </div>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] text-text-muted">
            {position ? (
              <Link to={`/leaders?q=${encodeURIComponent(profile.username)}`} className="hover:text-text">
                <span className="font-medium tabular-nums text-text-2">#{formatInt(position)}</span> on leaderboard
              </Link>
            ) : (
              <span>Not on the leaderboard yet</span>
            )}
            {profile.memberSince && (
              <>
                <span aria-hidden className="text-text-faint">
                  ·
                </span>
                <span>
                  Member since <span className="text-text-2">{formatDate(profile.memberSince, { month: "short", year: "numeric" })}</span>
                </span>
              </>
            )}
            {competitive?.last_match_at && (
              <>
                <span aria-hidden className="text-text-faint">
                  ·
                </span>
                <span>
                  Last played <RelativeTime value={competitive.last_match_at} className="text-text-2" />
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 pb-1.5">
          {playing && (
            <>
              <span
                className="inline-flex h-[34px] items-center gap-1.5 rounded-lg bg-live/12 px-3 text-[13px] font-semibold text-live"
                title={`${playing.serverName} · ${cs2MapLabel(playing.map)}`}
              >
                <span className="size-1.5 rounded-full bg-live" aria-hidden />
                Playing now
              </span>
              {playing.connectAddress && (
                <Button onClick={() => window.location.assign(`steam://connect/${playing.connectAddress}`)}>
                  <Play className="size-3" aria-hidden />
                  Join
                </Button>
              )}
            </>
          )}
          {isOwner && <PrivacyPopover profile={profile} onSaved={onPrivacySaved} />}
          <Button variant="outline" onClick={() => void copyText(link, "Profile link")}>
            <Link2 className="size-3.5" aria-hidden />
            Copy link
          </Button>
          <Button variant="outline" size="icon" asChild>
            <a href={steamProfileUrl(profile.steamId)} target="_blank" rel="noreferrer" aria-label="Steam profile">
              <ExternalLink className="size-3.5" aria-hidden />
            </a>
          </Button>
          {!isOwner && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" aria-label="More">
                  <MoreHorizontal className="size-4" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <a href={DISCORD_REPORT_URL} target="_blank" rel="noreferrer">
                    <Flag className="size-4" aria-hidden />
                    Report player
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => void copyText(profile.steamId, "SteamID")}>
                  <Link2 className="size-4" aria-hidden />
                  Copy SteamID
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>
    </>
  )
}

function StaffCard({ profile }: { profile: UserProfile }) {
  if (profile.role === "Player") return null
  return (
    <Card className="flex flex-col gap-3 px-[18px] py-3.5 md:flex-row md:items-center md:gap-4">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-raised text-text">
        <Crown className="size-4" aria-hidden />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm font-semibold text-text">Legacy-X team · {profile.role}</span>
        <span className="text-[13px] text-text-muted">{ROLE_BLURB[profile.role] ?? "Part of the Legacy-X team."} Staff never ask for your password or items.</span>
      </span>
      <span className="flex flex-wrap items-center gap-3">
        {typeof profile.penaltiesIssued === "number" && (
          <Link to={`/penalties?admin=${encodeURIComponent(profile.username)}`} className="inline-flex items-center gap-1 text-[13px] text-text-muted hover:text-text">
            Penalties issued <span className="font-semibold tabular-nums text-text">{formatInt(profile.penaltiesIssued)}</span>
            <ChevronRight className="size-3.5" aria-hidden />
          </Link>
        )}
        <Button variant="outline" asChild>
          <a href={DISCORD_STAFF_CONTACT_URL} target="_blank" rel="noreferrer">
            <MessageCircle className="size-3.5" aria-hidden />
            Contact on Discord
          </a>
        </Button>
      </span>
    </Card>
  )
}

/* ----------------------------------------------------------------------------
 * Rank, trust, stats
 * ------------------------------------------------------------------------- */

function RankCard({ competitive, username }: { competitive: CompetitiveProfile; username: string }) {
  const rank = rankById(competitive.rank_id)
  if (!rank) return null
  const { next, progress } = rankProgress(competitive.current_exp, rank)
  return (
    <Card className="flex items-center gap-[18px] p-[18px]">
      <RankEmblem rank={rank} size={64} />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[13px] text-text-muted">Rank</span>
          <Link to={`/leaders?q=${encodeURIComponent(username)}`} className="inline-flex items-center gap-1 text-[13px] text-text-2 hover:text-text">
            Leaderboard
            <ChevronRight className="size-3.5" aria-hidden />
          </Link>
        </div>
        <span className="text-xl leading-none font-bold" style={{ color: RANK_TIER_COLORS[rank.tier] }}>
          {rank.name}
        </span>
        <span className="mt-1 h-1.5 overflow-hidden rounded-full bg-line-soft" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)} aria-label="Progress to next rank">
          <span className="block h-full rounded-full transition-[width] duration-500" style={{ width: `${progress * 100}%`, background: RANK_TIER_COLORS[rank.tier] }} />
        </span>
        <div className="flex items-center justify-between text-xs text-text-dim">
          <span>
            EXP <span className="font-medium tabular-nums text-text-2">{formatInt(competitive.current_exp)}</span>
          </span>
          {next ? (
            <span>
              Next <span className="font-medium tabular-nums text-text-2">{formatInt(next.minimumExp)}</span> · {next.name}
            </span>
          ) : (
            <span>Highest rank</span>
          )}
        </div>
      </div>
    </Card>
  )
}

function TrustCard({ profile, penalties }: { profile: UserProfile; penalties: PenaltyEntry[] | null }) {
  const active = (penalties ?? []).find((penalty) => {
    const status = penaltyStatus(penalty)
    return status === "Active" || status === "Permanent"
  })
  const row = "flex h-[35px] items-center justify-between gap-3 border-b border-line-soft text-[13px] last:border-b-0"
  return (
    <Card className="flex flex-col justify-center px-[18px] py-3">
      <div className={row}>
        <span className="text-text-2">On Legacy-X since</span>
        <span className="tabular-nums text-text">{profile.memberSince ? formatDate(profile.memberSince) : "—"}</span>
      </div>
      <div className={row}>
        <span className="text-text-2">Record</span>
        {penalties === null ? (
          <Skeleton className="h-2.5 w-14" />
        ) : active ? (
          <Link to={`/penalties?q=${profile.steamId}&penalty=${active.id}`} className="inline-flex items-center gap-1.5 font-medium text-text hover:underline">
            <ShieldAlert className="size-3.5" aria-hidden />
            Active penalty
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1.5 font-medium text-live">
            <ShieldCheck className="size-3.5" aria-hidden />
            Clean
          </span>
        )}
      </div>
    </Card>
  )
}

function StatsTiles({ competitive }: { competitive: CompetitiveProfile }) {
  if (competitive.stats_hidden) return <HiddenCard label="Stats" />
  const matches = competitive.matches_completed ?? 0
  if (!matches) return <EmptyState className="rounded-xl border border-line-soft bg-card py-6">No ranked matches yet.</EmptyState>
  const deaths = competitive.deaths ?? 0
  const tiles: Array<[string, string]> = [
    ["Matches", formatInt(matches)],
    ["Win rate", formatPercent(competitive.wins / matches)],
    ["K/D", formatRatio(deaths ? competitive.kills / deaths : competitive.kills)],
    ["HS %", formatPercent(competitive.kills ? competitive.headshot_kills / competitive.kills : 0)],
    ["Avg kills", formatRatio(competitive.kills / matches, 1)],
  ]
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {tiles.map(([label, value]) => (
        <StatTile key={label} label={label} value={value} />
      ))}
    </div>
  )
}

/* ----------------------------------------------------------------------------
 * Recent matches and maps
 * ------------------------------------------------------------------------- */

const OUTCOME_LABEL: Record<RankedMatch["outcome"], string> = { win: "W", loss: "L", draw: "D" }

function ExpCell({ match }: { match: RankedMatch }) {
  const b = match.breakdown
  const value = <span className={cn("font-semibold tabular-nums", match.expDelta > 0 ? "text-text" : "text-text-muted")}>{match.countsAsRanked ? formatSigned(match.expDelta) : "—"}</span>
  if (!match.countsAsRanked || !b) return value
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span tabIndex={0} className="cursor-default">
          {value}
        </span>
      </TooltipTrigger>
      <TooltipContent className="flex flex-col gap-0.5 text-xs">
        {b.reason === "leaver" ? (
          <span>Left the match early</span>
        ) : b.reason !== "ranked" ? (
          <span>{b.reason === "low_participation" ? "Played under half the match" : "Match didn't count"}</span>
        ) : (
          <>
            <span>Result {formatSigned(b.result)}</span>
            <span>Margin {formatSigned(b.margin)}</span>
            <span>Performance {formatSigned(b.performance)}</span>
            {b.bonus ? <span>Bonus {formatSigned(b.bonus)}</span> : null}
            {b.calibration > 1 ? <span>Calibration ×{b.calibration}</span> : null}
          </>
        )}
      </TooltipContent>
    </Tooltip>
  )
}

const MATCH_COLUMNS = "grid grid-cols-[minmax(0,1fr)_44px_64px] items-center gap-3 px-4 md:grid-cols-[minmax(0,1fr)_60px_70px_60px_60px_90px]"

function RecentMatches({ matches }: { matches: RankedMatch[] }) {
  const [all, setAll] = useState(false)
  const form = matches.slice(0, 10)
  const rows = all ? matches : matches.slice(0, 6)
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-3 px-4 pt-4 pb-3.5">
        <CardHeader
          title="Recent matches"
          action={
            matches.length > 6 ? (
              <button type="button" onClick={() => setAll((open) => !open)} className="text-[13px] text-text-2 hover:text-text">
                {all ? "Show less" : "All matches"}
              </button>
            ) : null
          }
        />
        {matches.length > 0 && (
          <div className="flex items-center gap-2.5">
            <span className="text-xs text-text-dim">Form</span>
            <span className="flex gap-1.5" aria-label={`Last ${form.length} results: ${form.map((match) => OUTCOME_LABEL[match.outcome]).join(" ")}`}>
              {form.map((match) => (
                <span
                  key={match.eventId}
                  title={match.outcome}
                  className={cn(
                    "size-[18px] rounded-[5px] border",
                    match.outcome === "win" ? "border-accent bg-accent" : match.outcome === "draw" ? "border-line-strong bg-line" : "border-line-strong bg-transparent",
                  )}
                />
              ))}
            </span>
          </div>
        )}
      </div>
      {matches.length === 0 ? (
        <EmptyState className="border-t border-line-soft py-8">No ranked matches yet.</EmptyState>
      ) : (
        <div role="table" aria-label="Recent matches">
          <div role="row" className={cn(MATCH_COLUMNS, "h-[34px] border-y border-line-soft text-[11px] text-text-dim")}>
            <span>Map</span>
            <span>Result</span>
            <span className="hidden md:block">Score</span>
            <span className="hidden md:block">K/D</span>
            <span className="text-right md:text-left">EXP</span>
            <span className="hidden md:block">Date</span>
          </div>
          {rows.map((match) => {
            const art = cs2MapArtwork(match.map)
            return (
              <div role="row" key={match.eventId} className={cn(MATCH_COLUMNS, "h-[53px] border-b border-raised text-[13px] last:border-b-0")}>
                <span className="flex min-w-0 items-center gap-2.5">
                  <span className="h-7 w-[52px] shrink-0 overflow-hidden rounded-md bg-raised">{art && <img src={art} alt="" className="size-full object-cover" loading="lazy" />}</span>
                  <span className="truncate text-text">{cs2MapLabel(match.map)}</span>
                </span>
                <span>
                  <span
                    className={cn(
                      "inline-flex h-[22px] min-w-[26px] items-center justify-center rounded-md px-1.5 text-xs font-semibold",
                      match.outcome === "win" ? "bg-accent text-accent-contrast" : "border border-line-strong text-text-muted",
                    )}
                  >
                    {OUTCOME_LABEL[match.outcome]}
                  </span>
                </span>
                <span className="hidden tabular-nums text-text-2 md:block">{match.score ? `${match.score.for} : ${match.score.against}` : "—"}</span>
                <span className="hidden tabular-nums text-text-2 md:block">{formatRatio(match.kd)}</span>
                <span className="text-right md:text-left">
                  <ExpCell match={match} />
                </span>
                <span className="hidden text-text-dim md:block">{match.playedAt ? formatDate(match.playedAt, { day: "numeric", month: "short" }) : "—"}</span>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}

function MapsCard({ matches }: { matches: RankedMatch[] }) {
  const maps = useMemo(() => {
    const byMap = new Map<string, { played: number; wins: number }>()
    for (const match of matches) {
      const entry = byMap.get(match.map) ?? { played: 0, wins: 0 }
      entry.played += 1
      if (match.outcome === "win") entry.wins += 1
      byMap.set(match.map, entry)
    }
    return [...byMap.entries()]
      .filter(([, entry]) => entry.played >= 3)
      .map(([map, entry]) => ({ map, ...entry, rate: entry.wins / entry.played }))
      .sort((a, b) => b.rate - a.rate || b.played - a.played)
  }, [matches])

  return (
    <Card className="flex flex-col gap-4 p-4">
      <CardHeader title="Maps" action={<span className="text-[13px] text-text-muted">Win rate · min. 3 matches</span>} />
      {maps.length === 0 ? (
        <p className="m-0 py-3 text-[13px] text-text-dim">Play 3 matches on a map to see it here.</p>
      ) : (
        <div className="flex flex-col gap-3.5">
          {maps.map((entry) => (
            <div key={entry.map} className="grid grid-cols-[90px_minmax(0,1fr)_72px] items-center gap-3 text-[13px]">
              <span className="truncate text-text-2">{cs2MapLabel(entry.map)}</span>
              <span className="h-1.5 overflow-hidden rounded-full bg-line-soft">
                <span className="block h-full rounded-full bg-text-2" style={{ width: `${entry.rate * 100}%` }} />
              </span>
              <span className="text-right tabular-nums text-text">
                {formatPercent(entry.rate)} <span className="text-text-dim">({entry.played})</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

/* ----------------------------------------------------------------------------
 * Right column
 * ------------------------------------------------------------------------- */

function FaceitCard({ faceit }: { faceit: Extract<FaceitProfileData, { linked: true }> }) {
  const tiles: Array<[string, string]> = [
    ["Win rate", `${formatInt(faceit.stats.winRate)}%`],
    ["Avg K/D", formatRatio(faceit.stats.averageKd)],
    ["Avg kills", formatRatio(faceit.stats.averageKills, 1)],
    ["HS %", `${formatInt(faceit.stats.headshots)}%`],
  ]
  return (
    <Card className="flex flex-col gap-3.5 p-4">
      <CardHeader
        title="FACEIT"
        action={
          <a href={faceit.faceitUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[13px] text-text-2 hover:text-text">
            Open
            <ExternalLink className="size-3" aria-hidden />
          </a>
        }
      />
      <div className="flex items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-full border-2 border-line-strong bg-raised text-base font-bold tabular-nums text-text" aria-label={`Level ${faceit.level}`}>
          {faceit.level}
        </span>
        <span className="flex flex-col gap-0.5">
          <span className="text-xs text-text-dim">Level · ELO</span>
          <span className="text-[15px] font-semibold tabular-nums text-text">
            {faceit.level} · {formatInt(faceit.elo)}
          </span>
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {tiles.map(([label, value]) => (
          <div key={label} className="flex flex-col gap-1.5 rounded-[10px] border border-line-soft bg-panel px-3 py-2.5">
            <span className="text-[11px] text-text-dim">{label}</span>
            <span className="text-sm font-semibold tabular-nums text-text">{value}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

function PenaltyHistory({ penalties, steamId }: { penalties: PenaltyEntry[]; steamId: string }) {
  const sorted = [...penalties].sort((a, b) => {
    const activeA = ["Active", "Permanent"].includes(penaltyStatus(a)) ? 1 : 0
    const activeB = ["Active", "Permanent"].includes(penaltyStatus(b)) ? 1 : 0
    return activeB - activeA || Date.parse(b.date) - Date.parse(a.date)
  })
  return (
    <Card className="flex flex-col gap-1 p-4">
      <CardHeader
        title="Penalty history"
        action={
          <Link to={`/penalties?q=${steamId}`} className="text-[13px] text-text-2 hover:text-text">
            View all
          </Link>
        }
      />
      <div className="mt-2 flex flex-col">
        {sorted.slice(0, 4).map((penalty) => {
          const status = penaltyStatus(penalty)
          const active = status === "Active" || status === "Permanent"
          return (
            <Link
              key={penalty.id}
              to={`/penalties?q=${steamId}&penalty=${penalty.id}`}
              className="flex items-center gap-3 border-t border-line-soft py-2.5 text-[13px] first:border-t-0 hover:[&_.chev]:translate-x-0.5"
            >
              <span className={cn("inline-flex h-[22px] w-12 shrink-0 items-center justify-center rounded-md text-[11px] font-semibold uppercase", active ? "bg-accent text-accent-contrast" : "border border-line text-text-muted")}>
                {penalty.type}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-text">{penalty.reason || "No reason given"}</span>
                <span className="truncate text-xs text-text-dim">
                  {status} · {formatDate(penalty.date)}
                </span>
              </span>
              <ChevronRight className="chev size-4 shrink-0 text-text-dim transition-transform duration-150" aria-hidden />
            </Link>
          )
        })}
      </div>
    </Card>
  )
}

const LOADOUT_LABEL: Record<ProfileLoadoutShowcase["items"][number]["slot"], string> = { knife: "Knife", gloves: "Gloves", ak47: "AK-47", awp: "AWP" }

function LoadoutCard({ loadout }: { loadout: ProfileLoadoutShowcase }) {
  return (
    <Card className="flex flex-col gap-3.5 p-4">
      <CardHeader title="Loadout" action={loadout.side ? <span className="text-[13px] text-text-muted">{loadout.side.toUpperCase()} side</span> : null} />
      <div className="grid grid-cols-2 gap-2.5">
        {loadout.items.map((item) => (
          <div key={item.slot} className="flex flex-col gap-1.5">
            <span className="flex h-[58px] items-center justify-center overflow-hidden rounded-[10px] border border-line-soft bg-panel" title={item.name}>
              {item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="max-h-full max-w-full object-contain p-1.5" loading="lazy" /> : <span className="px-2 text-center text-xs text-text-2">{item.name}</span>}
            </span>
            <span className="truncate text-[11px] text-text-dim">{LOADOUT_LABEL[item.slot]}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}

/* ----------------------------------------------------------------------------
 * Page
 * ------------------------------------------------------------------------- */

function ProfileSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading profile">
      <div className="h-[132px] bg-[linear-gradient(180deg,#1c1c1c_0%,#121212_100%)]" />
      <div className="-mt-14 flex flex-col gap-4 px-4 pb-8 sm:px-6">
        <div className="flex items-end gap-5">
          <Skeleton className="size-[104px] rounded-[26px] border-4 border-panel bg-line" />
          <div className="flex flex-col gap-3 pb-2">
            <Skeleton className="h-5 w-48 bg-line" />
            <Skeleton className="h-2.5 w-72" />
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <Skeleton className="h-[134px] rounded-xl" />
          <Skeleton className="h-[134px] rounded-xl" />
        </div>
        <Skeleton className="h-[72px] rounded-xl" />
        <Skeleton className="h-[300px] rounded-xl" />
      </div>
    </div>
  )
}

export function ProfilePage() {
  const { identity } = useParams<{ identity?: string }>()
  const { user } = useAuth()
  const target = identity ?? "me"

  const profileQuery = useApiQuery<UserProfile>((signal) => profileService.getProfile(target, { signal }), { queryKey: `${target}|${user?.id ?? ""}` })
  const profile = profileQuery.data
  const userId = profile?.id ?? ""
  const enabled = Boolean(userId)
  const key = `${userId}|${user?.id ?? ""}`

  const competitiveQuery = useApiQuery<CompetitiveProfile>((signal) => competitiveService.getPlayer(userId, { signal }), { enabled, queryKey: key })
  const matchesQuery = useApiQuery((signal) => competitiveService.getPlayerMatches(userId, 30, { signal }), { enabled, queryKey: key })
  const faceitQuery = useApiQuery<FaceitProfileData>((signal) => profileService.getFaceitProfile(userId, { signal }), { enabled, queryKey: key })
  const penaltiesQuery = useApiQuery<PenaltyEntry[]>((signal) => profileService.getPenalties(userId, { signal }), { enabled, queryKey: key })
  const loadoutQuery = useApiQuery<ProfileLoadoutShowcase>((signal) => profileService.getLoadoutShowcase(userId, { signal }), { enabled, queryKey: key })
  const [hiddenOverride, setHiddenOverride] = useState<ProfileSection[] | null>(null)

  if (profileQuery.loading && !profile) return <ProfileSkeleton />
  if (!profile) {
    return (
      <div className="p-6">
        {profileQuery.error?.status === 404 ? <EmptyState>This player doesn't exist on Legacy-X.</EmptyState> : <ErrorState onRetry={profileQuery.refetch} />}
      </div>
    )
  }

  const isOwner = Boolean(user && user.id === profile.id)
  const competitive = competitiveQuery.data
  const matches = matchesQuery.data
  const faceit = faceitQuery.data
  const penalties = penaltiesQuery.data ?? (penaltiesQuery.error ? [] : null)
  const loadout = loadoutQuery.data
  const hidden = hiddenOverride ?? profile.hiddenSections ?? []

  return (
    <div className="pb-8">
      <ProfileHeader
        profile={{ ...profile, hiddenSections: hidden }}
        competitive={competitive ?? null}
        isOwner={isOwner}
        onPrivacySaved={(next) => {
          setHiddenOverride(next)
          competitiveQuery.refetch()
        }}
      />
      <div className="mt-4 flex flex-col gap-4 px-4 sm:px-6">
        <StaffCard profile={profile} />

        <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          {competitive ? <RankCard competitive={competitive} username={profile.username} /> : <Skeleton className="h-[134px] rounded-xl" />}
          <TrustCard profile={profile} penalties={penalties} />
        </div>

        {competitive ? <StatsTiles competitive={competitive} /> : <Skeleton className="h-[72px] rounded-xl" />}

        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex min-w-0 flex-col gap-4">
            {!matches ? (
              matchesQuery.error ? <ErrorState onRetry={matchesQuery.refetch} /> : <Skeleton className="h-[300px] rounded-xl" />
            ) : matches.hidden ? (
              <>
                <HiddenCard label="Recent matches" />
                <HiddenCard label="Maps" />
              </>
            ) : (
              <>
                <RecentMatches matches={matches.entries} />
                <MapsCard matches={matches.entries} />
              </>
            )}
          </div>
          <div className="flex min-w-0 flex-col gap-4">
            {faceit && "hidden" in faceit && faceit.hidden ? <HiddenCard label="FACEIT stats" /> : faceit?.linked ? <FaceitCard faceit={faceit} /> : null}
            {penalties && penalties.length > 0 && <PenaltyHistory penalties={penalties} steamId={profile.steamId} />}
            {loadout?.hidden ? <HiddenCard label="Loadout" /> : loadout && loadout.items.length > 0 ? <LoadoutCard loadout={loadout} /> : null}
          </div>
        </div>
      </div>
    </div>
  )
}
