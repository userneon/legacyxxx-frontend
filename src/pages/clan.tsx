import { createPortal } from "react-dom"
import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Check, Coins, Globe, Lock, Pencil, Plus, Search, Upload, UserPlus, Users, X } from "lucide-react"
import { toast } from "sonner"


import { cn } from "@/lib/utils"
import { clansService, type ClanLook } from "@/api"
import { ClanBackground } from "@/components/clan-background"
import { ClanAppearancePanel } from "@/components/shop-clan"
import { CLAN_ART_RULES, clanArtProblem, clanArtSrc, type ClanArtKind } from "@/api/clans"
import type { ClanCard, ClanDetail, ClanJoinRequest, ClanRole, MyClanState } from "@/api/types"
import { ClanMark } from "@/components/clan-mark"
import { ActivityPanel, ManagersSection, CLAN_FEE, InvitePanel, MemberControls, ModerateClan, RenameForm, clanFailure, roleLabel } from "@/components/clan-manage"
import { Button } from "@/components/ui/button"
import { PageBar, PageBarEnd, PageTabs, pageSearchClass } from "@/components/page-tabs"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"
import { QueryState } from "@/components/query-state"
import { AnimatedNumber } from "@/components/animated-number"
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


/**
 * The clan's page background paints the whole window, sidebar and top bar included: a fixed layer behind the (transparent)
 * shell. An animated one (from react-bits) is loaded only when a clan wears it.
 */
