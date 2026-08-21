import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Swords, Plus, Users, Upload, X, Globe, Shield, Crown, UserPlus } from "lucide-react"

import { cn } from "@/lib/utils"
import { clansService } from "@/api"
import type { ClanCard } from "@/api/types"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { useApiQuery } from "@/hooks/use-api-query"
import { QueryState } from "@/components/query-state"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// LEGACY-X visual system: retain the dark glass card rhythm while exposing clan identity, roster, and member navigation as first-class flows.
export function ClanPage({ onProfileNavigate, onClanNavigate }: { onProfileNavigate: (userId: string) => void; onClanNavigate: (clanId: string) => void }) {
  const { clanId } = useParams()
  const [open, setOpen] = useState(false)

  const { data: clans, loading, error, refetch } = useApiQuery<ClanCard[]>((signal) =>
    clansService.getClans({ signal }),
  )

  if (clanId) return <ClanDetailView clanId={clanId} onProfileNavigate={onProfileNavigate} />

  const list = clans ?? []
  const totalMembers = list.reduce((acc, c) => acc + c.currentPlayers, 0)
  const totalSlots = list.reduce((acc, c) => acc + c.maxPlayers, 0)
  const fullClans = list.filter((c) => c.currentPlayers >= c.maxPlayers).length

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" />
              Create Clan
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-strong">
            <DialogHeader>
              <DialogTitle>Create a New Clan</DialogTitle>
              <DialogDescription>
                Set up your clan. Logo and name are required, thumbnail is optional.
              </DialogDescription>
            </DialogHeader>
            <CreateClanForm onClose={() => { setOpen(false); void refetch() }} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Active Clans", value: list.length.toString(), icon: Shield },
          { label: "Total Members", value: totalMembers.toString(), icon: Users },
          { label: "Open Slots", value: (totalSlots - totalMembers).toString(), icon: UserPlus },
          { label: "Full Clans", value: fullClans.toString(), icon: Crown },
        ].map((stat) => (
          <div key={stat.label} className="glass rounded-xl p-4 hover-lift hover:glow-blue">
            <stat.icon className="size-4 text-muted-foreground" />
            <div className="mt-2 text-xl font-bold tabular-nums">{stat.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      <QueryState
        loading={loading}
        error={error}
        empty={!loading && !error && list.length === 0}
        emptyMessage="No clans found yet."
        onRetry={refetch}
      />

      {/* Clan cards */}
      {!loading && !error && list.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((clan) => (
            <ClanCardItem key={clan.id} clan={clan} onClanNavigate={onClanNavigate} onChanged={refetch} />
          ))}
        </div>
      )}
    </div>
  )
}

