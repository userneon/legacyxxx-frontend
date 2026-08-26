/**
 * LEGACY-X Home: neutral glass dashboard with map-led server cards. Reconnect
 * appears only from the authenticated Root API and never from local mock state.
 */
import { useEffect, useState, type ComponentProps } from "react"
import { Crosshair, Flame, Crown, Trophy, TrendingUp, Server, Zap, Users, RefreshCw, ExternalLink, Globe2, Copy, Play as PlayIcon, Info, RotateCcw } from "lucide-react"

import { cn } from "@/lib/utils"
import { communityService, serversService } from "@/api"
import type { CommunityCreator, CommunityPartner, HomeStats, PageId, ReconnectMatch, ServerInfo } from "@/api/types"
import { useApiQuery } from "@/hooks/use-api-query"
import { QueryState } from "@/components/query-state"
import { OptimizedImage } from "@/components/optimized-image"
import { cs2MapArtwork, cs2MapLabel } from "@/lib/cs2-map-art"
import { toast } from "sonner"
import homeHeroGif from "@/assets/skinchanger/hero.gif"
import { useAuth } from "@/hooks/use-auth"
import { ServerLiveMatchDialog } from "@/components/server-live-match-dialog"

interface HomePageProps {
  onNavigate: (page: PageId) => void
}

const MODE_CARDS: { id: PageId; label: string; desc: string; icon: typeof Crosshair; stat: string }[] = [
  { id: "play-5vs5", label: "5vs5 Matches", desc: "Competitive matches", icon: Crosshair, stat: "Live status from API" },
  { id: "play-fun", label: "Fun Mode", desc: "Surf, aim, deathmatch and more", icon: Flame, stat: "Live status from API" },
  { id: "play-proleague", label: "Pro League", desc: "Seasonal competitive league", icon: Crown, stat: "Live status from API" },
  { id: "play-tournaments", label: "Tournaments", desc: "Scheduled prize tournaments", icon: Trophy, stat: "Live status from API" },
]

async function copyServerAddress(server: ServerInfo) {
  if (!server.connectAddress) {
    toast.error("Server IP unavailable", { description: "This server does not currently expose a connection address." })
    return
  }

  try {
    await navigator.clipboard.writeText(server.connectAddress)
    toast.success("Server IP copied", { description: server.connectAddress })
  } catch {
    toast.error("Copy failed", { description: "Please copy the connection address manually." })
  }
}

function openServerInSteam(server: ServerInfo) {
  const address = server.connectAddress?.trim()
  if (!address || !/^[a-zA-Z0-9.-]+:\d{1,5}$/.test(address)) {
    toast.error("Server IP unavailable", { description: "This server does not currently expose a valid connection address." })
    return
  }

  toast.info("Opening Steam…", { description: `Connecting to ${address}` })
  window.location.assign(`steam://connect/${address}`)
}

type IconProps = ComponentProps<"svg">

function TikTokIcon({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true" {...props}>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.73 2.89 2.89 0 0 1 2.31-4.61 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z" />
    </svg>
  )
}

type PartnerTab = "creators" | "partners"

