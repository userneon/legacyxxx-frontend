import { DetailSheetContent } from "@/components/detail-sheet"
import { NameBanner } from "@/components/name-banner"
import { PerkMark } from "@/components/perk-badge"
import { Sheet, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { ClanLinksEditor, ClanLinksRow, clanLinkFields, clanLinksFromFields } from "@/components/clan-links"
import { Reveal } from "@/components/reveal"
import { createPortal } from "react-dom"
import { useEffect, useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { usePathTab } from "@/hooks/use-url-tab"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Check, Coins, Crown, Flag, Globe, Lock, Pencil, Plus, Search, ShieldCheck, Trophy, Upload, User, UserPlus, Users, X } from "lucide-react"
import { toast } from "sonner"


import { cn } from "@/lib/utils"
import { clansService, type ClanLook } from "@/api"
import { ClanBackground } from "@/components/clan-background"
import { ClanAppearancePanel } from "@/components/shop-clan"
import { CLAN_ART_RULES, clanArtProblem, clanArtSrc, type ClanArtKind } from "@/api/clans"
import type { ClanCard, ClanDetail, ClanJoinRequest, ClanRole, MyClanState } from "@/api/types"
import { ClanMark } from "@/components/clan-mark"
import { ClanBankPanel, ClanSectionTabs, ClanStatsPanel, type ClanSection } from "@/components/clan-extras"
import { ActivityPanel, ManagersSection, useClanFee, InvitePanel, RenameForm, clanFailure, roleLabel } from "@/components/clan-manage"
import { Button } from "@/components/ui/button"
import { PageBar, PageBarEnd, PageTabs, pageSearchClass } from "@/components/page-tabs"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"
import { QueryState } from "@/components/query-state"
import { AnimatedNumber } from "@/components/animated-number"
import { RankLabel } from "@/components/competitive-rank-badge"
import { PlayerAvatar } from "@/components/player-avatar"
import { nameProps } from "@/lib/cosmetics"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { backdropStyle, clanTagProps, pageBackground } from "@/lib/cosmetics"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"


/** The clan's animated or gradient page background: a fixed layer behind the (transparent) shell. An animated one is loaded only when a clan wears it. */
function PageWash({ page }: { page: ClanLook["page"] | undefined }) {
  if (!pageBackground(page) || !page) return null
  const calm = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  return createPortal(<div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-[1]"><ClanBackground page={page} calm={calm} /></div>, document.body)
}

/** A clan card's banner: the picture covers the whole box. (The clan page shows it whole instead: ClanBannerStrip.) */
function BannerArt({ src, alt = "", className, eager }: { src: string; alt?: string; className?: string; eager?: boolean }) {
  return <div className={cn("relative overflow-hidden bg-[var(--raised)]", className)}><img src={src} alt={alt} loading={eager ? "eager" : "lazy"} decoding="async" className="size-full object-cover" /></div>
}

/**
 * The clan's banner, whole and unfaded above the header, at the picture's own shape. It used to sit in a fixed 5:1 strip, which on a phone
 * was a sliver (about 70px tall at 360px wide) and made any other shape tiny. A very tall picture is capped (520px) and sits over its own blurred copy.
 */
function ClanBannerStrip({ banner, name }: { banner?: string | null; name: string }) {
  const src = clanArtSrc(banner)
  if (!src) return null
  return (
    <div className="relative overflow-hidden border-b border-[var(--glass-line)] bg-[var(--raised)]">
      <img src={src} alt="" aria-hidden="true" loading="eager" decoding="async" className="absolute inset-0 size-full scale-125 object-cover opacity-60 blur-2xl" />
      <img src={src} alt={`${name} banner`} loading="eager" decoding="async" className="relative mx-auto block h-auto max-h-[200px] w-full object-cover" />
    </div>
  )
}

/**
 * One picture slot: shows the current or chosen picture and a Choose button (plus Remove when there is one). It checks
 * type and size before anything is sent; the server checks again.
 */
function ArtSlot({ kind, preview, onPick, onRemove, busy }: { kind: ClanArtKind; preview: string | null; onPick: (file: File) => void; onRemove?: () => void; busy?: boolean }) {
  const [problem, setProblem] = useState("")
  const inputId = `clan-art-${kind}`
  const rule = CLAN_ART_RULES[kind]
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={inputId}>{kind === "logo" ? "Logo" : "Banner"} <span className="font-normal text-[var(--text-dim)]">({rule.hint})</span></Label>
      <div className="flex items-center gap-3">
        <div className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-[var(--line-strong)] bg-[var(--raised)]", kind === "logo" ? "size-16" : "h-16 w-32")}>
          {preview ? <img src={preview} alt="" className="size-full object-cover" /> : <Upload className="size-5 text-[var(--text-dim)]" aria-hidden="true" />}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => document.getElementById(inputId)?.click()}><Upload className="size-3.5" /> {preview ? "Replace" : "Choose file"}</Button>
          {preview && onRemove && <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={onRemove}><X className="size-3.5" /> Remove</Button>}
        </div>
        <input
          id={inputId}
          type="file"
          accept={rule.types.join(",")}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            event.target.value = ""
            if (!file) return
            const issue = clanArtProblem(kind, file)
            setProblem(issue ?? "")
            if (!issue) onPick(file)
          }}
        />
      </div>
      {problem && <p role="alert" className="text-[13px] text-[var(--status-red)]">{problem}</p>}
    </div>
  )
}

const failureMessage = clanFailure

export function ClanPage({ onProfileNavigate, onClanNavigate }: { onProfileNavigate: (userId: string) => void; onClanNavigate: (clanId: string) => void }) {
  const { clanId } = useParams()
  if (clanId) return <ClanDetailView clanId={clanId} onProfileNavigate={onProfileNavigate} />
  return <ClanList onClanNavigate={onClanNavigate} />
}

const PAGE_SIZE = 24

/** The stat row and the card grid of the clan list, in the places the real ones appear. */
const ROLE_ORDER = ["leader", "co-leader", "captain", "member"]

function ClanListSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden="true">
      <div className="lx-stat-grid grid-cols-3">
        {[0, 1, 2].map((index) => (
          <div key={index} className="lx-stat-cell shadow-none!">
            <Skeleton className="h-2.5 w-14 bg-white/[0.06]" />
            <Skeleton className="h-5 w-10 bg-white/[0.06]" />
          </div>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <div key={index} className="h-[150px] rounded-[10px] border border-[var(--glass-line)] bg-[var(--glass-fill)] p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-[10px] bg-white/[0.06]" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-2/5 bg-white/[0.06]" />
                <Skeleton className="h-3 w-1/4 bg-white/[0.06]" />
              </div>
            </div>
            <Skeleton className="mt-5 h-3 w-4/5 bg-white/[0.06]" />
            <Skeleton className="mt-6 h-1.5 w-full rounded-full bg-white/[0.06]" />
          </div>
        ))}
      </div>
    </div>
  )
}

// The viewer's own clan, kept while moving between "Clans", "My clan" and "Appearance": each of those remounts a page, and without it
// the page first draws the tabs of a player without a clan and then redraws them once the answer arrives.
let lastMine: MyClanState | null = null

