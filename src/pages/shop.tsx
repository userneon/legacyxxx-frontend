import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { usePathTab } from "@/hooks/use-url-tab"
import { Check, ChevronDown, Crosshair, Heart, Lock, RotateCcw, Search, SlidersHorizontal, Sword, Undo2, X } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { COSMETIC_DURATIONS, cosmeticsService, isModelKind, type ModelKind, type CosmeticDuration, type CosmeticKind, type Cosmetics, type FrameItem } from "@/api/cosmetics"
import { clansService, walletService, type MyClanState, type Wallet } from "@/api"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"
import { frameAccent, nameProps, timeLeft } from "@/lib/cosmetics"
import { SAVED_KEY, daysLeft, endingSoon, outfitTotal, rarityOf, readSaved } from "@/lib/shop-logic"
import { ORB_ID, type FrameLook } from "@/lib/frame-look"
import { OrbCustomizer } from "@/components/orb-customizer"
import { BgCustomizer } from "@/components/bg-customizer"
import { BgThumb } from "@/components/bg-thumb"
import { BackgroundScene, bgById, type BgLook } from "@/lib/backgrounds"
import StarBorder from "@/components/reactbits/star-border"
import ShinyText from "@/components/reactbits/shiny-text"
import { CountNumber } from "@/components/count-number"
import { SmokePuff } from "@/components/smoke-puff"
import { GrenadeLight, GrenadeTrail } from "@/components/grenade-trail"
import { FlashEffect } from "@/components/flash-effect"
import { ShopClan } from "@/components/shop-clan"
import { ShopGoods } from "@/components/shop-goods"
import { ShopRanks } from "@/components/shop-ranks"
import { perksService } from "@/api/perks"
import { ColorRow, PICK_COLORS, PICK_DEFAULT, demoColour } from "@/components/color-row"
import { FramedAvatar } from "@/components/framed-avatar"
import { LxMark } from "@/components/lx-mark"
import { PageBar, PageBarEnd, PageTabs, pageSearchClass } from "@/components/page-tabs"
import { Sheet, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { DetailSheetContent } from "@/components/detail-sheet"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

const SORTS = [
  { value: "price-up", label: "Price: low to high" },
  { value: "price-down", label: "Price: high to low" },
  { value: "rarity", label: "Rarity" },
] as const

/** The kinds the Shop sells (banners and titles are earned: they live in Profile → Appearance). */
type ShopKind = Exclude<CosmeticKind, "banner" | "title">
type ShopTab = "featured" | "frame" | "background" | "name" | "smoke_color" | "model" | "clan" | "goods" | "ranks"
const TABS: Array<{ value: ShopTab; label: string }> = [
  { value: "featured", label: "Featured" },
  { value: "frame", label: "Frames" },
  { value: "background", label: "Backgrounds" },
  { value: "name", label: "Name" },
  { value: "smoke_color", label: "Grenades" },
  { value: "model", label: "Weapons" },
  { value: "clan", label: "Clan" },
  { value: "goods", label: "Goods" },
  { value: "ranks", label: "Ranks" },
]

/** The Shop's top row is grouped: what you wear on your profile (frames, backgrounds, name, grenades) sits under one Profile tab with its own row below. */
const PROFILE_TABS: ShopTab[] = ["frame", "background", "name", "smoke_color", "model"]
const TOP_TABS: Array<{ value: "featured" | "profile" | "clan" | "goods" | "ranks"; label: string }> = [
  { value: "featured", label: "Featured" },
  { value: "profile", label: "Profile" },
  { value: "clan", label: "Clan" },
  { value: "goods", label: "Goods" },
  { value: "ranks", label: "Ranks" },
]

type ShopItem = FrameItem & { kind: ShopKind }

/** What the item looks like: a frame around your picture, or your name painted with it. */
function ItemArt({ item, avatar, username, size, orb }: { item: ShopItem; avatar?: string; username: string; size: number; orb?: FrameLook | null }) {
  if (item.kind === "background") return <BgThumb id={item.id} fill />
  if (item.kind === "frame") return <FramedAvatar avatar={avatar} name={username} frame={item.id} look={orb} live={size >= 120} size={size} />
  if (item.kind === "smoke_color") return <SmokePuff color={item.color} color2={item.color2} className={size > 100 ? "w-[200px]" : "w-[112px]"} />
  if (item.kind === "grenade_trail") return <GrenadeTrail color={item.color} shape={item.fx} className={size > 100 ? "w-[200px]" : "w-[112px]"} />
  if (item.kind === "flash_effect") return <FlashEffect color={item.color} shape={item.fx} className={size > 100 ? "w-[200px]" : "w-[112px]"} />
  if (item.kind === "grenade_light") return <GrenadeLight color={item.color} className={size > 100 ? "w-[200px]" : "w-[112px]"} />
  if (isModelKind(item.kind)) return <ModelArt kind={item.kind} big={size > 100} />
  const look = item.kind === "name_color" ? { color: item.color ?? null, colorFx: item.fx ?? null } : { glow: item.glow ?? null, glowFx: item.fx ?? null }
  return <span {...nameProps(look, cn("font-bold text-[var(--text)]", size > 100 ? "max-w-full truncate text-[19px]" : "whitespace-nowrap text-[13px]"))}>{username}</span>
}

/** A weapon model has no picture of its own here (the model is in the game): the weapon it replaces, drawn as an icon. */
function ModelArt({ kind, big }: { kind: ModelKind; big: boolean }) {
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

/**
 * The picked background in the preview: its still picture shows at once while the live one loads, then the picture fades away so the two are never
 * seen on top of each other (a live background can be see-through, and its picture would show behind it).
 */
function BgPreview({ id, look }: { id: string; look: BgLook }) {
  const [still, setStill] = useState(true)
  useEffect(() => {
    const timer = window.setTimeout(() => setStill(false), 1100)
    return () => window.clearTimeout(timer)
  }, [])
  return (
    <>
      <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0 transition-opacity duration-500", still ? "opacity-100" : "opacity-0")}><BgThumb id={id} fill /></div>
      <div className="absolute inset-0"><BackgroundScene id={id} look={look} /></div>
    </>
  )
}

/** A soft light in the item's own colour behind the art, and a shadow on the floor under it. A background's picture fills the whole box instead. */
function Spot({ accent, height, children, fill }: { accent: string; height: number; children: React.ReactNode; fill?: boolean }) {
  if (fill) return <div className="relative overflow-hidden rounded-lg" style={{ height }}>{children}</div>
  return (
    <div className="relative flex items-center justify-center overflow-hidden" style={{ height }}>
      <span aria-hidden="true" className="absolute inset-0 opacity-40" style={{ background: `radial-gradient(closest-side ellipse at 50% 46%, ${accent} 0%, transparent 100%)` }} />
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
      <ul className={cn("grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4", dense ? "xl:grid-cols-6 2xl:grid-cols-7" : "xl:grid-cols-5 2xl:grid-cols-6")}>{visible.map((item, index) => card(item, index, dense))}</ul>
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
  const [params] = useSearchParams() // an old ?item= link still opens that item; picking one no longer writes it to the address
  const { data, loading, error, refetch } = useApiQuery<Cosmetics>((signal) => cosmeticsService.getMine({ signal }), { queryKey: user ? `cosmetics:${user.id}` : "cosmetics:guest" })
  const { data: wallet, refetch: refetchWallet } = useApiQuery<Wallet>((signal) => walletService.getMine({ signal }), { enabled: Boolean(user), queryKey: user ? `wallet:${user.id}` : "wallet:guest" })
  const { data: myClan, loading: clanLoading, refetch: refetchClan } = useApiQuery<MyClanState>((signal) => clansService.getMine({ signal }), { enabled: Boolean(user), queryKey: user ? `clans-me:${user.id}` : "clans-me:guest" })
  const [tab, setTab] = usePathTab<ShopTab>("/shop", { featured: "", frame: "frames", background: "backgrounds", name: "name", smoke_color: "smoke", model: "weapons", clan: "clan", goods: "goods", ranks: "ranks" }, "featured")
  // The in-game ranks (owner request 2026-11-07): the tab is there only while at least one is on sale, so nothing is shown that cannot be bought.
  const { data: perks } = useApiQuery((signal) => perksService.catalogue({ signal }), { queryKey: "perk-catalogue" })
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
  // The Crystal Orb being tried in the preview (null: the one you saved). It is what the preview draws, live, while you change it.
  const [orbDraft, setOrbDraft] = useState<FrameLook | null>(null)
  // The Crystal Orb and background settings are long: they sit behind a "Customize" strip, closed until asked for, and scroll inside their own box.
  const [customizeOpen, setCustomizeOpen] = useState(false)
  const [customizeMounted, setCustomizeMounted] = useState(false)
  // The knobs being tried on the picked background, per background (what the preview draws, live, while you change them).
  const [bgDrafts, setBgDrafts] = useState<Record<string, BgLook>>({})
  // For a few seconds after a purchase its Buy button is an Undo (the API gives the window in seconds and takes the LX back whole).
  const [undo, setUndo] = useState<{ id: string; until: number } | null>(null)
  const [undoLeft, setUndoLeft] = useState(0)
  const pendingToasts = useRef<Record<string, number>>({})
  useEffect(() => {
    if (!undo) return
    const tick = () => {
      const left = Math.ceil((undo.until - Date.now()) / 1000)
      if (left <= 0) { setUndo(null); setUndoLeft(0) } else setUndoLeft(left)
    }
    tick()
    const timer = window.setInterval(tick, 250)
    return () => window.clearInterval(timer)
  }, [undo])
  // How long the next purchase rents the item for; the price of each length is the API's.
  const [duration, setDuration] = useState<CosmeticDuration>("30d")
  // Some items are rented for one length only (the Crystal Orb: 30 days); the API lists just the lengths it sells.
  const lengthsOf = (item: ShopItem) => { const sold = COSMETIC_DURATIONS.filter((length) => item.prices?.[length.value] !== undefined); return sold.length ? sold : COSMETIC_DURATIONS }
  const durationFor = (item: ShopItem): CosmeticDuration => (lengthsOf(item).some((length) => length.value === duration) ? duration : lengthsOf(item)[0].value)
  const priceFor = (item: ShopItem, length: CosmeticDuration = durationFor(item)) => item.prices?.[length] ?? item.price

  const all: ShopItem[] = useMemo(() => [
    ...(data?.frames ?? []).map((item) => ({ ...item, kind: "frame" as const })),
    ...(data?.backgrounds ?? []).map((item) => ({ ...item, kind: "background" as const })),
    ...(data?.nameColors ?? []).map((item) => ({ ...item, kind: "name_color" as const })),
    ...(data?.nameGlows ?? []).map((item) => ({ ...item, kind: "name_glow" as const })),
    ...(data?.smokeColors ?? []).map((item) => ({ ...item, kind: "smoke_color" as const })),
    ...(data?.grenadeTrails ?? []).map((item) => ({ ...item, kind: "grenade_trail" as const })),
    ...(data?.grenadeLights ?? []).map((item) => ({ ...item, kind: "grenade_light" as const })),
    ...(data?.flashEffects ?? []).map((item) => ({ ...item, kind: "flash_effect" as const })),
    ...(data?.modelKnives ?? []).map((item) => ({ ...item, kind: "model_knife" as const })),
    ...(data?.modelDeagles ?? []).map((item) => ({ ...item, kind: "model_deagle" as const })),
    ...(data?.modelAk47s ?? []).map((item) => ({ ...item, kind: "model_ak47" as const })),
  ].filter((item) => !item.retired), [data])
  const worn = { frame: data?.equippedFrame ?? null, background: data?.equippedBackground ?? null, name_color: data?.equippedNameColor ?? null, name_glow: data?.equippedNameGlow ?? null, smoke_color: data?.equippedSmokeColor ?? null, grenade_trail: data?.equippedGrenadeTrail ?? null, grenade_light: data?.equippedGrenadeLight ?? null, flash_effect: data?.equippedFlashEffect ?? null, model_knife: data?.equippedModelKnife ?? null, model_deagle: data?.equippedModelDeagle ?? null, model_ak47: data?.equippedModelAk47 ?? null }
  const balance = wallet?.balance ?? null
  const username = user?.username ?? "Player"

  const featured = all.filter((item) => item.featured && item.unlock === "coin")
  const inTab = all.filter((item) => tab === "featured" || item.kind === tab || (tab === "name" && (item.kind === "name_color" || item.kind === "name_glow")) || (tab === "smoke_color" && (item.kind === "grenade_trail")) || (tab === "model" && isModelKind(item.kind)))
  const shown = inTab
    .filter((item) => (!search.trim() || item.name.toLowerCase().includes(search.trim().toLowerCase())))
    .filter((item) => show === "all" || (show === "saved" ? saved.includes(item.id) : show === "owned" ? item.owned : !item.owned && item.unlock === "coin"))
    // What you can still buy comes first, then what you own, then what is only earned.
    .sort((a, b) => group(a) - group(b) || (sort === "rarity" ? (b.rarity ?? 0) - (a.rarity ?? 0) || a.price - b.price : sort === "price-up" ? a.price - b.price : b.price - a.price))

  // The picked item counts only on the tab it belongs to: moving to another tab shows that tab's own first item, not the last one you looked at.
  const selected = inTab.find((item) => item.id === picked) ?? (tab === "featured" ? featured[0] : null) ?? shown[0] ?? featured[0] ?? null
  useEffect(() => { setCustomizeOpen(false); setCustomizeMounted(false) }, [selected?.id])
  // The name colour and the name glow being tried together: the preview wears both, and each is bought on its own.
  const [combo, setCombo] = useState<{ name_color?: string; name_glow?: string }>({})
  useEffect(() => { setCombo({}) }, [tab])
  const isPicked = (item: ShopItem) => selected?.id === item.id || (item.kind === "name_color" || item.kind === "name_glow" ? combo[item.kind] === item.id : false)
  const choose = (item: ShopItem) => {
    setPicked(item.id)
    if (item.kind === "name_color" || item.kind === "name_glow") setCombo((current) => ({ ...current, [item.kind]: item.id }))
    // On a phone the preview and the buy button live in a sheet, so choosing an item never sends you down the page.
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) setSheetOpen(true)
  }

  // The preview wears the item you look at, and whatever you already wear of the other kinds.
  const previewOf = (kind: ShopKind) => (kind === "name_color" || kind === "name_glow" ? all.find((item) => item.id === combo[kind]) : undefined) ?? (selected?.kind === kind ? selected : all.find((item) => item.kind === kind && tray.includes(item.id)) ?? all.find((item) => item.kind === kind && item.id === worn[kind])) ?? null
  const previewFrame = previewOf("frame")
  const previewColor = previewOf("name_color")
  const previewGlow = previewOf("name_glow")
  const previewLook = { color: (previewColor && customDraft[previewColor.id]) || previewColor?.color || null, colorFx: previewColor?.fx ?? null, glow: (previewGlow && customDraft[previewGlow.id]) || previewGlow?.glow || null, glowFx: previewGlow?.fx ?? null }


  /** After a purchase: keep what was tried on the item (colours, orb or background settings) and wear it. */
  const settle = async (item: ShopItem) => {
    try {
      const keep: Array<Promise<unknown>> = []
      if (item.custom && (customDraft[item.id] || customDraft2[item.id])) {
        keep.push(cosmeticsService.saveCustom(item.id, customDraft[item.id] ?? (item.kind === "name_glow" ? item.glow : item.color) ?? "#d4d4d4", item.twoColours ? customDraft2[item.id] ?? item.color2 : null).then(() => dropDrafts(item.id)))
      }
      // What was tried before buying is kept: the orb's or the background's settings are saved the moment it is yours.
      if (item.id === ORB_ID && orbDraft) keep.push(cosmeticsService.saveFrameLook(orbDraft).then(() => setOrbDraft(null)))
      if (item.kind === "background" && bgDrafts[item.id]) {
        keep.push(cosmeticsService.saveBackgroundLook(item.id, bgDrafts[item.id]).then(() => setBgDrafts((current) => { const { [item.id]: _kept, ...rest } = current; return rest })))
      }
      keep.push(cosmeticsService.equip(item.kind, item.id))
      await Promise.all(keep)
    } catch (caught) {
      toast.error("It is yours, but it could not be set up", { description: caught instanceof Error ? caught.message : "Wear it from the Shop in a moment." })
    }
  }

  const buy = async (item: ShopItem) => {
    setBusy(true)
    let bought: Awaited<ReturnType<typeof cosmeticsService.buy>>
    try {
      bought = await cosmeticsService.buy(item.id, durationFor(item))
    } catch (caught) {
      toast.error("Could not buy it", { description: caught instanceof Error ? caught.message : "Try again in a moment." })
      setBusy(false)
      return
    }
    // The purchase is made: show Undo and free the button at once; wearing it, keeping what was tried and refreshing run alongside.
    window.dispatchEvent(new Event("legacyx:wallet-changed"))
    setUndo({ id: item.id, until: Date.now() + (bought.undoSeconds ?? 7) * 1000 })
    setJustBought(item.id)
    window.setTimeout(() => setJustBought((current) => (current === item.id ? null : current)), 1400)
    setBusy(false)
    // The "yours" message waits until the Undo window is over (and never comes if it was undone), so it does not say "yours" while Undo is still offered.
    const message = bought.expiresAt ? `${item.name} is yours for ${COSMETIC_DURATIONS.find((entry) => entry.value === durationFor(item))?.label.toLowerCase()} and now worn` : `${item.name} is yours for good and now worn`
    window.clearTimeout(pendingToasts.current[item.id])
    pendingToasts.current[item.id] = window.setTimeout(() => { delete pendingToasts.current[item.id]; toast.success(message) }, (bought.undoSeconds ?? 7) * 1000 + 300)
    await settle(item)
    await Promise.all([refetch(), refetchWallet()])
    window.dispatchEvent(new Event("legacyx:appearance-changed"))
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
      toast.success("Purchases undone, your LX are back")
      await Promise.all([refetch(), refetchWallet()])
      window.dispatchEvent(new Event("legacyx:appearance-changed"))
    } catch (caught) {
      toast.error("Could not undo it", { description: caught instanceof Error ? caught.message : "Try again in a moment." })
    } finally {
      setBusy(false)
    }
  }

  const undoBuy = async (item: ShopItem) => {
    window.clearTimeout(pendingToasts.current[item.id])
    delete pendingToasts.current[item.id]
    setUndo(null)
    setBusy(true)
    try {
      await cosmeticsService.undoBuy(item.id)
      window.dispatchEvent(new Event("legacyx:wallet-changed"))
      toast.success(`${item.name} purchase undone, your LX are back`)
      await Promise.all([refetch(), refetchWallet()])
    } catch (caught) {
      toast.error("Could not undo it", { description: caught instanceof Error ? caught.message : "Try again in a moment." })
    } finally {
      setBusy(false)
    }
  }

  const pill = (active: boolean) => cn("inline-flex h-[26px] items-center rounded-full border px-2.5 text-xs transition-colors", active ? "border-[var(--line-strong)] bg-[var(--raised)] text-[var(--text)]" : "border-[var(--line)] text-[var(--text-dim)] hover:text-[var(--text)]")

  /** A tile shows a design nobody has coloured yet in a sample colour, so the designs tell apart; the preview starts grey. */
  const onTile = (item: ShopItem, index: number): ShopItem => {
    if (!item.custom) return item
    const field = item.kind === "name_glow" ? "glow" : "color"
    if ((item[field] ?? PICK_DEFAULT).toLowerCase() !== PICK_DEFAULT) return item
    return { ...item, [field]: demoColour(index), ...(item.twoColours ? { color2: demoColour(index + 3) } : {}) }
  }

  const card = (item: ShopItem, index = 0, dense = false) => {
    const shown = onTile(item, index)
    const active = isPicked(item)
    const action = item.owned
      ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--status-green)]"><Check className="size-3" />{worn[item.kind] === item.id ? "Worn" : "Owned"}{item.expiresAt ? <span className="font-medium text-[var(--text-dim)]"> · {timeLeft(item.expiresAt)}</span> : null}</span>
      : item.unlock === "coin"
        ? <span className="lx-shop-price"><LxMark size={14} />{priceFor(item, "30d").toLocaleString()}</span>
        : <span className="inline-flex items-center gap-1 text-xs text-[var(--text-dim)]"><Lock className="size-3" />Earned</span>
    return (
      <li key={item.id} className={cn("group/tile relative rounded-xl [content-visibility:auto] [contain-intrinsic-size:auto_190px]", justBought === item.id && "lx-bought")}>
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => choose(item)}
                aria-pressed={active}
                aria-label={item.name}
                className="lx-shop-tile relative flex w-full flex-col overflow-hidden rounded-xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]/60"
              >
                {/* The rarity as a thin line along the bottom, never a surface. */}
                <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[2px]" style={{ background: rarityOf(item.rarity).color }} />
                <div className="relative">
                  <Spot accent={accentOf(shown)} height={dense ? 96 : 124} fill={shown.kind === "background"}><ItemArt item={shown} avatar={user?.avatar} username={username} orb={data?.frameLook} size={dense ? 56 : 70} /></Spot>
                </div>
                <div className="flex flex-col items-start gap-1 px-3 pb-2.5 pt-0.5">
                  <span className="line-clamp-2 w-full text-[11px] font-medium leading-[1.25] text-[var(--text-2)]">{item.name}</span>
                  {action}
                </div>
              </button>
            </TooltipTrigger>
            <button type="button" onClick={() => toggleSaved(item.id)} aria-pressed={saved.includes(item.id)} aria-label={saved.includes(item.id) ? `Remove ${item.name} from saved` : `Save ${item.name} for later`} className={cn("absolute right-1.5 top-1.5 z-[2] grid size-7 place-items-center rounded-full border border-[var(--line)] bg-[var(--card-surface)]/80 text-[var(--text-dim)] transition-opacity hover:text-[var(--text)] focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]/60", saved.includes(item.id) ? "text-[var(--brand-bright)] opacity-100" : "opacity-0 group-hover/tile:opacity-100")}><Heart className={cn("size-3.5", saved.includes(item.id) && "fill-current")} aria-hidden="true" /></button>
            {/* A big look at it on your own picture, with its name and what it costs. */}
            <TooltipContent side="top" sideOffset={8} className="flex flex-col items-center gap-2 rounded-xl border border-[var(--line-strong)] bg-[var(--panel)] px-5 py-4 text-[var(--text)] [--tooltip-bg:var(--panel)]">
              <Spot accent={accentOf(shown)} height={190} fill={shown.kind === "background"}><div className="px-6"><ItemArt item={shown} avatar={user?.avatar} username={username} orb={data?.frameLook} size={150} /></div></Spot>
              <span className="text-[13px] font-semibold">{item.name}</span>
              <span className="text-[11px] text-[var(--text-dim)]">{rarityOf(item.rarity).label} · {item.owned ? (worn[item.kind] === item.id ? "Worn" : "Owned") : item.unlock === "coin" ? `${priceFor(item, "30d").toLocaleString()} LX · 30 days` : "Earned"}</span>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
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
  const grid = (list: ShopItem[], tight = false) => <ShopGrid list={list} card={card} tight={tight} />

  /** One item per kind in the outfit: adding a second background replaces the first. */
  const toggleTray = (item: ShopItem) => setTray((current) => (current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current.filter((id) => all.find((other) => other.id === id)?.kind !== item.kind), item.id]))
  const trayItems = tray.map((id) => all.find((item) => item.id === id)).filter((item): item is ShopItem => Boolean(item) && !item!.owned && item!.unlock === "coin")
  const outfit = outfitTotal(trayItems.map((item) => ({ owned: item.owned, price: priceFor(item) })), balance)
  const outfitPanel = trayItems.length > 0 ? (
    <section aria-label="Outfit" className="flex flex-col gap-2.5 border-t border-[var(--line-soft)] px-4 py-3.5">
      <div className="flex items-baseline justify-between"><span className="text-[13px] font-semibold text-[var(--text)]">Outfit</span><span className="text-[11px] text-[var(--text-dim)]">{trayItems.length} {trayItems.length === 1 ? "item" : "items"}</span></div>
      <ul className="flex flex-col gap-1.5">
        {trayItems.map((item) => (
          <li key={item.id} className="flex items-center gap-2 rounded-lg border border-[var(--line)] bg-[var(--card-surface)] py-1.5 pl-2.5 pr-1.5 text-[12px]">
            <span className="min-w-0 flex-1 truncate text-[var(--text)]">{item.name}</span>
            <span className="inline-flex items-center gap-1 font-semibold text-[var(--text-2)]"><LxMark size={12} />{priceFor(item).toLocaleString()}</span>
            <button type="button" aria-label={`Take ${item.name} out of the outfit`} onClick={() => toggleTray(item)} className="grid size-6 place-items-center rounded-md text-[var(--text-dim)] hover:bg-[var(--raised)] hover:text-[var(--text)]"><X className="size-3.5" /></button>
          </li>
        ))}
      </ul>
      <div className="flex items-baseline justify-between text-[12px]"><span className="text-[var(--text-dim)]">Total</span><span className="text-[15px] font-semibold text-[var(--text)]">{outfit.total.toLocaleString()} LX</span></div>
      {!outfit.affordable && balance !== null && <p className="text-[11px] text-[var(--text-dim)]">You need {(outfit.total - balance).toLocaleString()} more LX.</p>}
      <button type="button" disabled={busy} onClick={() => (outfit.affordable ? void buyMany(trayItems) : (setSheetOpen(false), navigate("/wallet/top-up")))} className="lx-primary-button inline-flex h-10 w-full items-center justify-center rounded-lg text-[13px] font-semibold disabled:opacity-60">
        {outfit.affordable ? `Buy outfit for ${outfit.total.toLocaleString()} LX` : "Top up"}
      </button>
    </section>
  ) : null

  const buyBlock = (item: ShopItem, inline = false) => {
    const isWorn = worn[item.kind] === item.id
    // Yours for good: nothing to buy. Anything sold with LX that is not (not owned, or only rented) can be bought or extended.
    const undoing = undo?.id === item.id && undoLeft > 0
    const rentable = item.unlock === "coin" && (undoing || !(item.owned && !item.expiresAt))
    const cost = priceFor(item)
    const afford = balance === null || balance >= cost
    return (
      <div className={cn(inline ? "grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_260px] items-center gap-x-6 px-5 py-4" : "flex flex-col gap-2.5 border-t border-[var(--line-soft)] px-4 py-3.5")}>
        <div className="flex min-w-0 flex-col gap-2.5">
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
        </div>
        <div className="flex min-w-0 flex-col gap-2.5">
        {item.owned && !undoing && (
          <div key="owned" className={cn("flex flex-col gap-2.5", justBought === item.id && "lx-swap-in")}>
            <p className="text-xs text-[var(--text-dim)]">{isWorn ? "Worn" : "Owned"}{item.expiresAt ? ` · ${timeLeft(item.expiresAt)}` : ""}</p>
            <button type="button" disabled={busy} onClick={() => void wearHere(item, !isWorn)} className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--raised)] text-[13px] font-semibold text-[var(--text-2)] hover:border-[var(--line-strong)] disabled:opacity-60">{isWorn ? "Take it off" : "Wear it"}</button>
          </div>
        )}
        {rentable ? (
          <>
            {lengthsOf(item).length === 1 ? (
              <div className="flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-[var(--line)] bg-[var(--raised)] px-3 text-[13px]">
                <span className="flex items-center gap-2"><span className="text-[var(--text-dim)]">For</span><span className="font-semibold text-[var(--text)]">{lengthsOf(item)[0].label}</span></span>
                <span className="flex items-center gap-1 font-semibold text-[var(--text)]"><LxMark size={12} /><CountNumber value={priceFor(item)} /></span>
              </div>
            ) : (
            <Popover>
              <PopoverTrigger asChild>
                <button type="button" aria-label="How long" className="group flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-[var(--line)] bg-[var(--raised)] px-3 text-left text-[13px] transition-colors hover:border-[var(--line-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/60">
                  <span className="flex min-w-0 items-center gap-2"><span className="text-[var(--text-dim)]">For</span><span className="font-semibold text-[var(--text)]">{COSMETIC_DURATIONS.find((length) => length.value === durationFor(item))?.label}</span></span>
                  <span className="flex items-center gap-2"><span className="flex items-center gap-1 font-semibold text-[var(--text)]"><LxMark size={12} /><CountNumber value={priceFor(item)} /></span><ChevronDown className="size-3.5 text-[var(--text-dim)] transition-transform duration-200 group-data-[state=open]:rotate-180" /></span>
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" side="top" sideOffset={8} className="w-[var(--radix-popover-trigger-width)] min-w-[220px] rounded-xl border-[var(--line)] bg-[var(--panel)] p-1.5 shadow-[0_18px_44px_rgba(0,0,0,0.55)]">
                <div role="radiogroup" aria-label="How long" className="flex flex-col">
                  {lengthsOf(item).map((length) => (
                    <button key={length.value} type="button" role="radio" aria-checked={durationFor(item) === length.value} onClick={() => setDuration(length.value)} className="flex h-9 items-center justify-between gap-3 rounded-lg px-2.5 text-left text-[13px] text-[var(--text-2)] transition-colors hover:bg-[var(--raised)] hover:text-[var(--text)] aria-checked:text-[var(--text)]">
                      <span className="flex items-center gap-2">{durationFor(item) === length.value ? <Check className="size-3.5" aria-hidden="true" /> : <span className="size-3.5" aria-hidden="true" />}{length.label}</span>
                      <span className="flex items-center gap-1 font-semibold"><LxMark size={12} />{priceFor(item, length.value).toLocaleString()}</span>
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            )}
            {/* One place for both: Buy (a React Bits Star Border with Shiny Text) turns into Undo, and Wear it only comes once the Undo time is over. */}
            {undoing ? (
              <button type="button" disabled={busy} onClick={() => void undoBuy(item)} className="lx-swap-in inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-[var(--line-strong)] bg-[var(--raised)] text-[13px] font-semibold text-[var(--text)] transition-colors hover:bg-[var(--card-surface)] disabled:opacity-60">
                <Undo2 className="size-4" />Undo ({undoLeft}s)
              </button>
            ) : (
              <StarBorder
                as="button"
                type="button"
                disabled={busy}
                onClick={() => (afford ? void buy(item) : (setSheetOpen(false), navigate("/wallet/top-up")))}
                className="lx-swap-in h-12 w-full text-[15px] font-bold"
                radius={8}
                thickness={1}
                duration={5}
                trailLength={0.28}
                glow={0.35}
                color="#c4b5fd"
                backgroundColor="#262626"
                borderColor="#404040"
                textColor="#fafafa"
              >
                <ShinyText speed={3.2} delay={1.4} shineWidth={0.35} color="#fafafa" shineColor="#a78bfa">{afford ? <>{item.owned ? "Extend" : "Buy"} for <CountNumber value={cost} /> LX</> : <>Top up <CountNumber value={cost - (balance ?? 0)} /> more LX</>}</ShinyText>
              </StarBorder>
            )}
            {!undoing && !item.owned && item.unlock === "coin" && (
              <button type="button" onClick={() => toggleTray(item)} aria-pressed={tray.includes(item.id)} className="inline-flex h-9 w-full items-center justify-center rounded-lg border border-[var(--line)] text-[12px] font-semibold text-[var(--text-2)] transition-colors hover:border-[var(--line-strong)] hover:bg-[var(--raised)]">
                {tray.includes(item.id) ? "Remove from outfit" : "Add to outfit"}
              </button>
            )}
          </>
        ) : !item.owned ? (
          <p className="text-xs text-[var(--text-dim)]">{item.requirement || "Earned in game, not for sale."}</p>
        ) : null}
        </div>
      </div>
    )
  }

  /** What the picked item looks like on you: the in-game effect, or your picture and name wearing it. `compact` for the Spotlight bar. */
  const previewStage = (compact = false) => {
    const effect = compact ? "w-[170px]" : "w-[220px]"
    return (
      <>
          {selected?.kind === "background" ? (
            <div className={cn("overflow-hidden bg-[var(--card-surface)] [&>div]:size-full", compact ? "absolute inset-0" : "relative h-[150px] w-full rounded-lg")}>
              <BgPreview key={selected.id} id={selected.id} look={bgLookNow} />
            </div>
          ) : selected?.kind === "grenade_trail" ? (
            <div className="relative flex items-center justify-center py-4"><GrenadeTrail key={`${selected.id}${tried(selected).fx}`} color={tried(selected).color} shape={tried(selected).fx} className={effect} /></div>
          ) : selected?.kind === "flash_effect" ? (
            <div className="relative flex items-center justify-center py-4"><FlashEffect key={`${selected.id}${tried(selected).fx}`} color={tried(selected).color} shape={tried(selected).fx} className={effect} /></div>
          ) : selected?.kind === "grenade_light" ? (
            <div className="relative flex items-center justify-center py-4"><GrenadeLight color={tried(selected).color} className={effect} /></div>
          ) : selected && isModelKind(selected.kind) ? (
            <div className="relative flex items-center justify-center py-6"><ModelArt kind={selected.kind} big /></div>
          ) : selected?.kind === "smoke_color" ? (
            <div className="relative flex items-center justify-center py-4"><span aria-hidden="true" className="absolute left-1/2 top-1/2 aspect-square w-[130%] -translate-x-1/2 -translate-y-1/2 opacity-25" style={{ background: "radial-gradient(circle, var(--brand) 0%, transparent 60%)" }} /><SmokePuff color={tried(selected).color} color2={tried(selected).color2} className={effect} /></div>
          ) : (
            <div className="relative flex flex-col items-center gap-3 py-4">
              <span aria-hidden="true" className="absolute left-1/2 top-1/2 aspect-square w-[130%] -translate-x-1/2 -translate-y-1/2 opacity-25" style={{ background: "radial-gradient(circle, var(--brand) 0%, transparent 60%)" }} />
              <FramedAvatar avatar={user?.avatar} name={user?.username} frame={previewFrame?.id ?? null} look={orbDraft ?? data?.frameLook} live={selected?.id === ORB_ID} size={compact ? 88 : 120} />
              <span {...nameProps(previewLook, cn("max-w-full truncate font-bold text-[var(--text)]", compact ? "text-[15px]" : "text-[19px]"))}>{username}</span>
            </div>
          )}
      </>
    )
  }

  /** Every knob of the Crystal Orb, under the preview, before and after buying (saving needs it). The preview above moves with each change. */
  const orbPanel = selected?.id === ORB_ID && selected.kind === "frame" ? (
    <OrbCustomizer
      showPreview={false}
      avatar={user?.avatar}
      name={user?.username}
      owned={Boolean(selected.owned)}
      saved={data?.frameLook ?? null}
      draft={orbDraft ?? data?.frameLook ?? {}}
      onDraft={setOrbDraft}
      busy={busy}
      onSave={(look) => {
        setBusy(true)
        cosmeticsService.saveFrameLook(look)
          .then(() => { setOrbDraft(null); window.dispatchEvent(new Event("legacyx:appearance-changed")); return refetch() })
          .catch((caught) => toast.error("Could not save your orb", { description: caught instanceof Error ? caught.message : "Try again in a moment." }))
          .finally(() => setBusy(false))
      }}
    />
  ) : null

  /** The strip that opens the settings of the picked orb or background (they are long, so they never push the list down). */
  const customizerBlock = (scroll: boolean) => {
    const panel = orbPanel ?? bgPanel
    if (!panel) return null
    return (
      <div className="border-t border-[var(--line-soft)]">
        <button
          type="button"
          aria-expanded={customizeOpen}
          onClick={() => { setCustomizeOpen(!customizeOpen); setCustomizeMounted(true) }}
          className="group flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[var(--raised)]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-solid)]/60"
        >
          <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg border transition-colors duration-300", customizeOpen ? "border-[var(--line-strong)] bg-[var(--card-surface)] text-[var(--text)]" : "border-[var(--line)] bg-[var(--raised)] text-[var(--text-2)]")}>
            <SlidersHorizontal className="size-4" aria-hidden="true" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-[13px] font-semibold text-[var(--text)]">Customize</span>
            <span className="truncate text-[11px] text-[var(--text-dim)]">{selected?.owned ? "Change every setting, then save" : "Try every setting now; it is kept when you buy"}</span>
          </span>
          <ChevronDown className={cn("size-4 shrink-0 text-[var(--text-dim)] transition-transform duration-300 group-hover:text-[var(--text)]", customizeOpen && "rotate-180")} aria-hidden="true" />
        </button>
        {/* Opens and closes by growing from zero height (a grid row going 0fr to 1fr), so nothing jumps; the settings mount on the first open. */}
        <div className={cn("grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none", customizeOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")} aria-hidden={!customizeOpen} inert={!customizeOpen}>
          <div className="min-h-0 overflow-hidden">
            {customizeMounted && <div className={cn("p-3 pt-1", scroll && "max-h-[min(52vh,480px)] overflow-y-auto")}>{panel}</div>}
          </div>
        </div>
      </div>
    )
  }

  /** Every knob of the picked background, under its preview, before and after buying (saving needs it). */
  const pickedBg = selected?.kind === "background" ? bgById(selected.id) : null
  const bgLookNow = pickedBg ? bgDrafts[pickedBg.id] ?? data?.backgroundLooks?.[pickedBg.id] ?? {} : {}
  const bgPanel = pickedBg && selected ? (
    <BgCustomizer
      def={pickedBg}
      draft={bgLookNow}
      onDraft={(next) => setBgDrafts((current) => ({ ...current, [pickedBg.id]: next }))}
      saved={data?.backgroundLooks?.[pickedBg.id] ?? null}
      owned={Boolean(selected.owned)}
      busy={busy}
      onSave={(look) => {
        setBusy(true)
        cosmeticsService.saveBackgroundLook(pickedBg.id, look)
          .then(() => { setBgDrafts((current) => { const { [pickedBg.id]: _saved, ...rest } = current; return rest }); window.dispatchEvent(new Event("legacyx:appearance-changed")); return refetch() })
          .catch((caught) => toast.error("Could not save your background", { description: caught instanceof Error ? caught.message : "Try again in a moment." }))
          .finally(() => setBusy(false))
      }}
    />
  ) : null

  const railBody = (
    <div className="lx-add-box relative flex min-h-0 flex-col overflow-hidden rounded-[14px] border lg:max-h-[calc(100dvh-11rem)]">
        <div className="scrollbar-hidden flex min-h-0 flex-col gap-3 overflow-y-auto p-3.5">
          {previewStage()}
          {customizerBlock(false)}
        </div>
        {selected && (
          <div className="shrink-0">
            {tab === "name" && combo.name_color && combo.name_glow
              ? [combo.name_color, combo.name_glow].map((id) => all.find((item) => item.id === id)).filter((item): item is ShopItem => Boolean(item)).map((item) => <div key={item.id}>{buyBlock(item)}</div>)
              : buyBlock(selected)}
            {outfitPanel}
          </div>
        )}
      </div>
  )

  const soon = endingSoon(all)
  const tabOfKind = (kind: ShopKind): ShopTab => (kind === "name_color" || kind === "name_glow" ? "name" : kind === "smoke_color" || kind === "grenade_trail" ? "smoke_color" : kind === "frame" ? "frame" : kind === "background" ? "background" : "featured")
  /**
   * The Spotlight bar (owner pick "S8", 2026-10-26): on a wide screen the picked item sits in one bar across the top of the list, stuck while the
   * list scrolls under it: the item on you at the left, then its colours, length and Buy (the name colour and glow side by side when both are picked).
   * Phones keep the bottom sheet.
   */
  const spotlight = selected ? (
    <div className="lx-add-box sticky top-0 z-10 hidden overflow-hidden rounded-[14px] border bg-[var(--panel)] lg:block">
      <div className="flex items-stretch">
      <div className={cn("relative flex w-[240px] shrink-0 items-center justify-center border-r border-[var(--line-soft)] [&>div]:w-full", selected.kind === "background" ? "min-h-[150px]" : "px-3")}>{previewStage(true)}</div>
      {tab === "name" && combo.name_color && combo.name_glow
        ? [combo.name_color, combo.name_glow].map((id) => all.find((item) => item.id === id)).filter((item): item is ShopItem => Boolean(item)).map((item, index) => <div key={item.id} className={cn("flex min-w-0 flex-1", index > 0 && "border-l border-[var(--line-soft)]")}>{buyBlock(item, true)}</div>)
        : buyBlock(selected, true)}
      </div>
      {customizerBlock(true)}
      {outfitPanel}
    </div>
  ) : null

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageBar>
        <PageTabs<(typeof TOP_TABS)[number]["value"]> ariaLabel="Shop sections" value={PROFILE_TABS.includes(tab) ? "profile" : (tab as "featured" | "clan" | "goods" | "ranks")} onChange={(next) => setTab(next === "profile" ? lastProfileTab : next)} options={TOP_TABS.filter((entry) => entry.value !== "ranks" || (perks?.tiers.length ?? 0) > 0)} />
        {(tab === "featured" || tab === "frame" || tab === "background" || tab === "name" || tab === "smoke_color" || tab === "model") && (
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
      <div className="lx-glass-page min-h-0 flex-1 px-6 py-5 max-md:px-4">
        {tab === "ranks" ? (
          perks && perks.tiers.length > 0 ? <ShopRanks catalogue={perks} /> : <p className="py-8 text-[13px] text-[var(--text-dim)]">Nothing is for sale here yet.</p>
        ) : tab === "goods" ? (
          <ShopGoods />
        ) : loading && !data ? (
          <div className="flex flex-col gap-5"><Skeleton className="h-[170px] rounded-[14px] max-lg:hidden" /><Skeleton className="h-[480px] rounded-xl" /></div>
        ) : error || !data ? (
          <p className="flex items-center justify-center gap-3 py-24 text-[13px] text-[var(--text-dim)]">Could not load the shop.<button type="button" onClick={refetch} className="inline-flex items-center gap-1.5 text-[var(--text-2)] hover:text-[var(--text)]"><RotateCcw className="size-3.5" />Retry</button></p>
        ) : (
          tab === "clan" ? (
            <ShopClan prices={wallet?.clanPrices} balance={balance} mine={user ? myClan : null} loading={Boolean(user) && (clanLoading || !wallet)} onChanged={() => Promise.all([refetchClan(), refetchWallet()])} />
          ) : (
          <div className="flex min-w-0 flex-col gap-5">
            {/* On Featured the Genesis card comes first: the bar waits until an item below it is picked. */}
            {(tab !== "featured" || picked !== null) && spotlight}
            <div className="flex min-w-0 flex-col gap-5">
              {soon.length > 0 && (
                <div role="status" aria-label="Ending soon" className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[10px] border border-[var(--brand)]/30 bg-[var(--brand)]/[0.06] px-3.5 py-2.5 text-[12px]">
                  <span className="font-semibold text-[var(--text)]">Ending soon</span>
                  {soon.slice(0, 3).map((item) => (
                    <button key={item.id} type="button" onClick={() => { setTab(tabOfKind(item.kind)); choose(item) }} className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--card-surface)] px-2.5 py-1 text-[var(--text-2)] hover:border-[var(--line-strong)] hover:text-[var(--text)]">
                      {item.name}<span className="text-[var(--text-dim)]">{daysLeft(item.expiresAt) === 0 ? "ends today" : `${daysLeft(item.expiresAt)} d left`}</span>
                    </button>
                  ))}
                </div>
              )}
              {tab === "featured" && featured.length > 0 && (
                <section aria-label="Featured">
                  <div className="lx-shop-heading mb-2.5">Featured</div>
                  <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 scrollbar-hidden sm:mx-0 sm:grid sm:snap-none sm:grid-cols-3 sm:overflow-visible sm:px-0 xl:grid-cols-5 [&>li]:w-[170px] [&>li]:shrink-0 [&>li]:snap-start sm:[&>li]:w-auto">{featured.map((item, index) => card(item, index))}</ul>
                </section>
              )}
              <section aria-label="Items">
                <div className="mb-3 flex items-center gap-2 max-md:-mx-4 max-md:overflow-x-auto max-md:px-4 max-md:pb-1 max-md:scrollbar-hidden md:flex-wrap [&>*]:shrink-0">
                  {/* Name and Grenades head each of their sections instead, so they get no empty heading here. */}
                  {tab !== "name" && tab !== "smoke_color" && tab !== "model" && <span className="lx-shop-heading">{tab === "featured" ? "All items" : TABS.find((entry) => entry.value === tab)?.label}</span>}
                  <span className="flex-1" />
                  <div role="radiogroup" aria-label="Show" className="flex items-center gap-1.5">
                    {([["all", "All"], ["available", "Not owned"], ["owned", "Owned"], ["saved", "Saved"]] as const).map(([value, label]) => (
                      <button key={value} type="button" role="radio" aria-checked={show === value} onClick={() => setShow(value)} className={pill(show === value)}>{label}</button>
                    ))}
                  </div>
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
                ) : grid(shown)}
              </section>
            </div>
          </div>
          )
        )}
      </div>
      <Sheet open={sheetOpen && Boolean(selected)} onOpenChange={setSheetOpen}>
        <DetailSheetContent width="max-w-xl">
          <SheetTitle className="sr-only">{selected?.name}</SheetTitle>
          <SheetDescription className="sr-only">Preview and buy this item</SheetDescription>
          <div className="p-3 pt-9">{railBody}</div>
        </DetailSheetContent>
      </Sheet>
    </div>
  )
}

