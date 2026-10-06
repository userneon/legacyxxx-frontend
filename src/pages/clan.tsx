import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Check, Coins, Plus, UserMinus, UserPlus, Users, X } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { clansService } from "@/api"
import type { ApiError, ClanCard, ClanDetail, MyClanMembership } from "@/api/types"
import { Button } from "@/components/ui/button"
import { PageBar, PageBarEnd, PageTabs } from "@/components/page-tabs"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"
import { QueryState } from "@/components/query-state"
import { PlayerAvatar } from "@/components/player-avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

/** What a clan costs and needs. The server enforces both; these numbers only explain them. */
const CLAN_FEE = 500
const CLAN_MIN_MATCHES = 15

/** A clan has no uploaded picture: its tag on a plain tile is its mark. */
function TagTile({ tag, className }: { tag: string; className?: string }) {
  return (
    <div className={cn("flex shrink-0 items-center justify-center rounded-xl border border-[var(--line)] bg-[var(--raised)] text-[13px] font-bold tracking-wide text-[var(--text)]", className)}>
      {tag}
    </div>
  )
}

function failureMessage(error: unknown, fallback: string) {
  const status = (error as Partial<ApiError> | null)?.status
  if (status === 401) return "Sign in with Steam first."
  if (status === 402) return `A clan costs ${CLAN_FEE} coins and your wallet is short.`
  if (status === 409) return "That did not work: the name or tag is taken, you are already in a clan, or you have not played enough ranked matches yet."
  if (status === 429) return "Too many tries. Wait a moment."
  return fallback
}

export function ClanPage({ onProfileNavigate, onClanNavigate }: { onProfileNavigate: (userId: string) => void; onClanNavigate: (clanId: string) => void }) {
  const { clanId } = useParams()
  if (clanId) return <ClanDetailView clanId={clanId} onProfileNavigate={onProfileNavigate} />
  return <ClanList onClanNavigate={onClanNavigate} />
}