function PartnerSection() {
  const [tab, setTab] = useState<PartnerTab>("creators")
  const { data: content, loading, error, refetch } = useApiQuery((signal) =>
    communityService.getContent({ signal }),
  )

  const creators = content?.creators ?? []
  const partners = (content?.partners ?? []).filter((partner) => partner.type === "website")

  return (
    <section className="glass rounded-xl p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-semibold">Our Partners</h2>
        <div className="relative inline-flex rounded-lg bg-secondary/60 p-1">
          <span
            className={cn(
              "absolute inset-y-1 w-[calc(50%-0.25rem)] rounded-md bg-background shadow-sm transition-transform duration-300 ease-out",
              tab === "partners" && "translate-x-[calc(100%+0.5rem)]"
            )}
          />
          <button
            onClick={() => setTab("creators")}
            className={cn(
              "relative z-10 rounded-md px-4 py-1.5 text-sm font-medium transition-colors duration-200",
              tab === "creators" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Creators
          </button>
          <button
            onClick={() => setTab("partners")}
            className={cn(
              "relative z-10 rounded-md px-4 py-1.5 text-sm font-medium transition-colors duration-200",
              tab === "partners" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Partners
          </button>
        </div>
      </div>

      <QueryState
        loading={loading}
        error={error}
        empty={!loading && !error && creators.length === 0 && partners.length === 0}
        emptyMessage="No community content available yet."
        onRetry={refetch}
      />

      {!loading && !error && tab === "creators" && creators.length > 0 && (
        <div key="creators" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 page-enter">
          {creators.map((creator) => (
            <CreatorCard key={creator.id} creator={creator} />
          ))}
        </div>
      )}

      {!loading && !error && tab === "partners" && partners.length > 0 && (
        <div key="partners" className="flex flex-col gap-2 page-enter">
          {partners.map((partner) => (
            <PartnerCard key={partner.id} partner={partner} />
          ))}
        </div>
      )}
    </section>
  )
}

function CreatorCard({ creator }: { creator: CommunityCreator }) {
  return (
    <a
      href={creator.url}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "glass group flex flex-col items-center gap-2 rounded-lg p-4 text-center",
        "transition-all hover:bg-secondary/40 hover:scale-[1.02]"
      )}
    >
      <div className="flex size-11 items-center justify-center rounded-full bg-foreground/5 transition-colors group-hover:bg-foreground/10">
        <TikTokIcon className="size-5 text-foreground" />
      </div>
      <div className="min-w-0 w-full">
        <div className="truncate text-sm font-medium">{creator.name}</div>
        <div className="truncate text-xs text-muted-foreground">{creator.handle}</div>
      </div>
    </a>
  )
}

function PartnerCard({ partner }: { partner: CommunityPartner }) {
  return (
    <a
      href={partner.url}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "glass group flex items-center gap-3 rounded-lg p-4 transition-all hover:bg-secondary/40"
      )}
    >
      <div
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-lg",
          "bg-secondary"
        )}
      >
        <Globe2 className="size-5 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{partner.name}</div>
        <div className="truncate text-xs text-muted-foreground">{partner.description}</div>
      </div>
      <ExternalLink className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
    </a>
  )
}