function ClanList({ onClanNavigate }: { onClanNavigate: (clanId: string) => void }) {
  const fee = useClanFee()
  const { isAuthenticated, loginWithSteam } = useAuth()
  const [creating, setCreating] = useState(() => new URLSearchParams(window.location.search).get("create") === "1")
  const [tab, setTab] = usePathTab<"all" | "appearance">("/clans", { all: "", appearance: "appearance" }, "all")
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState<"new" | "name">("new")
  const [limit, setLimit] = useState(PAGE_SIZE)
  const q = search.trim()
  const { data: clans, loading, error, refetch } = useApiQuery<ClanCard[]>(
    (signal) => clansService.getClans({ q: q || undefined, sort, limit }, { signal }),
    { queryKey: `${q}|${sort}|${limit}`, keepPreviousData: true },
  )
  const { data: mineData, loading: mineLoading, refetch: refetchMine } = useApiQuery<MyClanState>(
    (signal) => clansService.getMine({ signal }),
    { enabled: isAuthenticated, queryKey: String(isAuthenticated) },
  )
  useEffect(() => {
    if (!isAuthenticated) lastMine = null
    else if (mineData) lastMine = mineData
  }, [isAuthenticated, mineData])
  const mineState = mineData ?? (isAuthenticated ? lastMine : null)
  // Until we know whether the player has a clan, the tabs and the Create button wait instead of showing the wrong ones.
  const mineKnown = !isAuthenticated || mineState !== null || !mineLoading

  const mine = mineState?.membership ?? null
  const pending = mineState?.pendingClanIds ?? []
  const invites = mineState?.invites ?? []
  const list = clans ?? []
  const members = list.reduce((sum, clan) => sum + clan.currentPlayers, 0)
  const open = list.reduce((sum, clan) => sum + Math.max(0, clan.maxPlayers - clan.currentPlayers), 0)
  const changed = () => { void refetch(); void refetchMine() }
  const mayShowMore = list.length >= limit

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageBar>
        {mineKnown ? <PageTabs<"all" | "appearance" | "mine">
          ariaLabel="Clans"
          value={mine && tab === "appearance" ? "appearance" : "all"}
          onChange={(next) => {
            if (next === "mine" && mine) { onClanNavigate(String(mine.clan.number ?? mine.clan.id)); return }
            setTab(next === "appearance" ? "appearance" : "all")
          }}
          options={mine ? [{ value: "all", label: "Clans" }, { value: "mine", label: "My clan" }, { value: "appearance", label: "Appearance" }] : [{ value: "all", label: "All clans" }]}
        /> : <span />}
        <PageBarEnd>
          {mineKnown && !(mine && tab === "appearance") && (
            <>
              <div className="flex items-center gap-1 text-[13px]" role="group" aria-label="Sort">
                {(["new", "name"] as const).map((value) => (
                  <button key={value} type="button" aria-pressed={sort === value} onClick={() => setSort(value)} className={cn("h-8 rounded-md px-2.5 transition-colors", sort === value ? "bg-[var(--raised)] text-[var(--text)]" : "text-[var(--text-dim)] hover:text-[var(--text)]")}>{value === "new" ? "Newest" : "A–Z"}</button>
                ))}
              </div>
              <label className={pageSearchClass}>
                <Search className="size-4 shrink-0 text-[var(--text-dim)]" aria-hidden="true" />
                <input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setLimit(PAGE_SIZE) }} aria-label="Search clans" placeholder="Search clans" className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--text)] outline-none placeholder:text-[var(--text-dim)] [&::-webkit-search-cancel-button]:hidden" />
              </label>
            </>
          )}
          {mineKnown && !mine && (
            <button type="button" onClick={() => (isAuthenticated ? setCreating(true) : loginWithSteam())} className="lx-primary-button inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-[13px] font-semibold">
              <Plus className="size-4" aria-hidden="true" />
              Create clan{fee != null ? ` · ${fee.toLocaleString()}` : ""}
            </button>
          )}
        </PageBarEnd>
      </PageBar>

      <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-4 px-6 pb-4 pt-4">
          {invites.length > 0 && !mine && <Reveal><Invitations invites={invites} onChanged={changed} /></Reveal>}

          {!mineKnown && tab === "appearance" ? null : mine && tab === "appearance" ? (
            <ClanAppearancePanel clanId={String(mine.clan.id)} tag={mine.clan.tag} leader={mine.role === "leader"} />
          ) : (
            <>
              {!loading && !error && !q && (
                <div className="lx-stat-grid grid-cols-3">
                  {[{ label: "Clans", value: list.length }, { label: "Members", value: members }, { label: "Open slots", value: open }].map((stat) => (
                    <div key={stat.label} className="lx-stat-cell shadow-none!">
                      <span className="lx-stat-label">{stat.label}</span>
                      <span className="text-xl font-semibold leading-none text-[var(--text)]"><AnimatedNumber value={stat.value} /></span>
                    </div>
                  ))}
                </div>
              )}

              <QueryState loading={loading && list.length === 0} skeleton={<ClanListSkeleton />} error={error} empty={!loading && !error && list.length === 0} emptyMessage={q ? "No clan has that name." : "No clans yet."} onRetry={refetch} />

              {!error && list.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                  {list.map((clan) => (
                    <ClanCardItem key={clan.id} clan={clan} mine={mine} pending={pending.includes(clan.id)} canJoin={!mine} onClanNavigate={onClanNavigate} onChanged={changed} />
                  ))}
                </div>
              )}
              {!error && mayShowMore && (
                <button type="button" disabled={loading} onClick={() => setLimit((value) => value + PAGE_SIZE)} className="mx-auto inline-flex h-9 items-center rounded-lg border border-[var(--line)] bg-[var(--raised)] px-4 text-[13px] hover:border-[var(--line-strong)] disabled:opacity-50">Show more</button>
              )}
            </>
          )}
        </div>
      </div>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="lx-add-box rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5"><span className="lx-add-icon"><Users className="size-4" /></span>Create a clan</DialogTitle>
            <DialogDescription>
              {fee != null ? `${fee.toLocaleString()} LX` : "LX"} are taken from your wallet when the clan is created.
            </DialogDescription>
          </DialogHeader>
          <CreateClanForm onClose={() => setCreating(false)} onCreated={(clan) => { setCreating(false); changed(); onClanNavigate(String(clan.number ?? clan.id)) }} />
        </DialogContent>
      </Dialog>
    </div>
  )
}

/** Clans that invited the signed-in player. */
function Invitations({ invites, onChanged }: { invites: MyClanState["invites"]; onChanged: () => void }) {
  const [busy, setBusy] = useState("")
  const answer = async (clan: ClanCard, accept: boolean) => {
    setBusy(clan.id)
    try {
      if (accept) await clansService.acceptInvite(clan.id); else await clansService.declineInvite(clan.id)
      toast.success(accept ? `You joined ${clan.name}` : "Invitation declined")
      onChanged()
    } catch (error) {
      toast.error("That did not work", { description: failureMessage(error, "Try again in a moment.") })
    } finally {
      setBusy("")
    }
  }
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-dim)]">Invitations · {invites.length}</h2>
      {invites.map(({ clan }) => (
        <div key={clan.id} className="flex items-center gap-3 rounded-[10px] border border-[var(--glass-line)] bg-[var(--glass-fill)] p-3">
          <ClanMark logo={clan.logo} tag={clan.tag} className="size-10" />
          <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-medium">{clan.name}</span><span className="block text-[11px] text-[var(--text-dim)]">invited you · {clan.currentPlayers}/{clan.maxPlayers} members</span></span>
          <Button type="button" size="sm" disabled={busy === clan.id} onClick={() => void answer(clan, true)}>Join</Button>
          <Button type="button" variant="outline" size="sm" disabled={busy === clan.id} onClick={() => void answer(clan, false)}>Decline</Button>
        </div>
      ))}
    </section>
  )
}