function ClanList({ onClanNavigate }: { onClanNavigate: (clanId: string) => void }) {
  const { isAuthenticated, loginWithSteam } = useAuth()
  const [creating, setCreating] = useState(false)
  const { data: clans, loading, error, refetch } = useApiQuery<ClanCard[]>((signal) => clansService.getClans({ signal }))
  const { data: mine, refetch: refetchMine } = useApiQuery<MyClanMembership | null>(
    (signal) => clansService.getMine({ signal }),
    { enabled: isAuthenticated, queryKey: String(isAuthenticated) },
  )

  const list = clans ?? []
  const members = list.reduce((sum, clan) => sum + clan.currentPlayers, 0)
  const open = list.reduce((sum, clan) => sum + Math.max(0, clan.maxPlayers - clan.currentPlayers), 0)
  const changed = () => { void refetch(); void refetchMine() }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageBar>
        <PageTabs ariaLabel="Clans" value="all" onChange={() => undefined} options={[{ value: "all", label: "All clans", count: loading ? undefined : list.length }]} />
        <PageBarEnd>
          <span className="text-[13px] text-[var(--text-dim)] max-md:hidden">{CLAN_FEE} coins · {CLAN_MIN_MATCHES} ranked matches</span>
          {!mine && (
            <button type="button" onClick={() => (isAuthenticated ? setCreating(true) : loginWithSteam())} className="lx-primary-button inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-[13px] font-semibold">
              <Plus className="size-4" aria-hidden="true" />
              Create clan
            </button>
          )}
        </PageBarEnd>
      </PageBar>

      <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-4 px-6 pb-4 pt-4">
          {!loading && !error && (
            <div className="lx-stat-grid grid-cols-3">
              {[{ label: "Clans", value: list.length }, { label: "Members", value: members }, { label: "Open slots", value: open }].map((stat) => (
                <div key={stat.label} className="flex flex-col gap-1 p-4">
                  <span className="text-[22px] font-semibold leading-none">{stat.value}</span>
                  <span className="text-[11px] uppercase tracking-wider text-[var(--text-dim)]">{stat.label}</span>
                </div>
              ))}
            </div>
          )}

          <QueryState loading={loading} error={error} empty={!loading && !error && list.length === 0} emptyMessage="No clans yet." onRetry={refetch} />

          {!loading && !error && list.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((clan) => (
                <ClanCardItem key={clan.id} clan={clan} mine={mine ?? null} canJoin={!mine} onClanNavigate={onClanNavigate} onChanged={changed} />
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Create a clan</DialogTitle>
            <DialogDescription>
              {CLAN_FEE} coins are taken from your wallet when the clan is created. You need {CLAN_MIN_MATCHES} ranked matches played. A clan holds up to 10 players.
            </DialogDescription>
          </DialogHeader>
          <CreateClanForm onClose={() => setCreating(false)} onCreated={(clan) => { setCreating(false); changed(); onClanNavigate(clan.id) }} />
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ClanCardItem({ clan, mine, canJoin, onClanNavigate, onChanged }: { clan: ClanCard; mine: MyClanMembership | null; canJoin: boolean; onClanNavigate: (clanId: string) => void; onChanged: () => void }) {
  const { isAuthenticated, loginWithSteam } = useAuth()
  const isFull = clan.currentPlayers >= clan.maxPlayers
  const isMine = mine?.clan.id === clan.id
  const fill = Math.round((clan.currentPlayers / Math.max(1, clan.maxPlayers)) * 100)
  const [busy, setBusy] = useState(false)

  const join = async () => {
    if (!isAuthenticated) { loginWithSteam(); return }
    setBusy(true)
    try {
      await clansService.joinClan(clan.id)
      toast.success(`You joined ${clan.name}`)
      onChanged()
    } catch (error) {
      toast.error("Could not join the clan", { description: failureMessage(error, "Try again in a moment.") })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-[10px] border border-[var(--glass-line)] bg-[var(--glass-fill)] p-4 transition-[border-color] duration-200 hover:border-[var(--line-strong)]">
      <button type="button" onClick={() => onClanNavigate(clan.id)} className="flex items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60 rounded-lg">
        <TagTile tag={clan.tag} className="size-12" />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-[15px] font-semibold">{clan.name}</span>
          <span className="text-[11px] text-[var(--text-dim)]">{clan.region}</span>
        </span>
      </button>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[11px] text-[var(--text-dim)]">
          <span className="inline-flex items-center gap-1.5"><Users className="size-3.5" aria-hidden="true" /> Members</span>
          <span className={cn("font-semibold", isFull ? "text-[var(--text)]" : "text-[var(--text-dim)]")}>{clan.currentPlayers}/{clan.maxPlayers}</span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-[var(--raised)]">
          <div className="h-full rounded-full bg-[var(--accent-solid)]" style={{ width: `${fill}%` }} />
        </div>
      </div>

      {isMine ? (
        <span className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--raised)] text-[13px] text-[var(--text-dim)]"><Check className="size-4" aria-hidden="true" /> Your clan</span>
      ) : (
        <button
          type="button"
          disabled={isFull || busy || (isAuthenticated && !canJoin)}
          onClick={() => void join()}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--raised)] text-[13px] font-medium transition-colors hover:border-[var(--line-strong)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <UserPlus className="size-4" aria-hidden="true" />
          {isFull ? "Full" : busy ? "Joining…" : "Join"}
        </button>
      )}
    </div>
  )
}

function ClanDetailView({ clanId, onProfileNavigate }: { clanId: string; onProfileNavigate: (userId: string) => void }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [busy, setBusy] = useState(false)
  const { data: clan, loading, error, refetch } = useApiQuery<ClanDetail>((signal) => clansService.getClan(clanId, { signal }))
  const members = clan?.members ?? []
  const me = members.find((member) => member.id === user?.id)
  const isLeader = me?.role === "leader"

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
        <button type="button" onClick={() => navigate("/clans")} className="inline-flex h-11 items-center gap-2 text-[13px] text-[var(--text-dim)] transition-colors hover:text-[var(--text)]">
          <ArrowLeft className="size-4" aria-hidden="true" /> All clans
        </button>
        <PageBarEnd>
          {me && !isLeader && (
            <button type="button" disabled={busy} onClick={() => void run(() => clansService.leaveClan(clanId), "You left the clan", () => navigate("/clans"))} className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--raised)] px-3 text-[13px] hover:border-[var(--line-strong)] disabled:opacity-50">
              Leave clan
            </button>
          )}
          {isLeader && (
            <button
              type="button"
              disabled={busy}
              onClick={() => { if (window.confirm("Delete this clan? Your coins are not given back.")) void run(() => clansService.deleteClan(clanId), "Clan deleted", () => navigate("/clans")) }}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--raised)] px-3 text-[13px] text-[var(--status-red)] hover:border-[var(--line-strong)] disabled:opacity-50"
            >
              Delete clan
            </button>
          )}
        </PageBarEnd>
      </PageBar>

      <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-4 px-6 pb-4 pt-4">
          <QueryState loading={loading} error={error} empty={!loading && !error && !clan} emptyMessage="Clan not found." onRetry={refetch} />
          {!loading && !error && clan && (
            <>
              <section className="flex flex-wrap items-center gap-4 rounded-[10px] border border-[var(--glass-line)] bg-[var(--glass-fill)] p-5">
                <TagTile tag={clan.tag} className="size-16 text-[15px]" />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <h1 className="truncate text-[22px] font-semibold leading-tight">{clan.name}</h1>
                  <p className="text-[13px] text-[var(--text-dim)]">{clan.region} · {clan.currentPlayers}/{clan.maxPlayers} members</p>
                  {clan.description && <p className="max-w-2xl text-[13px] text-[var(--text-dim)]">{clan.description}</p>}
                </div>
              </section>

              <section className="flex flex-col gap-3">
                <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-dim)]"><Users className="size-3.5" aria-hidden="true" /> Members</h2>
                {members.length === 0 ? (
                  <p className="text-[13px] text-[var(--text-dim)]">No members to show.</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {members.map((member) => (
                      <div key={member.id} className="flex items-center gap-1 rounded-[10px] border border-[var(--glass-line)] bg-[var(--glass-fill)] transition-[border-color] duration-200 hover:border-[var(--line-strong)]">
                        <button type="button" onClick={() => onProfileNavigate(member.id)} className="flex min-w-0 flex-1 items-center gap-3 rounded-[10px] p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60">
                          <PlayerAvatar avatar={member.avatar} name={member.name} className="size-10 rounded-[10px] text-sm" />
                          <span className="min-w-0">
                            <span className="block truncate text-[13px] font-medium">{member.name}</span>
                            <span className="block text-[11px] capitalize text-[var(--text-dim)]">{member.role}</span>
                          </span>
                        </button>
                        {isLeader && member.id !== user?.id && (
                          <button
                            type="button"
                            disabled={busy}
                            aria-label={`Remove ${member.name}`}
                            onClick={() => { if (window.confirm(`Remove ${member.name} from the clan?`)) void run(() => clansService.removeMember(clanId, member.id), `${member.name} was removed`) }}
                            className="mr-2 flex size-8 items-center justify-center rounded-lg text-[var(--text-dim)] transition-colors hover:bg-[var(--raised)] hover:text-[var(--text)] disabled:opacity-50"
                          >
                            <UserMinus className="size-4" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function CreateClanForm({ onClose, onCreated }: { onClose: () => void; onCreated: (clan: ClanDetail) => void }) {
  const [name, setName] = useState("")
  const [tag, setTag] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const valid = name.trim().length >= 3 && /^[A-Za-z0-9]{2,5}$/.test(tag)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!valid || submitting) return
    setSubmitting(true)
    setError("")
    try {
      onCreated(await clansService.createClan({ name: name.trim(), tag: tag.trim().toUpperCase() }))
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
      {error && <p role="alert" className="text-[13px] text-[var(--status-red)]">{error}</p>}
      <div className="mt-2 flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={submitting}><X className="size-4" /> Cancel</Button>
        <button type="submit" disabled={!valid || submitting} className="lx-primary-button inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-[13px] font-semibold disabled:opacity-50">
          <Coins className="size-4" aria-hidden="true" />
          {submitting ? "Creating…" : `Create · ${CLAN_FEE} coins`}
        </button>
      </div>
    </form>
  )
}