function PageWash({ page }: { page: ClanLook["page"] | undefined }) {
  if (!pageBackground(page) || !page) return null
  const calm = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  return createPortal(<div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-[1]"><ClanBackground page={page} calm={calm} /></div>, document.body)
}

/** The clan's banner (a picture or a GIF) fills the whole header box behind its logo, name and description, under a fade so the text stays readable. */
function ClanBannerBackdrop({ banner }: { banner?: string | null }) {
  const src = clanArtSrc(banner)
  if (!src) return null
  return (
    <>
      <img src={src} alt="" className="absolute inset-0 size-full object-cover" />
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-[var(--card-surface)]/90 via-[var(--card-surface)]/60 to-[var(--card-surface)]/15" />
    </>
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

function ClanList({ onClanNavigate }: { onClanNavigate: (clanId: string) => void }) {
  const { isAuthenticated, loginWithSteam } = useAuth()
  const [creating, setCreating] = useState(() => new URLSearchParams(window.location.search).get("create") === "1")
  const [tab, setTab] = useState<"all" | "appearance">(() => (new URLSearchParams(window.location.search).get("tab") === "appearance" ? "appearance" : "all"))
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState<"new" | "name">("new")
  const [limit, setLimit] = useState(PAGE_SIZE)
  const q = search.trim()
  const { data: clans, loading, error, refetch } = useApiQuery<ClanCard[]>(
    (signal) => clansService.getClans({ q: q || undefined, sort, limit }, { signal }),
    { queryKey: `${q}|${sort}|${limit}`, keepPreviousData: true },
  )
  const { data: mineState, refetch: refetchMine } = useApiQuery<MyClanState>(
    (signal) => clansService.getMine({ signal }),
    { enabled: isAuthenticated, queryKey: String(isAuthenticated) },
  )

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
        <PageTabs<"all" | "appearance" | "mine">
          ariaLabel="Clans"
          value={mine && tab === "appearance" ? "appearance" : "all"}
          onChange={(next) => {
            if (next === "mine" && mine) { onClanNavigate(String(mine.clan.number ?? mine.clan.id)); return }
            setTab(next === "appearance" ? "appearance" : "all")
          }}
          options={mine ? [{ value: "all", label: "Clans" }, { value: "mine", label: "My clan" }, { value: "appearance", label: "Appearance" }] : [{ value: "all", label: "All clans" }]}
        />
        <PageBarEnd>
          {!(mine && tab === "appearance") && (
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
          {!mine && (
            <button type="button" onClick={() => (isAuthenticated ? setCreating(true) : loginWithSteam())} className="lx-primary-button inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-[13px] font-semibold">
              <Plus className="size-4" aria-hidden="true" />
              Create clan · {CLAN_FEE}
            </button>
          )}
        </PageBarEnd>
      </PageBar>

      <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-4 px-6 pb-4 pt-4">
          {invites.length > 0 && !mine && <Invitations invites={invites} onChanged={changed} />}

          {mine && tab === "appearance" ? (
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

              <QueryState loading={loading && list.length === 0} error={error} empty={!loading && !error && list.length === 0} emptyMessage={q ? "No clan has that name." : "No clans yet."} onRetry={refetch} />

              {!error && list.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Create a clan</DialogTitle>
            <DialogDescription>
              {CLAN_FEE} LX are taken from your wallet when the clan is created. You choose who can join and how many players it holds.
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

function ClanCardItem({ clan, mine, pending, canJoin, onClanNavigate, onChanged }: { clan: ClanCard; mine: MyClanState["membership"]; pending: boolean; canJoin: boolean; onClanNavigate: (clanId: string) => void; onChanged: () => void }) {
  const { isAuthenticated, loginWithSteam } = useAuth()
  const isFull = clan.currentPlayers >= clan.maxPlayers
  const isMine = mine?.clan.id === clan.id
  const fill = Math.round((clan.currentPlayers / Math.max(1, clan.maxPlayers)) * 100)
  const banner = clanArtSrc(clan.thumbnail)
  const backdrop = backdropStyle(clan.look?.backdrop)
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
  const join = () => {
    if (!isAuthenticated) { loginWithSteam(); return }
    void act(async () => {
      const result = await clansService.joinClan(clan.id)
      toast.success(result.status === "requested" ? `Request sent to ${clan.name}` : `You joined ${clan.name}`)
    }, "Could not join the clan")
  }

  const buttonClass = "relative inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--raised)] text-[13px] font-medium transition-colors hover:border-[var(--line-strong)] disabled:cursor-not-allowed disabled:opacity-50"
  return (
    <div className="relative flex min-h-[210px] flex-col overflow-hidden rounded-[10px] border border-[var(--glass-line)] bg-[var(--card-surface)] transition-[border-color] duration-200 hover:border-[var(--line-strong)]">
      {backdrop ? <div aria-hidden="true" className="absolute inset-0" style={{ backgroundImage: backdrop }} /> : banner && <img src={banner} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />}
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-[var(--card-surface)] via-[var(--card-surface)]/85 to-[var(--card-surface)]/35" />
      <div className="relative flex flex-1 flex-col gap-4 p-4">
        <button type="button" onClick={() => onClanNavigate(String(clan.number ?? clan.id))} className="flex items-center gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60">
          <ClanMark logo={clan.logo} tag={clan.tag} className="size-12" />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-[15px] font-semibold">{clan.name}</span>
            <JoinModeLabel mode={clan.joinMode} />
          </span>
        </button>

        <div className="mt-auto flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-[11px] text-[var(--text-dim)]">
            <span className="inline-flex items-center gap-1.5"><Users className="size-3.5" aria-hidden="true" /> Members</span>
            <span className={cn("font-semibold", isFull ? "text-[var(--text)]" : "text-[var(--text-dim)]")}>{clan.currentPlayers}/{clan.maxPlayers}</span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-[var(--raised)]">
            <div className="h-full rounded-full bg-[var(--accent-solid)]" style={{ width: `${fill}%` }} />
          </div>
        </div>

        {isMine ? (
          <span className={cn(buttonClass, "text-[var(--text-dim)]")}><Check className="size-4" aria-hidden="true" /> Your clan</span>
        ) : pending ? (
          <button type="button" disabled={busy} onClick={() => void act(() => clansService.cancelRequest(clan.id), "Could not cancel the request")} className={buttonClass}>
            <X className="size-4" aria-hidden="true" /> Requested · cancel
          </button>
        ) : (
          <button type="button" disabled={isFull || busy || (isAuthenticated && !canJoin)} onClick={join} className={buttonClass}>
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
  const role = (clan?.viewer?.role ?? null) as ClanRole | null
  const isLeader = role === "leader"
  const isManager = role === "leader" || role === "co-leader"
  const canModerate = Boolean(clan?.viewer?.canModerate)

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
            onChange={(next) => { if (next === "all") navigate("/clans"); else if (next === "appearance") navigate("/clans?tab=appearance") }}
            options={[{ value: "all", label: "Clans" }, { value: "mine", label: "My clan" }, { value: "appearance", label: "Appearance" }]}
          />
        ) : (
          <button type="button" onClick={() => navigate("/clans")} className="inline-flex h-11 items-center gap-2 text-[13px] text-[var(--text-dim)] transition-colors hover:text-[var(--text)]">
            <ArrowLeft className="size-4" aria-hidden="true" /> All clans
          </button>
        )}
        <PageBarEnd>
          {canModerate && clan && <ModerateClan key={`${clan.name}:${clan.tag}:${clan.description ?? ""}`} clan={clan} onChanged={() => void refetch()} onDeleted={() => navigate("/clans")} />}
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
        <div className="flex flex-col gap-4 px-6 pb-4 pt-4">
          <QueryState loading={loading} error={error} empty={!loading && !error && !clan} emptyMessage="Clan not found." onRetry={refetch} />
          {!loading && !error && clan && (
            <>
              <section className="relative overflow-hidden rounded-[10px] border border-[var(--glass-line)] bg-[var(--glass-fill)]">
              {backdropStyle(clan.look?.backdrop) && <div aria-hidden="true" className="absolute inset-0 opacity-70" style={{ backgroundImage: backdropStyle(clan.look?.backdrop) }} />}
              <ClanBannerBackdrop banner={clan.thumbnail} />
              <div className="relative flex flex-wrap items-center gap-4 p-6">
                <ClanMark logo={clan.logo} tag={clan.tag} className="size-16 text-[15px]" />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <h1 className="truncate text-[22px] font-semibold leading-tight">{clan.name} <span {...clanTagProps(clan.look, "text-[13px] font-medium text-[var(--text-dim)]")}>[{clan.tag}]</span></h1>
                  <p className="flex flex-wrap items-center gap-x-3 text-[13px] text-[var(--text-dim)]"><span>{clan.region} · {clan.currentPlayers}/{clan.maxPlayers} members</span><JoinModeLabel mode={clan.joinMode} /></p>
                  {clan.description && <p className="max-w-2xl text-[13px] text-[var(--text-dim)]">{clan.description}</p>}
                </div>
                {isLeader && <button type="button" onClick={() => setEditing(true)} className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--raised)] px-3 text-[13px] hover:border-[var(--line-strong)]"><Pencil className="size-4" aria-hidden="true" /> Edit clan</button>}
              </div>
              </section>
              <Dialog open={deleting} onOpenChange={setDeleting}>
                <DialogContent className="rounded-2xl">
                  <DialogHeader>
                    <DialogTitle>Delete {clan.name}?</DialogTitle>
                    <DialogDescription>
                      The clan, its members list and any extra places are removed for good, and the LX spent on the clan and its places are not given back. The appearance you bought (tag colour, glow, backgrounds) stays yours and can be worn by your next clan. This cannot be undone.
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
              <Dialog open={editing} onOpenChange={setEditing}>
                <DialogContent className="rounded-2xl">
                  <DialogHeader><DialogTitle>Edit clan</DialogTitle><DialogDescription>Description, who may join, how many players and the pictures of {clan.name}.</DialogDescription></DialogHeader>
                  <EditLook clan={clan} isLeader={isLeader} onChanged={() => void refetch()} />
                </DialogContent>
              </Dialog>

              {isManager && <JoinRequests clanId={clanId} onAccepted={() => void refetch()} />}

              <section className="flex flex-col gap-3">
                <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-dim)]"><Users className="size-3.5" aria-hidden="true" /> Members</h2>
                {members.length === 0 ? (
                  <p className="text-[13px] text-[var(--text-dim)]">No members to show.</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {members.map((member) => (
                      <div key={member.id} className="flex items-center gap-1 rounded-[10px] border border-[var(--glass-line)] bg-[var(--glass-fill)] transition-[border-color] duration-200 hover:border-[var(--line-strong)]">
                        <button type="button" onClick={() => onProfileNavigate(member.id)} className="flex min-w-0 flex-1 items-center gap-3 rounded-[10px] p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60">
                          <PlayerAvatar avatar={member.avatar} name={member.name} frame={member.frame} className="size-10 rounded-[10px] text-sm" />
                          <span className="min-w-0">
                            <span {...nameProps(member.nameStyle, "block truncate text-[13px] font-medium")}>{member.name}{member.id === user?.id ? " (you)" : ""}</span>
                            <span className="block text-[11px] text-[var(--text-dim)]">{roleLabel(member.role)}</span>
                          </span>
                        </button>
                        {member.id !== user?.id && <MemberControls clanId={clanId} member={member} viewerRole={role} onChanged={() => void refetch()} />}
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {isManager && <InvitePanel clanId={clanId} />}
              {isManager && <ActivityPanel clanId={clanId} />}
                    </>
          )}
        </div>
      </div>
      </div>
    </div>
  )
}

function CreateClanForm({ onClose, onCreated }: { onClose: () => void; onCreated: (clan: ClanDetail) => void }) {
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
          {submitting ? "Creating…" : `Create · ${CLAN_FEE} LX`}
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
    <section className="flex flex-col gap-3">
      <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-dim)]"><UserPlus className="size-3.5" aria-hidden="true" /> Join requests · {requests.length}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {requests.map((request) => (
          <div key={request.id} className="flex items-center gap-3 rounded-[10px] border border-[var(--glass-line)] bg-[var(--glass-fill)] p-3">
            <PlayerAvatar avatar={request.avatar} name={request.name} className="size-10 rounded-[10px] text-sm" />
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{request.name}</span>
            <button type="button" disabled={busy === request.id} aria-label={`Accept ${request.name}`} onClick={() => void answer(request, true)} className="flex size-8 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--raised)] text-[var(--status-green)] transition-colors hover:border-[var(--line-strong)] disabled:opacity-50"><Check className="size-4" aria-hidden="true" /></button>
            <button type="button" disabled={busy === request.id} aria-label={`Decline ${request.name}`} onClick={() => void answer(request, false)} className="flex size-8 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--raised)] text-[var(--text-dim)] transition-colors hover:border-[var(--line-strong)] hover:text-[var(--text)] disabled:opacity-50"><X className="size-4" aria-hidden="true" /></button>
          </div>
        ))}
      </div>
    </section>
  )
}

function EditLook({ clan, isLeader, onChanged }: { clan: ClanDetail; isLeader: boolean; onChanged: () => void }) {
  const [busy, setBusy] = useState(false)
  const [description, setDescription] = useState(clan.description ?? "")
  const [joinMode, setJoinMode] = useState(clan.joinMode)
  const [maxPlayers, setMaxPlayers] = useState(clan.maxPlayers)
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
  const unchanged = joinMode === clan.joinMode && maxPlayers === clan.maxPlayers && description.trim() === (clan.description ?? "")
  return (
    <div className="mt-2 flex max-h-[70vh] flex-col gap-5 overflow-y-auto pr-1">
      <div className="flex flex-col gap-2">
        <Label htmlFor="clan-description">Description</Label>
        <textarea id="clan-description" maxLength={200} rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What is your clan about?" className="w-full resize-none rounded-lg border border-[var(--line)] bg-transparent px-3 py-2 text-[13px] text-[var(--text)] outline-none transition-[border-color] placeholder:text-[var(--text-dim)] focus:border-[var(--text-faint)]" />
        <span className="text-right text-[11px] text-[var(--text-dim)]">{description.length}/200</span>
      </div>
      <JoinSettings joinMode={joinMode} maxPlayers={maxPlayers} onMode={setJoinMode} onMax={setMaxPlayers} />
      <div>
        <button type="button" disabled={busy || tooFew || unchanged} onClick={() => void run(() => clansService.updateClan(clan.id, { description: description.trim(), joinMode, maxPlayers }), "Settings saved")} className="lx-primary-button inline-flex h-9 items-center rounded-lg px-3.5 text-[13px] font-semibold disabled:opacity-50">Save settings</button>
        {tooFew && <p className="mt-2 text-[13px] text-[var(--status-red)]">The clan already has {clan.currentPlayers} members.</p>}
      </div>
      {isLeader && <ManagersSection clan={clan} onChanged={onChanged} />}
      {isLeader && <RenameForm clan={clan} onChanged={onChanged} />}
      <ArtSlot kind="logo" busy={busy} preview={clanArtSrc(clan.logo)} onPick={(file) => void run(() => clansService.uploadArt(clan.id, "logo", file), "Logo saved")} onRemove={() => void run(() => clansService.removeArt(clan.id, "logo"), "Logo removed")} />
      <ArtSlot kind="banner" busy={busy} preview={clanArtSrc(clan.thumbnail)} onPick={(file) => void run(() => clansService.uploadArt(clan.id, "banner", file), "Banner saved")} onRemove={() => void run(() => clansService.removeArt(clan.id, "banner"), "Banner removed")} />
    </div>
  )
}
