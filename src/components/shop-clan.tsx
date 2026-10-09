import { useNavigate } from "react-router-dom"
import { Coins, UserPlus, Users } from "lucide-react"
import { toast } from "sonner"
import { useState } from "react"

import { clansService, type ClanLookItem, type ClanLookKind, type ClanLooks, type ClanPrices, type MyClanState } from "@/api"
import { useApiQuery } from "@/hooks/use-api-query"
import { backdropStyle, clanTagProps } from "@/lib/cosmetics"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

interface ShopClanProps {
  prices: ClanPrices | undefined
  balance: number | null
  mine: MyClanState | null | undefined
  loading: boolean
  onChanged: () => void | Promise<unknown>
}

function Card({ icon, title, price, children }: { icon: React.ReactNode; title: string; price: number; children: React.ReactNode }) {
  return (
    <li className="flex flex-col gap-3 rounded-xl border border-[var(--glass-line)] bg-[var(--glass-fill)] p-4">
      <div className="flex items-center gap-2.5">
        <span className="grid size-9 place-items-center rounded-lg border border-[var(--line)] bg-[var(--raised)] text-[var(--text-2)]">{icon}</span>
        <span className="min-w-0 flex-1 text-[15px] font-semibold text-[var(--text)]">{title}</span>
        <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--text)]"><Coins className="size-3.5 text-[var(--text-dim)]" />{price}</span>
      </div>
      {children}
    </li>
  )
}

const note = "text-[13px] leading-relaxed text-[var(--text-muted)]"
const action = "lx-primary-button mt-auto inline-flex h-9 items-center justify-center rounded-lg px-3.5 text-[13px] font-semibold disabled:opacity-50"
const secondary = "mt-auto inline-flex h-9 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--raised)] px-3.5 text-[13px] hover:border-[var(--line-strong)] disabled:opacity-50"

export function ShopClan({ prices, balance, mine, loading, onChanged }: ShopClanProps) {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)

  if (loading || !prices) return <Skeleton className="h-40 max-w-md rounded-xl" />

  const membership = mine?.membership ?? null
  const clan = membership?.clan ?? null
  const leader = membership?.role === "leader"
  const short = (price: number) => (balance != null && balance < price ? `Need ${(price - balance).toLocaleString()} more coins` : null)

  const nextSize = clan ? Math.min(prices.slotCap, clan.maxPlayers + prices.slotStep) : null
  const atCap = clan ? clan.maxPlayers >= prices.slotCap : false

  const buySlots = async () => {
    if (!clan) return
    setBusy(true)
    try {
      await clansService.buySlots(String(clan.id))
      window.dispatchEvent(new Event("legacyx:wallet-changed"))
      toast.success(`${clan.name} now holds ${nextSize} players`)
      await onChanged()
    } catch (caught) {
      toast.error("Could not add the places", { description: caught instanceof Error ? caught.message : "Try again in a moment." })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
    <ul className="grid max-w-md gap-3" aria-label="Clan services">
      <Card icon={<UserPlus className="size-4" />} title={`+${prices.slotStep} member places`} price={prices.slots}>
        <p className={note}>Make room for more players. Buy it again whenever the clan is full, up to {prices.slotCap} players.</p>
        {!clan ? (
          <button type="button" onClick={() => navigate("/clans")} className={secondary}>Find or create a clan in Clans</button>
        ) : (
          <>
            <p className="inline-flex items-center gap-1.5 text-xs text-[var(--text-2)]"><Users className="size-3.5" />{clan.currentPlayers} of {clan.maxPlayers} places used{!atCap && nextSize ? ` · next ${nextSize}` : ""}</p>
            {!leader ? (
              <p className="text-xs text-[var(--text-dim)]">Only the leader can do this.</p>
            ) : atCap ? (
              <p className="text-xs text-[var(--text-dim)]">The clan is at the largest size.</p>
            ) : (
              <>
                {short(prices.slots) && <p className="text-xs text-[var(--text-dim)]">{short(prices.slots)}</p>}
                <button type="button" disabled={busy || (balance != null && balance < prices.slots)} onClick={buySlots} className={action}>{busy ? "Adding…" : `Add ${prices.slotStep} places`}</button>
              </>
            )}
          </>
        )}
      </Card>
    </ul>
    {clan && leader && <ClanLooksShop clanId={String(clan.id)} tag={clan.tag} balance={balance} onChanged={onChanged} />}
    {clan && !leader && <p className="text-[13px] text-[var(--text-dim)]">Only the clan leader can buy a tag colour, a tag glow or a backdrop for the clan.</p>}
    </div>
  )
}

