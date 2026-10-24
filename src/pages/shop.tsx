import { FounderPack } from "@/components/founder-pack"
import { useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { usePathTab } from "@/hooks/use-url-tab"
import { Check, ChevronDown, Lock, RotateCcw, Search, X } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { cosmeticsService, type CosmeticKind, type Cosmetics, type FrameItem } from "@/api/cosmetics"
import { clansService, walletService, type MyClanState, type Wallet } from "@/api"
import { shopGoodsService, type GoodsProduct } from "@/api/shop-goods"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"
import { frameAccent, nameProps } from "@/lib/cosmetics"
import { SmokePuff } from "@/components/smoke-puff"
import { ShopClan } from "@/components/shop-clan"
import { ShopGoods } from "@/components/shop-goods"
import { FramedAvatar } from "@/components/framed-avatar"
import { LxMark } from "@/components/lx-mark"
import { PageBar, PageBarEnd, PageTabs, pageSearchClass } from "@/components/page-tabs"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Skeleton } from "@/components/ui/skeleton"

const SORTS = [
  { value: "price-up", label: "Price: low to high" },
  { value: "price-down", label: "Price: high to low" },
  { value: "rarity", label: "Rarity" },
] as const

/** The kinds the Shop sells (banners and titles are earned: they live in Profile → Appearance). */
type ShopKind = Exclude<CosmeticKind, "banner" | "title">
type ShopTab = "featured" | ShopKind | "clan" | "goods"
type Rarity = 0 | 1 | 2 | 3 | 4

const RARITY_NAMES = ["", "Common", "Rare", "Epic", "Legendary"]
const TABS: Array<{ value: ShopTab; label: string }> = [
  { value: "featured", label: "Featured" },
  { value: "frame", label: "Frames" },
  { value: "name_color", label: "Name colour" },
  { value: "name_glow", label: "Name glow" },
  { value: "smoke_color", label: "Smoke" },
  { value: "clan", label: "Clan" },
  { value: "goods", label: "Goods" },
]

type ShopItem = FrameItem & { kind: ShopKind }

