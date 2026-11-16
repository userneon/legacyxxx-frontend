import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { usePathTab } from "@/hooks/use-url-tab"
import { Check, ChevronDown, Crosshair, Heart, Lock, RotateCcw, Search, ShoppingCart, SlidersHorizontal, Star, Sword, X } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { COSMETIC_DURATIONS, cosmeticsService, isModelKind, type ModelKind, type CosmeticDuration, type CosmeticKind, type Cosmetics, type FrameItem } from "@/api/cosmetics"
import { clansService, walletService, type MyClanState, type Wallet } from "@/api"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"
import { frameAccent, nameProps, timeLeft } from "@/lib/cosmetics"
import { SAVED_KEY, daysLeft, endingSoon, outfitTotal, rarityOf, readSaved } from "@/lib/shop-logic"
import { isRingFrame } from "@/lib/ring-frames"
import { BgThumb } from "@/components/bg-thumb"
import { SmokePuff } from "@/components/smoke-puff"
import { GrenadeLight, GrenadeTrail } from "@/components/grenade-trail"
import { FlashEffect } from "@/components/flash-effect"
import { ShopClan } from "@/components/shop-clan"
import { ShopRanks } from "@/components/shop-ranks"
import { usePerkCatalogue } from "@/hooks/use-perk-catalogue"
import { PICK_DEFAULT, demoColour } from "@/components/color-row"
import { FramedAvatar } from "@/components/framed-avatar"
import { LxMark } from "@/components/lx-mark"
import { PageBar, PageBarEnd, PageTabs, pageSearchClass } from "@/components/page-tabs"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { ChoiceSelect } from "@/components/choice-select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Skeleton } from "@/components/ui/skeleton"

const SORTS = [
  { value: "price-up", label: "Price: low to high" },
  { value: "price-down", label: "Price: high to low" },
  { value: "rarity", label: "Rarity" },
] as const

/** The kinds the Shop sells (banners and titles are earned: they live in Profile → Appearance). */
type ShopKind = Exclude<CosmeticKind, "banner" | "title">
type ShopTab = "featured" | "frame" | "background" | "name" | "smoke_color" | "model" | "discord_role" | "clan"
const TABS: Array<{ value: ShopTab; label: string }> = [
  { value: "featured", label: "Featured" },
  { value: "frame", label: "Frames" },
  { value: "background", label: "Backgrounds" },
  { value: "name", label: "Customize" },
  { value: "smoke_color", label: "Grenades" },
  { value: "model", label: "Weapons" },
  { value: "discord_role", label: "Discord" },
  { value: "clan", label: "Clan" },
]

/** What kind of thing a tile is, in one word, so a name like "Planet Orbit" or "Drift" says what it is before it is opened. */
const KIND_WORD: Record<string, string> = { discord_role: "Discord role", frame: "Frame", background: "Background", profile_customize: "Profile customize", name_color: "Name", name_glow: "Name glow", grenade_trail: "Trail", smoke_color: "Smoke", model_knife: "Knife", model_deagle: "Deagle", model_ak47: "AK-47" }

/** The Shop's top row is grouped: what you wear on your profile (frames, backgrounds, name, grenades) sits under one Profile tab with its own row below. */
const PROFILE_TABS: ShopTab[] = ["frame", "background", "name", "smoke_color", "model", "discord_role"]
const TOP_TABS: Array<{ value: "featured" | "profile" | "clan"; label: string }> = [
  { value: "featured", label: "Featured" },
  { value: "profile", label: "Profile" },
  { value: "clan", label: "Clan" },
]

type ShopItem = FrameItem & { kind: ShopKind }

/** What the item looks like: a frame around your picture, or your name painted with it. */
function ItemArt({ item, avatar, username, size }: { item: ShopItem; avatar?: string; username: string; size: number }) {
  if (item.kind === "background") return <BgThumb id={item.id} fill />
  if (item.kind === "frame") {
    const pic = <FramedAvatar avatar={avatar} name={username} frame={item.id} size={size} />
    // A ring frame draws its own ring; every other frame shows as a ring in its colour.
    return isRingFrame(item.id) ? pic : <span className="lx-shop-ring" style={{ "--acc": frameAccent(item.id) } as React.CSSProperties}>{pic}</span>
  }
  if (item.kind === "discord_role") return <span className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-[14px] font-bold" style={{ color: item.color ?? "#e4e4e7", backgroundColor: `color-mix(in srgb, ${item.color ?? "#e4e4e7"} 18%, #111)` }}>★ {item.name}</span>
  if (item.kind === "smoke_color") return <SmokePuff color={item.color} color2={item.color2} className={size > 100 ? "w-[200px]" : "w-[112px]"} />
  if (item.kind === "grenade_trail") return <GrenadeTrail color={item.color} shape={item.fx} className={size > 100 ? "w-[200px]" : "w-[112px]"} />
  if (item.kind === "flash_effect") return <FlashEffect color={item.color} shape={item.fx} className={size > 100 ? "w-[200px]" : "w-[112px]"} />
  if (item.kind === "grenade_light") return <GrenadeLight color={item.color} className={size > 100 ? "w-[200px]" : "w-[112px]"} />
  if (isModelKind(item.kind)) return <ModelArt id={item.id} kind={item.kind} mode={size > 100 ? "big" : size >= 40 ? "fill" : "small"} />
  if (item.kind === "profile_customize") {
    // The product shows what it unlocks: the three name styles, one under the other.
    return (
      <span className={cn("flex flex-col items-center", size > 100 ? "gap-1.5 text-[19px]" : "gap-0.5 text-[13px]")}>
        <span className="font-bold text-[var(--text)]">{username}</span>
        <span {...nameProps({ mode: "gradient", color: "#60a5fa", color2: "#e879f9" }, "font-bold")}>{username}</span>
        <span {...nameProps({ mode: "glow", glow: "#4ade80", font: "display" }, "font-bold text-[var(--text)]")}>{username}</span>
      </span>
    )
  }
  const look = item.kind === "name_color" ? { color: item.color ?? null, colorFx: item.fx ?? null } : { glow: item.glow ?? null, glowFx: item.fx ?? null }
  return <span {...nameProps(look, cn("font-bold text-[var(--text)]", size > 100 ? "max-w-full truncate text-[19px]" : "whitespace-nowrap text-[13px]"))}>{username}</span>
}