function ClanCardItem({ clan, onClanNavigate, onChanged }: { clan: ClanCard; onClanNavigate: (clanId: string) => void; onChanged: () => void }) {
  const isFull = clan.currentPlayers >= clan.maxPlayers
  const fillPercent = Math.round((clan.currentPlayers / clan.maxPlayers) * 100)
  const [joining, setJoining] = useState(false)

  const handleJoin = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isFull) return
    setJoining(true)
    void clansService
      .joinClan(clan.id)
      .then(() => onChanged())
      .finally(() => setJoining(false))
  }

  return (
    <div
      onClick={() => onClanNavigate(clan.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") onClanNavigate(clan.id) }}
      className="glass group flex flex-col overflow-hidden rounded-xl transition-all hover:glow-blue hover-lift cursor-pointer"
    >
      {/* Banner */}
      <div className="relative h-36 overflow-hidden">
        {clan.thumbnail ? (
          <img
            src={clan.thumbnail}
            alt={`${clan.name} banner`}
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-gradient-to-br from-secondary via-secondary/80 to-muted">
            <Swords className="size-10 text-muted-foreground/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-card/80 via-transparent to-transparent" />

        {/* Region badge */}
        <div className="absolute top-3 right-3 glass-strong rounded-md px-2 py-1 flex items-center gap-1.5">
          <Globe className="size-3 text-muted-foreground" />
          <span className="text-[11px] font-medium">{clan.region}</span>
        </div>

        {/* Logo + name overlay */}
        <div className="absolute bottom-3 left-4 flex items-center gap-3">
          <div className="size-12 rounded-xl border-2 border-card/80 bg-card overflow-hidden shadow-lg shrink-0">
            <img
              src={clan.logo}
              alt={`${clan.name} logo`}
              className="size-full object-cover"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-[15px] drop-shadow-sm">{clan.name}</h3>
            </div>
            <span className="text-[11px] font-bold text-muted-foreground drop-shadow-sm">
              [{clan.tag}]
            </span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-3 p-4">
        {/* Member progress */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Users className="size-3.5" />
              <span>Members</span>
            </div>
            <span className={cn(
              "font-bold tabular-nums",
              isFull ? "text-destructive" : "text-foreground"
            )}>
              {clan.currentPlayers}/{clan.maxPlayers}
            </span>
          </div>
          <Progress
            value={fillPercent}
            className="h-1.5"
          />
        </div>

        {/* Action */}
        <Button
          className="w-full"
          variant={isFull ? "secondary" : "default"}
          disabled={isFull || joining}
          onClick={handleJoin}
        >
          {isFull ? (
            <>
              <Shield className="size-3.5" />
              Clan Full
            </>
          ) : joining ? (
            "Joining..."
          ) : (
            <>
              <UserPlus className="size-3.5" />
              Join Clan
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

function ClanDetailView({ clanId, onProfileNavigate }: { clanId: string; onProfileNavigate: (userId: string) => void }) {
  const navigate = useNavigate()
  const { data: clan, loading, error, refetch } = useApiQuery<ClanCard & { description?: string; members?: { id: string; name: string; role: string; avatar: string }[] }>(
    (signal) => clansService.getClan(clanId, { signal }),
  )
  const members = clan?.members ?? []

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between gap-3">
        <Button variant="outline" size="sm" onClick={() => navigate("/clans")}><ArrowLeft className="size-3.5" /> Back to Clans</Button>
        {clan && <span className="text-xs font-semibold text-muted-foreground">[{clan.tag}] roster</span>}
      </div>
      <QueryState loading={loading} error={error} empty={!loading && !error && !clan} emptyMessage="Clan not found." onRetry={refetch} />
      {!loading && !error && clan && <>
        <section className="glass overflow-hidden rounded-xl">
          <div className="relative h-40 bg-secondary">
            {clan.thumbnail ? <img src={clan.thumbnail} alt={`${clan.name} banner`} className="size-full object-cover" /> : <div className="size-full bg-gradient-to-br from-secondary via-secondary/70 to-muted" />}
            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/10 to-transparent" />
            <div className="absolute inset-x-5 bottom-5 flex items-end gap-4"><div className="size-16 overflow-hidden rounded-xl border-2 border-card bg-card shadow-lg"><img src={clan.logo} alt={`${clan.name} logo`} className="size-full object-cover" /></div><div><h1 className="text-xl font-bold">{clan.name}</h1><p className="text-sm text-muted-foreground">[{clan.tag}] · {clan.region}</p></div></div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 p-5 text-sm"><p className="max-w-2xl text-muted-foreground">{clan.description || "This LEGACY-X clan has not added a public description yet."}</p><div className="rounded-lg bg-secondary px-3 py-2 font-semibold">{clan.currentPlayers}/{clan.maxPlayers} members</div></div>
        </section>
        <section className="flex flex-col gap-3"><div className="flex items-center gap-2"><Users className="size-4 text-muted-foreground" /><h2 className="font-semibold">Members</h2></div>
          {members.length === 0 ? <div className="glass rounded-xl p-5 text-sm text-muted-foreground">Member roster will appear here as players join this clan.</div> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{members.map((member) => <button key={member.id} onClick={() => onProfileNavigate(member.id)} className="glass flex items-center gap-3 rounded-xl p-4 text-left transition-all hover:bg-secondary/40 hover-lift"><div className="flex size-10 items-center justify-center overflow-hidden rounded-full bg-secondary text-sm font-bold">{member.avatar ? <img src={member.avatar} alt="" className="size-full object-cover" /> : member.name.slice(0, 2).toUpperCase()}</div><div className="min-w-0"><div className="truncate font-medium">{member.name}</div><div className="text-xs text-muted-foreground">{member.role}</div></div></button>)}</div>}
        </section>
      </>}
    </div>
  )
}

function CreateClanForm({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("")
  const [tag, setTag] = useState("")
  const [logo, setLogo] = useState("")
  const [thumbnail, setThumbnail] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !tag.trim() || !logo) return
    setSubmitting(true)
    setError("")
    try {
      await clansService.createClan({
        name: name.trim(),
        tag: tag.trim(),
        logo,
        thumbnail,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create clan. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (value: string) => void,
  ) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setter(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  return (
    <form className="flex flex-col gap-4 mt-4" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-2">
        <Label>Clan Logo (Required)</Label>
        <div className="flex items-center gap-3">
          <div className="flex size-16 items-center justify-center rounded-xl border-2 border-dashed border-border bg-secondary/50 overflow-hidden">
            {logo ? (
              <img src={logo} alt="Logo preview" className="size-full object-cover" />
            ) : (
              <Upload className="size-5 text-muted-foreground" />
            )}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById("clan-logo")?.click()}>
            <Upload className="size-3.5" />
            Upload Logo
          </Button>
          <input
            id="clan-logo"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFileUpload(e, setLogo)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Thumbnail (Optional)</Label>
        {thumbnail && (
          <div className="size-32 rounded-lg overflow-hidden border border-border">
            <img src={thumbnail} alt="Thumbnail preview" className="size-full object-cover" />
          </div>
        )}
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById("clan-thumbnail")?.click()}>
            <Upload className="size-3.5" />
            Upload Thumbnail
          </Button>
          {thumbnail && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setThumbnail(null)}>
              <X className="size-3.5" />
              Remove
            </Button>
          )}
        </div>
        <input
          id="clan-thumbnail"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFileUpload(e, (v) => setThumbnail(v))}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="clan-name">Clan Name (Required)</Label>
        <Input id="clan-name" placeholder="Enter clan name" required value={name} onChange={(e) => setName(e.target.value)} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="clan-tag">Clan Tag (Required)</Label>
        <Input id="clan-tag" placeholder="e.g. SHDW" maxLength={6} required value={tag} onChange={(e) => setTag(e.target.value)} />
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex justify-end gap-2 mt-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
          <X className="size-3.5" />
          Cancel
        </Button>
        <Button type="submit" disabled={submitting || !name.trim() || !tag.trim() || !logo}>
          <Plus className="size-3.5" />
          {submitting ? "Creating..." : "Create Clan"}
        </Button>
      </div>
    </form>
  )
}
