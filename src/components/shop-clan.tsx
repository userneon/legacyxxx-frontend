import { useNavigate } from "react-router-dom"
import { Check, Plus, UserPlus, Users } from "lucide-react"

import { LxMark } from "@/components/lx-mark"
import { toast } from "sonner"
import { useEffect, useRef, useState } from "react"

import { walletService, clansService, type Wallet, type ClanLookItem, type ClanLookKind, type ClanLooks, type ClanPageEffect, type ClanPrices, type MyClanState } from "@/api"
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
    <li className="flex flex-col gap-3 rounded-xl border border-[var(--glass-line)] bg-[var(--glass-fill)] p-4">
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
    <div className="flex flex-col gap-6">
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
    </ul>
    <ClanLooksShop clanId={clan ? String(clan.id) : null} canWear={leader} tag={clan?.tag ?? "TAG"} balance={balance} onChanged={onChanged} />
    </div>
  )
}

const KINDS: Array<{ kind: ClanLookKind; label: string; hint: string }> = [
  { kind: "tag_color", label: "Tag colour", hint: "" },
  { kind: "tag_glow", label: "Tag glow", hint: "" },
  { kind: "page", label: "Page background", hint: "" },
]
const RARITY = ["", "Common", "Rare", "Epic", "Legendary"]

/** Browsers allow only about sixteen WebGL pages at once, so at most this many animated previews run together. */
const MAX_LIVE = 6
let liveNow = 0

/** Runs an animated preview while its card is on screen (or hovered), within the limit above. */
function useLive(enabled: boolean) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [live, setLive] = useState(false)
  useEffect(() => {
    const node = ref.current
    if (!enabled || !node || typeof IntersectionObserver === "undefined") return
    const watcher = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.6 })
    watcher.observe(node)
    return () => watcher.disconnect()
  }, [enabled])
  const want = enabled && (visible || hovered)
  useEffect(() => {
    if (!want || (liveNow >= MAX_LIVE && !hovered)) return
    liveNow += 1
    setLive(true)
    return () => { liveNow -= 1; setLive(false) }
  }, [want, hovered])
  return { ref, live, hover: { onMouseEnter: () => setHovered(true), onMouseLeave: () => setHovered(false) } }
}

function Preview({ item, tag, big }: { item: ClanLookItem; tag: string; big?: boolean }) {
  const look = {
    tagColor: item.kind === "tag_color" ? item.color ?? null : null,
    tagColorFx: item.kind === "tag_color" ? item.fx ?? null : null,
    tagGlow: item.kind === "tag_glow" ? item.glow ?? null : null,
    tagGlowFx: item.kind === "tag_glow" ? item.fx ?? null : null,
  }
  const colors = item.from && item.to ? { from: item.from, to: item.to } : null
  const isPage = item.kind === "page" && colors !== null
  const { ref, live, hover } = useLive(isPage && Boolean(item.effect))
  const back = item.kind === "backdrop" ? backdropStyle(colors) : undefined
  const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  return (
    <div ref={ref} {...hover} className={cn("relative grid place-items-center overflow-hidden rounded-lg border border-[var(--line-soft)]", item.kind === "page" ? "bg-[var(--bg)]" : "bg-[var(--panel)]", big ? "h-[150px]" : "h-[72px]")} style={back ? { backgroundImage: back } : undefined}>
      {isPage && colors && (!item.effect || live) && <div aria-hidden="true" className="pointer-events-none absolute inset-0"><ClanBackground page={{ ...colors, effect: item.effect ?? null }} calm={reduced} /></div>}
      <span {...clanTagProps(look, big ? "relative text-[30px] font-semibold text-[var(--text)]" : "relative text-[22px] font-semibold text-[var(--text)]")}>[{tag}]</span>
      {item.effect && <span className="pointer-events-none absolute right-2 top-1.5 rounded-full border border-[var(--line)] bg-[var(--panel)] px-1.5 text-[10px] text-[var(--text-dim)]">{live ? "Live" : "Animated"}</span>}
    </div>
  )
}