const KINDS: Array<{ kind: ClanLookKind; label: string; hint: string }> = [
  { kind: "tag_color", label: "Tag colour", hint: "The colour of [TAG] everywhere the clan shows." },
  { kind: "tag_glow", label: "Tag glow", hint: "A light around [TAG]." },
  { kind: "backdrop", label: "Backdrop", hint: "Behind the clan page header and the clan cards, when the clan has no banner picture." },
]
const RARITY = ["", "Common", "Rare", "Epic", "Legendary"]

function Preview({ item, tag }: { item: ClanLookItem; tag: string }) {
  const look = {
    tagColor: item.kind === "tag_color" ? item.color ?? null : null,
    tagColorFx: item.kind === "tag_color" ? item.fx ?? null : null,
    tagGlow: item.kind === "tag_glow" ? item.glow ?? null : null,
    tagGlowFx: item.kind === "tag_glow" ? item.fx ?? null : null,
  }
  const back = item.kind === "backdrop" ? backdropStyle(item.from && item.to ? { from: item.from, to: item.to } : null) : undefined
  return (
    <div className="grid h-[72px] place-items-center rounded-lg border border-[var(--line-soft)] bg-[var(--panel)]" style={back ? { backgroundImage: back } : undefined}>
      <span {...clanTagProps(look, "text-[22px] font-semibold text-[var(--text)]")}>[{tag}]</span>
    </div>
  )
}

function ClanLooksShop({ clanId, tag, balance, onChanged }: { clanId: string; tag: string; balance: number | null; onChanged: () => void | Promise<unknown> }) {
  const { data, loading, error, refetch } = useApiQuery<ClanLooks>((signal) => clansService.getLooks(clanId, { signal }), { queryKey: `clan-looks:${clanId}` })
  const [busy, setBusy] = useState<string | null>(null)
  if (loading) return <Skeleton className="h-64 rounded-xl" />
  if (error || !data) return <p className="flex items-center gap-3 text-[13px] text-[var(--text-dim)]">Could not load the clan looks.<button type="button" onClick={refetch} className="text-[var(--text-2)] hover:text-[var(--text)]">Retry</button></p>

  const run = async (id: string, work: () => Promise<unknown>, done: string) => {
    setBusy(id)
    try {
      await work()
      toast.success(done)
      window.dispatchEvent(new Event("legacyx:wallet-changed"))
      await Promise.all([refetch(), onChanged()])
    } catch (caught) {
      toast.error("That did not work", { description: caught instanceof Error ? caught.message : "Try again in a moment." })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {KINDS.map(({ kind, label, hint }) => {
        const items = data.items.filter((item) => item.kind === kind)
        const wearing = data.equipped[kind]
        return (
          <section key={kind} aria-label={label}>
            <div className="mb-2.5 flex flex-wrap items-baseline gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[1.2px] text-[var(--text-dim)]">{label}</span>
              <span className="text-xs text-[var(--text-faint)]">{hint}</span>
              <span className="flex-1" />
              {wearing && <button type="button" disabled={busy !== null} onClick={() => run(kind, () => clansService.equipLook(clanId, kind, null), "Taken off")} className="text-xs text-[var(--text-dim)] hover:text-[var(--text)]">Take off</button>}
            </div>
            <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
              {items.map((item) => {
                const worn = wearing === item.id
                const short = !item.owned && balance != null && balance < item.price
                return (
                  <li key={item.id} className={cn("flex flex-col gap-2.5 rounded-xl border bg-[var(--glass-fill)] p-3", worn ? "border-[var(--line-strong)]" : "border-[var(--glass-line)]")}>
                    <Preview item={item} tag={tag} />
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[13px] font-medium text-[var(--text)]">{item.name}</span>
                      <span className="shrink-0 text-[11px] text-[var(--text-dim)]">{RARITY[item.rarity]}</span>
                    </div>
                    {worn ? (
                      <span className="inline-flex h-8 items-center justify-center rounded-lg border border-[var(--line)] text-xs text-[var(--text-dim)]">Worn</span>
                    ) : item.owned ? (
                      <button type="button" disabled={busy !== null} onClick={() => run(item.id, () => clansService.equipLook(clanId, kind, item.id), `${item.name} is now worn`)} className="inline-flex h-8 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--raised)] text-xs hover:border-[var(--line-strong)] disabled:opacity-50">Wear</button>
                    ) : (
                      <button type="button" disabled={busy !== null || short} onClick={() => run(item.id, async () => { await clansService.buyLook(clanId, item.id); await clansService.equipLook(clanId, kind, item.id) }, `${item.name} is the clan's now`)} className="lx-primary-button inline-flex h-8 items-center justify-center gap-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"><Coins className="size-3.5" />{item.price}</button>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
