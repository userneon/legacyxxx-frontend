import { useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Check, Coins, Lock, RotateCcw } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { cosmeticsService, type CosmeticKind, type Cosmetics, type FrameItem } from "@/api/cosmetics"
import { walletService, type Wallet } from "@/api"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"
import { frameAccent, nameProps } from "@/lib/cosmetics"
import { FramedAvatar } from "@/components/framed-avatar"
import { PageBar, PageTabs } from "@/components/page-tabs"
import { Skeleton } from "@/components/ui/skeleton"

type ShopTab = "featured" | CosmeticKind
type Rarity = 0 | 1 | 2 | 3 | 4

const RARITY_NAMES = ["", "Common", "Rare", "Epic", "Legendary"]
const TABS: Array<{ value: ShopTab; label: string }> = [
  { value: "featured", label: "Featured" },
  { value: "frame", label: "Frames" },
  { value: "name_color", label: "Name colour" },
  { value: "name_glow", label: "Name glow" },
]

type ShopItem = FrameItem & { kind: CosmeticKind }

function RarityDots({ rarity }: { rarity: number }) {
  return (
    <span aria-hidden="true" className="inline-flex gap-[3px]">
      {[1, 2, 3, 4].map((step) => <i key={step} className={cn("size-1.5 rounded-full", step <= rarity ? "bg-[var(--text-2)]" : "bg-[var(--line-strong)]")} />)}
    </span>
  )
}

/** What the item looks like: a frame around your picture, or your name painted with it. */
function ItemArt({ item, avatar, username, size }: { item: ShopItem; avatar?: string; username: string; size: number }) {
  if (item.kind === "frame") return <FramedAvatar avatar={avatar} name={username} frame={item.id} size={size} />
  const look = item.kind === "name_color" ? { color: item.color ?? null, colorFx: item.fx ?? null } : { glow: item.glow ?? null, glowFx: item.fx ?? null }
  return <span {...nameProps(look, "max-w-full truncate px-2 text-[19px] font-bold text-[var(--text)]")}>{username}</span>
}

function accentOf(item: ShopItem) {
  return item.kind === "frame" ? frameAccent(item.id) : item.color ?? item.glow ?? "var(--text-2)"
}

/** A soft light in the item's own colour behind the art, and a shadow on the floor under it. */
function Spot({ accent, height, children }: { accent: string; height: number; children: React.ReactNode }) {
  return (
    <div className="relative flex items-center justify-center overflow-hidden" style={{ height }}>
      <span aria-hidden="true" className="absolute left-1/2 top-[46%] aspect-square w-[150%] -translate-x-1/2 -translate-y-1/2 opacity-35" style={{ background: `radial-gradient(circle, ${accent} 0%, transparent 58%)` }} />
      <span aria-hidden="true" className="absolute bottom-2.5 left-1/2 h-2.5 w-[56%] -translate-x-1/2" style={{ background: "radial-gradient(ellipse, rgba(0,0,0,.65), transparent 70%)" }} />
      <div className="relative z-[1] flex max-w-full items-center justify-center">{children}</div>
    </div>
  )
}

const group = (item: ShopItem) => (item.unlock === "coin" && !item.owned ? 0 : item.owned ? 1 : 2)

function ownersLine(item: ShopItem, players: number | null | undefined) {
  if (item.owners == null) return "Free"
  if (!players || players < 20) return `${item.owners.toLocaleString()} own`
  return `${Math.round((item.owners / players) * 100)}% own`
}