export function HomePage({ onNavigate }: HomePageProps) {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const [infoServer, setInfoServer] = useState<ServerInfo | null>(null)
  const [reconnectPending, setReconnectPending] = useState(false)
  const { data: servers, loading, error, refetch } = useApiQuery<ServerInfo[]>((signal) =>
    serversService.getServers(undefined, { signal }),
  )
  const { data: homeStats } = useApiQuery<HomeStats>((signal) =>
    serversService.getHomeStats({ signal }),
  )
  const { data: reconnect, refetch: refetchReconnect } = useApiQuery<ReconnectMatch | null>(
    (signal) => serversService.getMyReconnect({ signal }),
    { enabled: isAuthenticated && !authLoading, queryKey: `home-reconnect:${isAuthenticated}` },
  )

  const liveServers = (servers ?? []).filter((s) => s.status !== "offline")
  const totalPlayers = homeStats?.playersOnline ?? (servers ?? []).reduce((acc, s) => acc + s.players, 0)
  const reconnectServer: ServerInfo | null = reconnect ? {
    id: reconnect.serverId,
    name: reconnect.serverName,
    map: reconnect.map,
    players: reconnect.playerCount,
    maxPlayers: 10,
    mode: reconnect.mode,
    ping: 0,
    status: "online",
    connectAddress: reconnect.connectAddress,
  } : null

  useEffect(() => {
    if (!reconnect) setReconnectPending(false)
  }, [reconnect])

  useEffect(() => {
    if (!isAuthenticated) return
    const refreshOnFocus = () => {
      if (document.visibilityState === "visible") refetchReconnect()
    }
    window.addEventListener("focus", refreshOnFocus)
    document.addEventListener("visibilitychange", refreshOnFocus)
    return () => {
      window.removeEventListener("focus", refreshOnFocus)
      document.removeEventListener("visibilitychange", refreshOnFocus)
    }
  }, [isAuthenticated, refetchReconnect])

  useEffect(() => {
    if (!reconnectPending || !isAuthenticated) return
    const timer = window.setInterval(refetchReconnect, 5_000)
    return () => window.clearInterval(timer)
  }, [isAuthenticated, reconnectPending, refetchReconnect])

  const reconnectToMatch = () => {
    if (!reconnectServer) return
    setReconnectPending(true)
    openServerInSteam(reconnectServer)
    window.setTimeout(refetchReconnect, 1_200)
  }

  return (
      <div className="flex flex-col gap-6 p-6">
        {/* Hero */}
        <div className={cn(
        "glass shiny-slow relative flex flex-col gap-4 overflow-hidden rounded-xl p-8"
      )}>
        <picture className="pointer-events-none absolute inset-0">
          <OptimizedImage src={homeHeroGif} width={480} height={268} priority alt="" aria-hidden="true" className="h-full w-full object-cover opacity-30" />
        </picture>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-background/90 via-background/65 to-background/25" />
        <div className="relative z-10 flex items-center gap-2">
          <span className="flex size-2 rounded-full bg-chart-2 animate-pulse" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Live Now
          </span>
        </div>
        <h1 className="relative z-10 font-display text-3xl tracking-wide md:text-5xl">
          LegacyX Ecosystem
        </h1>
        <p className="relative z-10 text-muted-foreground max-w-xl">
          The premier CS2 / CSGO community server platform. Join matches, build your
          clan, and compete with the Mongolian CS2 community.
        </p>
        <div className="relative z-10 flex flex-wrap gap-3 mt-2">
          {MODE_CARDS.map((mode) => (
            <button
              key={mode.id}
              onClick={() => onNavigate(mode.id)}
              className={cn(
                "glass group flex items-center gap-2 rounded-lg px-4 py-3",
                "transition-all hover:bg-secondary/50 hover:border-sidebar-border/60"
              )}
            >
              <mode.icon className="size-5 text-muted-foreground transition-colors group-hover:text-foreground" />
              <span className="text-sm font-medium">{mode.label}</span>
            </button>
          ))}
          </div>
	        </div>

        {reconnect && reconnectServer && (
          <section className="glass relative isolate overflow-hidden rounded-xl border border-amber-200/20 bg-amber-200/[0.045] p-5 shadow-lg shadow-black/10">
            {cs2MapArtwork(reconnect.map) && <OptimizedImage src={cs2MapArtwork(reconnect.map)!} width={640} height={360} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover opacity-[0.12]" />}
            <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-r from-background/95 via-background/80 to-background/55" />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-amber-100/75"><RotateCcw className="size-3.5" />Temporary reconnect</div>
                <h2 className="mt-1 truncate text-lg font-semibold">{reconnect.serverName}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{cs2MapLabel(reconnect.map)} · {reconnect.mode} · {reconnect.playerCount} players</p>
                <p className="mt-2 text-xs text-muted-foreground">Available until {new Date(reconnect.reconnectableUntil).toLocaleTimeString()}. This card clears only after the server confirms your rejoin.</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button type="button" onClick={() => setInfoServer(reconnectServer)} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border/70 bg-background/55 px-3 text-xs font-semibold text-foreground transition-colors hover:border-primary/60 hover:bg-secondary/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label={`View ${reconnect.serverName} live match information`}><Info className="size-3.5" />Info</button>
                <button type="button" onClick={() => void copyServerAddress(reconnectServer)} className="inline-flex size-9 items-center justify-center rounded-lg border border-border/70 bg-background/55 text-foreground transition-colors hover:border-primary/60 hover:bg-secondary/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label={`Copy ${reconnect.serverName} server IP`} title={`Copy ${reconnect.connectAddress}`}><Copy className="size-3.5" /></button>
                <button type="button" onClick={reconnectToMatch} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-emerald-300/35 bg-emerald-300/18 px-3 text-xs font-semibold text-emerald-50 transition-colors hover:border-emerald-200/65 hover:bg-emerald-300/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200/60"><PlayIcon className="size-3.5 fill-current" />{reconnectPending ? "Connecting…" : "Reconnect"}</button>
              </div>
            </div>
          </section>
        )}

        {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Players Online", value: totalPlayers.toString(), icon: Users },
          { label: "Live Servers", value: (homeStats?.liveServers ?? liveServers.length).toString(), icon: Server },
          { label: "Matches Today", value: homeStats?.matchesToday?.toLocaleString() ?? "—", icon: TrendingUp },
          { label: "Active Clans", value: homeStats?.activeClans?.toString() ?? "—", icon: Zap },
        ].map((stat) => (
          <div key={stat.label} className="glass rounded-xl p-4 hover-lift transition-all">
            <div className="flex items-center justify-between">
              <stat.icon className="size-4 text-muted-foreground" />
            </div>
            <div className="mt-3 text-2xl font-bold tabular-nums">{stat.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Mode cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {MODE_CARDS.map((mode) => (
          <button
            key={mode.id}
            onClick={() => onNavigate(mode.id)}
            className={cn(
              "glass shiny group flex flex-col gap-3 rounded-xl p-5 text-left",
              "transition-all hover:bg-secondary/30 hover:scale-[1.02]"
            )}
          >
            <div className="flex size-10 items-center justify-center rounded-lg bg-secondary">
              <mode.icon className="size-5" />
            </div>
            <div>
              <div className="font-semibold">{mode.label}</div>
              <div className="text-xs text-muted-foreground mt-1">{mode.desc}</div>
            </div>
            <div className="flex items-center gap-1.5 mt-auto">
              <span className="flex size-1.5 rounded-full bg-chart-2 animate-pulse" />
              <span className="text-xs text-muted-foreground">{mode.stat}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Live server preview */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Live Servers</h2>
          <div className="flex items-center gap-2">
            {error && (
              <button
                onClick={refetch}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <RefreshCw className="size-3" />
                Retry
              </button>
            )}
            <button
              onClick={() => onNavigate("play-5vs5")}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              View all
            </button>
          </div>
        </div>

        <QueryState
          loading={loading}
          error={error}
          empty={!loading && !error && liveServers.length === 0}
          emptyMessage="No live servers right now."
          onRetry={refetch}
        />

        {!loading && !error && liveServers.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {liveServers.slice(0, 5).map((server) => {
              const mapBackground = cs2MapArtwork(server.map)
              const hasAddress = Boolean(server.connectAddress)
              const isOffline = server.status === "offline"
              const isFull = server.status === "full"

              return (
                <article
                  key={server.id}
                  className={cn(
                    "group relative isolate min-h-44 overflow-hidden rounded-xl border border-border/60 bg-secondary/60 transition-all duration-300",
                    isOffline ? "opacity-60" : "hover:-translate-y-0.5 hover:border-sidebar-border/90 hover:shadow-lg hover:shadow-black/20",
                  )}
                >
                  {mapBackground && (
                    <OptimizedImage
                      src={mapBackground}
                      width={640}
                      height={360}
                      alt=""
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover opacity-65 transition-transform duration-700 group-hover:scale-105"
                    />
                  )}
                  <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-background/30 via-background/50 to-background/95" />

                  <div className="relative z-10 flex h-full min-h-44 flex-col justify-between p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/60">
                          <Server className="size-3" />
                          {server.mode}
                        </div>
                        <h3 className="mt-1 truncate text-sm font-semibold text-white">{server.name}</h3>
                      </div>
                      <span className={cn(
                        "shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                        isOffline && "border-white/15 bg-white/10 text-white/45",
                        isFull && "border-destructive/40 bg-destructive/15 text-destructive",
                        !isOffline && !isFull && "border-emerald-300/40 bg-emerald-300/16 text-emerald-100",
                      )}>
                        {isOffline ? "Offline" : isFull ? "Full" : "Live"}
                      </span>
                    </div>

                    <div className="mt-auto flex items-end justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-mono text-xs font-medium text-white/85">{cs2MapLabel(server.map)}</div>
                        <div className="mt-1 flex items-center gap-1.5 text-xs text-white/60 tabular-nums">
                          <Users className="size-3" />
                          {server.players}/{server.maxPlayers} players
                        </div>
                      </div>
	                      <div className="flex shrink-0 items-center gap-1.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
	                        <button type="button" onClick={() => setInfoServer(server)} className="inline-flex size-8 items-center justify-center rounded-md border border-white/20 bg-background/75 text-white/75 transition-colors hover:border-primary/70 hover:bg-primary/25 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label={`View ${server.name} live match information`} title="Live server information">
	                          <Info className="size-3.5" />
	                        </button>
	                        <button type="button" disabled={!hasAddress} onClick={() => void copyServerAddress(server)} className="inline-flex size-8 items-center justify-center rounded-md border border-white/20 bg-background/75 text-white/75 transition-colors hover:border-primary/70 hover:bg-primary/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label={`Copy ${server.name} server IP`} title={hasAddress ? `Copy ${server.connectAddress}` : "Server IP unavailable"}>
                          <Copy className="size-3.5" />
                        </button>
                        <button type="button" disabled={!hasAddress || isOffline} onClick={() => openServerInSteam(server)} className="inline-flex size-8 items-center justify-center rounded-md border border-emerald-300/45 bg-emerald-300/72 text-emerald-950 transition-colors hover:border-emerald-200 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/10 disabled:text-white/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200/70" aria-label={`Play ${server.name} in Steam`} title={hasAddress && !isOffline ? `Connect through Steam to ${server.connectAddress}` : "Steam connection unavailable"}>
                          <PlayIcon className="size-3.5 fill-current" />
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>

	      {/* Our Partners */}
	      <PartnerSection />
	      {infoServer && <ServerLiveMatchDialog server={infoServer} open onOpenChange={(open) => { if (!open) setInfoServer(null) }} />}
	    </div>
  )
}
