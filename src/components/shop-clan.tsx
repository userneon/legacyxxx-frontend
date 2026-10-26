import { useNavigate } from "react-router-dom"
import { Check, UserPlus, Users } from "lucide-react"

import { ColorRow, PICK_BASES, PICK_COLORS } from "@/components/color-row"
import { LxMark } from "@/components/lx-mark"
import { toast } from "sonner"
import { useState } from "react"

import { walletService, clansService, type Wallet, type ClanLookItem, type ClanLookKind, type ClanLooks, type ClanPrices, type MyClanState } from "@/api"
import { useAuth } from "@/hooks/use-auth"
import { useApiQuery } from "@/hooks/use-api-query"
import { ClanBackground } from "@/components/clan-background"
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
    <li className="lx-shop-tile flex flex-col gap-3 rounded-xl p-4">
      <div className="flex items-center gap-2.5">
        <span className="grid size-9 place-items-center rounded-lg border border-[var(--line)] bg-[var(--raised)] text-[var(--text-2)]">{icon}</span>
        <span className="min-w-0 flex-1 text-[15px] font-semibold text-[var(--text)]">{title}</span>
        <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--text)]"><LxMark size={14} />{price}</span>
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
  const short = (price: number) => (balance != null && balance < price ? `Need ${(price - balance).toLocaleString()} more LX` : null)

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
    <ClanLooksShop clanId={clan ? String(clan.id) : null} canWear={leader} tag={clan?.tag ?? "TAG"} balance={balance} onChanged={onChanged} header={
    <ul className="grid max-w-md gap-3" aria-label="Clan services">
      <Card icon={<UserPlus className="size-4" />} title={`+${prices.slotStep} member places`} price={prices.slots}>
        <p className={note}>Room for more players, up to {prices.slotCap}.</p>
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
    </ul>} />
  )
}

const KINDS: Array<{ kind: ClanLookKind; label: string; hint: string }> = [
  { kind: "tag_color", label: "Tag colour", hint: "" },
  { kind: "tag_glow", label: "Tag glow", hint: "" },
  { kind: "page", label: "Page background", hint: "" },
]

function Preview({ item, tag, big }: { item: ClanLookItem; tag: string; big?: boolean }) {
  const look = {
    tagColor: item.kind === "tag_color" ? item.color ?? null : null,
    tagColorFx: item.kind === "tag_color" ? item.fx ?? null : null,
    tagGlow: item.kind === "tag_glow" ? item.glow ?? null : null,
    tagGlowFx: item.kind === "tag_glow" ? item.fx ?? null : null,
  }
  const colors = item.from && item.to ? { from: item.from, to: item.to } : null
  const isPage = item.kind === "page" && colors !== null
  const back = item.kind === "backdrop" ? backdropStyle(colors) : undefined
  const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  return (
    <div className={cn("relative grid place-items-center overflow-hidden rounded-lg border border-[var(--line-soft)]", item.kind === "page" ? "bg-[var(--bg)]" : "bg-[var(--panel)]", big ? "h-[150px]" : "h-[72px]")} style={back ? { backgroundImage: back } : undefined}>
      {isPage && colors && <div aria-hidden="true" className="pointer-events-none absolute inset-0"><ClanBackground page={{ ...colors, effect: item.effect ?? null }} calm={reduced} recorded /></div>}
      <span {...clanTagProps(look, big ? "relative text-[30px] font-semibold text-[var(--text)]" : "relative text-[22px] font-semibold text-[var(--text)]")}>[{tag}]</span>
    </div>
  )
}

/** The colours a custom look starts from, and the labels of its pickers: tag colour and glow have one colour, a backdrop and a page two. */
function customParts(item: ClanLookItem): { a: string; b: string | null; labels: [string, string | null] } {
  if (item.kind === "tag_color") return { a: item.color ?? "#d4d4d4", b: null, labels: ["Colour", null] }
  if (item.kind === "tag_glow") return { a: item.glow ?? "#d4d4d4", b: null, labels: ["Glow", null] }
  return { a: item.from ?? "#d4d4d4", b: item.to ?? "#0a0a0a", labels: [item.kind === "page" ? "Colour" : "From", item.kind === "page" ? "Base" : "To"] }
}