/** The models that have an in-game picture (`public/shop/models/<id>.webp`, taken in the game, owner request 2026-11-09). Any other model shows the weapon it replaces as an icon. */
const MODEL_PICTURES = new Set(["katana-wupie", "katana-miku", "katana-blood", "katana-dengliz", "deagle-mari", "ak-10005"])

/** The preview's picture: a change of model slides the new picture in and the old one out, so the two are never swapped with a jump. */
function SlidingPicture({ id }: { id: string }) {
  const [state, setState] = useState<{ shown: string; prev: string | null }>({ shown: id, prev: null })
  useEffect(() => {
    setState((current) => (current.shown === id ? current : { shown: id, prev: current.shown }))
    const timer = window.setTimeout(() => setState((current) => ({ ...current, prev: null })), 450)
    return () => window.clearTimeout(timer)
  }, [id])
  return (
    <div className="relative aspect-video w-full overflow-hidden">
      {state.prev && <img key={`out-${state.prev}`} src={`/shop/models/${state.prev}.webp`} alt="" draggable={false} className="lx-model-out absolute inset-0 h-full w-full object-cover" />}
      <img key={state.shown} src={`/shop/models/${state.shown}.webp`} alt="" width={640} height={360} draggable={false} className={cn("h-full w-full object-cover", state.prev && "lx-model-in")} />
    </div>
  )
}

/** Whether a model has an in-game picture (the Shop tile then lets it fill the whole top of the tile). */
const hasModelPicture = (item: ShopItem) => isModelKind(item.kind) && MODEL_PICTURES.has(item.id)

/**
 * A weapon model: its picture as it looks in the game's first person view, or, without one, the weapon it replaces drawn as an icon.
 * `fill` covers its whole box (a tile), `big` is the hover card, `preview` the large one beside the price, `small` an outfit thumbnail.
 */
function ModelArt({ id, kind, mode }: { id: string; kind: ModelKind; mode: "fill" | "big" | "preview" | "small" }) {
  if (MODEL_PICTURES.has(id)) {
    // The big preview: when another model is picked, its picture slides in as the old one slides out and fades (owner request 2026-11-09, "the pictures move smoothly between each other").
    if (mode === "preview") return <SlidingPicture id={id} />
    const look = mode === "fill" ? "h-full w-full object-cover" : mode === "big" ? "aspect-video w-[320px] rounded-lg border border-[var(--line)] object-cover" : "aspect-video w-16 rounded-md object-cover"
    return <img src={`/shop/models/${id}.webp`} alt="" width={640} height={360} loading="lazy" draggable={false} className={look} />
  }
  const big = mode === "big" || mode === "preview"
  const Icon = kind === "model_knife" ? Sword : Crosshair
  return (
    <span className="flex flex-col items-center gap-1.5 text-[var(--text-2)]">
      <Icon className={big ? "size-14" : "size-9"} strokeWidth={1.5} aria-hidden="true" />
      <span className="text-[10px] uppercase tracking-[1.2px] text-[var(--text-dim)]">{kind === "model_knife" ? "Knife" : kind === "model_deagle" ? "Desert Eagle" : "AK-47"}</span>
    </span>
  )
}

function accentOf(item: ShopItem) {
  return item.kind === "frame" ? frameAccent(item.id) : item.color ?? item.glow ?? "var(--text-2)"
}

/** A soft light in the item's own colour behind the art, and a shadow on the floor under it. A background's picture fills the whole box instead. */
function Spot({ height, children, fill }: { height: number; children: React.ReactNode; fill?: boolean }) {
  if (fill) return <div className="relative overflow-hidden rounded-lg" style={{ height }}>{children}</div>
  return (
    <div className="relative flex items-center justify-center overflow-hidden" style={{ height }}>
      <span aria-hidden="true" className="absolute bottom-2.5 left-1/2 h-2.5 w-[56%] -translate-x-1/2" style={{ background: "radial-gradient(ellipse, rgba(0,0,0,.65), transparent 70%)" }} />
      <div className="relative z-[1] flex max-w-full items-center justify-center">{children}</div>
    </div>
  )
}

const group = (item: ShopItem) => (item.unlock === "coin" && !item.owned ? 0 : item.owned ? 1 : 2)


/** Items shown at first in a list; the rest comes with "Show more", so a long list stays light and quick to scroll. */
const FIRST_BATCH = 30

/** A grid of cards: tight columns once a list is long, and only the first batch drawn until asked for more. */
function ShopGrid({ list, card, tight = false }: { list: ShopItem[]; tight?: boolean; card: (item: ShopItem, index: number, dense: boolean) => React.ReactNode }) {
  const [limit, setLimit] = useState(FIRST_BATCH)
  const visible = list.slice(0, limit)
  const dense = tight || list.length > 12
  return (
    <>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{visible.map((item, index) => card(item, index, dense))}</ul>
      {list.length > limit && (
        <button type="button" onClick={() => setLimit((current) => current + FIRST_BATCH)} className="mx-auto mt-4 flex h-9 items-center rounded-lg border border-[var(--line)] bg-[var(--raised)] px-4 text-[13px] text-[var(--text-2)] transition-colors hover:border-[var(--line-strong)] hover:text-[var(--text)]">
          Show {Math.min(FIRST_BATCH, list.length - limit)} more · {list.length - limit} left
        </button>
      )}
    </>
  )
}