/** Open or by request, as a small label. */
function JoinModeLabel({ mode, className }: { mode: ClanCard["joinMode"]; className?: string }) {
  const Icon = mode === "request" ? Lock : Globe
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[11px] text-[var(--text-dim)]", className)}>
      <Icon className="size-3.5" aria-hidden="true" />
      {mode === "request" ? "By request" : "Open"}
    </span>
  )
}

/** A clan's colour: the one it bought for its backdrop, else one of five calm hues picked from its tag (violet, orchid, emerald, teal, ruby). */
const CLAN_HUES = [262, 285, 152, 172, 350]
function clanAccent(clan: ClanCard): string {
  const own = clan.look?.backdrop?.from
  if (own && /^#[0-9a-fA-F]{6}$/.test(own)) return own
  let hash = 0
  for (const char of `${clan.tag}${clan.id}`) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return `hsl(${CLAN_HUES[hash % CLAN_HUES.length]} 70% 58%)`
}

/** Under a member's name in the roster: when they joined, and their share of the clan's EXP as a thin bar (both from the API's real numbers; left out when unknown). */
/** A member's role as an icon in the first column of the roster (owner request 2026-11-09): crown for the leader, shield for a manager, flag for a captain, a person for a member. */
function RoleIcon({ role }: { role: string }) {
  const Icon = role === "leader" ? Crown : role === "co-leader" ? ShieldCheck : role === "captain" ? Flag : User
  const tone = role === "leader" ? "text-[var(--brand-bright)]" : role === "co-leader" ? "text-[var(--text-2)]" : role === "captain" ? "text-[var(--text-muted)]" : "text-[var(--text-faint)]"
  return <span title={roleLabel(role)} className="flex w-5 shrink-0 justify-center"><Icon className={cn("size-4", tone)} aria-label={roleLabel(role)} /></span>
}

function RosterSub({ joinedAt, exp, total }: { joinedAt?: string | null; exp: number | null; total: number }) {
  const when = joinedAt && !Number.isNaN(Date.parse(joinedAt)) ? new Date(joinedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : null
  const share = exp !== null && total > 0 && exp > 0 ? Math.round((exp / total) * 100) : null
  if (!when && share === null) return null
  return (
    <span className="flex items-center gap-2 text-[10px] leading-none text-[var(--text-dim)]">
      {when && <span title="Joined the clan">Joined {when}</span>}
      {share !== null && (
        <span className="inline-flex items-center gap-1.5 max-md:hidden" title={`${share}% of the clan's EXP`}>
          <span className="h-[3px] w-12 overflow-hidden rounded-full bg-[var(--raised)]"><span className="block h-full rounded-full bg-[var(--text-2)]" style={{ width: `${Math.max(4, share)}%` }} /></span>{share}%
        </span>
      )}
    </span>
  )
}

/** What a clan's card tells besides its name, all from the API: a line about it, its numbers, and who is in it. Left out piece by piece when the API has nothing. */
function ClanCardPreview({ clan, accent, tint }: { clan: ClanCard; accent: string; tint: (percent: number) => string }) {
  const preview = clan.preview
  if (!preview) return null
  const winRate = preview.matches > 0 ? Math.round((preview.wins / preview.matches) * 100) : null
  const stats: Array<{ label: string; value: string }> = [
    { label: "Level", value: clan.level != null ? String(clan.level) : "–" },
    { label: "Total EXP", value: preview.totalExp > 0 ? preview.totalExp.toLocaleString() : "–" },
    { label: "Win rate", value: winRate != null ? `${winRate}%` : "–" },
  ]
  const more = Math.max(0, clan.currentPlayers - preview.members.length)
  return (
    <div className="flex flex-col gap-3">
      {preview.blurb && <p className="line-clamp-2 text-[12px] leading-snug text-[var(--text-muted)]">{preview.blurb}</p>}
      {/* Small facts, each only when the API has it: where it plays and whether it is looking for players. */}
      <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-[var(--text-dim)]">
        {clan.region && <span title="Region" className="inline-flex items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--card-surface)]/70 px-2 py-0.5"><Globe className="size-3" aria-hidden="true" />{clan.region}</span>}
        {clan.recruit && <span title="This clan reads answers before accepting" className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5" style={{ borderColor: tint(45), color: accent }}><UserPlus className="size-3" aria-hidden="true" />Recruiting</span>}
        {clan.currentPlayers >= clan.maxPlayers && <span className="inline-flex items-center gap-1 rounded-full border border-[var(--line)] px-2 py-0.5">Full</span>}
      </div>
      <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-lg" style={{ background: tint(18) }}>
        {stats.map((stat) => (
          <div key={stat.label} className="flex flex-col gap-0.5 bg-[var(--card-surface)]/85 px-2.5 py-2">
            <dt className="text-[10px] uppercase tracking-wide text-[var(--text-dim)]">{stat.label}</dt>
            <dd className="text-[15px] font-semibold leading-none text-[var(--text)]">{stat.value}</dd>
          </div>
        ))}
      </dl>
      {preview.matches > 0 && (
        <div className="flex flex-col gap-1" title={`${preview.wins} wins in ${preview.matches} ranked matches`}>
          <div className="flex items-center justify-between text-[10px] text-[var(--text-dim)]"><span>Ranked record</span><span>{preview.wins} W · {preview.matches - preview.wins} other</span></div>
          <div className="h-1 overflow-hidden rounded-full bg-[var(--raised)]"><div className="h-full rounded-full" style={{ width: `${Math.round((preview.wins / preview.matches) * 100)}%`, background: "var(--status-green)" }} /></div>
        </div>
      )}
      {preview.topPlayer && (
        <div className="flex items-center gap-2 text-[11px] text-[var(--text-dim)]" title="The member with the most EXP">
          <Trophy className="size-3.5 shrink-0" style={{ color: accent }} aria-hidden="true" />
          <span className="min-w-0 truncate"><span className="text-[var(--text-2)]">{preview.topPlayer.name}</span> · {preview.topPlayer.exp.toLocaleString()} EXP</span>
        </div>
      )}
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center" aria-label={`${preview.members.length} of ${clan.currentPlayers} members shown`}>
          {preview.members.map((member, index) => (
            <PlayerAvatar key={`${member.name}${index}`} avatar={member.avatar} name={member.name} style={{ width: 26, height: 26, fontSize: 10, marginLeft: index === 0 ? 0 : -8, boxShadow: `0 0 0 2px var(--card-surface)` }} className="relative shrink-0" />
          ))}
          {more > 0 && <span className="ml-1.5 text-[11px] text-[var(--text-dim)]">+{more}</span>}
        </span>
        {preview.leader && <span className="min-w-0 truncate text-[11px] text-[var(--text-dim)]" title={`Led by ${preview.leader.name}`}>Led by <span style={{ color: accent }}>{preview.leader.name}</span></span>}
      </div>
    </div>
  )
}

function ClanCardItem({ clan, mine, pending, canJoin, onClanNavigate, onChanged }: { clan: ClanCard; mine: MyClanState["membership"]; pending: boolean; canJoin: boolean; onClanNavigate: (clanId: string) => void; onChanged: () => void }) {
  const { isAuthenticated, loginWithSteam } = useAuth()
  const isFull = clan.currentPlayers >= clan.maxPlayers
  const isMine = mine?.clan.id === clan.id
  const fill = Math.round((clan.currentPlayers / Math.max(1, clan.maxPlayers)) * 100)
  const banner = clanArtSrc(clan.thumbnail)
  const [busy, setBusy] = useState(false)

  const act = async (action: () => Promise<void>, failure: string) => {
    setBusy(true)
    try {
      await action()
      onChanged()
    } catch (error) {
      toast.error(failure, { description: failureMessage(error, "Try again in a moment.") })
    } finally {
      setBusy(false)
    }
  }
  const [asking, setAsking] = useState(false)
  const [answers, setAnswers] = useState<string[]>([])
  const questions = clan.recruit?.questions ?? []
  const join = () => {
    if (!isAuthenticated) { loginWithSteam(); return }
    if (questions.length > 0 && !asking) { setAnswers(questions.map(() => "")); setAsking(true); return }
    setAsking(false)
    void act(async () => {
      const result = await clansService.joinClan(clan.id, questions.length > 0 ? answers.map((entry) => entry.trim()) : undefined)
      toast.success(result.status === "requested" ? `Request sent to ${clan.name}` : `You joined ${clan.name}`)
    }, "Could not join the clan")
  }

  const buttonClass = "relative inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--raised)] text-[13px] font-medium transition-colors hover:border-[var(--line-strong)] disabled:cursor-not-allowed disabled:opacity-50"
  const wash = backdropStyle(clan.look?.backdrop)
  const accent = clanAccent(clan)
  const baseTag = clanTagProps(clan.look, "w-fit text-[13px] font-semibold tracking-wide")
  const tagProps = clan.look?.tagColor ? baseTag : { ...baseTag, style: { ...baseTag.style, color: accent } }
  const tint = (percent: number) => `color-mix(in srgb, ${accent} ${percent}%, transparent)`
  return (
    <div className="lx-fx-card group relative isolate flex min-h-[270px] flex-col overflow-hidden rounded-2xl border border-[var(--line-soft)] bg-[var(--card-surface)] transition-colors hover:border-[var(--line-strong)]">
      <Dialog open={asking} onOpenChange={setAsking}>
        <DialogContent className="rounded-2xl">
          <DialogHeader><DialogTitle>Join {clan.name}</DialogTitle><DialogDescription>The leader reads your answers before accepting.</DialogDescription></DialogHeader>
          <form className="flex flex-col gap-4" onSubmit={(event) => { event.preventDefault(); join() }}>
            {questions.map((question, index) => (
              <div key={index} className="flex flex-col gap-1.5">
                <Label htmlFor={`recruit-${clan.id}-${index}`}>{question}</Label>
                <Input id={`recruit-${clan.id}-${index}`} maxLength={300} value={answers[index] ?? ""} onChange={(event) => setAnswers((current) => current.map((entry, at) => (at === index ? event.target.value : entry)))} autoComplete="off" />
              </div>
            ))}
            <div className="flex items-center justify-end gap-2">
              {answers.some((entry) => !entry.trim()) && <span role="status" className="mr-auto text-xs text-[var(--text-dim)]">Answer every question to send.</span>}
              <Button type="button" variant="outline" onClick={() => setAsking(false)}>Cancel</Button>
              <Button type="submit" disabled={busy || answers.length !== questions.length || answers.some((entry) => !entry.trim())}>Send request</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      {banner ? (
        <BannerArt src={banner} className="absolute inset-0 -z-10 transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100" />
      ) : (
        <div aria-hidden="true" className="absolute inset-0 -z-10 opacity-50" style={{ background: wash ?? `radial-gradient(120% 90% at 100% 0%, ${tint(45)}, transparent 62%)` }} />
      )}
      <span aria-hidden="true" className="absolute inset-x-0 top-0 z-[1] h-[3px]" style={{ background: `linear-gradient(90deg, ${accent}, transparent 85%)` }} />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-[var(--card-surface)] via-[var(--card-surface)]/75 to-[var(--card-surface)]/5" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 opacity-70 transition-opacity duration-300 group-hover:opacity-100" style={{ background: `radial-gradient(80% 55% at 85% 0%, ${tint(38)}, transparent 70%)` }} />
      <div className="relative flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-center justify-between gap-2">
          {clan.number != null ? <span className="rounded-full border border-[var(--line-strong)] bg-[var(--card-surface)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--text-2)]">#{clan.number}</span> : <span />}
          <JoinModeLabel mode={clan.joinMode} className="rounded-full border border-[var(--line)] bg-[var(--card-surface)] px-2.5 py-0.5" />
        </div>
        <button type="button" onClick={() => onClanNavigate(String(clan.number ?? clan.id))} className="mt-auto flex items-end gap-3.5 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60">
          <ClanMark logo={clan.logo} tag={clan.tag} className="size-[68px] rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.5)]" style={{ boxShadow: `0 8px 24px rgba(0,0,0,.5), 0 0 0 2px ${tint(55)}` }} />
          <span className="flex min-w-0 flex-col gap-1">
            <span className="truncate text-[19px] font-bold leading-tight" title={clan.name}>{clan.name}</span>
            <span {...tagProps}>[{clan.tag}]</span>
          </span>
        </button>

        {clan.preview && <ClanCardPreview clan={clan} accent={accent} tint={tint} />}

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[11px] text-[var(--text-dim)]">
            <span className="inline-flex items-center gap-1.5"><Users className="size-3.5" aria-hidden="true" /> Members</span>
            <span className={cn("font-semibold", isFull ? "text-[var(--text)]" : "text-[var(--text-dim)]")}>{clan.currentPlayers}/{clan.maxPlayers}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--raised)]">
            <div className="h-full rounded-full" style={{ width: `${fill}%`, background: accent }} />
          </div>
        </div>

        {isMine ? (
          <span className={cn(buttonClass, "text-[var(--text-dim)]")}><Check className="size-4" aria-hidden="true" /> Your clan</span>
        ) : pending ? (
          <button type="button" disabled={busy} onClick={() => void act(() => clansService.cancelRequest(clan.id), "Could not cancel the request")} className={buttonClass}>
            <X className="size-4" aria-hidden="true" /> Requested · cancel
          </button>
        ) : (
          <button type="button" disabled={isFull || busy || (isAuthenticated && !canJoin)} onClick={join} className={cn(buttonClass, !isFull && "lx-primary-button border-transparent font-semibold")}>
            <UserPlus className="size-4" aria-hidden="true" />
            {isFull ? "Full" : busy ? "Sending…" : clan.joinMode === "request" ? "Request to join" : "Join"}
          </button>
        )}
      </div>
    </div>
  )
}

function ClanDetailView({ clanId, onProfileNavigate }: { clanId: string; onProfileNavigate: (userId: string) => void }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmName, setConfirmName] = useState("")
  const { data: clan, loading, error, refetch } = useApiQuery<ClanDetail>((signal) => clansService.getClan(clanId, { signal }))
  // An address with the long id moves to the short one (/clans/1).
  useEffect(() => {
    if (clan?.number !== undefined && clanId !== String(clan.number)) navigate(`/clans/${clan.number}`, { replace: true })
  }, [clan?.number, clanId, navigate])
  const members = clan?.members ?? []
  // The role is known from the viewer's own clan before this clan has loaded, so the tabs do not change when it arrives.
  const knownRole = lastMine && [String(lastMine.membership?.clan.number ?? ""), String(lastMine.membership?.clan.id ?? "")].includes(clanId) ? lastMine.membership?.role : null
  const role = (clan?.viewer?.role ?? knownRole ?? null) as ClanRole | null
  const isLeader = role === "leader"
  const isManager = role === "leader" || role === "co-leader"
  const [section, setSection] = useState<ClanSection>("roster")
  // The Bank is for members: anyone else lands on the Roster.
  const shown: ClanSection = section === "bank" && !role ? "roster" : section

  const run = async (action: () => Promise<void>, done: string, after?: () => void) => {
    setBusy(true)
    try {
      await action()
      toast.success(done)
      if (after) after(); else void refetch()
    } catch (failure) {
      toast.error("That did not work", { description: failureMessage(failure, "Try again in a moment.") })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageBar>
        {role ? (
          <PageTabs<"all" | "appearance" | "mine">
            ariaLabel="Clans"
            value="mine"
            onChange={(next) => { if (next === "all") navigate("/clans"); else if (next === "appearance") navigate("/clans", { state: { tab: "appearance" } }) }}
            options={[{ value: "all", label: "Clans" }, { value: "mine", label: "My clan" }, { value: "appearance", label: "Appearance" }]}
          />
        ) : (
          <button type="button" onClick={() => navigate("/clans")} className="inline-flex h-11 items-center gap-2 text-[13px] text-[var(--text-dim)] transition-colors hover:text-[var(--text)]">
            <ArrowLeft className="size-4" aria-hidden="true" /> All clans
          </button>
        )}
        <PageBarEnd>
          {role && !isLeader && (
            <button type="button" disabled={busy} onClick={() => void run(() => clansService.leaveClan(clanId), "You left the clan", () => navigate("/clans"))} className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--raised)] px-3 text-[13px] hover:border-[var(--line-strong)] disabled:opacity-50">
              Leave clan
            </button>
          )}
          {isLeader && (
            <button
              type="button"
              disabled={busy}
              onClick={() => { setConfirmName(""); setDeleting(true) }}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--raised)] px-3 text-[13px] text-[var(--status-red)] hover:border-[var(--line-strong)] disabled:opacity-50"
            >
              Delete clan
            </button>
          )}
        </PageBarEnd>
      </PageBar>

      <div className="relative min-h-0 flex-1">
      <PageWash page={clan?.look?.page} />
      <div className="scrollbar-hidden relative size-full overflow-y-auto">
        <div className="@container flex flex-col gap-4 px-6 pb-4 pt-4">
          <QueryState loading={loading} error={error} empty={!loading && !error && !clan} emptyMessage="Clan not found." onRetry={refetch} />
          {!loading && !error && clan && (
            <>
              {/* The clan as a bento (owner request 2026-11-09): who the clan is on the left, with what its managers answer and do, and the roster, stats and bank on the right. */}
              <div className="grid gap-3 @4xl:grid-cols-12">
              <aside className="flex min-w-0 flex-col gap-3 @4xl:col-span-4">
              <section className="lx-glass relative overflow-hidden rounded-2xl">
              <ClanBannerStrip banner={clan.thumbnail} name={clan.name} />
              <div className="relative flex flex-col gap-4 p-5">
                <ClanMark logo={clan.logo} tag={clan.tag} className="size-16 text-[15px]" />
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <h1 className="flex min-w-0 items-center gap-2 text-[22px] font-semibold leading-tight"><span className="truncate">{clan.name} <span className="text-[13px] font-medium text-[var(--text-dim)]">[{clan.tag}]</span></span>{clan.level ? <span title="Clan level" className="shrink-0 rounded-full border border-[var(--line-strong)] px-2 py-0.5 text-[11px] font-semibold text-[var(--text-2)]">Lv {clan.level}</span> : null}</h1>
                  <p className="flex flex-wrap items-center gap-x-3 text-[13px] text-[var(--text-dim)]"><span>{clan.region} · {clan.currentPlayers}/{clan.maxPlayers} members</span><JoinModeLabel mode={clan.joinMode} /></p>
                  {clan.description && <p className="max-w-2xl text-[13px] text-[var(--text-dim)]">{clan.description}</p>}
                  <ClanLinksRow links={clan.links} />
                </div>
                {isManager && <button type="button" onClick={() => setEditing(true)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--raised)] px-3 text-[13px] hover:border-[var(--line-strong)]"><Pencil className="size-4" aria-hidden="true" /> Edit clan</button>}
              </div>
              </section>
              {isManager && shown === "roster" && <JoinRequests clanId={clanId} onAccepted={() => void refetch()} />}
              {isManager && shown === "roster" && <InvitePanel clanId={clanId} />}
              {isManager && shown === "roster" && <ActivityPanel clanId={clanId} />}
              </aside>
              <div className="flex min-w-0 flex-col gap-3 @4xl:col-span-8">
              <ClanSectionTabs value={shown} onChange={setSection} member={Boolean(role)} />
              {shown === "stats" && <ClanStatsPanel clanId={clanId} onProfileNavigate={onProfileNavigate} />}
              {shown === "bank" && <ClanBankPanel clan={clan} role={role} onChanged={() => void refetch()} onProfileNavigate={onProfileNavigate} />}
              {shown === "roster" && <>
              <section aria-label="Roster" className="flex flex-col gap-3">
                <h2 className="lx-shop-heading">Roster<span className="lx-shop-price !h-5 !text-[11px]">{clan.currentPlayers} / {clan.maxPlayers}</span></h2>
                {members.length === 0 ? (
                  <p className="text-[13px] text-[var(--text-dim)]">No members to show.</p>
                ) : (
                  <ul className="overflow-hidden rounded-xl border border-[var(--glass-line)] bg-[var(--glass-fill)]">
                    <li aria-hidden="true" className="flex h-9 items-center gap-1 border-b border-[var(--raised)] text-[11px] font-medium text-[var(--text-dim)] max-md:hidden">
                      <span className="flex min-w-0 flex-1 items-center gap-3 px-4"><span className="w-5 shrink-0" /><span>Player</span><span className="flex-1" /><span className="w-[150px] shrink-0 max-lg:hidden">Rank</span><span className="w-[70px] shrink-0 text-right">Matches</span><span className="w-[64px] shrink-0 text-right">Win rate</span><span className="w-[56px] shrink-0 text-right">K/D</span><span className="w-[96px] shrink-0 text-right max-xl:hidden">FACEIT</span></span>
                    </li>
                    {[...members].sort((x, y) => ROLE_ORDER.indexOf(x.role) - ROLE_ORDER.indexOf(y.role)).map((member) => {
                      const totalExp = members.reduce((sum, entry) => sum + (entry.stats?.currentExp ?? 0), 0)
                      return (
                        <li key={member.id} className="group relative isolate flex h-14 items-center gap-1 overflow-hidden border-b border-[var(--raised)] transition-[background-color] duration-500 last:border-b-0 hover:bg-[var(--raised)] hover:duration-200">
                          <NameBanner fx={member.banner} />
                          <span aria-hidden="true" className="absolute bottom-2 left-0 top-2 w-[3px] origin-center scale-y-0 rounded-r-full bg-[var(--brand-bright)] opacity-0 transition-[scale,opacity] duration-500 group-hover:scale-y-100 group-hover:opacity-100 group-hover:duration-300" />
                          <button type="button" onClick={() => onProfileNavigate(member.steamId || member.id)} className="flex h-full min-w-0 flex-1 items-center gap-3 px-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand)]/60">
                            <RoleIcon role={member.role} />
                            {/* A roster is a plain list: no frame light and no name glow (owner request 2026-11-02); the name keeps its colour. */}
                            <PlayerAvatar avatar={member.avatar} name={member.name} className="size-8 shrink-0 rounded-[9px] text-xs" />
                            <span className="flex min-w-0 flex-col gap-0.5">
                              <span {...nameProps(member.nameStyle ? { ...member.nameStyle, glow: null, glowFx: null } : null, "min-w-0 truncate text-[13px] font-medium leading-tight")}>{member.name}{member.id === user?.id ? " (you)" : ""}</span>
                              <PerkMark perk={member.perk} compact size={18} />
                              <RosterSub joinedAt={member.joinedAt} exp={member.stats?.currentExp ?? null} total={totalExp} />
                            </span>
                            <span className="min-w-0 flex-1" />
                            <span className="w-[150px] shrink-0 max-lg:hidden">{member.stats ? <RankLabel rankId={member.stats.rankId} rankName={member.stats.rankName} imageKey={member.stats.rankImageKey} currentExp={member.stats.currentExp} size={20} nameClassName="text-xs font-medium" /> : <span className="text-xs text-[var(--text-dim)]">Unranked</span>}</span>
                            <span className="w-[70px] shrink-0 text-right text-[13px] text-[var(--text-muted)] max-md:hidden" title="Ranked matches">{member.stats ? member.stats.matches.toLocaleString() : "—"}</span>
                            <span className="w-[64px] shrink-0 text-right text-[13px] text-[var(--text-muted)] max-md:hidden" title="Win rate">{member.stats?.winRate != null ? `${member.stats.winRate}%` : "—"}</span>
                            <span className="w-[56px] shrink-0 text-right text-[13px] text-[var(--text-muted)] max-md:hidden" title="K/D">{member.stats?.kd != null ? member.stats.kd.toFixed(2) : "—"}</span>
                            <span className="w-[96px] shrink-0 text-right text-[13px] text-[var(--text-muted)] max-xl:hidden" title={member.faceit ? `FACEIT ${member.faceit.username}` : "No FACEIT linked"}>{member.faceit ? `Lv ${member.faceit.level} · ${member.faceit.elo.toLocaleString()}` : "—"}</span>
                          </button>
                        </li>
                      )
                    })}
                    {Array.from({ length: Math.min(Math.max(clan.maxPlayers - members.length, 0), 3) }, (_, index) => (
                      <li key={`open-${index}`} className="flex h-14 items-center gap-3 border-b border-[var(--raised)] px-4 text-[var(--text-faint)] last:border-b-0">
                        <User className="size-4 w-5 shrink-0" aria-hidden="true" />
                        <span className="grid size-8 place-items-center rounded-[9px] border border-dashed border-[var(--line)]"><UserPlus className="size-3.5" aria-hidden="true" /></span>
                        <span className="text-[13px]">{index === 2 && clan.maxPlayers - members.length > 3 ? `+${clan.maxPlayers - members.length - 2} open slots` : "Open slot"}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              </>}
              </div>
              </div>
              <Dialog open={deleting} onOpenChange={setDeleting}>
                <DialogContent className="rounded-2xl">
                  <DialogHeader>
                    <DialogTitle>Delete {clan.name}?</DialogTitle>
                    <DialogDescription>
                      The clan and its members are removed for good. LX spent is not given back.
                    </DialogDescription>
                  </DialogHeader>
                  <form
                    className="flex flex-col gap-3"
                    onSubmit={(event) => { event.preventDefault(); if (confirmName.trim() === clan.name) { setDeleting(false); void run(() => clansService.deleteClan(clanId), "Clan deleted", () => navigate("/clans")) } }}
                  >
                    <Label htmlFor="clan-delete-name">Type the clan name <b className="text-[var(--text)]">{clan.name}</b> to confirm</Label>
                    <Input id="clan-delete-name" autoComplete="off" value={confirmName} onChange={(event) => setConfirmName(event.target.value)} placeholder={clan.name} />
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => setDeleting(false)} className="inline-flex h-9 items-center rounded-lg border border-[var(--line)] bg-[var(--raised)] px-3 text-[13px] hover:border-[var(--line-strong)]">Cancel</button>
                      <button type="submit" disabled={busy || confirmName.trim() !== clan.name} className="inline-flex h-9 items-center rounded-lg border border-[var(--status-red)]/60 bg-[var(--raised)] px-3 text-[13px] font-semibold text-[var(--status-red)] hover:border-[var(--status-red)] disabled:cursor-not-allowed disabled:opacity-40">Delete clan</button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
              <Sheet open={editing} onOpenChange={setEditing}>
                <DetailSheetContent width="max-w-3xl" fill>
                  <SheetTitle className="sr-only">Edit {clan.name}</SheetTitle>
                  <SheetDescription className="sr-only">Description, links, who may join, roles, hand over, name and pictures of {clan.name}.</SheetDescription>
                  <EditLook clan={clan} isLeader={isLeader} onChanged={() => void refetch()} />
                </DetailSheetContent>
              </Sheet>

                    </>
          )}
        </div>
      </div>
      </div>
    </div>
  )
}

function CreateClanForm({ onClose, onCreated }: { onClose: () => void; onCreated: (clan: ClanDetail) => void }) {
  const fee = useClanFee()
  const [name, setName] = useState("")
  const [tag, setTag] = useState("")
  const [joinMode, setJoinMode] = useState<"open" | "request">("open")
  const [maxPlayers, setMaxPlayers] = useState(10)
  const [files, setFiles] = useState<Partial<Record<ClanArtKind, { file: File; url: string }>>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const valid = name.trim().length >= 3 && /^[A-Za-z0-9]{2,5}$/.test(tag) && maxPlayers >= 2 && maxPlayers <= 50

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!valid || submitting) return
    setSubmitting(true)
    setError("")
    try {
      const created = await clansService.createClan({ name: name.trim(), tag: tag.trim().toUpperCase(), joinMode, maxPlayers })
      // The clan exists now, so its pictures can go up. A failed picture never undoes the clan.
      for (const kind of ["logo", "banner"] as const) {
        const chosen = files[kind]
        if (!chosen) continue
        try { await clansService.uploadArt(created.id, kind, chosen.file) } catch { toast.error(`The ${kind} was not saved`, { description: "Add it from the clan page with Edit clan." }) }
      }
      onCreated(created)
    } catch (failure) {
      setError(failureMessage(failure, "Could not create the clan right now. Try again."))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="mt-2 flex flex-col gap-4" onSubmit={(event) => void submit(event)}>
      <div className="flex flex-col gap-2">
        <Label htmlFor="clan-name">Clan name</Label>
        <Input id="clan-name" placeholder="3-24 characters" minLength={3} maxLength={24} required value={name} onChange={(event) => setName(event.target.value)} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="clan-tag">Clan tag</Label>
        <Input id="clan-tag" placeholder="e.g. WOLF" minLength={2} maxLength={5} required value={tag} onChange={(event) => setTag(event.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase())} />
      </div>
      <JoinSettings joinMode={joinMode} maxPlayers={maxPlayers} onMode={setJoinMode} onMax={setMaxPlayers} />
      {(["logo", "banner"] as const).map((kind) => (
        <ArtSlot key={kind} kind={kind} preview={files[kind]?.url ?? null} onPick={(file) => setFiles((current) => ({ ...current, [kind]: { file, url: URL.createObjectURL(file) } }))} onRemove={() => setFiles((current) => ({ ...current, [kind]: undefined }))} />
      ))}
      {error && <p role="alert" className="text-[13px] text-[var(--status-red)]">{error}</p>}
      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={submitting}><X className="size-4" /> Cancel</Button>
        <button type="submit" disabled={!valid || submitting} className="lx-primary-button inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-[13px] font-semibold disabled:opacity-50">
          <Coins className="size-4" aria-hidden="true" />
          {submitting ? "Creating…" : `Create${fee != null ? ` · ${fee.toLocaleString()} LX` : ""}`}
        </button>
      </div>
    </form>
  )
}

/** Open or private, and the player limit. */
function JoinSettings({ joinMode, maxPlayers, onMode, onMax }: { joinMode: "open" | "request"; maxPlayers: number; onMode: (mode: "open" | "request") => void; onMax: (value: number) => void }) {
  const options = [{ mode: "open" as const, Icon: Globe, title: "Public", note: "Anyone can join" }, { mode: "request" as const, Icon: Lock, title: "Private", note: "Players send a request" }]
  return (
    <>
      <div className="flex flex-col gap-2">
        <Label>Who can join</Label>
        <div className="grid grid-cols-2 gap-2">
          {options.map(({ mode, Icon, title, note }) => (
            <button key={mode} type="button" aria-pressed={joinMode === mode} onClick={() => onMode(mode)} className={cn("flex items-center gap-3 rounded-lg border p-3 text-left transition-colors", joinMode === mode ? "border-[var(--accent-solid)] bg-[var(--raised)]" : "border-[var(--line)] hover:border-[var(--line-strong)] hover:bg-[var(--raised)]")}>
              <Icon className="size-[18px] shrink-0 text-[var(--text-dim)]" aria-hidden="true" />
              <span className="flex flex-col"><span className="text-[13px] font-medium">{title}</span><span className="text-[11px] text-[var(--text-dim)]">{note}</span></span>
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="clan-max">Max players</Label>
        <Input id="clan-max" type="number" min={2} max={50} value={maxPlayers} onChange={(event) => onMax(Math.max(0, Math.min(50, Math.floor(Number(event.target.value) || 0))))} className="w-28" />
      </div>
    </>
  )
}

/** The leader's list of players waiting to get in. Shown only for a clan that takes requests, or while some are waiting. */
function JoinRequests({ clanId, onAccepted }: { clanId: string; onAccepted: () => void }) {
  const { data, loading, error, refetch } = useApiQuery<ClanJoinRequest[]>((signal) => clansService.getRequests(clanId, { signal }))
  const [busy, setBusy] = useState("")
  const requests = data ?? []
  if (loading || error || requests.length === 0) return null
  const answer = async (request: ClanJoinRequest, accept: boolean) => {
    setBusy(request.id)
    try {
      await (accept ? clansService.acceptRequest(clanId, request.id) : clansService.declineRequest(clanId, request.id))
      toast.success(accept ? `${request.name} joined the clan` : "Request declined")
      void refetch()
      if (accept) onAccepted()
    } catch (failure) {
      toast.error("That did not work", { description: failureMessage(failure, "Try again in a moment.") })
    } finally {
      setBusy("")
    }
  }
  return (
    <Reveal>
    <section className="flex flex-col gap-3">
      <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-dim)]"><UserPlus className="size-3.5" aria-hidden="true" /> Join requests · {requests.length}</h2>
      <div className="grid gap-3">
        {requests.map((request) => (
          <div key={request.id} className="lx-shop-tile flex flex-col gap-2.5 rounded-xl p-3">
            <div className="flex items-center gap-3">
              <PlayerAvatar avatar={request.avatar} name={request.name} className="size-10 rounded-[10px] text-sm" />
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{request.name}</span>
              <button type="button" disabled={busy === request.id} aria-label={`Accept ${request.name}`} onClick={() => void answer(request, true)} className="flex size-8 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--raised)] text-[var(--status-green)] transition-colors hover:border-[var(--line-strong)] disabled:opacity-50"><Check className="size-4" aria-hidden="true" /></button>
              <button type="button" disabled={busy === request.id} aria-label={`Decline ${request.name}`} onClick={() => void answer(request, false)} className="flex size-8 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--raised)] text-[var(--text-dim)] transition-colors hover:border-[var(--line-strong)] hover:text-[var(--text)] disabled:opacity-50"><X className="size-4" aria-hidden="true" /></button>
            </div>
            {(request.answers ?? []).map((entry, index) => (
              <div key={index} className="flex flex-col gap-0.5 border-t border-[var(--line-soft)] pt-2">
                <span className="text-[11px] text-[var(--text-dim)]">{entry.q}</span>
                <span className="break-words text-[13px] text-[var(--text)]">{entry.a}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
    </Reveal>
  )
}

function RecruitmentSettings({ clan, onChanged }: { clan: ClanDetail; onChanged: () => void }) {
  const [busy, setBusy] = useState(false)
  const [enabled, setEnabled] = useState(clan.recruitment?.enabled ?? false)
  const [questions, setQuestions] = useState<string[]>(clan.recruitment?.questions ?? [])
  const saved = clan.recruitment
  const cleaned = questions.map((question) => question.trim()).filter(Boolean)
  const unchanged = enabled === (saved?.enabled ?? false) && cleaned.join("\n") === (saved?.questions ?? []).join("\n")
  const save = async () => {
    setBusy(true)
    try {
      await clansService.setRecruitment(clan.id, { enabled, questions: cleaned })
      toast.success(enabled ? "Recruitment is on" : "Recruitment is off")
      onChanged()
    } catch (error) {
      toast.error("Could not save", { description: failureMessage(error, "Try again in a moment.") })
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-3">
        <Label>Recruitment</Label>
        <button type="button" role="switch" aria-checked={enabled} onClick={() => setEnabled((current) => !current)} className={cn("relative h-6 w-11 rounded-full border transition-colors", enabled ? "border-[var(--brand)] bg-[var(--brand)]/40" : "border-[var(--line)] bg-[var(--raised)]")}>
          <span className={cn("absolute top-0.5 size-4 rounded-full bg-[var(--text)] transition-all", enabled ? "left-[22px]" : "left-0.5")} />
        </button>
      </div>
      {enabled && (
        <>
          <p className="text-[11px] text-[var(--text-dim)]">Players answer these before asking to join, and you read the answers beside the request. The clan takes requests while this is on.</p>
          {[0, 1, 2].map((index) => (
            <Input key={index} maxLength={100} value={questions[index] ?? ""} onChange={(event) => setQuestions((current) => { const next = [...current]; next[index] = event.target.value; return next })} placeholder={["Question 1, e.g. How many hours do you play?", "Question 2 (optional)", "Question 3 (optional)"][index]} aria-label={`Question ${index + 1}`} autoComplete="off" />
          ))}
        </>
      )}
      <button type="button" disabled={busy || unchanged} onClick={() => void save()} className="lx-primary-button inline-flex h-9 items-center justify-center self-start rounded-lg px-4 text-[13px] font-semibold disabled:opacity-50">Save recruitment</button>
    </div>
  )
}
function EditLook({ clan, isLeader, onChanged }: { clan: ClanDetail; isLeader: boolean; onChanged: () => void }) {
  const [busy, setBusy] = useState(false)
  const [description, setDescription] = useState(clan.description ?? "")
  const [joinMode, setJoinMode] = useState(clan.joinMode)
  const [maxPlayers, setMaxPlayers] = useState(clan.maxPlayers)
  const [linkFields, setLinkFields] = useState(() => clanLinkFields(clan.links))
  const run = async (action: () => Promise<unknown>, done: string) => {
    setBusy(true)
    try {
      await action()
      toast.success(done)
      onChanged()
    } catch (error) {
      toast.error("Could not save", { description: failureMessage(error, "Try again in a moment.") })
    } finally {
      setBusy(false)
    }
  }
  const tooFew = maxPlayers < Math.max(2, clan.currentPlayers)
  const unchanged = joinMode === clan.joinMode && maxPlayers === clan.maxPlayers && description.trim() === (clan.description ?? "") && JSON.stringify(clanLinksFromFields(linkFields)) === JSON.stringify(clanLinksFromFields(clanLinkFields(clan.links)))
  const section = (id: string, title: string, hint: string, children: React.ReactNode) => (
    <section id={id} aria-labelledby={`${id}-title`} className="flex flex-col gap-4 rounded-xl border border-[var(--line)] bg-[var(--card-surface)] p-4 max-sm:p-3.5">
      <div className="flex flex-col gap-0.5">
        <h3 id={`${id}-title`} className="text-[15px] font-semibold text-[var(--text)]">{title}</h3>
        <p className="text-[12px] leading-snug text-[var(--text-dim)]">{hint}</p>
      </div>
      {children}
    </section>
  )
  const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
  const parts: Array<[string, string]> = !isLeader ? [["edit-people", "People"]] : isLeader ? [["edit-about", "About"], ["edit-joining", "Joining"], ["edit-people", "People"], ["edit-look", "Pictures"], ["edit-name", "Name"]] : [["edit-about", "About"], ["edit-joining", "Joining"], ["edit-look", "Pictures"]]
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex shrink-0 items-center gap-3.5 border-b border-[var(--line-soft)] px-6 pb-4 pt-1 max-sm:px-4">
        <ClanMark logo={clan.logo} tag={clan.tag} className="size-12 rounded-xl text-[13px]" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex items-baseline gap-2"><h2 className="truncate text-[18px] font-semibold text-[var(--text)]">Edit {clan.name}</h2><span className="shrink-0 text-[12px] text-[var(--text-dim)]">[{clan.tag}]</span></span>
          <span className="truncate text-[12px] text-[var(--text-dim)]">{clan.level != null ? `Level ${clan.level} · ` : ""}{clan.currentPlayers}/{clan.maxPlayers} members{clan.region ? ` · ${clan.region}` : ""} · {clan.joinMode === "request" ? "By request" : "Open to all"}</span>
        </div>
      </header>
      <nav aria-label="Sections" className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-[var(--line-soft)] px-6 py-2.5 scrollbar-hidden max-sm:px-4">
        {parts.map(([id, label]) => <button key={id} type="button" onClick={() => jump(id)} className="inline-flex h-7 shrink-0 items-center rounded-full border border-[var(--line)] px-3 text-[12px] text-[var(--text-dim)] transition-colors hover:border-[var(--line-strong)] hover:text-[var(--text)]">{label}</button>)}
      </nav>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-4 max-sm:px-4">
        {isLeader && section("edit-about", "About", "What players see first on the clan's page and card.", <>
          <div className="flex flex-col gap-2">
            <Label htmlFor="clan-description">Description</Label>
            <textarea id="clan-description" maxLength={200} rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What is your clan about?" className="w-full resize-none rounded-lg border border-[var(--line)] bg-[var(--glass-fill)] p-3 text-[13px] leading-6 text-[var(--text)] outline-none transition-colors placeholder:text-[var(--text-faint)] focus-visible:border-[var(--line-strong)]" />
            <span className="text-right text-[11px] text-[var(--text-dim)]">{description.length}/200</span>
          </div>
          <ClanLinksEditor value={linkFields} onChange={setLinkFields} />
        </>)}
        {isLeader && section("edit-joining", "Joining", "How players get in and how many fit.", <>
          <JoinSettings joinMode={joinMode} maxPlayers={maxPlayers} onMode={setJoinMode} onMax={setMaxPlayers} />
          {tooFew && <p className="text-[13px] text-[var(--status-red)]">The clan already has {clan.currentPlayers} members.</p>}
          {isLeader && <RecruitmentSettings key={`${clan.recruitment?.enabled}:${(clan.recruitment?.questions ?? []).join("|")}`} clan={clan} onChanged={onChanged} />}
        </>)}
        {section("edit-people", "People", isLeader ? "Who does what, who leads and who is removed." : "Remove captains and members.", <>
          <ManagersSection clan={clan} viewerRole={isLeader ? "leader" : "co-leader"} onChanged={onChanged} />
        </>)}
        {isLeader && section("edit-look", "Pictures", "The logo shows on cards and lists; the banner sits above the clan's page.", <>
      <ArtSlot kind="logo" busy={busy} preview={clanArtSrc(clan.logo)} onPick={(file) => void run(() => clansService.uploadArt(clan.id, "logo", file), "Logo saved")} onRemove={() => void run(() => clansService.removeArt(clan.id, "logo"), "Logo removed")} />
      <ArtSlot kind="banner" busy={busy} preview={clanArtSrc(clan.thumbnail)} onPick={(file) => void run(() => clansService.uploadArt(clan.id, "banner", file), "Banner saved")} onRemove={() => void run(() => clansService.removeArt(clan.id, "banner"), "Banner removed")} />
        </>)}
        {isLeader && section("edit-name", "Name and tag", "Renaming costs LX and can be done once a week.", <RenameForm clan={clan} onChanged={onChanged} />)}
      </div>
      {isLeader && (
      <footer className="flex shrink-0 flex-wrap items-center justify-end gap-3 border-t border-[var(--line-soft)] bg-[var(--panel)] px-6 py-3 max-sm:px-4">
        {!unchanged && !tooFew && <span role="status" className="mr-auto inline-flex items-center gap-1.5 text-[12px] text-[var(--text-2)]"><span aria-hidden="true" className="size-1.5 rounded-full bg-[var(--accent-solid)]" />Not saved yet</span>}
        <button type="button" disabled={busy || tooFew || unchanged} onClick={() => void run(() => clansService.updateClan(clan.id, { description: description.trim(), joinMode, maxPlayers, links: clanLinksFromFields(linkFields) }), "Clan saved")} className="lx-primary-button inline-flex h-10 items-center rounded-lg px-5 text-[13px] font-semibold disabled:opacity-50">{busy ? "Saving…" : "Save changes"}</button>
      </footer>
      )}
    </div>
  )
}
