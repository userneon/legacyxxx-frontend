import { useEffect, useState } from "react"
import { ChevronLeft, ChevronRight, ImageOff, Plus, RotateCcw, Search, X } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"

import { formatPrice, marketService, type MarketCard } from "@/api/market"
import { MarketForm } from "@/components/market-form"
import { PageBar, PageBarEnd, PageTabs, pageSearchClass } from "@/components/page-tabs"
import { PlayerAvatar } from "@/components/player-avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { useModerationAccess } from "@/components/penalty-staff"
import { useApiQuery } from "@/hooks/use-api-query"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"

type MarketTab = "all" | "mine" | "reported"

export function timeAgo(iso: string, now = Date.now()) {
  const minutes = Math.max(0, Math.round((now - Date.parse(iso)) / 60_000))
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.round(hours / 24)
  return `${days} day${days === 1 ? "" : "s"} ago`
}

export function MarketTile({ card }: { card: MarketCard }) {
  return (
    <Link to={`/market/${card.id}`} className="group flex flex-col overflow-hidden rounded-xl border border-[var(--glass-line)] bg-[var(--glass-fill)] transition-colors hover:border-[var(--line-strong)]">
      <div className="relative aspect-[4/3] bg-[var(--card-surface)]">
        {card.cover ? <img src={card.cover} alt="" loading="lazy" draggable={false} className="size-full object-cover" /> : <span className="flex size-full items-center justify-center text-[var(--text-faint)]"><ImageOff className="size-7" aria-hidden="true" /></span>}
        {card.status === "sold" && <span className="absolute left-2 top-2 rounded-md bg-[var(--bg)]/85 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text)]">Sold</span>}
        {card.hidden && <span className="absolute left-2 top-2 rounded-md bg-[var(--bg)]/85 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--status-red)]">Hidden</span>}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <p className="line-clamp-2 text-[14px] font-medium leading-snug text-[var(--text)]">{card.title}</p>
        <p className="text-[15px] font-semibold text-[var(--text)]">{formatPrice(card.priceMnt)}</p>
        <div className="mt-auto flex items-center gap-2 text-[12px] text-[var(--text-dim)]">
          <PlayerAvatar avatar={card.seller.avatar ?? undefined} name={card.seller.name} className="size-5 rounded-full" />
          <span className="min-w-0 flex-1 truncate">{card.seller.name}</span>
          <span className="shrink-0">{timeAgo(card.createdAt)}</span>
        </div>
        {card.reportCount ? <p className="text-[11px] text-[var(--status-red)]">{card.reportCount} report{card.reportCount === 1 ? "" : "s"}</p> : null}
      </div>
    </Link>
  )
}