const PAGE_EFFECTS: Array<{ value: ClanPageEffect | ""; label: string }> = [
  { value: "", label: "None" },
  { value: "slats", label: "Micro slats" },
  { value: "waves", label: "Pattern waves" },
  { value: "dots", label: "Dot field" },
  { value: "aurora", label: "Aurora veil" },
  { value: "threads", label: "Silk threads" },
  { value: "particles", label: "Star dust" },
  { value: "lightning", label: "Lightning" },
  { value: "rays", label: "Light rays" },
  { value: "lines", label: "Wave lines" },
  { value: "plasma", label: "Plasma" },
]

/* palette-exempt: the colours a clan leader can pick for the clan's own page, far apart so they are easy to tell apart. */
const PICK_COLORS = ["#ef4444", "#fb923c", "#fcd34d", "#22c55e", "#2dd4bf", "#38bdf8", "#8b5cf6", "#fb7185", "#fafafa"] // palette-exempt
const PICK_BASES = ["#0a0a0a", "#171717", "#262626"]

/** A short row of clearly different colours, and the browser's own picker for any other. */
function ColorRow({ label, value, colors, onChange }: { label: string; value: string; colors: string[]; onChange: (next: string) => void }) {
  const custom = !colors.includes(value)
  return (
    <div role="group" aria-label={label} className="flex items-center gap-3">
      <span className="w-12 shrink-0 text-[12px] text-[var(--text-dim)]">{label}</span>
      <div className="flex flex-wrap items-center gap-2">
        {colors.map((color) => (
          <button key={color} type="button" aria-label={color} aria-pressed={value === color} onClick={() => onChange(color)} style={{ background: color }} className={cn("size-7 rounded-full border transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60", value === color ? "border-[var(--text)] ring-2 ring-[var(--text)]/40" : "border-[var(--line-strong)]")} />
        ))}
        <label title="Other colour" className={cn("relative grid size-7 cursor-pointer place-items-center overflow-hidden rounded-full border text-[var(--text-2)] transition-transform hover:scale-110", custom ? "border-[var(--text)] ring-2 ring-[var(--text)]/40" : "border-[var(--line-strong)] bg-[var(--raised)]")} style={custom ? { background: value } : undefined}>
          {!custom && <Plus className="size-3.5" aria-hidden="true" />}
          <input type="color" value={value} onChange={(event) => onChange(event.target.value)} aria-label={`Other ${label.toLowerCase()}`} className="absolute inset-0 size-full cursor-pointer opacity-0" />
        </label>
      </div>
    </div>
  )
}