export function ShopPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { data, loading, error, refetch } = useApiQuery<Cosmetics>((signal) => cosmeticsService.getMine({ signal }), { queryKey: user ? `cosmetics:${user.id}` : "cosmetics:guest" })
  const { data: wallet, refetch: refetchWallet } = useApiQuery<Wallet>((signal) => walletService.getMine({ signal }), { enabled: Boolean(user), queryKey: user ? `wallet:${user.id}` : "wallet:guest" })
  const [tab, setTab] = useState<ShopTab>("featured")
  const [rarity, setRarity] = useState<Rarity>(0)
  const [hideOwned, setHideOwned] = useState(false)
  const [sort, setSort] = useState<"price-up" | "price-down" | "rarity">("price-up")
  const [busy, setBusy] = useState(false)
  const [picked, setPicked] = useState<string | null>(params.get("item"))

  const all: ShopItem[] = useMemo(() => [
    ...(data?.frames ?? []).map((item) => ({ ...item, kind: "frame" as const })),
    ...(data?.nameColors ?? []).map((item) => ({ ...item, kind: "name_color" as const })),
    ...(data?.nameGlows ?? []).map((item) => ({ ...item, kind: "name_glow" as const })),
  ], [data])
  const worn = { frame: data?.equippedFrame ?? null, name_color: data?.equippedNameColor ?? null, name_glow: data?.equippedNameGlow ?? null }
  const balance = wallet?.balance ?? null
  const username = user?.username ?? "Player"

  const featured = all.filter((item) => item.featured && item.unlock === "coin")
  const inTab = all.filter((item) => tab === "featured" || item.kind === tab)
  const shown = inTab
    .filter((item) => (rarity === 0 || item.rarity === rarity) && !(hideOwned && item.owned))
    // What you can still buy comes first, then what you own, then what is only earned.
    .sort((a, b) => group(a) - group(b) || (sort === "rarity" ? (b.rarity ?? 0) - (a.rarity ?? 0) || a.price - b.price : sort === "price-up" ? a.price - b.price : b.price - a.price))

  const selected = all.find((item) => item.id === picked) ?? featured[0] ?? shown[0] ?? null
  const choose = (item: ShopItem) => {
    setPicked(item.id)
    setParams(item.id ? { item: item.id } : {}, { replace: true })
  }

  // The preview wears the item you look at, and whatever you already wear of the other kinds.
  const previewOf = (kind: CosmeticKind) => (selected?.kind === kind ? selected : all.find((item) => item.kind === kind && item.id === worn[kind])) ?? null
  const previewFrame = previewOf("frame")
  const previewColor = previewOf("name_color")
  const previewGlow = previewOf("name_glow")
  const previewLook = { color: previewColor?.color ?? null, colorFx: previewColor?.fx ?? null, glow: previewGlow?.glow ?? null, glowFx: previewGlow?.fx ?? null }

  const collection = (kind: CosmeticKind) => {
    const list = all.filter((item) => item.kind === kind)
    return { owned: list.filter((item) => item.owned).length, total: list.length }
  }

  const buy = async (item: ShopItem) => {
    setBusy(true)
    try {
      await cosmeticsService.buy(item.id)
      window.dispatchEvent(new Event("legacyx:wallet-changed"))
      await cosmeticsService.equip(item.kind, item.id)
      toast.success(`${item.name} is yours and now worn`)
      await Promise.all([refetch(), refetchWallet()])
    } catch (caught) {
      toast.error("Could not buy it", { description: caught instanceof Error ? caught.message : "Try again in a moment." })
    } finally {
      setBusy(false)
    }
  }

  const pill = (active: boolean) => cn("inline-flex h-[26px] items-center rounded-full border px-2.5 text-xs transition-colors", active ? "border-[var(--line-strong)] bg-[var(--raised)] text-[var(--text)]" : "border-[var(--line)] text-[var(--text-dim)] hover:text-[var(--text)]")

  const card = (item: ShopItem) => {
    const active = selected?.id === item.id
    const action = item.owned
      ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--status-green)]"><Check className="size-3" />{worn[item.kind] === item.id ? "Worn" : "Owned"}</span>
      : item.unlock === "coin"
        ? <span className="inline-flex items-center gap-1 whitespace-nowrap text-sm font-bold text-[var(--text)]"><Coins className="size-3.5 text-[var(--text-muted)]" />{item.price.toLocaleString()}</span>
        : <span className="inline-flex items-center gap-1 text-xs text-[var(--text-dim)]"><Lock className="size-3" />Earned</span>
    return (
      <li key={item.id}>
        <button
          type="button"
          onClick={() => choose(item)}
          aria-pressed={active}
          className={cn("flex w-full flex-col overflow-hidden rounded-xl border text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/50", active ? "border-[var(--text-2)] bg-[var(--raised)]" : "border-[var(--line-soft)] bg-[var(--card-surface)] hover:border-[var(--line-strong)]", item.rarity === 4 && !active && "border-[var(--line-strong)]")}
        >
          <div className="relative">
            <span className="absolute left-2.5 top-2.5 z-[2] flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[1px] text-[var(--text-2)]"><RarityDots rarity={item.rarity ?? 1} />{RARITY_NAMES[item.rarity ?? 1]}</span>
            <Spot accent={accentOf(item)} height={132}><div className="pt-3"><ItemArt item={item} avatar={user?.avatar} username={username} size={92} /></div></Spot>
          </div>
          <div className="flex flex-col gap-1.5 px-3 pb-3 pt-2.5">
            <span className="truncate text-[13px] font-semibold text-[var(--text)]">{item.name}</span>
            <span className="flex items-center justify-between gap-2">
              <span className="truncate text-[11px] text-[var(--text-dim)]">{item.kind === "frame" ? "Frame" : item.kind === "name_color" ? "Name colour" : "Name glow"} · {ownersLine(item, data?.players)}</span>
              {action}
            </span>
          </div>
        </button>
      </li>
    )
  }

  const buyBlock = (item: ShopItem) => {
    const afford = balance === null || balance >= item.price
    const isWorn = worn[item.kind] === item.id
    return (
      <div className="flex flex-col gap-2.5 border-t border-[var(--line-soft)] px-4 py-3.5">
        <div className="flex items-baseline justify-between"><span className="text-[15px] font-semibold text-[var(--text)]">{item.name}</span><span className="flex items-center gap-1.5 text-xs text-[var(--text-dim)]"><RarityDots rarity={item.rarity ?? 1} />{RARITY_NAMES[item.rarity ?? 1]}</span></div>
        {item.owned ? (
          <>
            <p className="text-xs text-[var(--text-dim)]">{isWorn ? "You are wearing this." : "You own this. Wear it in Profile → Appearance."}</p>
            <button type="button" onClick={() => navigate("/profile?tab=appearance")} className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--raised)] text-[13px] font-semibold text-[var(--text-2)] hover:border-[var(--line-strong)]">Open Appearance</button>
          </>
        ) : item.unlock === "coin" ? (
          <>
            {balance !== null && (
              <div className="flex flex-col gap-1.5 text-xs text-[var(--text-muted)]">
                <span className="flex justify-between"><span>Your coins</span><span>{balance.toLocaleString()}</span></span>
                <span className="flex justify-between"><span>Price</span><span>− {item.price.toLocaleString()}</span></span>
                <span className="flex justify-between border-t border-[var(--line-soft)] pt-2 text-[13px] font-semibold text-[var(--text)]"><span>After buying</span><span>{afford ? (balance - item.price).toLocaleString() : `${(item.price - balance).toLocaleString()} short`}</span></span>
              </div>
            )}
            <button type="button" disabled={busy || !afford} onClick={() => void buy(item)} className="lx-primary-button inline-flex h-10 w-full items-center justify-center rounded-lg text-[13px] font-semibold disabled:opacity-60">
              {afford ? `Buy for ${item.price.toLocaleString()} coins` : `Need ${(item.price - (balance ?? 0)).toLocaleString()} more coins`}
            </button>
            <p className="text-center text-[11px] text-[var(--text-faint)]">Buying wears it right away. Change it any time in Profile → Appearance.</p>
          </>
        ) : (
          <p className="text-xs text-[var(--text-dim)]">{item.requirement || "Earned in game, not for sale."}</p>
        )}
      </div>
    )
  }

  const rail = (
    <aside className="flex flex-col gap-3 self-start lg:sticky lg:top-6">
      <div className="overflow-hidden rounded-[14px] border border-[var(--line)] bg-[var(--card-surface)]">
        <div className="flex items-center justify-between border-b border-[var(--line-soft)] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[1.2px] text-[var(--text-dim)]"><span>See it everywhere</span><span className="normal-case tracking-normal">{selected?.name}</span></div>
        <div className="flex flex-col gap-3 p-3.5">
          <Context label="Profile">
            <div className="flex items-center gap-3">
              <FramedAvatar avatar={user?.avatar} name={user?.username} frame={previewFrame?.id ?? null} size={92} />
              <div className="min-w-0"><span {...nameProps(previewLook, "block truncate text-[19px] font-bold text-[var(--text)]")}>{username}</span><span className="text-[11px] text-[var(--text-dim)]">Your profile</span></div>
            </div>
          </Context>
          <Context label="Leaderboard">
            <div className="flex items-center gap-2.5 text-[13px]"><b className="w-3.5 text-[var(--text-dim)]">4</b><FramedAvatar avatar={user?.avatar} name={user?.username} frame={previewFrame?.id ?? null} size={46} /><span {...nameProps(previewLook, "min-w-0 flex-1 truncate font-medium text-[var(--text)]")}>{username}</span></div>
          </Context>
          <Context label="Review">
            <div className="flex items-center gap-2.5"><FramedAvatar avatar={user?.avatar} name={user?.username} frame={previewFrame?.id ?? null} size={46} /><span {...nameProps(previewLook, "min-w-0 flex-1 truncate text-[13px] font-medium text-[var(--text)]")}>{username}</span></div>
          </Context>
        </div>
        {selected && buyBlock(selected)}
      </div>
    </aside>
  )

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageBar>
        <PageTabs<ShopTab> ariaLabel="Shop sections" value={tab} onChange={(next) => { setTab(next); setRarity(0) }} options={TABS} />
      </PageBar>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 max-md:px-4">
        {loading ? (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]"><Skeleton className="h-[480px] rounded-xl" /><Skeleton className="h-[480px] rounded-xl" /></div>
        ) : error || !data ? (
          <p className="flex items-center justify-center gap-3 py-24 text-[13px] text-[var(--text-dim)]">Could not load the shop.<button type="button" onClick={refetch} className="inline-flex items-center gap-1.5 text-[var(--text-2)] hover:text-[var(--text)]"><RotateCcw className="size-3.5" />Retry</button></p>
        ) : (
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="flex min-w-0 flex-col gap-5">
              {tab === "featured" && featured.length > 0 && (
                <section aria-label="Featured">
                  <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-[1.2px] text-[var(--text-dim)]">Featured</div>
                  <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{featured.map(card)}</ul>
                </section>
              )}
              {tab === "featured" && (
                <section aria-label="Your collection" className="grid gap-4 rounded-xl border border-[var(--line-soft)] bg-[var(--card-surface)] px-4 py-3 sm:grid-cols-3">
                  {(["frame", "name_color", "name_glow"] as const).map((kind) => {
                    const { owned, total } = collection(kind)
                    return (
                      <div key={kind} className="flex flex-col gap-1.5">
                        <span className="flex justify-between text-xs text-[var(--text-muted)]"><span>{kind === "frame" ? "Frames" : kind === "name_color" ? "Name colours" : "Name glows"}</span><b className="text-[var(--text-2)]">{owned} / {total}</b></span>
                        <span className="h-1 overflow-hidden rounded-full bg-[var(--line)]"><i className="block h-full bg-[var(--text-2)]" style={{ width: `${total ? (owned / total) * 100 : 0}%` }} /></span>
                      </div>
                    )
                  })}
                </section>
              )}
              <section aria-label="Items">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[1.2px] text-[var(--text-dim)]">{tab === "featured" ? "All items" : TABS.find((entry) => entry.value === tab)?.label}</span>
                  <span className="flex-1" />
                  {([0, 1, 2, 3, 4] as const).map((step) => <button key={step} type="button" aria-pressed={rarity === step} onClick={() => setRarity(step)} className={pill(rarity === step)}>{step === 0 ? "All" : RARITY_NAMES[step]}</button>)}
                  <button type="button" aria-pressed={hideOwned} onClick={() => setHideOwned((current) => !current)} className={pill(hideOwned)}>Hide owned</button>
                  <select aria-label="Sort" value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} className="h-[26px] rounded-full border border-[var(--line)] bg-transparent px-2.5 text-xs text-[var(--text-2)]">
                    <option value="price-up">Price: low to high</option>
                    <option value="price-down">Price: high to low</option>
                    <option value="rarity">Rarity</option>
                  </select>
                </div>
                {shown.length === 0 ? <p className="py-8 text-[13px] text-[var(--text-dim)]">Nothing here.</p> : <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">{shown.map(card)}</ul>}
              </section>
            </div>
            {rail}
          </div>
        )}
      </div>
    </div>
  )
}

function Context({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[1.2px] text-[var(--text-dim)]">{label}</div>
      <div className="rounded-[10px] border border-[var(--line-soft)] bg-[var(--panel)] px-3 py-2.5">{children}</div>
    </div>
  )
}