/** The item with the colours being tried (a custom one), or as it is. */
function withColours(item: ClanLookItem, a: string, b: string | null): ClanLookItem {
  if (!item.custom) return item
  if (item.kind === "tag_color") return { ...item, color: a }
  if (item.kind === "tag_glow") return { ...item, glow: a }
  return { ...item, from: a, to: b ?? item.to }
}

/** Buying is for everyone; wearing is for the leader of a clan (`clanId` is null, or `canWear` false, when it is not). A list of tiles beside one stage: the picked look, its colours, and Buy or Wear. */
export function ClanLooksShop({ clanId, canWear = true, tag, balance, onChanged, header }: { clanId: string | null; canWear?: boolean; tag: string; balance: number | null; onChanged: () => void | Promise<unknown>; header?: React.ReactNode }) {
  const wear = Boolean(clanId) && canWear
  const { data, loading, error, refetch } = useApiQuery<ClanLooks>((signal) => (wear && clanId ? clansService.getLooks(clanId, { signal }) : clansService.getMyLooks({ signal })), { queryKey: `clan-looks:${wear ? clanId : "mine"}` })
  const [busy, setBusy] = useState<string | null>(null)
  const [pick, setPick] = useState<string | null>(null)
  // Colours being tried on a custom look before they are saved.
  const [draft, setDraft] = useState<Record<string, { a: string; b: string | null }>>({})
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

  const coloursOf = (item: ClanLookItem) => {
    const start = customParts(item)
    const saved = data.custom?.[item.id]
    const tried = draft[item.id]
    return { a: tried?.a ?? saved?.a ?? start.a, b: tried ? tried.b : saved ? saved.b : start.b, labels: start.labels }
  }
  const shownOf = (item: ClanLookItem) => {
    const { a, b } = coloursOf(item)
    return withColours(item, a, b)
  }

  const sections = KINDS.map(({ kind, label }) => ({ kind, label, items: data.items.filter((item) => item.kind === kind).sort((x, y) => Number(Boolean(y.custom)) - Number(Boolean(x.custom)) || x.price - y.price) }))
  const selected = data.items.find((item) => item.id === pick) ?? sections[0]?.items[0] ?? null
  const wearing = (item: ClanLookItem) => data.equipped[item.kind] === item.id
  const cost = selected?.price ?? 0
  const short = Boolean(selected && !selected.owned && balance != null && balance < cost)

  const stage = selected && (() => {
    const parts = coloursOf(selected)
    const worn = wearing(selected)
    return (
      <aside className="lx-add-box relative flex flex-col overflow-hidden rounded-[14px] border lg:sticky lg:top-6 lg:self-start">
        <div className="relative p-3.5">
          <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[120%] -translate-x-1/2 -translate-y-1/2 opacity-20" style={{ background: "radial-gradient(circle, var(--brand) 0%, transparent 60%)" }} />
          <div className="relative"><Preview item={shownOf(selected)} tag={tag} big /></div>
        </div>
        <div className="flex flex-col gap-3 border-t border-[var(--line-soft)] px-4 py-3.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[15px] font-semibold text-[var(--text)]">{selected.name}</span>
            {worn && <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--status-green)]"><Check className="size-3" />Worn</span>}
          </div>
          {/* Every look is a design the clan colours (owner request 2026-10-26): anyone can try colours here; the leader keeps them. */}
          {selected.custom && (
            <div className="flex flex-col gap-2.5">
              <ColorRow label={parts.labels[0]} value={parts.a} colors={PICK_COLORS} onChange={(next) => setDraft((state) => ({ ...state, [selected.id]: { a: next, b: parts.b } }))} />
              {parts.labels[1] && parts.b !== null && <ColorRow label={parts.labels[1]} value={parts.b} colors={selected.kind === "page" ? PICK_BASES : PICK_COLORS} onChange={(next) => setDraft((state) => ({ ...state, [selected.id]: { a: parts.a, b: next } }))} />}
              {selected.owned && wear
                ? <button type="button" disabled={busy !== null || !clanId} onClick={() => run(selected.id, () => clansService.saveCustomLook(clanId as string, { item: selected.id, a: parts.a, b: parts.b }), "Saved")} className="lx-primary-button inline-flex h-9 items-center justify-center rounded-lg text-[13px] font-semibold disabled:opacity-50">Save and wear</button>
                : !selected.owned && <p className="text-[11px] text-[var(--text-dim)]">{wear ? "Pick any colour; the clan wears it in these colours once bought." : "Pick any colour to see it; the clan's leader picks the colours it wears."}</p>}
            </div>
          )}
          {selected.owned && !(selected.custom && wear) && (wear && clanId ? (
            worn ? (
              <button type="button" disabled={busy !== null} onClick={() => run(selected.kind, () => clansService.equipLook(clanId, selected.kind, null), "Taken off")} className="inline-flex h-9 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--raised)] text-[13px] hover:border-[var(--line-strong)] disabled:opacity-50">Take off</button>
            ) : (
              <button type="button" disabled={busy !== null} onClick={() => run(selected.id, () => clansService.equipLook(clanId, selected.kind, selected.id), `${selected.name} is now worn`)} className="lx-primary-button inline-flex h-9 items-center justify-center rounded-lg text-[13px] font-semibold disabled:opacity-50">Wear</button>
            )
          ) : (
            <span className="text-xs text-[var(--text-dim)]">Owned{!wear ? " · wear it once you lead a clan" : ""}</span>
          ))}
          {!selected.owned && (
            <button type="button" disabled={busy !== null || short} onClick={() => run(selected.id, async () => { if (wear && clanId) { await clansService.buyLook(clanId, selected.id); if (selected.custom) await clansService.saveCustomLook(clanId, { item: selected.id, a: parts.a, b: parts.b }); else await clansService.equipLook(clanId, selected.kind, selected.id) } else await clansService.buyMyLook(selected.id) }, wear ? `${selected.name} is yours and now worn by the clan` : `${selected.name} is yours. Wear it once you lead a clan`)} className="lx-primary-button inline-flex h-10 items-center justify-center gap-1.5 rounded-lg text-[13px] font-semibold disabled:opacity-50"><LxMark size={14} />{short && balance != null ? `Need ${(cost - balance).toLocaleString()} more LX` : `Buy for ${cost.toLocaleString()} LX`}</button>
          )}
        </div>
      </aside>
    )
  })()

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex min-w-0 flex-col gap-6">
        {header}
        {sections.map(({ kind, label, items }) => (
          <section key={kind} aria-label={label}>
            <div className="lx-shop-heading mb-2.5">{label}</div>
            <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
              {items.map((item) => (
                <li key={item.id}>
                  <button type="button" aria-pressed={selected?.id === item.id} data-worn={wearing(item)} aria-label={item.name} title={item.name} onClick={() => setPick(item.id)} className="lx-shop-tile flex w-full flex-col gap-2 rounded-xl p-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]/60">
                    <div className="relative">
                      <Preview item={shownOf(item)} tag={tag} />
                    </div>
                    <span className="flex items-center justify-between gap-2 px-1 pb-0.5">
                      {wearing(item) ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--status-green)]"><Check className="size-3" />Worn</span>
                        : item.owned ? <span className="text-xs text-[var(--text-dim)]">Owned</span>
                        : <span className="lx-shop-price"><LxMark size={14} />{item.price.toLocaleString()}</span>}
                      <span className="min-w-0 truncate text-[11px] font-medium text-[var(--text-dim)]">{item.name}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <div className="max-lg:order-first">{stage}</div>
    </div>
  )
}

/** The Appearance tab of Clans: what the clan wears and what it can still buy. Wearing and buying are the leader's. */
export function ClanAppearancePanel({ clanId, tag, leader }: { clanId: string; tag: string; leader: boolean }) {
  const { user } = useAuth()
  const { data: wallet, refetch } = useApiQuery<Wallet>((signal) => walletService.getMine({ signal }), { enabled: Boolean(user), queryKey: user ? `wallet:${user.id}` : "wallet:guest" })
  return <ClanLooksShop clanId={clanId} canWear={leader} tag={tag} balance={wallet?.balance ?? null} onChanged={() => refetch()} />
}
