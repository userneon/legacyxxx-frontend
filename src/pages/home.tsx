/**
 * LEGACY-X Home: neutral glass dashboard with map-led server cards. Reconnect
 * appears only from the authenticated Root API and never from local mock state.
 */
import { useEffect, useState, type ComponentProps } from "react"
import { Crosshair, Flame, Crown, Trophy, Server, Users, ExternalLink, Copy, Play as PlayIcon, Info, RotateCcw, Swords, Gamepad2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { serversService } from "@/api"
import type { HomeStats, PageId, ReconnectMatch, ServerInfo } from "@/api/types"
import { useApiQuery } from "@/hooks/use-api-query"
import { AnimatedNumber } from "@/components/animated-number"
import { OptimizedImage } from "@/components/optimized-image"
import { cs2MapArtwork, cs2MapLabel } from "@/lib/cs2-map-art"
import { toast } from "sonner"
import homeHeroGif from "@/assets/skinchanger/hero.gif"
import { useAuth } from "@/hooks/use-auth"
import { ServerLiveMatchDialog } from "@/components/server-live-match-dialog"
import { HomeReviews } from "@/components/home-reviews"
import { isFeatureEnabled } from "@/lib/features"

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

function DiscordIcon({ className, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true" {...props}>
      <path d="M20.32 4.37A19.79 19.79 0 0 0 15.43 2.9a.07.07 0 0 0-.07.04c-.21.37-.44.85-.6 1.23a18.27 18.27 0 0 0-5.49 0c-.16-.39-.39-.86-.61-1.23a.07.07 0 0 0-.07-.04c-1.7.29-3.31.8-4.82 1.47a.07.07 0 0 0-.03.03C.53 9.05-.32 13.58.1 18.06a.08.08 0 0 0 .03.05 19.9 19.9 0 0 0 5.99 3.03.07.07 0 0 0 .08-.03c.46-.63.87-1.29 1.22-1.99a.07.07 0 0 0-.04-.1c-.65-.25-1.27-.55-1.87-.89a.07.07 0 0 1-.01-.12l.15-.12a.07.07 0 0 1 .07-.01c3.93 1.79 8.18 1.79 12.06 0a.07.07 0 0 1 .07.01l.15.12a.07.07 0 0 1-.01.12c-.6.34-1.22.64-1.87.89a.07.07 0 0 0-.04.1c.36.7.78 1.36 1.22 1.99a.07.07 0 0 0 .08.03 19.84 19.84 0 0 0 6-3.03.07.07 0 0 0 .03-.05c.5-5.18-.84-9.67-3.55-13.66a.07.07 0 0 0-.03-.03zM8.02 15.33c-1.18 0-2.16-1.08-2.16-2.42 0-1.33.96-2.42 2.16-2.42 1.21 0 2.18 1.1 2.16 2.42 0 1.34-.96 2.42-2.16 2.42zm7.97 0c-1.18 0-2.16-1.08-2.16-2.42 0-1.33.96-2.42 2.16-2.42 1.21 0 2.18 1.1 2.16 2.42 0 1.34-.95 2.42-2.16 2.42z" />
    </svg>
  )
}

export function HomePage({ onNavigate }: HomePageProps) {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const [infoServer, setInfoServer] = useState<ServerInfo | null>(null)
  const [reconnectPending, setReconnectPending] = useState(false)
  const { data: servers } = useApiQuery<ServerInfo[]>((signal) =>
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
  // The clan tile only belongs here while clans are part of the product.
  const statTiles = [
    { label: "Players Online", value: totalPlayers, icon: Users },
    { label: "Live Servers", value: homeStats?.liveServers ?? liveServers.length, icon: Server },
    { label: "Matches Today", value: homeStats?.matchesToday, icon: Gamepad2 },
    ...(isFeatureEnabled("clan") ? [{ label: "Active Clans", value: homeStats?.activeClans, icon: Swords }] : []),
  ]
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
          The premier CS2 / CSGO community server platform. Join matches{isFeatureEnabled("clan") ? ", build your clan," : ","} and
          compete with the Mongolian CS2 community.
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
                {isFeatureEnabled("roster") && <button type="button" onClick={() => setInfoServer(reconnectServer)} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border/70 bg-background/55 px-3 text-xs font-semibold text-foreground transition-colors hover:border-primary/60 hover:bg-secondary/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label={`View ${reconnect.serverName} live match information`}><Info className="size-3.5" />Info</button>}
                <button type="button" onClick={() => void copyServerAddress(reconnectServer)} className="inline-flex size-9 items-center justify-center rounded-lg border border-border/70 bg-background/55 text-foreground transition-colors hover:border-primary/60 hover:bg-secondary/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" aria-label={`Copy ${reconnect.serverName} server IP`} title={`Copy ${reconnect.connectAddress}`}><Copy className="size-3.5" /></button>
                <button type="button" onClick={reconnectToMatch} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-emerald-300/35 bg-emerald-300/18 px-3 text-xs font-semibold text-emerald-50 transition-colors hover:border-emerald-200/65 hover:bg-emerald-300/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200/60"><PlayIcon className="size-3.5 fill-current" />{reconnectPending ? "Connecting…" : "Reconnect"}</button>
              </div>
            </div>
          </section>
        )}

	        {/* Discord community invite */}
        <a
          href="https://discord.gg/legacyx"
          target="_blank"
          rel="noreferrer"
          aria-label="Join the LEGACY-X Discord community"
          className={cn(
            "group relative isolate flex min-h-40 overflow-hidden rounded-xl border border-[#5865F2]/25 bg-[#121526] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#7289DA]/60 hover:shadow-[0_18px_48px_rgba(88,101,242,0.2)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7289DA] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          )}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(88,101,242,0.38),transparent_46%),linear-gradient(105deg,rgba(88,101,242,0.18),rgba(15,18,38,0.08)_55%,rgba(88,101,242,0.2))]" />
          <div className="pointer-events-none absolute -right-12 -top-16 size-52 rounded-full bg-[#7289DA]/15 blur-3xl transition-transform duration-500 group-hover:scale-125" />
          <div className="relative z-10 flex w-full flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <div className="flex size-20 shrink-0 items-center justify-center rounded-[1.65rem] bg-[#5865F2]/20 text-[#7289DA] ring-1 ring-inset ring-[#7289DA]/25 shadow-inner shadow-[#5865F2]/20 transition-transform duration-300 group-hover:scale-105">
                <DiscordIcon className="size-11" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex size-2 rounded-full bg-[#7ee787] shadow-[0_0_12px_rgba(126,231,135,0.9)]" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#b9c3ff]">Community hub</span>
                </div>
                <h2 className="mt-1 font-display text-2xl tracking-wide text-white">Join LEGACY-X Discord</h2>
                <p className="mt-1 max-w-xl text-sm text-slate-300">Find teammates, receive announcements, share clips and stay connected with the Mongolian CS2 community.</p>
              </div>
            </div>
            <span className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-lg border border-[#7289DA]/35 bg-[#5865F2]/15 px-4 py-2.5 text-sm font-semibold text-[#d9ddff] transition-colors group-hover:bg-[#5865F2]/30 sm:self-auto">
              Join Discord <ExternalLink className="size-4" />
            </span>
          </div>
        </a>

        {/* Stats */}
      <div className={cn("grid grid-cols-2 gap-4", statTiles.length === 4 ? "md:grid-cols-4" : "md:grid-cols-3")}>
        {statTiles.map((stat) => (
          <div key={stat.label} className="glass rounded-xl p-4 hover-lift transition-all">
            <div className="flex items-center justify-between">
              <stat.icon className="size-4 text-muted-foreground" />
            </div>
            <div className="mt-3 text-2xl font-bold tabular-nums"><AnimatedNumber value={stat.value} /></div>
            <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Mode cards */}
      <div className="stagger-in grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

      <HomeReviews onWriteReview={() => onNavigate("feedback")} />
      {isFeatureEnabled("roster") && infoServer && <ServerLiveMatchDialog server={infoServer} open onOpenChange={(open) => { if (!open) setInfoServer(null) }} />}
	    </div>
  )
}
