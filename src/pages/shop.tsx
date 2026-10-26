import { FounderPack } from "@/components/founder-pack"
import { useMemo, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { usePathTab } from "@/hooks/use-url-tab"
import { Check, ChevronDown, Lock, RotateCcw, Search, X } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { COSMETIC_DURATIONS, cosmeticsService, type CosmeticDuration, type CosmeticKind, type Cosmetics, type FrameItem } from "@/api/cosmetics"
import { clansService, walletService, type MyClanState, type Wallet } from "@/api"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"
import { frameAccent, nameProps, timeLeft } from "@/lib/cosmetics"
import { SmokePuff } from "@/components/smoke-puff"
import { GrenadeLight, GrenadeTrail } from "@/components/grenade-trail"
import { FlashEffect } from "@/components/flash-effect"
import { ShopClan } from "@/components/shop-clan"
import { ShopGoods } from "@/components/shop-goods"
import { ColorRow, PICK_COLORS } from "@/components/color-row"
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
type ShopTab = "featured" | "frame" | "name" | "smoke_color" | "clan" | "goods"
const TABS: Array<{ value: ShopTab; label: string }> = [
  { value: "featured", label: "Featured" },
  { value: "frame", label: "Frames" },
  { value: "name", label: "Name" },
  { value: "smoke_color", label: "Grenades" },
  { value: "clan", label: "Clan" },
  { value: "goods", label: "Goods" },
]

type ShopItem = FrameItem & { kind: ShopKind }

/** What the item looks like: a frame around your picture, or your name painted with it. */
function ItemArt({ item, avatar, username, size }: { item: ShopItem; avatar?: string; username: string; size: number }) {
  if (item.kind === "frame") return <FramedAvatar avatar={avatar} name={username} frame={item.id} size={size} />
  if (item.kind === "smoke_color") return <SmokePuff color={item.color} color2={item.color2} className={size > 100 ? "w-[200px]" : "w-[112px]"} />
  if (item.kind === "grenade_trail") return <GrenadeTrail color={item.color} shape={item.fx} className={size > 100 ? "w-[200px]" : "w-[112px]"} />
  if (item.kind === "flash_effect") return <FlashEffect color={item.color} shape={item.fx} className={size > 100 ? "w-[200px]" : "w-[112px]"} />
  if (item.kind === "grenade_light") return <GrenadeLight color={item.color} className={size > 100 ? "w-[200px]" : "w-[112px]"} />
  const look = item.kind === "name_color" ? { color: item.color ?? null, colorFx: item.fx ?? null } : { glow: item.glow ?? null, glowFx: item.fx ?? null }
  return <span {...nameProps(look, cn("font-bold text-[var(--text)]", size > 100 ? "max-w-full truncate text-[19px]" : "whitespace-nowrap text-[13px]"))}>{username}</span>
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


export function ShopPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { data, loading, error, refetch } = useApiQuery<Cosmetics>((signal) => cosmeticsService.getMine({ signal }), { queryKey: user ? `cosmetics:${user.id}` : "cosmetics:guest" })
  const { data: wallet, refetch: refetchWallet } = useApiQuery<Wallet>((signal) => walletService.getMine({ signal }), { enabled: Boolean(user), queryKey: user ? `wallet:${user.id}` : "wallet:guest" })
  const { data: myClan, loading: clanLoading, refetch: refetchClan } = useApiQuery<MyClanState>((signal) => clansService.getMine({ signal }), { enabled: Boolean(user), queryKey: user ? `clans-me:${user.id}` : "clans-me:guest" })
  const [tab, setTab] = usePathTab<ShopTab>("/shop", { featured: "", frame: "frames", name: "name", smoke_color: "smoke", clan: "clan", goods: "goods" }, "featured")
  const [sort, setSort] = useState<"price-up" | "price-down" | "rarity">("price-up")
  const [busy, setBusy] = useState(false)
  const [picked, setPicked] = useState<string | null>(params.get("item"))
  const [search, setSearch] = useState("")
  const [sheetOpen, setSheetOpen] = useState(false)
  // The colours being tried on a design before they are saved (anyone can try; buying or saving keeps them).
  const [customDraft, setCustomDraft] = useState<Record<string, string>>({})
  const [customDraft2, setCustomDraft2] = useState<Record<string, string>>({})
  /** An in-game item as it would look with the colours being tried on it. */
  const tried = (item: ShopItem) => ({ color: customDraft[item.id] ?? item.color, color2: customDraft2[item.id] ?? item.color2, fx: item.fx })
  const dropDrafts = (id: string) => {
    setCustomDraft((current) => { const { [id]: _saved, ...rest } = current; return rest })
    setCustomDraft2((current) => { const { [id]: _saved, ...rest } = current; return rest })
  }
  // The item bought a moment ago: its card rings once and the buy block turns into "Worn" with a fade.
  const [justBought, setJustBought] = useState<string | null>(null)
  // How long the next purchase rents the item for; the price of each length is the API's.
  const [duration, setDuration] = useState<CosmeticDuration>("30d")
  const priceFor = (item: ShopItem, length: CosmeticDuration = duration) => item.prices?.[length] ?? item.price

  const all: ShopItem[] = useMemo(() => [
    ...(data?.frames ?? []).map((item) => ({ ...item, kind: "frame" as const })),
    ...(data?.nameColors ?? []).map((item) => ({ ...item, kind: "name_color" as const })),
    ...(data?.nameGlows ?? []).map((item) => ({ ...item, kind: "name_glow" as const })),
    ...(data?.smokeColors ?? []).map((item) => ({ ...item, kind: "smoke_color" as const })),
    ...(data?.grenadeTrails ?? []).map((item) => ({ ...item, kind: "grenade_trail" as const })),
    ...(data?.grenadeLights ?? []).map((item) => ({ ...item, kind: "grenade_light" as const })),
    ...(data?.flashEffects ?? []).map((item) => ({ ...item, kind: "flash_effect" as const })),
  ], [data])
  const worn = { frame: data?.equippedFrame ?? null, name_color: data?.equippedNameColor ?? null, name_glow: data?.equippedNameGlow ?? null, smoke_color: data?.equippedSmokeColor ?? null, grenade_trail: data?.equippedGrenadeTrail ?? null, grenade_light: data?.equippedGrenadeLight ?? null, flash_effect: data?.equippedFlashEffect ?? null }
  const balance = wallet?.balance ?? null
  const username = user?.username ?? "Player"

  const featured = all.filter((item) => item.featured && item.unlock === "coin")
  const inTab = all.filter((item) => tab === "featured" || item.kind === tab || (tab === "name" && (item.kind === "name_color" || item.kind === "name_glow")) || (tab === "smoke_color" && (item.kind === "grenade_trail" || item.kind === "grenade_light" || item.kind === "flash_effect")))
  const shown = inTab
    .filter((item) => (!search.trim() || item.name.toLowerCase().includes(search.trim().toLowerCase())))
    // What you can still buy comes first, then what you own, then what is only earned.
    .sort((a, b) => group(a) - group(b) || (sort === "rarity" ? (b.rarity ?? 0) - (a.rarity ?? 0) || a.price - b.price : sort === "price-up" ? a.price - b.price : b.price - a.price))

  const selected = all.find((item) => item.id === picked) ?? (tab === "featured" ? featured[0] : null) ?? shown[0] ?? featured[0] ?? null
  // The name colour and the name glow being tried together: the preview wears both, and each is bought on its own.
  const [combo, setCombo] = useState<{ name_color?: string; name_glow?: string }>({})
  const isPicked = (item: ShopItem) => selected?.id === item.id || (item.kind === "name_color" || item.kind === "name_glow" ? combo[item.kind] === item.id : false)
  const choose = (item: ShopItem) => {
    setPicked(item.id)
    if (item.kind === "name_color" || item.kind === "name_glow") setCombo((current) => ({ ...current, [item.kind]: item.id }))
    // On a phone the preview and the buy button live in a sheet, so choosing an item never sends you down the page.
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) setSheetOpen(true)
    setParams((current) => {
      const updated = new URLSearchParams(current)
      if (item.id) updated.set("item", item.id)
      else updated.delete("item")
      return updated
    }, { replace: true, state: { tab } }) // keep the tab: it lives in the history entry, which a bare search change would drop
  }

  // The preview wears the item you look at, and whatever you already wear of the other kinds.
  const previewOf = (kind: ShopKind) => (kind === "name_color" || kind === "name_glow" ? all.find((item) => item.id === combo[kind]) : undefined) ?? (selected?.kind === kind ? selected : all.find((item) => item.kind === kind && item.id === worn[kind])) ?? null
  const previewFrame = previewOf("frame")
  const previewColor = previewOf("name_color")
  const previewGlow = previewOf("name_glow")
  const previewLook = { color: (previewColor && customDraft[previewColor.id]) || previewColor?.color || null, colorFx: previewColor?.fx ?? null, glow: (previewGlow && customDraft[previewGlow.id]) || previewGlow?.glow || null, glowFx: previewGlow?.fx ?? null }


  const buy = async (item: ShopItem) => {
    setBusy(true)
    try {
      const bought = await cosmeticsService.buy(item.id, duration)
      window.dispatchEvent(new Event("legacyx:wallet-changed"))
      if (item.custom && (customDraft[item.id] || customDraft2[item.id])) {
        await cosmeticsService.saveCustom(item.id, customDraft[item.id] ?? (item.kind === "name_glow" ? item.glow : item.color) ?? "#d4d4d4", item.twoColours ? customDraft2[item.id] ?? item.color2 : null)
        dropDrafts(item.id)
      }
      await cosmeticsService.equip(item.kind, item.id)
      toast.success(bought.expiresAt ? `${item.name} is yours for ${COSMETIC_DURATIONS.find((entry) => entry.value === duration)?.label.toLowerCase()} and now worn` : `${item.name} is yours for good and now worn`)
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
    const active = isPicked(item)
    const action = item.owned
      ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--status-green)]"><Check className="size-3" />{worn[item.kind] === item.id ? "Worn" : "Owned"}{item.expiresAt ? <span className="font-medium text-[var(--text-dim)]"> · {timeLeft(item.expiresAt)}</span> : null}</span>
      : item.unlock === "coin"
        ? <span className="lx-shop-price"><LxMark size={14} />{priceFor(item, "30d").toLocaleString()}</span>
        : <span className="inline-flex items-center gap-1 text-xs text-[var(--text-dim)]"><Lock className="size-3" />Earned</span>
    return (
      <li key={item.id} className={cn("rounded-xl", justBought === item.id && "lx-bought")}>
        <button
          type="button"
          onClick={() => choose(item)}
          aria-pressed={active}
          aria-label={item.name}
          title={item.name}
          className="lx-shop-tile flex w-full flex-col overflow-hidden rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]/60"
        >
          <div className="relative">
            <Spot accent={accentOf(item)} height={124}><ItemArt item={item} avatar={user?.avatar} username={username} size={70} /></Spot>
          </div>
          <div className="flex items-center justify-between gap-2 px-3 pb-3 pt-1">{action}<span className="min-w-0 truncate text-[11px] font-medium text-[var(--text-dim)]">{item.name}</span></div>
        </button>
      </li>
    )
  }

  const saveCustom = async (item: ShopItem) => {
    setBusy(true)
    try {
      await cosmeticsService.saveCustom(item.id, customDraft[item.id] ?? (item.kind === "name_glow" ? item.glow : item.color) ?? "#d4d4d4", item.twoColours ? customDraft2[item.id] ?? item.color2 : null)
      await refetch()
      dropDrafts(item.id)
      toast.success("Saved")
    } catch (caught) {
      toast.error("Could not save it", { description: caught instanceof Error ? caught.message : "Try again in a moment." })
    } finally {
      setBusy(false)
    }
  }

  /** A grid of cards, one per design. */
  const grid = (list: ShopItem[]) => <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">{list.map(card)}</ul>

  const buyBlock = (item: ShopItem) => {
    const isWorn = worn[item.kind] === item.id
    // Yours for good: nothing to buy. Anything sold with LX that is not (not owned, or only rented) can be bought or extended.
    const rentable = item.unlock === "coin" && !(item.owned && !item.expiresAt)
    const cost = priceFor(item)
    const afford = balance === null || balance >= cost
    return (
      <div className="flex flex-col gap-2.5 border-t border-[var(--line-soft)] px-4 py-3.5">
        <span className="flex items-baseline justify-between gap-2">
          <span className="min-w-0 truncate text-[15px] font-semibold text-[var(--text)]">{item.name}</span>
          {/* A real count from the API (players who own it now); nothing when nobody does yet. */}
          {item.owners ? <span className="shrink-0 text-[11px] text-[var(--text-dim)]">{item.owners.toLocaleString()} {item.owners === 1 ? "player owns" : "players own"} it</span> : null}
        </span>
        {/* Every design is coloured by the player: anyone can try colours on here; buying or saving keeps them. */}
        {item.custom && (
          <div className="flex flex-col gap-2.5">
            <ColorRow label={item.kind === "name_glow" ? "Glow" : item.twoColours ? "First" : "Colour"} value={customDraft[item.id] ?? (item.kind === "name_glow" ? item.glow : item.color) ?? "#d4d4d4"} colors={PICK_COLORS} onChange={(next) => setCustomDraft((current) => ({ ...current, [item.id]: next }))} />
            {item.twoColours && <ColorRow label="Second" value={customDraft2[item.id] ?? item.color2 ?? "#737373"} colors={PICK_COLORS} onChange={(next) => setCustomDraft2((current) => ({ ...current, [item.id]: next }))} />}
            {item.owned
              ? <button type="button" disabled={busy || (!customDraft[item.id] && !customDraft2[item.id])} onClick={() => void saveCustom(item)} className="lx-primary-button inline-flex h-9 items-center justify-center self-start rounded-lg px-4 text-xs font-semibold disabled:opacity-50">Save colour</button>
              : <p className="text-[11px] text-[var(--text-dim)]">Pick any colour; it is kept when you buy it.</p>}
          </div>
        )}
        {item.owned && (
          <div key="owned" className={cn("flex flex-col gap-2.5", justBought === item.id && "lx-swap-in")}>
            <p className="text-xs text-[var(--text-dim)]">{isWorn ? "Worn" : "Owned"}{item.expiresAt ? ` · ${timeLeft(item.expiresAt)}` : ""}</p>
            <button type="button" onClick={() => navigate("/profile", { state: { tab: "appearance" } })} className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--raised)] text-[13px] font-semibold text-[var(--text-2)] hover:border-[var(--line-strong)]">Wear it</button>
          </div>
        )}
        {rentable ? (
          <>
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" aria-label="How long" className="group flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-[var(--line)] bg-[var(--raised)] px-3 text-left text-[13px] transition-colors hover:border-[var(--line-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60">
                  <span className="flex min-w-0 items-center gap-2"><span className="text-[var(--text-dim)]">For</span><span className="font-semibold text-[var(--text)]">{COSMETIC_DURATIONS.find((length) => length.value === duration)?.label}</span></span>
                  <span className="flex items-center gap-2"><span className="flex items-center gap-1 font-semibold text-[var(--text)]"><LxMark size={12} />{priceFor(item).toLocaleString()}</span><ChevronDown className="size-3.5 text-[var(--text-dim)] transition-transform duration-200 group-data-[state=open]:rotate-180" /></span>
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" side="top" sideOffset={8} className="w-[var(--radix-popover-trigger-width)] min-w-[220px] rounded-xl border-[var(--line)] bg-[var(--panel)] p-1.5 shadow-[0_18px_44px_rgba(0,0,0,0.55)]">
                <div role="radiogroup" aria-label="How long" className="flex flex-col">
                  {COSMETIC_DURATIONS.map((length) => (
                    <button key={length.value} type="button" role="radio" aria-checked={duration === length.value} onClick={() => setDuration(length.value)} className="flex h-9 items-center justify-between gap-3 rounded-lg px-2.5 text-left text-[13px] text-[var(--text-2)] transition-colors hover:bg-[var(--raised)] hover:text-[var(--text)] aria-checked:text-[var(--text)]">
                      <span className="flex items-center gap-2">{duration === length.value ? <Check className="size-3.5" aria-hidden="true" /> : <span className="size-3.5" aria-hidden="true" />}{length.label}</span>
                      <span className="flex items-center gap-1 font-semibold"><LxMark size={12} />{priceFor(item, length.value).toLocaleString()}</span>
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            <button type="button" disabled={busy} onClick={() => (afford ? void buy(item) : (setSheetOpen(false), navigate("/wallet/top-up")))} className="lx-primary-button inline-flex h-10 w-full items-center justify-center rounded-lg text-[13px] font-semibold disabled:opacity-60">
              {afford ? `${item.owned ? "Extend" : "Buy"} for ${cost.toLocaleString()} LX` : `Top up ${(cost - (balance ?? 0)).toLocaleString()} more LX`}
            </button>
          </>
        ) : !item.owned ? (
          <p className="text-xs text-[var(--text-dim)]">{item.requirement || "Earned in game, not for sale."}</p>
        ) : null}
      </div>
    )
  }

  const railBody = (
    <div className="lx-add-box relative flex min-h-0 flex-col overflow-hidden rounded-[14px] border lg:max-h-[calc(100dvh-11rem)]">
        <div className="scrollbar-hidden flex min-h-0 flex-col gap-3 overflow-y-auto p-3.5">
          {selected?.kind === "grenade_trail" ? (
            <div className="relative flex items-center justify-center py-4"><GrenadeTrail key={`${selected.id}${tried(selected).fx}`} color={tried(selected).color} shape={tried(selected).fx} className="w-[220px]" /></div>
          ) : selected?.kind === "flash_effect" ? (
            <div className="relative flex items-center justify-center py-4"><FlashEffect key={`${selected.id}${tried(selected).fx}`} color={tried(selected).color} shape={tried(selected).fx} className="w-[220px]" /></div>
          ) : selected?.kind === "grenade_light" ? (
            <div className="relative flex items-center justify-center py-4"><GrenadeLight color={tried(selected).color} className="w-[220px]" /></div>
          ) : selected?.kind === "smoke_color" ? (
            <div className="relative flex items-center justify-center py-4"><span aria-hidden="true" className="absolute left-1/2 top-1/2 aspect-square w-[130%] -translate-x-1/2 -translate-y-1/2 opacity-25" style={{ background: "radial-gradient(circle, var(--brand) 0%, transparent 60%)" }} /><SmokePuff color={tried(selected).color} color2={tried(selected).color2} className="w-[220px]" /></div>
          ) : (
            <div className="relative flex flex-col items-center gap-3 py-4">
              <span aria-hidden="true" className="absolute left-1/2 top-1/2 aspect-square w-[130%] -translate-x-1/2 -translate-y-1/2 opacity-25" style={{ background: "radial-gradient(circle, var(--brand) 0%, transparent 60%)" }} />
              <FramedAvatar avatar={user?.avatar} name={user?.username} frame={previewFrame?.id ?? null} size={120} />
              <span {...nameProps(previewLook, "max-w-full truncate text-[19px] font-bold text-[var(--text)]")}>{username}</span>
            </div>
          )}
        </div>
        {selected && (
          <div className="shrink-0">
            {tab === "name" && combo.name_color && combo.name_glow
              ? [combo.name_color, combo.name_glow].map((id) => all.find((item) => item.id === id)).filter((item): item is ShopItem => Boolean(item)).map((item) => <div key={item.id}>{buyBlock(item)}</div>)
              : buyBlock(selected)}
          </div>
        )}
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
        <PageTabs<ShopTab> ariaLabel="Shop sections" value={tab} onChange={setTab} options={TABS} />
        {(tab === "featured" || tab === "frame" || tab === "name" || tab === "smoke_color") && (
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
      <div className="lx-glass-page min-h-0 flex-1 px-6 py-5 max-md:px-4">
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
              {tab === "featured" && featured.length > 0 && (
                <section aria-label="Featured">
                  <div className="lx-shop-heading mb-2.5">Featured</div>
                  <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 scrollbar-hidden sm:mx-0 sm:grid sm:snap-none sm:grid-cols-3 sm:overflow-visible sm:px-0 xl:grid-cols-5 [&>li]:w-[170px] [&>li]:shrink-0 [&>li]:snap-start sm:[&>li]:w-auto">{featured.map(card)}</ul>
                </section>
              )}
              <section aria-label="Items">
                <div className="mb-3 flex items-center gap-2 max-md:-mx-4 max-md:overflow-x-auto max-md:px-4 max-md:pb-1 max-md:scrollbar-hidden md:flex-wrap [&>*]:shrink-0">
                  {/* Name and Grenades head each of their sections instead, so they get no empty heading here. */}
                  {tab !== "name" && tab !== "smoke_color" && <span className="lx-shop-heading">{tab === "featured" ? "All items" : TABS.find((entry) => entry.value === tab)?.label}</span>}
                  <span className="flex-1" />
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
                {shown.length === 0 ? <p className="py-8 text-[13px] text-[var(--text-dim)]">Nothing here.</p> : tab === "name" ? (
                  <div className="flex flex-col gap-6">
                    {([["name_color", "Colour"], ["name_glow", "Glow"]] as const).map(([kind, heading]) => {
                      const list = shown.filter((item) => item.kind === kind)
                      return list.length ? <div key={kind}><div className="lx-shop-heading mb-2.5">{heading}</div>{grid(list)}</div> : null
                    })}
                  </div>
                ) : tab === "smoke_color" ? (
                  <div className="flex flex-col gap-6">
                    {([["smoke_color", "Smoke"], ["grenade_trail", "Trail"], ["grenade_light", "Light"], ["flash_effect", "Flash"]] as const).map(([kind, heading]) => {
                      const list = shown.filter((item) => item.kind === kind)
                      return list.length ? <div key={kind}><div className="lx-shop-heading mb-2.5">{heading}</div>{grid(list)}</div> : null
                    })}
                  </div>
                ) : grid(shown)}
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