export function ShopPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data, loading, error, refetch } = useApiQuery<Cosmetics>((signal) => cosmeticsService.getMine({ signal }), { queryKey: user ? `cosmetics:${user.id}` : "cosmetics:guest" })
  const { data: wallet, refetch: refetchWallet } = useApiQuery<Wallet>((signal) => walletService.getMine({ signal }), { enabled: Boolean(user), queryKey: user ? `wallet:${user.id}` : "wallet:guest" })
  const { data: myClan, loading: clanLoading, refetch: refetchClan } = useApiQuery<MyClanState>((signal) => clansService.getMine({ signal }), { enabled: Boolean(user), queryKey: user ? `clans-me:${user.id}` : "clans-me:guest" })
  const [tab, setTab] = usePathTab<ShopTab>("/shop", { featured: "", frame: "frames", background: "backgrounds", name: "customize", smoke_color: "smoke", model: "weapons", discord_role: "discord", clan: "clan" }, "featured")
  // The in-game ranks (owner request 2026-11-07) sit at the top of Featured, only while at least one is on sale, so nothing is shown that cannot be bought. (The Goods tab was taken out the same day.)
  const { catalogue: perks, loading: perksLoading, failed: perksFailed, retry: retryPerks } = usePerkCatalogue()
  // Which Profile sub-tab to return to when the Profile tab is tapped again.
  const [lastProfileTab, setLastProfileTab] = useState<ShopTab>("frame")
  useEffect(() => { if (PROFILE_TABS.includes(tab)) setLastProfileTab(tab) }, [tab])
  const [sort, setSort] = useState<"price-up" | "price-down" | "rarity">("price-up")
  const [show, setShow] = useState<"all" | "available" | "owned" | "saved">("all")
  // Items you marked to come back to; kept in this browser only.
  // Items put aside to buy together as one outfit (one per kind at a time); only what is not owned yet counts.
  const [tray, setTray] = useState<string[]>([])
  const [saved, setSaved] = useState<string[]>(() => readSaved(typeof localStorage === "undefined" ? null : localStorage))
  const toggleSaved = (id: string) => setSaved((current) => {
    const next = current.includes(id) ? current.filter((entry) => entry !== id) : [id, ...current].slice(0, 200)
    try { localStorage.setItem(SAVED_KEY, JSON.stringify(next)) } catch { /* storage blocked: it lasts until the page closes */ }
    return next
  })
  const [busy, setBusy] = useState(false)
  const [search, setSearch] = useState("")
  // How long the next purchase rents the item for; the price of each length is the API's.
  const [duration] = useState<CosmeticDuration>("30d")
  // Some items are rented for one length only; the API lists just the lengths it sells.
  const lengthsOf = (item: ShopItem) => { const sold = COSMETIC_DURATIONS.filter((length) => item.prices?.[length.value] !== undefined); return sold.length ? sold : COSMETIC_DURATIONS }
  // A length picked in the outfit belongs to that item alone; without one the item follows the length picked last.
  const [itemLength, setItemLength] = useState<Record<string, CosmeticDuration>>({})
  const durationFor = (item: ShopItem): CosmeticDuration => {
    const own = itemLength[item.id]
    if (own && lengthsOf(item).some((length) => length.value === own)) return own
    return lengthsOf(item).some((length) => length.value === duration) ? duration : lengthsOf(item)[0].value
  }
  const priceFor = (item: ShopItem, length: CosmeticDuration = durationFor(item)) => item.prices?.[length] ?? item.price

  const all: ShopItem[] = useMemo(() => [
    ...(data?.frames ?? []).map((item) => ({ ...item, kind: "frame" as const })),
    ...(data?.backgrounds ?? []).map((item) => ({ ...item, kind: "background" as const })),
    ...(data?.profileCustomize ?? []).map((item) => ({ ...item, kind: "profile_customize" as const })),
    ...(data?.discordRoles ?? []).map((item) => ({ ...item, kind: "discord_role" as const })),
    ...(data?.smokeColors ?? []).map((item) => ({ ...item, kind: "smoke_color" as const })),
    ...(data?.grenadeTrails ?? []).map((item) => ({ ...item, kind: "grenade_trail" as const })),
    ...(data?.grenadeLights ?? []).map((item) => ({ ...item, kind: "grenade_light" as const })),
    ...(data?.flashEffects ?? []).map((item) => ({ ...item, kind: "flash_effect" as const })),
    ...(data?.modelKnives ?? []).map((item) => ({ ...item, kind: "model_knife" as const })),
    ...(data?.modelDeagles ?? []).map((item) => ({ ...item, kind: "model_deagle" as const })),
    ...(data?.modelAk47s ?? []).map((item) => ({ ...item, kind: "model_ak47" as const })),
  ].filter((item) => !item.retired), [data])
  const worn = { discord_role: null as string | null, frame: data?.equippedFrame ?? null, background: data?.equippedBackground ?? null, name_color: data?.equippedNameColor ?? null, name_glow: data?.equippedNameGlow ?? null, profile_customize: null as string | null, smoke_color: data?.equippedSmokeColor ?? null, grenade_trail: data?.equippedGrenadeTrail ?? null, grenade_light: data?.equippedGrenadeLight ?? null, flash_effect: data?.equippedFlashEffect ?? null, model_knife: data?.equippedModelKnife ?? null, model_deagle: data?.equippedModelDeagle ?? null, model_ak47: data?.equippedModelAk47 ?? null }
  const balance = wallet?.balance ?? null
  const username = user?.username ?? "Player"

  const featured = all.filter((item) => item.featured && item.unlock === "coin")
  const inTab = all.filter((item) => tab === "featured" || item.kind === tab || (tab === "name" && item.kind === "profile_customize") || (tab === "smoke_color" && (item.kind === "grenade_trail")) || (tab === "model" && isModelKind(item.kind)))
  const shown = inTab
    .filter((item) => (!search.trim() || item.name.toLowerCase().includes(search.trim().toLowerCase())))
    .filter((item) => show === "all" || (show === "saved" ? saved.includes(item.id) : show === "owned" ? item.owned : !item.owned && item.unlock === "coin"))
    // What you can still buy comes first, then what you own, then what is only earned.
    .sort((a, b) => group(a) - group(b) || (sort === "rarity" ? (b.rarity ?? 0) - (a.rarity ?? 0) || a.price - b.price : sort === "price-up" ? a.price - b.price : b.price - a.price))

  /** After a purchase: wear the item. */
  const settle = async (item: ShopItem) => {
    try {
      await cosmeticsService.equip(item.kind, item.id)
    } catch (caught) {
      toast.error("It is yours, but it could not be set up", { description: caught instanceof Error ? caught.message : "Wear it from the Shop in a moment." })
    }
  }

  /** Wear or take off an item you own, right here (the Shop used to send you to your profile for this). */
  const wearHere = async (item: ShopItem, on: boolean) => {
    setBusy(true)
    try {
      await cosmeticsService.equip(item.kind, on ? item.id : null)
      toast.success(on ? `${item.name} is on you now` : `${item.name} taken off`)
      await refetch()
      window.dispatchEvent(new Event("legacyx:appearance-changed"))
    } catch (caught) {
      toast.error("Could not change it", { description: caught instanceof Error ? caught.message : "Try again in a moment." })
    } finally {
      setBusy(false)
    }
  }

  /** Buy the whole outfit one item after another: it stops at the first that fails, and says what was bought. */
  const buyMany = async (items: ShopItem[]) => {
    setBusy(true)
    const done: ShopItem[] = []
    for (const item of items) {
      try {
        await cosmeticsService.buy(item.id, durationFor(item))
        done.push(item)
      } catch (caught) {
        toast.error(`Stopped at ${item.name}`, { description: caught instanceof Error ? caught.message : "Try again in a moment." })
        break
      }
    }
    setBusy(false)
    if (!done.length) return
    window.dispatchEvent(new Event("legacyx:wallet-changed"))
    setTray((current) => current.filter((id) => !done.some((item) => item.id === id)))
    toast.success(done.length === 1 ? `${done[0].name} is yours and now worn` : `${done.length} items are yours and now worn`, { duration: 7000, action: { label: "Undo all", onClick: () => void undoMany(done) } })
    for (const item of done) await settle(item)
    await Promise.all([refetch(), refetchWallet()])
    window.dispatchEvent(new Event("legacyx:appearance-changed"))
  }

  const undoMany = async (items: ShopItem[]) => {
    setBusy(true)
    try {
      for (const item of items) await cosmeticsService.undoBuy(item.id)
      window.dispatchEvent(new Event("legacyx:wallet-changed"))
      toast.success("Purchases undone, your FOL$ are back")
      await Promise.all([refetch(), refetchWallet()])
      window.dispatchEvent(new Event("legacyx:appearance-changed"))
    } catch (caught) {
      toast.error("Could not undo it", { description: caught instanceof Error ? caught.message : "Try again in a moment." })
    } finally {
      setBusy(false)
    }
  }

  /** A tile shows a design nobody has coloured yet in a sample colour, so the designs tell apart; the preview starts grey. */
  const onTile = (item: ShopItem, index: number): ShopItem => {
    if (!item.custom) return item
    const field = item.kind === "name_glow" ? "glow" : "color"
    if ((item[field] ?? PICK_DEFAULT).toLowerCase() !== PICK_DEFAULT) return item
    return { ...item, [field]: demoColour(index), ...(item.twoColours ? { color2: demoColour(index + 3) } : {}) }
  }


  const card = (item: ShopItem, index = 0, dense = false) => {
    const shown = onTile(item, index)
    const action = item.testing
      ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--text-2)]"><Check className="size-3" />Testing<span className="font-medium text-[var(--text-dim)]"> · not on sale</span></span>
      : item.owned
      ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--status-green)]"><Check className="size-3" />{worn[item.kind] === item.id ? "Worn" : "Owned"}{item.expiresAt ? <span className="font-medium text-[var(--text-dim)]"> · {timeLeft(item.expiresAt)}</span> : null}</span>
      : item.unlock === "coin"
        ? <span className="lx-shop-price"><LxMark size={14} />{priceFor(item, "30d").toLocaleString()}</span>
        : <span className="inline-flex items-center gap-1 text-xs text-[var(--text-dim)]"><Lock className="size-3" />Earned</span>
    return (
      // No content-visibility here: it paints only inside the box, which cut off the tile's border and glow when it lifts on hover (the lists are at most 30 tiles anyway).
      <li key={item.id} className={cn("group/tile relative rounded-xl",)}>
              <div
                role="group"
                aria-label={item.name}
                style={{ "--acc": accentOf(shown) } as React.CSSProperties}
                className="lx-shop-tile relative flex w-full flex-col overflow-hidden rounded-xl text-left"
              >
                {/* The rarity as a thin line along the bottom, never a surface. */}
                <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[2px]" style={{ background: rarityOf(item.rarity).color }} />
                <div className="lx-tile-panel relative">
                  <Spot height={dense ? 80 : 96} fill={shown.kind === "background" || hasModelPicture(shown)}><ItemArt item={shown} avatar={user?.avatar} username={username} size={dense ? 46 : 56} /></Spot>
                </div>
                <div className="flex flex-col items-start gap-1 px-3 pb-2.5 pt-1.5">
                  <span className="line-clamp-2 w-full text-[13px] font-semibold leading-[1.25] text-[var(--text)]">{(item.rarity ?? 1) >= 3 && <Star className="mr-1 inline size-3 -translate-y-px fill-current text-[var(--text-2)]" aria-label={`${rarityOf(item.rarity).label} item`} />}{item.name}</span>
                  {action}
                </div>
              </div>
            {item.owned && !item.testing && item.kind === "profile_customize" && (
              <button type="button" onClick={() => navigate("/profile/appearance")} style={{ "--acc": accentOf(shown) } as React.CSSProperties} className="absolute bottom-2.5 right-2.5 z-[2] inline-flex h-8 items-center rounded-lg bg-[color-mix(in_srgb,var(--acc)_20%,#111)] px-3 text-[12px] font-semibold text-[var(--acc)] transition-colors hover:bg-[color-mix(in_srgb,var(--acc)_34%,#111)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--acc)]">Set up</button>
            )}
            {item.owned && !item.testing && item.kind !== "profile_customize" && item.kind !== "discord_role" && (
              <button type="button" disabled={busy} onClick={() => void wearHere(item, worn[item.kind] !== item.id)} style={{ "--acc": accentOf(shown) } as React.CSSProperties} className="absolute bottom-2.5 right-2.5 z-[2] inline-flex h-8 items-center rounded-lg bg-[color-mix(in_srgb,var(--acc)_20%,#111)] px-3 text-[12px] font-semibold text-[var(--acc)] transition-colors hover:bg-[color-mix(in_srgb,var(--acc)_34%,#111)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--acc)] disabled:opacity-60">{worn[item.kind] === item.id ? "Take off" : "Wear"}</button>
            )}
            {!item.testing && item.unlock === "coin" && !(item.owned && !item.expiresAt) && (
              <button type="button" onClick={() => addToCart(item)} aria-pressed={tray.includes(item.id)} aria-label={tray.includes(item.id) ? `${item.name} is in the cart` : `Add ${item.name} to the cart`} style={{ "--acc": accentOf(shown) } as React.CSSProperties} className={cn("absolute bottom-2.5 z-[2] grid size-8 place-items-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--acc)]", item.owned && !item.testing && item.kind !== "discord_role" ? (item.kind === "profile_customize" ? "right-[4.5rem]" : worn[item.kind] === item.id ? "right-[5.75rem]" : "right-[4.5rem]") : "right-2.5", tray.includes(item.id) ? "bg-[var(--acc)] text-[#0a0a0a]" : "bg-[color-mix(in_srgb,var(--acc)_20%,#111)] text-[var(--acc)] hover:bg-[color-mix(in_srgb,var(--acc)_34%,#111)]")}>{tray.includes(item.id) ? <Check className="size-4" aria-hidden="true" /> : <ShoppingCart className="size-4" aria-hidden="true" />}</button>
            )}
            <button type="button" onClick={() => toggleSaved(item.id)} aria-pressed={saved.includes(item.id)} aria-label={saved.includes(item.id) ? `Remove ${item.name} from saved` : `Save ${item.name} for later`} className={cn("absolute right-1.5 top-1.5 z-[2] grid size-7 place-items-center rounded-full border border-[var(--line)] bg-[var(--card-surface)]/80 text-[var(--text-dim)] transition-opacity hover:text-[var(--text)] focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]/60", saved.includes(item.id) ? "text-[var(--brand-bright)] opacity-100" : "opacity-0 group-hover/tile:opacity-100")}><Heart className={cn("size-3.5", saved.includes(item.id) && "fill-current")} aria-hidden="true" /></button>
      </li>
    )
  }


  /** A grid of cards, one per design. */
  const grid = (list: ShopItem[], tight = false) => <ShopGrid list={list} card={card} tight={tight} />

  /** One item per kind in the outfit: adding a second background replaces the first. */
  const toggleTray = (item: ShopItem) => setTray((current) => (current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current.filter((id) => all.find((other) => other.id === id)?.kind !== item.kind), item.id]))
  const addToCart = (item: ShopItem) => {
    if (tray.includes(item.id)) { setOutfitOpen(true); return }
    toggleTray(item)
    toast.success(`${item.name} is in your cart`, { action: { label: "Open cart", onClick: () => setOutfitOpen(true) } })
  }
  const trayItems = tray.map((id) => all.find((item) => item.id === id)).filter((item): item is ShopItem => Boolean(item) && item!.unlock === "coin" && !(item!.owned && !item!.expiresAt))
  const outfit = outfitTotal(trayItems.map((item) => ({ price: priceFor(item) })), balance)
  const [outfitOpen, setOutfitOpen] = useState(false)
  useEffect(() => { if (trayItems.length === 0) setOutfitOpen(false) }, [trayItems.length])
  const after = balance === null ? null : balance - outfit.total
  /** The outfit: a bar at the bottom of the page and a panel from the right with every item, its length and the total (owner request 2026-11-07). */
  const outfitPanel = trayItems.length > 0 ? (
    <>
      <div className="fixed inset-x-0 bottom-3 z-30 flex justify-center px-4 max-md:bottom-[72px]">
        <button type="button" onClick={() => setOutfitOpen(true)} aria-label="Open your cart" className="lx-sweep lx-shop-glass flex items-center gap-4 rounded-xl border border-[var(--brand)]/60 bg-[var(--panel)]/70 px-4 py-2.5 text-[13px] shadow-[0_10px_40px_rgba(0,0,0,0.6)] transition-colors hover:border-[var(--brand)]">
          <ShoppingCart className="size-4 text-[var(--brand-bright)]" aria-hidden="true" />
          <span className="font-semibold text-[var(--text)]">Cart · {trayItems.length} {trayItems.length === 1 ? "item" : "items"}</span>
          <span className="inline-flex items-center gap-1 font-semibold text-[var(--text)]"><LxMark size={13} />{outfit.total.toLocaleString()}</span>
        </button>
      </div>
      <Sheet open={outfitOpen} onOpenChange={setOutfitOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 border-l border-[var(--line)] bg-[var(--panel)] p-0 sm:max-w-[400px]">
          <div className="border-b border-[var(--line-soft)] px-[18px] py-4">
            <SheetTitle className="text-[15px] font-semibold text-[var(--text)]">Your cart · {trayItems.length} {trayItems.length === 1 ? "item" : "items"}</SheetTitle>
            <SheetDescription className="mt-0.5 text-[11px] text-[var(--text-dim)]">Everything you buy goes through the cart.</SheetDescription>
          </div>
          <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3.5">
            {trayItems.map((item) => (
              <li key={item.id} className="lx-shop-glass grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-3 rounded-[10px] border p-2">
                <Spot height={64}><ItemArt item={item} avatar={user?.avatar} username={username} size={34} /></Spot>
                <div className="flex min-w-0 flex-col gap-1.5">
                  <span className="truncate text-[13px] font-semibold text-[var(--text)]">{item.name}</span>
                  <span className="text-[11px] text-[var(--text-dim)]">{KIND_WORD[item.kind] ?? "Item"}</span>
                  {lengthsOf(item).length > 1 ? (
                    <ChoiceSelect<CosmeticDuration> ariaLabel={`How long, ${item.name}`} value={durationFor(item)} onChange={(next) => setItemLength((current) => ({ ...current, [item.id]: next }))} options={lengthsOf(item).map((length) => ({ value: length.value, label: length.label, hint: `${priceFor(item, length.value).toLocaleString()}$` }))} className="w-[150px]" />
                  ) : <span className="text-[12px] text-[var(--text-2)]">{COSMETIC_DURATIONS.find((length) => length.value === durationFor(item))?.label}</span>}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--text)]"><LxMark size={12} />{priceFor(item).toLocaleString()}</span>
                  <button type="button" aria-label={`Take ${item.name} out of the cart`} onClick={() => toggleTray(item)} className="inline-flex items-center gap-1 text-[11px] text-[var(--text-dim)] hover:text-[var(--text)]"><X className="size-3" />Remove</button>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-2 border-t border-[var(--line-soft)] bg-[var(--bg)] px-[18px] py-3.5 text-[13px]">
            {balance !== null && <div className="flex justify-between text-[var(--text-dim)]"><span>Your balance</span><span className="inline-flex items-center gap-1"><LxMark size={12} />{balance.toLocaleString()}</span></div>}
            <div className="flex items-baseline justify-between"><span className="text-[var(--text-dim)]">Total</span><span className="inline-flex items-center gap-1 text-[16px] font-bold text-[var(--text)]"><LxMark size={14} />{outfit.total.toLocaleString()}</span></div>
            {balance !== null && (outfit.affordable
              ? <p className="flex justify-between text-[12px] text-[var(--status-green)]"><span className="inline-flex items-center gap-1"><Check className="size-3" />Enough FOL$</span><span>Left after: {after?.toLocaleString()} FOL$</span></p>
              : <p className="text-[12px] text-[var(--status-red)]">You need {(outfit.total - balance).toLocaleString()}$ more.</p>)}
            <button type="button" disabled={busy} onClick={() => (outfit.affordable ? (setOutfitOpen(false), void buyMany(trayItems)) : (setOutfitOpen(false), navigate("/wallet/top-up")))} className="lx-primary-button inline-flex h-11 w-full items-center justify-center rounded-lg text-[13px] font-semibold disabled:opacity-60">
              {outfit.affordable ? `Checkout · ${outfit.total.toLocaleString()}$` : "Top up FOL$"}
            </button>
            <button type="button" onClick={() => { setTray([]); setOutfitOpen(false) }} className="text-center text-[12px] text-[var(--text-dim)] hover:text-[var(--text)]">Empty the cart</button>
            <p className="text-center text-[11px] text-[var(--text-faint)]">After buying you can undo it for a few seconds.</p>
          </div>
        </SheetContent>
      </Sheet>
    </>
  ) : null

  const soon = endingSoon(all)
  const tabOfKind = (kind: ShopKind): ShopTab => (kind === "discord_role" ? "discord_role" : kind === "profile_customize" ? "name" : kind === "smoke_color" || kind === "grenade_trail" ? "smoke_color" : kind === "frame" ? "frame" : kind === "background" ? "background" : "featured")
  // The page bars (sections, and the profile items under them) stick to the top of the panel; stack them one under the other instead of all sticking at 0 and covering each other.
  const rootRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const measure = () => {
      let top = 0
      for (const bar of Array.from(root.querySelectorAll<HTMLElement>(":scope > [data-pagebar]"))) {
        bar.style.top = `${top}px`
        top += bar.offsetHeight
      }
    }
    measure()
    const observer = new ResizeObserver(measure)
    root.querySelectorAll(":scope > [data-pagebar]").forEach((bar) => observer.observe(bar))
    return () => observer.disconnect()
  }, [tab])

  return (
    <div ref={rootRef} className="flex h-full min-h-0 flex-col">
      <PageBar>
        <PageTabs<(typeof TOP_TABS)[number]["value"]> ariaLabel="Shop sections" value={PROFILE_TABS.includes(tab) ? "profile" : (tab as "featured" | "clan")} onChange={(next) => setTab(next === "profile" ? lastProfileTab : next)} options={TOP_TABS} />
        {(tab === "featured" || tab === "frame" || tab === "background" || tab === "name" || tab === "smoke_color" || tab === "model" || tab === "discord_role") && (
          <PageBarEnd className="max-md:hidden">
            <label className={cn(pageSearchClass, "max-md:hidden")}>
              <Search className="size-4 shrink-0 text-[var(--text-dim)]" aria-hidden="true" />
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search items" aria-label="Search items" className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--text)] placeholder:text-[var(--text-faint)] focus:outline-none" />
              {search && <button type="button" aria-label="Clear search" onClick={() => setSearch("")} className="text-[var(--text-dim)] hover:text-[var(--text)]"><X className="size-3.5" /></button>}
            </label>
          </PageBarEnd>
        )}
      </PageBar>
      {PROFILE_TABS.includes(tab) && (
        <PageBar>
          <PageTabs<ShopTab> ariaLabel="Profile items" value={tab} onChange={setTab} options={TABS.filter((entry) => PROFILE_TABS.includes(entry.value))} />
        </PageBar>
      )}
      {/* Not a scroller itself: the page panel around it scrolls, and a sticky rail sticks to the nearest scroller (an inner overflow-y-auto that never scrolled kept it from sticking). */}
      <div className="flex min-h-0 flex-1">
      <div className="lx-glass-page lx-shop-root min-h-0 min-w-0 flex-1 px-6 py-5 max-md:px-4">
        {tab === "featured" && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border border-[var(--line-soft)] px-4 py-3 text-[12px] leading-relaxed text-[var(--text-dim)]">
            <span>Cosmetics are paid in FOL$ (earn it by playing, or top it up). Ranks are paid in ₮ with QPay or any bank app.</span>
            <button type="button" onClick={() => navigate("/wallet/top-up")} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--raised)] px-3 text-[12px] font-semibold text-[var(--text)] transition-colors hover:border-[var(--line-strong)]">Top up FOL$</button>
          </div>
        )}
        {tab === "featured" && (perks ? perks.tiers.length > 0 : true) && (
          <section aria-label="Ranks" className="mb-6 flex flex-col gap-2.5">
            <div className="lx-shop-heading">Ranks</div>
            {perks ? <ShopRanks catalogue={perks} qa={data?.qa === true} /> : perksFailed ? (
              <p className="flex items-center gap-3 text-[13px] text-[var(--text-dim)]">Could not load the ranks.<button type="button" onClick={retryPerks} className="inline-flex items-center gap-1.5 text-[var(--text-2)] hover:text-[var(--text)]"><RotateCcw className="size-3.5" />Retry</button></p>
            ) : (
              <ul className="grid gap-3 md:grid-cols-3" aria-hidden="true" data-loading={perksLoading}>{[0, 1, 2].map((n) => <li key={n}><Skeleton className="h-[318px] rounded-xl" /></li>)}</ul>
            )}
          </section>
        )}
        {loading && !data ? (
          <div className="flex flex-col gap-5"><Skeleton className="h-[170px] rounded-[14px] max-lg:hidden" /><Skeleton className="h-[480px] rounded-xl" /></div>
        ) : error || !data ? (
          <p className="flex items-center justify-center gap-3 py-24 text-[13px] text-[var(--text-dim)]">Could not load the shop.<button type="button" onClick={refetch} className="inline-flex items-center gap-1.5 text-[var(--text-2)] hover:text-[var(--text)]"><RotateCcw className="size-3.5" />Retry</button></p>
        ) : (
          tab === "clan" ? (
            <div key="clan" className="lx-flow-stack"><ShopClan prices={wallet?.clanPrices} balance={balance} mine={user ? myClan : null} loading={Boolean(user) && (clanLoading || !wallet)} onChanged={() => Promise.all([refetchClan(), refetchWallet()])} /></div>
          ) : (
          <div key={tab} className="lx-flow-stack flex min-w-0 flex-col gap-5">
                        <div className="flex min-w-0 flex-col gap-5">
              {soon.length > 0 && (
                <div role="status" aria-label="Ending soon" className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[10px] border border-[var(--brand)]/30 bg-[var(--brand)]/[0.06] px-3.5 py-2.5 text-[12px]">
                  <span className="font-semibold text-[var(--text)]">Ending soon</span>
                  {soon.slice(0, 3).map((item) => (
                    <button key={item.id} type="button" onClick={() => setTab(tabOfKind(item.kind))} className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--card-surface)] px-2.5 py-1 text-[var(--text-2)] hover:border-[var(--line-strong)] hover:text-[var(--text)]">
                      {item.name}<span className="text-[var(--text-dim)]">{daysLeft(item.expiresAt) === 0 ? "ends today" : `${daysLeft(item.expiresAt)} d left`}</span>
                    </button>
                  ))}
                </div>
              )}
              {tab === "featured" && featured.length > 0 && (
                <section aria-label="Featured">
                  <div className="lx-shop-heading mb-2.5">Featured</div>
                  <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 scrollbar-hidden sm:mx-0 sm:grid sm:snap-none sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-5 [&>li]:w-[150px] [&>li]:shrink-0 [&>li]:snap-start sm:[&>li]:w-auto">{featured.map((item, index) => card(item, index, true))}</ul>
                </section>
              )}
              <section aria-label="Items">
                <div className="mb-3 flex items-center gap-2 max-md:-mx-4 max-md:overflow-x-auto max-md:px-4 max-md:pb-1 max-md:scrollbar-hidden md:flex-wrap [&>*]:shrink-0">
                  {/* Name and Grenades head each of their sections instead, so they get no empty heading here. */}
                  {tab !== "name" && tab !== "smoke_color" && tab !== "model" && <span className="lx-shop-heading">{tab === "featured" ? "All items" : TABS.find((entry) => entry.value === tab)?.label}</span>}
                  <span className="flex-1" />
                  {/* One Filter dropdown, the same as on Play (owner report 2026-11-13: the filter did not match the other pages). */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <button type="button" aria-label="Filter items" className={cn("group inline-flex h-[30px] items-center gap-1.5 rounded-[7px] border border-[var(--line)] px-3 text-[13px] font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60", (show !== "all" || sort !== SORTS[0].value) ? "bg-[var(--line)] text-[var(--text)]" : "text-[var(--text-muted)] hover:text-[var(--text)]")}>
                        <SlidersHorizontal className="size-3.5" />
                        Filter
                        {((show !== "all" ? 1 : 0) + (sort !== SORTS[0].value ? 1 : 0)) > 0 && <span className="flex size-4 items-center justify-center rounded-full bg-[var(--text)] text-[10px] font-semibold text-[var(--bg)]">{(show !== "all" ? 1 : 0) + (sort !== SORTS[0].value ? 1 : 0)}</span>}
                        <ChevronDown className="size-3.5 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="end" sideOffset={8} className="w-[232px] rounded-xl border-[var(--line)] bg-[var(--panel)] p-2 shadow-[0_18px_44px_rgba(0,0,0,0.55)]">
                      <div className="flex flex-col gap-2.5">
                        {([
                          { label: "Show", value: show, options: [["all", "All"], ["available", "Not owned"], ["owned", "Owned"], ["saved", "Saved"]] as const, change: (value: string) => setShow(value as typeof show) },
                          { label: "Sort by", value: sort, options: SORTS.map((option) => [option.value, option.label] as const), change: (value: string) => setSort(value as typeof sort) },
                        ]).map((group, index) => (
                          <div key={group.label} className="flex flex-col gap-0.5">
                            {index > 0 && <span aria-hidden="true" className="mb-2 h-px bg-[var(--line-soft)]" />}
                            <span className="px-2 pb-1 text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--text-dim)]">{group.label}</span>
                            <div role="radiogroup" aria-label={group.label} className="flex flex-col gap-0.5">
                              {group.options.map(([value, label]) => (
                                <button key={value} type="button" role="radio" aria-checked={group.value === value} onClick={() => group.change(value)} className={cn("flex h-8 items-center justify-between gap-2 rounded-lg px-2 text-[13px] transition-colors", group.value === value ? "bg-[var(--line)] text-[var(--text)]" : "text-[var(--text-muted)] hover:bg-[var(--raised)] hover:text-[var(--text)]")}>
                                  {label}
                                  {group.value === value && <span aria-hidden="true" className="size-1.5 rounded-full bg-[var(--text)]" />}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                        {(show !== "all" || sort !== SORTS[0].value) && (
                          <button type="button" onClick={() => { setShow("all"); setSort(SORTS[0].value) }} className="mt-0.5 flex h-8 items-center justify-center gap-1.5 rounded-lg text-[13px] text-[var(--text-muted)] transition-colors hover:bg-[var(--raised)] hover:text-[var(--text)]">
                            <RotateCcw className="size-3.5" />
                            Reset
                          </button>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                {shown.length === 0 ? <p className="py-8 text-[13px] text-[var(--text-dim)]">Nothing here.</p> : tab === "name" ? (
                  <div className="flex flex-col gap-4">
                    <div className="lx-glass flex flex-col gap-3 rounded-xl p-5">
                      <h3 className="text-[16px] font-semibold text-[var(--text)]">Profile customize</h3>
                      <ul className="grid gap-x-8 gap-y-1.5 text-[13px] text-[var(--text-2)] @2xl:grid-cols-2">
                        <li><b className="font-semibold text-[var(--text)]">Normal:</b> a colour of your own, in the site font or one of two more.</li>
                        <li><b className="font-semibold text-[var(--text)]">Gradient:</b> two colours across your name.</li>
                        <li><b className="font-semibold text-[var(--text)]">Glow:</b> a glowing name in the colour you pick.</li>
                        <li><b className="font-semibold text-[var(--text)]">Banner:</b> upload your own picture for your profile.</li>
                      </ul>
                      <p className="text-[12px] text-[var(--text-dim)]">Bought for 1, 7 or 30 days. You set everything up in Profile → Appearance.</p>
                    </div>
                    {grid(shown)}
                  </div>
                ) : tab === "smoke_color" ? (
                  <div className="flex flex-col gap-6">
                    {([["smoke_color", "Smoke"], ["grenade_trail", "Trail"]] as const).map(([kind, heading]) => {
                      const list = shown.filter((item) => item.kind === kind)
                      return list.length ? <div key={kind}><div className="lx-shop-heading mb-2.5">{heading}</div>{grid(list)}</div> : null
                    })}
                  </div>
                ) : tab === "model" ? (
                  <div className="flex flex-col gap-6">
                    {([["model_knife", "Knives"], ["model_deagle", "Desert Eagle"], ["model_ak47", "AK-47"]] as const).map(([kind, heading]) => {
                      const list = shown.filter((item) => item.kind === kind)
                      return list.length ? <div key={kind}><div className="lx-shop-heading mb-2.5">{heading}</div>{grid(list)}</div> : null
                    })}
                  </div>
                ) : tab === "discord_role" ? (
                  <div className="flex flex-col gap-5">
                    <p className="max-w-[560px] text-[13px] leading-6 text-[var(--text-2)]">A role in the LXC Discord server, with a colour and a star by your name. It gives no rights, only the look. Rent it for 1, 7 or 30 days; the bot gives it within a minute and takes it back when the rental ends. You need your Discord linked in Settings → Connections.</p>
                    {grid(shown)}
                  </div>
                ) : grid(shown)}
              </section>
            </div>
          </div>
          )
        )}
      </div>
      </div>
      {outfitPanel}
    </div>
  )
}