/** The clan's own page background: the leader picks colour, base and effect and sees it live before saving. */
function CustomPageEditor({ item, custom, tag, clanId, editable, actions, onSave }: { item: ClanLookItem; custom: ClanLooks["custom"]; tag: string; clanId: string | null; editable: boolean; actions: React.ReactNode; onSave: (look: { from: string; to: string; effect: ClanPageEffect | null }) => void }) {
  const [from, setFrom] = useState(custom?.from ?? item.from ?? "#8b5cf6")
  const [to, setTo] = useState(custom?.to ?? item.to ?? "#0a0a0a")
  const [effect, setEffect] = useState<ClanPageEffect | "">(custom?.effect ?? item.effect ?? "")
  return (
    <div className="mb-3 flex flex-col gap-3 rounded-xl border border-[var(--glass-line)] bg-[var(--glass-fill)] p-3 md:flex-row md:items-center">
      <div className="md:w-[300px] md:shrink-0"><Preview item={{ ...item, from, to, effect: effect || undefined }} tag={tag} big /></div>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <span className="text-[13px] font-semibold text-[var(--text)]">Your own</span>
        {editable ? (
          <>
            <ColorRow label="Colour" value={from} colors={PICK_COLORS} onChange={setFrom} />
            <ColorRow label="Base" value={to} colors={PICK_BASES} onChange={setTo} />
            <label className="flex items-center gap-3">
              <span className="w-12 shrink-0 text-[12px] text-[var(--text-dim)]">Effect</span>
              <select value={effect} onChange={(event) => setEffect(event.target.value as ClanPageEffect | "")} className="h-8 min-w-0 flex-1 rounded-lg border border-[var(--line)] bg-[var(--raised)] px-2.5 text-[13px] text-[var(--text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/50 sm:max-w-[220px]">
                {PAGE_EFFECTS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <button type="button" disabled={!clanId} onClick={() => onSave({ from, to, effect: effect || null })} className="lx-primary-button inline-flex h-8 items-center justify-center self-start rounded-lg px-4 text-xs font-semibold disabled:opacity-50">Save</button>
          </>
        ) : (
          <div className="sm:max-w-[240px]">{actions}</div>
        )}
      </div>
    </div>
  )
}

/** Buying is for everyone; wearing is for the leader of a clan (`clanId` is null, or `canWear` false, when it is not). */
export function ClanLooksShop({ clanId, canWear = true, tag, balance, onChanged }: { clanId: string | null; canWear?: boolean; tag: string; balance: number | null; onChanged: () => void | Promise<unknown> }) {
  const wear = Boolean(clanId) && canWear
  const { data, loading, error, refetch } = useApiQuery<ClanLooks>((signal) => (wear && clanId ? clansService.getLooks(clanId, { signal }) : clansService.getMyLooks({ signal })), { queryKey: `clan-looks:${wear ? clanId : "mine"}` })
  const [busy, setBusy] = useState<string | null>(null)
  const [picked, setPicked] = useState<Record<string, string>>({})
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
      {KINDS.map(({ kind, label }) => {
        const items = data.items.filter((item) => item.kind === kind && !item.custom)
        const wearing = data.equipped[kind]
        const actionsOf = (item: ClanLookItem) => {
          const worn = wearing === item.id
          const short = !item.owned && balance != null && balance < item.price
          return (
            worn ? (
              <span className="inline-flex h-8 items-center justify-center rounded-lg border border-[var(--line)] text-xs text-[var(--text-dim)]">Worn</span>
            ) : item.owned && !(wear && clanId) ? (
              <span className="inline-flex h-8 items-center justify-center rounded-lg border border-[var(--line)] text-xs text-[var(--text-dim)]">Owned</span>
            ) : item.owned && clanId ? (
              <button type="button" disabled={busy !== null} onClick={() => run(item.id, () => clansService.equipLook(clanId, kind, item.id), `${item.name} is now worn`)} className="inline-flex h-8 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--raised)] text-xs hover:border-[var(--line-strong)] disabled:opacity-50">Wear</button>
            ) : (
              <button type="button" disabled={busy !== null || short} onClick={() => run(item.id, async () => { if (wear && clanId) { await clansService.buyLook(clanId, item.id); await clansService.equipLook(clanId, kind, item.id) } else await clansService.buyMyLook(item.id) }, wear ? `${item.name} is yours and now worn by the clan` : `${item.name} is yours. Wear it once you lead a clan`)} className="lx-primary-button inline-flex h-8 items-center justify-center gap-1.5 rounded-lg text-xs font-semibold disabled:opacity-50"><LxMark size={14} />{item.price}</button>
            )
          )
        }
        return (
          <section key={kind} aria-label={label}>
            <div className="mb-2.5 flex flex-wrap items-baseline gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[1.2px] text-[var(--text-dim)]">{label}</span>
              <span className="flex-1" />
              {wear && clanId && wearing && <button type="button" disabled={busy !== null} onClick={() => run(kind, () => clansService.equipLook(clanId, kind, null), "Taken off")} className="text-xs text-[var(--text-dim)] hover:text-[var(--text)]">Take off</button>}
            </div>
            {kind === "page" && (() => {
              const custom = data.items.find((item) => item.kind === "page" && item.custom)
              return custom ? <CustomPageEditor key={`${custom.id}:${data.custom?.from}:${data.custom?.to}:${data.custom?.effect}`} item={custom} custom={data.custom} tag={tag} clanId={clanId} editable={wear && Boolean(clanId) && custom.owned} actions={actionsOf(custom)} onSave={(look) => run("custom", () => clansService.saveCustomLook(clanId as string, look), "Saved")} /> : null
            })()}
            <ul className={cn("grid gap-3", kind === "backdrop" || kind === "page" ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3" : "grid-cols-2 md:grid-cols-3 xl:grid-cols-4")}>
              {(() => {
                const actions = actionsOf
                const card = (item: ClanLookItem) => (
                  <li key={item.id} className={cn("flex flex-col gap-2.5 rounded-xl border bg-[var(--glass-fill)] p-3", wearing === item.id ? "border-[var(--line-strong)]" : "border-[var(--glass-line)]")}>
                    <Preview item={item} tag={tag} big={kind === "backdrop" || kind === "page"} />
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[13px] font-medium text-[var(--text)]">{item.name}</span>
                      <span className="shrink-0 text-[11px] text-[var(--text-dim)]">{RARITY[item.rarity]}</span>
                    </div>
                    {actions(item)}
                  </li>
                )
                // Plain single colours share one card with a swatch each; effects keep a card apiece.
                const solids = kind === "tag_color" || kind === "tag_glow" ? items.filter((item) => !item.fx) : []
                if (solids.length < 2) return items.map(card)
                const current = solids.find((item) => item.id === picked[kind]) ?? solids.find((item) => item.id === wearing) ?? solids[0]
                const palette = (
                  <li key="solid-palette" className="col-span-full flex flex-col gap-3 rounded-xl border border-[var(--glass-line)] bg-[var(--glass-fill)] p-3 sm:flex-row sm:items-center">
                    <div className="sm:w-[220px] sm:shrink-0"><Preview item={current} tag={tag} /></div>
                    <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-[13px] font-medium text-[var(--text)]">Solid colours<b className="ml-2 font-medium text-[var(--text-dim)]">{solids.length}</b></span>
                        <span className="truncate text-[11px] text-[var(--text-dim)]">{current.name}</span>
                      </div>
                      <ul role="group" aria-label="Solid colours" className="flex flex-wrap gap-2">
                        {solids.map((item) => (
                          <li key={item.id}>
                            <button type="button" aria-pressed={item.id === current.id} aria-label={item.name} title={item.name} onClick={() => setPicked((state) => ({ ...state, [kind]: item.id }))} className={cn("relative grid size-7 place-items-center rounded-full border transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60", item.id === current.id ? "border-[var(--text)] ring-2 ring-[var(--text)]/40" : "border-[var(--line-strong)]")} style={{ background: item.color ?? item.glow ?? "var(--text-2)" }}>
                              {item.owned && <Check className="size-3.5 text-white mix-blend-difference" aria-hidden="true" />}
                            </button>
                          </li>
                        ))}
                      </ul>
                      <div className="sm:max-w-[240px]">{actions(current)}</div>
                    </div>
                  </li>
                )
                return [palette, ...items.filter((item) => item.fx).map(card)]
              })()}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

/** The Appearance tab of Clans: what the clan wears and what it can still buy. Wearing and buying are the leader's. */
export function ClanAppearancePanel({ clanId, tag, leader }: { clanId: string; tag: string; leader: boolean }) {
  const { user } = useAuth()
  const { data: wallet, refetch } = useApiQuery<Wallet>((signal) => walletService.getMine({ signal }), { enabled: Boolean(user), queryKey: user ? `wallet:${user.id}` : "wallet:guest" })
  return <ClanLooksShop clanId={clanId} canWear={leader} tag={tag} balance={wallet?.balance ?? null} onChanged={() => refetch()} />
}