/** The Market (owner request 2026-11-07): what players have for sale, a search, your own listings, and for staff the reported ones. */
export function MarketPage() {
  const { isAuthenticated, loginWithSteam } = useAuth()
  const navigate = useNavigate()
  const staff = useModerationAccess()
  const mayModerate = Boolean(staff?.role && ["ADMIN", "MANAGER", "OWNER"].includes(staff.role))
  const [tab, setTab] = useState<MarketTab>("all")
  const [typed, setTyped] = useState("")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [selling, setSelling] = useState(false)

  useEffect(() => { const timer = window.setTimeout(() => { setSearch(typed.trim()); setPage(1) }, 350); return () => window.clearTimeout(timer) }, [typed])
  const list = useApiQuery((signal) => (tab === "all" ? marketService.list({ q: search || undefined, page }, { signal }) : tab === "mine" ? marketService.mine({ signal }).then((result) => ({ items: result.items, total: result.items.length, page: 1, pageSize: result.items.length || 1 })) : marketService.reported({ signal }).then((result) => ({ items: result.items, total: result.items.length, page: 1, pageSize: result.items.length || 1 }))), { queryKey: `market-${tab}-${search}-${page}`, keepPreviousData: true })
  const items = list.data?.items ?? []
  const pages = tab === "all" && list.data ? Math.max(1, Math.ceil(list.data.total / list.data.pageSize)) : 1
  const options = [
    { value: "all" as const, label: "All" },
    ...(isAuthenticated ? [{ value: "mine" as const, label: "My listings" }] : []),
    ...(mayModerate ? [{ value: "reported" as const, label: "Reported" }] : []),
  ]

  const sell = () => { if (isAuthenticated) setSelling(true); else loginWithSteam() }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageBar>
        <PageTabs<MarketTab> ariaLabel="Market" value={tab} onChange={(next) => { setTab(next); setPage(1) }} options={options} />
        <PageBarEnd>
          <label className={cn(pageSearchClass, "max-md:hidden")}>
            <Search className="size-4 shrink-0 text-[var(--text-dim)]" aria-hidden="true" />
            <input value={typed} onChange={(event) => setTyped(event.target.value)} placeholder="Search the market" aria-label="Search the market" className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--text)] outline-none placeholder:text-[var(--text-dim)]" />
            {typed && <button type="button" aria-label="Clear search" onClick={() => setTyped("")} className="text-[var(--text-dim)] hover:text-[var(--text)]"><X className="size-3.5" aria-hidden="true" /></button>}
          </label>
          <button type="button" onClick={sell} className="lx-primary-button inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold"><Plus className="size-4" aria-hidden="true" />{isAuthenticated ? "Sell something" : "Sign in to sell"}</button>
        </PageBarEnd>
      </PageBar>
      <div className="scrollbar-hidden min-h-0 flex-1 overflow-y-auto px-6 py-6 max-md:px-4">
        <div className="mx-auto flex max-w-[1320px] flex-col gap-5">
          <label className={cn(pageSearchClass, "w-full md:hidden")}>
            <Search className="size-4 shrink-0 text-[var(--text-dim)]" aria-hidden="true" />
            <input value={typed} onChange={(event) => setTyped(event.target.value)} placeholder="Search the market" aria-label="Search the market" className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--text)] outline-none placeholder:text-[var(--text-dim)]" />
          </label>
          {list.loading && !list.data ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-hidden="true">{[0, 1, 2, 3, 4, 5, 6, 7].map((index) => <Skeleton key={index} className="aspect-[4/5] rounded-xl bg-[var(--card-surface)]" />)}</div>
          ) : list.error && !list.data ? (
            <p className="flex items-center gap-3 py-10 text-[13px] text-[var(--text-dim)]">Could not load the market. <button type="button" onClick={list.refetch} className="inline-flex items-center gap-1.5 text-[var(--text-2)] hover:text-[var(--text)]"><RotateCcw className="size-3.5" aria-hidden="true" />Retry</button></p>
          ) : items.length === 0 ? (
            <p className="py-10 text-[13px] text-[var(--text-dim)]">{tab === "mine" ? "You have no listings yet." : tab === "reported" ? "Nothing has been reported." : search ? "Nothing matches your search." : "Nobody is selling anything yet. Be the first."}</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{items.map((card) => <li key={card.id}><MarketTile card={card} /></li>)}</ul>
          )}
          {pages > 1 && (
            <nav className="flex items-center justify-center gap-3" aria-label="Pages">
              <button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} aria-label="Previous page" className="inline-flex size-9 items-center justify-center rounded-lg border border-[var(--line)] text-[var(--text-2)] hover:bg-[var(--raised)] disabled:opacity-40"><ChevronLeft className="size-4" aria-hidden="true" /></button>
              <span className="text-[13px] text-[var(--text-dim)]">Page {page} of {pages}</span>
              <button type="button" disabled={page >= pages} onClick={() => setPage((current) => current + 1)} aria-label="Next page" className="inline-flex size-9 items-center justify-center rounded-lg border border-[var(--line)] text-[var(--text-2)] hover:bg-[var(--raised)] disabled:opacity-40"><ChevronRight className="size-4" aria-hidden="true" /></button>
            </nav>
          )}
        </div>
      </div>
      <MarketForm open={selling} onClose={() => setSelling(false)} onSaved={() => { setTab("mine"); navigate("/market", { replace: false }) }} />
    </div>
  )
}