const KIND_NAME: Record<ShopKind, string> = { frame: "Frame", name_color: "Name colour", name_glow: "Name glow", smoke_color: "Smoke colour" }
const KIND_PLURAL: Record<ShopKind, string> = { frame: "Frames", name_color: "Name colours", name_glow: "Name glows", smoke_color: "Smoke colours" }

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
  if (item.kind === "smoke_color") return <SmokePuff color={item.color} className={size > 100 ? "w-[200px]" : "w-[112px]"} />
  const look = item.kind === "name_color" ? { color: item.color ?? null, colorFx: item.fx ?? null } : { glow: item.glow ?? null, glowFx: item.fx ?? null }
  return <span {...nameProps(look, cn("max-w-full truncate px-2 font-bold text-[var(--text)]", size > 100 ? "text-[19px]" : "text-[15px]"))}>{username}</span>
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
  const { data: goods } = useApiQuery<GoodsProduct[]>((signal) => shopGoodsService.products({ signal }), { queryKey: "shop-goods" })
  const { data: myClan, loading: clanLoading, refetch: refetchClan } = useApiQuery<MyClanState>((signal) => clansService.getMine({ signal }), { enabled: Boolean(user), queryKey: user ? `clans-me:${user.id}` : "clans-me:guest" })
  const [tab, setTab] = usePathTab<ShopTab>("/shop", { featured: "", frame: "frames", name_color: "name-colors", name_glow: "name-glows", smoke_color: "smoke", clan: "clan", goods: "goods" }, "featured")
  const [rarity, setRarity] = useState<Rarity>(0)
  const [status, setStatus] = useState<"all" | "sale" | "owned" | "earned">("all")
  const [sort, setSort] = useState<"price-up" | "price-down" | "rarity">("price-up")
  const [busy, setBusy] = useState(false)
  const [picked, setPicked] = useState<string | null>(params.get("item"))
  const [search, setSearch] = useState("")
  const [sheetOpen, setSheetOpen] = useState(false)
  // The item bought a moment ago: its card rings once and the buy block turns into "Worn" with a fade.
  const [justBought, setJustBought] = useState<string | null>(null)

  const all: ShopItem[] = useMemo(() => [
    ...(data?.frames ?? []).map((item) => ({ ...item, kind: "frame" as const })),
    ...(data?.nameColors ?? []).map((item) => ({ ...item, kind: "name_color" as const })),
    ...(data?.nameGlows ?? []).map((item) => ({ ...item, kind: "name_glow" as const })),
    ...(data?.smokeColors ?? []).map((item) => ({ ...item, kind: "smoke_color" as const })),
  ], [data])
  const worn = { frame: data?.equippedFrame ?? null, name_color: data?.equippedNameColor ?? null, name_glow: data?.equippedNameGlow ?? null, smoke_color: data?.equippedSmokeColor ?? null }
  const balance = wallet?.balance ?? null
  const username = user?.username ?? "Player"

  const featured = all.filter((item) => item.featured && item.unlock === "coin")
  const inTab = all.filter((item) => tab === "featured" || item.kind === tab)
  const shown = inTab
    .filter((item) => (rarity === 0 || item.rarity === rarity) && (status === "all" || (status === "sale" ? item.unlock === "coin" && !item.owned : status === "owned" ? item.owned : item.unlock === "achievement" && !item.owned)) && (!search.trim() || item.name.toLowerCase().includes(search.trim().toLowerCase())))
    // What you can still buy comes first, then what you own, then what is only earned.
    .sort((a, b) => group(a) - group(b) || (sort === "rarity" ? (b.rarity ?? 0) - (a.rarity ?? 0) || a.price - b.price : sort === "price-up" ? a.price - b.price : b.price - a.price))

  const selected = all.find((item) => item.id === picked) ?? (tab === "featured" ? featured[0] : null) ?? shown[0] ?? featured[0] ?? null
  const choose = (item: ShopItem) => {
    setPicked(item.id)
    // On a phone the preview and the buy button live in a sheet, so choosing an item never sends you down the page.
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) setSheetOpen(true)
    setParams((current) => {
      const updated = new URLSearchParams(current)
      if (item.id) updated.set("item", item.id)
      else updated.delete("item")
      return updated
    }, { replace: true })
  }

  // The preview wears the item you look at, and whatever you already wear of the other kinds.
  const previewOf = (kind: ShopKind) => (selected?.kind === kind ? selected : all.find((item) => item.kind === kind && item.id === worn[kind])) ?? null
  const previewFrame = previewOf("frame")
  const previewColor = previewOf("name_color")
  const previewGlow = previewOf("name_glow")
  const previewLook = { color: previewColor?.color ?? null, colorFx: previewColor?.fx ?? null, glow: previewGlow?.glow ?? null, glowFx: previewGlow?.fx ?? null }

  const collection = (kind: ShopKind) => {
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
      setJustBought(item.id)
      window.setTimeout(() => setJustBought((current) => (current === item.id ? null : current)), 1400)
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
        ? <span className="inline-flex items-center gap-1 whitespace-nowrap text-sm font-bold text-[var(--text)]"><LxMark size={14} />{item.price.toLocaleString()}</span>
        : <span className="inline-flex items-center gap-1 text-xs text-[var(--text-dim)]"><Lock className="size-3" />Earned</span>
    return (
      <li key={item.id} className={cn("rounded-xl", justBought === item.id && "lx-bought")}>
        <button
          type="button"
          onClick={() => choose(item)}
          aria-pressed={active}
          className={cn("flex w-full flex-col overflow-hidden rounded-xl border text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/50", active ? "border-[var(--text-2)] bg-[var(--raised)]" : "border-[var(--line-soft)] bg-[var(--card-surface)] hover:border-[var(--line-strong)]", item.rarity === 4 && !active && "border-[var(--line-strong)]")}
        >
          <div className="relative">
            <span className="absolute left-2.5 top-2.5 z-[2] flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[1px] text-[var(--text-2)]"><RarityDots rarity={item.rarity ?? 1} />{RARITY_NAMES[item.rarity ?? 1]}</span>
            <Spot accent={accentOf(item)} height={104}><div className="pt-2"><ItemArt item={item} avatar={user?.avatar} username={username} size={70} /></div></Spot>
          </div>
          <div className="flex flex-col gap-1 px-2.5 pb-2.5 pt-2">
            <span className="truncate text-[13px] font-semibold text-[var(--text)]">{item.name}</span>
            <span className="flex items-center justify-between gap-2">
              {action}
              <span className="truncate text-[11px] text-[var(--text-dim)]">{tab === "featured" ? `${KIND_NAME[item.kind]} · ` : ""}{ownersLine(item, data?.players)}</span>
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
          <div key="owned" className={cn("flex flex-col gap-2.5", justBought === item.id && "lx-swap-in")}>
            <p className="text-xs text-[var(--text-dim)]">{isWorn ? "You are wearing this." : "You own this. Wear it in Profile → Appearance."}</p>
            <button type="button" onClick={() => navigate("/profile", { state: { tab: "appearance" } })} className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--raised)] text-[13px] font-semibold text-[var(--text-2)] hover:border-[var(--line-strong)]">Open Appearance</button>
          </div>
        ) : item.unlock === "coin" ? (
          <>
            {balance !== null && (
              <div className="flex flex-col gap-1.5 text-xs text-[var(--text-muted)]">
                <span className="flex justify-between"><span>Your LX</span><span>{balance.toLocaleString()}</span></span>
                <span className="flex justify-between"><span>Price</span><span>− {item.price.toLocaleString()}</span></span>
                <span className="flex justify-between border-t border-[var(--line-soft)] pt-2 text-[13px] font-semibold text-[var(--text)]"><span>After buying</span><span>{afford ? (balance - item.price).toLocaleString() : `${(item.price - balance).toLocaleString()} short`}</span></span>
              </div>
            )}
            <button type="button" disabled={busy} onClick={() => (afford ? void buy(item) : (setSheetOpen(false), navigate("/wallet/top-up")))} className="lx-primary-button inline-flex h-10 w-full items-center justify-center rounded-lg text-[13px] font-semibold disabled:opacity-60">
              {afford ? `Buy for ${item.price.toLocaleString()} LX` : `Top up ${(item.price - (balance ?? 0)).toLocaleString()} more LX`}
            </button>
          </>
        ) : (
          <p className="text-xs text-[var(--text-dim)]">{item.requirement || "Earned in game, not for sale."}</p>
        )}
      </div>
    )
  }

  const railBody = (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-[14px] border border-[var(--line)] bg-[var(--card-surface)] lg:max-h-[calc(100dvh-11rem)]">
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--line-soft)] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[1.2px] text-[var(--text-dim)]"><span>See it everywhere</span><span className="normal-case tracking-normal">{selected?.name}</span></div>
        <div className="scrollbar-hidden flex min-h-0 flex-col gap-3 overflow-y-auto p-3.5">
          {selected?.kind === "smoke_color" && (
            <Context label="In game">
              <div className="flex items-center justify-center py-1"><SmokePuff color={selected.color} className="w-[220px]" /></div>
            </Context>
          )}
          <Context label="Profile">
            <div className="flex items-center gap-3">
              <FramedAvatar avatar={user?.avatar} name={user?.username} frame={previewFrame?.id ?? null} size={92} />
              <div className="min-w-0"><span {...nameProps(previewLook, "block truncate text-[19px] font-bold text-[var(--text)]")}>{username}</span><span className="text-[11px] text-[var(--text-dim)]">Your profile</span></div>
            </div>
          </Context>
          <div className="max-lg:hidden"><Context label="Leaderboard">
            <div className="flex items-center gap-2.5 text-[13px]"><b className="w-3.5 text-[var(--text-dim)]">4</b><FramedAvatar avatar={user?.avatar} name={user?.username} frame={previewFrame?.id ?? null} size={46} /><span {...nameProps(previewLook, "min-w-0 flex-1 truncate font-medium text-[var(--text)]")}>{username}</span></div>
          </Context></div>
          <div className="max-lg:hidden"><Context label="Review">
            <div className="flex items-center gap-2.5"><FramedAvatar avatar={user?.avatar} name={user?.username} frame={previewFrame?.id ?? null} size={46} /><span {...nameProps(previewLook, "min-w-0 flex-1 truncate text-[13px] font-medium text-[var(--text)]")}>{username}</span></div>
          </Context></div>
        </div>
        {selected && <div className="shrink-0">{buyBlock(selected)}</div>}
      </div>
  )

  const rail = (
    <aside className="scrollbar-hidden hidden flex-col gap-3 self-start lg:sticky lg:top-6 lg:flex">
      {railBody}
    </aside>
  )

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageBar>
        <PageTabs<ShopTab> ariaLabel="Shop sections" value={tab} onChange={(next) => { setTab(next); setRarity(0) }} options={TABS} />
        {(tab === "featured" || tab === "frame" || tab === "name_color" || tab === "name_glow" || tab === "smoke_color") && (
          <PageBarEnd>
            <label className={cn(pageSearchClass, "max-md:hidden")}>
              <Search className="size-4 shrink-0 text-[var(--text-dim)]" aria-hidden="true" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search items" aria-label="Search items" className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--text)] placeholder:text-[var(--text-faint)] focus:outline-none" />
              {search && <button type="button" aria-label="Clear search" onClick={() => setSearch("")} className="text-[var(--text-dim)] hover:text-[var(--text)]"><X className="size-3.5" /></button>}
            </label>
          </PageBarEnd>
        )}
      </PageBar>
      {/* Not a scroller itself: the page panel around it scrolls, and a sticky rail sticks to the nearest scroller (an inner overflow-y-auto that never scrolled kept it from sticking). */}
      <div className="min-h-0 flex-1 px-6 py-5 max-md:px-4">
        {tab === "goods" ? (
          <ShopGoods />
        ) : loading && !data ? (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]"><Skeleton className="h-[480px] rounded-xl" /><Skeleton className="h-[480px] rounded-xl" /></div>
        ) : error || !data ? (
          <p className="flex items-center justify-center gap-3 py-24 text-[13px] text-[var(--text-dim)]">Could not load the shop.<button type="button" onClick={refetch} className="inline-flex items-center gap-1.5 text-[var(--text-2)] hover:text-[var(--text)]"><RotateCcw className="size-3.5" />Retry</button></p>
        ) : (
          tab === "clan" ? (
            <ShopClan prices={wallet?.clanPrices} balance={balance} mine={user ? myClan : null} loading={Boolean(user) && (clanLoading || !wallet)} onChanged={() => Promise.all([refetchClan(), refetchWallet()])} />
          ) : (
          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="flex min-w-0 flex-col gap-5">
              {tab === "featured" && <FounderPack />}
              {tab === "featured" && featured[0] && (() => {
                const item = featured[0]
                const cheapest = (goods ?? []).filter((product) => product.kind === "lx" && product.grantsLx > 0).sort((a, b) => a.priceMnt - b.priceMnt)[0]
                return (
                  <section aria-label="Spotlight" className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_280px]">
                    <button type="button" onClick={() => choose(item)} className="group relative flex min-h-[220px] items-center gap-6 overflow-hidden rounded-2xl border border-[var(--line-soft)] bg-[var(--card-surface)] p-6 text-left transition-colors hover:border-[var(--line-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/50 max-sm:flex-col max-sm:items-start max-sm:gap-3 max-sm:p-4">
                      <span aria-hidden="true" className="absolute -left-10 top-1/2 aspect-square w-[420px] -translate-y-1/2 opacity-30" style={{ background: `radial-gradient(circle, ${accentOf(item)} 0%, transparent 62%)` }} />
                      <span className="relative z-[1] flex w-[200px] shrink-0 items-center justify-center max-sm:w-full"><ItemArt item={item} avatar={user?.avatar} username={username} size={150} /></span>
                      <span className="relative z-[1] flex min-w-0 flex-col gap-2">
                        <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[1px] text-[var(--text-2)]"><RarityDots rarity={item.rarity ?? 1} />{RARITY_NAMES[item.rarity ?? 1]} · Spotlight</span>
                        <span className="text-[28px] font-bold leading-tight text-[var(--text)]">{item.name}</span>
                        <span className="text-[13px] text-[var(--text-muted)]">{item.kind === "frame" ? "Avatar frame" : KIND_NAME[item.kind]} · {ownersLine(item, data?.players)}</span>
                        <span className="mt-1 inline-flex items-center gap-2 text-[18px] font-bold text-[var(--text)]"><LxMark size={20} />{item.price.toLocaleString()}</span>
                      </span>
                    </button>
                    {cheapest && (
                      <button type="button" onClick={() => navigate("/wallet/top-up")} className="group relative flex flex-col justify-between gap-4 overflow-hidden rounded-2xl border border-[var(--line-soft)] bg-[var(--card-surface)] p-5 text-left transition-colors hover:border-[var(--line-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/50">
                        <LxMark size={44} />
                        <span className="flex flex-col gap-1"><span className="text-[17px] font-bold text-[var(--text)]">Top up LX</span><span className="text-[13px] text-[var(--text-muted)]">Packages from {cheapest.priceMnt.toLocaleString()}₮. Clans, frames and more.</span></span>
                        <span className="text-xs font-semibold text-[var(--text-2)]">See packages →</span>
                      </button>
                    )}
                  </section>
                )
              })()}
              {tab === "featured" && featured.length > 0 && (
                <section aria-label="Featured">
                  <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-[1.2px] text-[var(--text-dim)]">Featured</div>
                  <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 scrollbar-hidden sm:mx-0 sm:grid sm:snap-none sm:grid-cols-3 sm:overflow-visible sm:px-0 xl:grid-cols-5 [&>li]:w-[170px] [&>li]:shrink-0 [&>li]:snap-start sm:[&>li]:w-auto">{featured.map(card)}</ul>
                </section>
              )}
              {tab === "featured" && (
                <section aria-label="Your collection" className="grid gap-4 rounded-xl border border-[var(--line-soft)] bg-[var(--card-surface)] px-4 py-3 sm:grid-cols-4">
                  {(["frame", "name_color", "name_glow", "smoke_color"] as const).map((kind) => {
                    const { owned, total } = collection(kind)
                    return (
                      <div key={kind} className="flex flex-col gap-1.5">
                        <span className="flex justify-between text-xs text-[var(--text-muted)]"><span>{KIND_PLURAL[kind]}</span><b className="text-[var(--text-2)]">{owned} / {total}</b></span>
                        <span className="h-1 overflow-hidden rounded-full bg-[var(--line)]"><i className="block h-full bg-[var(--text-2)]" style={{ width: `${total ? (owned / total) * 100 : 0}%` }} /></span>
                      </div>
                    )
                  })}
                </section>
              )}
              <section aria-label="Items">
                <div className="mb-3 flex items-center gap-2 max-md:-mx-4 max-md:overflow-x-auto max-md:px-4 max-md:pb-1 max-md:scrollbar-hidden md:flex-wrap [&>*]:shrink-0">
                  <span className="text-[11px] font-semibold uppercase tracking-[1.2px] text-[var(--text-dim)]">{tab === "featured" ? "All items" : TABS.find((entry) => entry.value === tab)?.label}{tab !== "featured" && (() => { const { owned, total } = collection(tab as ShopKind); return <b className="ml-2 font-semibold normal-case tracking-normal text-[var(--text-2)]">{owned} / {total} owned</b> })()}</span>
                  <span className="flex-1" />
                  {([0, 1, 2, 3, 4] as const).map((step) => <button key={step} type="button" aria-pressed={rarity === step} onClick={() => setRarity(step)} className={pill(rarity === step)}>{step === 0 ? "All" : RARITY_NAMES[step]}</button>)}
                  <span aria-hidden="true" className="mx-0.5 h-4 w-px bg-[var(--line)]" />
                  {([["all", "Everything"], ["sale", "For sale"], ["owned", "Owned"], ["earned", "Earned"]] as const).map(([value, text]) => <button key={value} type="button" aria-pressed={status === value} onClick={() => setStatus(value)} className={pill(status === value)}>{text}</button>)}
                  <Popover>
                    <PopoverTrigger asChild>
                      <button type="button" aria-label="Sort" className={cn(pill(false), "group gap-1.5 text-[var(--text-2)]")}>
                        {SORTS.find((option) => option.value === sort)?.label}
                        <ChevronDown className="size-3.5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="end" sideOffset={8} className="w-[200px] rounded-xl border-[var(--line)] bg-[var(--panel)] p-1.5 shadow-[0_18px_44px_rgba(0,0,0,0.55)]">
                      <div role="radiogroup" aria-label="Sort" className="flex flex-col">
                        {SORTS.map((option) => (
                          <button key={option.value} type="button" role="radio" aria-checked={sort === option.value} onClick={() => setSort(option.value)} className="flex h-8 items-center justify-between rounded-lg px-2.5 text-left text-[13px] text-[var(--text-2)] transition-colors hover:bg-[var(--raised)] hover:text-[var(--text)] aria-checked:text-[var(--text)]">
                            {option.label}
                            {sort === option.value && <Check className="size-3.5" aria-hidden="true" />}
                          </button>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                {shown.length === 0 ? <p className="py-8 text-[13px] text-[var(--text-dim)]">Nothing here.</p> : <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">{shown.map(card)}</ul>}
              </section>
            </div>
            {rail}
          </div>
          )
        )}
      </div>
      <Sheet open={sheetOpen && Boolean(selected)} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="max-h-[88dvh] gap-0 overflow-y-auto rounded-t-2xl border-[var(--line)] bg-[var(--panel)] p-0 lg:hidden">
          <SheetTitle className="sr-only">{selected?.name}</SheetTitle>
          <SheetDescription className="sr-only">Preview and buy this item</SheetDescription>
          <div className="p-3 pt-11">{railBody}</div>
        </SheetContent>
      </Sheet>
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
