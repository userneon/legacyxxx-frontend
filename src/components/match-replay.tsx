/**
 * Match replay: a top-down view of one round, played back from the recorded positions. Pick a round, press play, drag the
 * bar to jump. The map picture comes with the replay; without one a plain layout is drawn.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Bomb, Pause, Play, Scissors, Skull } from "lucide-react"

import { matchesService } from "@/api"
import type { MatchReplay, MatchReplayEvent, MatchReplayRound, MatchReplaySide } from "@/api/types"
import { QueryState } from "@/components/query-state"
import { useApiQuery } from "@/hooks/use-api-query"
import { cn } from "@/lib/utils"

const SPEEDS = [1, 2, 4] as const
const KILL_LINE_SECONDS = 1.4

const SIDE_TEXT: Record<MatchReplaySide, string> = { t: "text-[var(--team-t)]", ct: "text-[var(--team-ct)]" }
const SIDE_TILE: Record<MatchReplaySide, string> = {
  t: "border-[var(--team-t)]/40 bg-[var(--team-t)]/15 text-[var(--team-t)]",
  ct: "border-[var(--team-ct)]/40 bg-[var(--team-ct)]/15 text-[var(--team-ct)]",
}

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`
const otherSide = (side: MatchReplaySide): MatchReplaySide => (side === "ct" ? "t" : "ct")

interface Colors { t: string; ct: string; text: string; dim: string; line: string; raised: string; panel: string }

function readColors(): Colors {
  // The theme defines every one of these; "currentColor" only covers a missing token.
  const style = getComputedStyle(document.documentElement)
  const get = (name: string) => style.getPropertyValue(name).trim() || "currentColor"
  return { t: get("--team-t"), ct: get("--team-ct"), text: get("--text"), dim: get("--text-faint"), line: get("--line"), raised: get("--raised"), panel: get("--panel") }
}

/** Where everyone is at `time`, blended between the two nearest samples. */
function pose(replay: MatchReplay, round: MatchReplayRound, time: number) {
  const exact = Math.min(round.frames.length - 1, Math.max(0, time * replay.sampleRate))
  const i = Math.floor(exact)
  const a = round.frames[i]!
  const b = round.frames[Math.min(round.frames.length - 1, i + 1)]!
  const k = exact - i
  return a.players.map((from, index) => {
    const to = b.players[index]!
    return { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k, yaw: from.yaw, alive: from.alive }
  })
}

function drawLayout(ctx: CanvasRenderingContext2D, size: number, replay: MatchReplay, colors: Colors) {
  // No radar picture: a grid, the lanes between the spawns and the two bomb sites.
  ctx.fillStyle = colors.panel
  ctx.fillRect(0, 0, size, size)
  ctx.strokeStyle = colors.line
  ctx.lineWidth = 1
  for (let i = 1; i < 10; i++) {
    const at = (i / 10) * size
    ctx.beginPath(); ctx.moveTo(at, 0); ctx.lineTo(at, size); ctx.moveTo(0, at); ctx.lineTo(size, at); ctx.stroke()
  }
  const point = (x: number, y: number) => [x * size, y * size] as const
  ctx.strokeStyle = colors.raised
  ctx.lineWidth = size * 0.07
  ctx.lineCap = "round"
  ctx.lineJoin = "round"
  const route = [[0.16, 0.84], [0.5, 0.5], [0.84, 0.16]] as const
  ctx.beginPath(); route.forEach(([x, y], i) => (i ? ctx.lineTo(...point(x, y)) : ctx.moveTo(...point(x, y)))); ctx.stroke()
  for (const site of Object.values(replay.sites)) {
    ctx.beginPath(); ctx.moveTo(...point(0.5, 0.5)); ctx.lineTo(...point(site.x, site.y)); ctx.stroke()
  }
  ctx.fillStyle = colors.dim
  ctx.font = `600 ${size * 0.028}px Onest, system-ui, sans-serif`
  ctx.textAlign = "center"
  ctx.fillText("T spawn", ...point(0.16, 0.92))
  ctx.fillText("CT spawn", ...point(0.84, 0.08))
  ctx.font = `700 ${size * 0.06}px Onest, system-ui, sans-serif`
  ctx.fillStyle = colors.text
  for (const [name, site] of Object.entries(replay.sites)) ctx.fillText(name, site.x * size, site.y * size + size * 0.02)
}

function draw(canvas: HTMLCanvasElement, replay: MatchReplay, round: MatchReplayRound, time: number, colors: Colors, image: HTMLImageElement | null, names: boolean) {
  const ctx = canvas.getContext("2d")
  if (!ctx) return
  const size = canvas.width
  ctx.clearRect(0, 0, size, size)
  if (image) ctx.drawImage(image, 0, 0, size, size)
  else drawLayout(ctx, size, replay, colors)

  const sideOf = (index: number) => (replay.players[index]!.team === "team1" ? round.team1Side : otherSide(round.team1Side))
  const players = pose(replay, round, time)

  // The planted bomb.
  const plant = round.events.find((event) => event.type === "plant" && event.t <= time)
  if (plant?.site) {
    const site = replay.sites[plant.site]
    const pulse = (time - plant.t) % 1
    ctx.strokeStyle = colors.text
    ctx.globalAlpha = 1 - pulse
    ctx.lineWidth = size * 0.004
    ctx.beginPath(); ctx.arc(site.x * size, site.y * size, size * (0.03 + pulse * 0.04), 0, Math.PI * 2); ctx.stroke()
    ctx.globalAlpha = 1
    ctx.fillStyle = colors.text
    ctx.fillRect(site.x * size - size * 0.012, site.y * size - size * 0.008, size * 0.024, size * 0.016)
  }

  // A line from the killer to the victim just after each kill.
  for (const event of round.events) {
    if (event.type !== "kill" || event.t > time || time - event.t > KILL_LINE_SECONDS || event.actor === undefined || event.victim === undefined) continue
    const killer = pose(replay, round, event.t)[event.actor]!
    const victim = pose(replay, round, event.t)[event.victim]!
    ctx.globalAlpha = 1 - (time - event.t) / KILL_LINE_SECONDS
    ctx.strokeStyle = colors[sideOf(event.actor)]
    ctx.lineWidth = size * 0.004
    ctx.beginPath(); ctx.moveTo(killer.x * size, killer.y * size); ctx.lineTo(victim.x * size, victim.y * size); ctx.stroke()
    ctx.globalAlpha = 1
  }

  const radius = size * 0.016
  players.forEach((player, index) => {
    const color = colors[sideOf(index)]
    const x = player.x * size
    const y = player.y * size
    if (!player.alive) {
      ctx.strokeStyle = colors.dim
      ctx.lineWidth = size * 0.004
      ctx.beginPath(); ctx.moveTo(x - radius * 0.7, y - radius * 0.7); ctx.lineTo(x + radius * 0.7, y + radius * 0.7); ctx.moveTo(x + radius * 0.7, y - radius * 0.7); ctx.lineTo(x - radius * 0.7, y + radius * 0.7); ctx.stroke()
      return
    }
    ctx.strokeStyle = color
    ctx.lineWidth = size * 0.005
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(player.yaw) * radius * 2.2, y + Math.sin(player.yaw) * radius * 2.2); ctx.stroke()
    ctx.fillStyle = color
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = "#0a0a0a"
    ctx.lineWidth = size * 0.003
    ctx.stroke()
    if (names) {
      ctx.fillStyle = colors.text
      ctx.font = `500 ${size * 0.024}px Onest, system-ui, sans-serif`
      ctx.textAlign = "center"
      ctx.fillText(replay.players[index]!.name, x, y - radius * 1.7)
    }
  })
}

function EventRow({ event, replay, round }: { event: MatchReplayEvent; replay: MatchReplay; round: MatchReplayRound }) {
  const sideOf = (index: number) => (replay.players[index]!.team === "team1" ? round.team1Side : otherSide(round.team1Side))
  const name = (index: number | undefined) => (index === undefined ? "" : replay.players[index]!.name)
  if (event.type === "kill" && event.actor !== undefined && event.victim !== undefined) {
    return (
      <li className="flex items-center gap-1.5 text-xs">
        <span className="w-9 shrink-0 text-[10px] text-[var(--text-faint)]">{clock(event.t)}</span>
        <span className={cn("truncate font-medium", SIDE_TEXT[sideOf(event.actor)])}>{name(event.actor)}</span>
        <Skull className="size-3 shrink-0 text-[var(--text-dim)]" aria-hidden="true" />
        <span className={cn("truncate", SIDE_TEXT[sideOf(event.victim)])}>{name(event.victim)}</span>
        <span className="ml-auto shrink-0 text-[10px] text-[var(--text-dim)]">{event.weapon}{event.headshot ? " · HS" : ""}</span>
      </li>
    )
  }
  const label = event.type === "plant" ? `Bomb planted at ${event.site}` : event.type === "defuse" ? "Bomb defused" : "Bomb exploded"
  const Icon = event.type === "defuse" ? Scissors : Bomb
  return (
    <li className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
      <span className="w-9 shrink-0 text-[10px] text-[var(--text-faint)]">{clock(event.t)}</span>
      <Icon className="size-3 shrink-0" aria-hidden="true" />{label}
    </li>
  )
}

function ReplayPlayer({ replay }: { replay: MatchReplay }) {
  const [roundNumber, setRoundNumber] = useState(replay.rounds[0]?.number ?? 1)
  const round = useMemo(() => replay.rounds.find((entry) => entry.number === roundNumber) ?? replay.rounds[0]!, [replay, roundNumber])
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1)
  const [names, setNames] = useState(false)
  const [shownTime, setShownTime] = useState(0)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef(0)
  const timeRef = useRef(0)
  const colorsRef = useRef<Colors | null>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const live = useRef({ playing, speed, names, round, replay })
  live.current = { playing, speed, names, round, replay }

  const paint = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    colorsRef.current ??= readColors()
    draw(canvas, live.current.replay, live.current.round, timeRef.current, colorsRef.current, imageRef.current, live.current.names)
  }, [])

  // The radar picture, when the replay has one.
  useEffect(() => {
    imageRef.current = null
    const source = replay.radar.image
    if (!source) { paint(); return }
    const image = new Image()
    image.crossOrigin = "anonymous"
    image.onload = () => { imageRef.current = image; paint() }
    image.src = source
  }, [replay.radar.image, paint])

  // Canvas resolution follows its box.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const resize = () => {
      const size = Math.round(canvas.clientWidth * Math.min(window.devicePixelRatio || 1, 2))
      if (size && canvas.width !== size) { canvas.width = size; canvas.height = size; paint() }
    }
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    resize()
    return () => observer.disconnect()
  }, [paint])

  // Playback clock.
  useEffect(() => {
    let last = performance.now()
    let shownAt = 0
    const tick = (now: number) => {
      frameRef.current = requestAnimationFrame(tick)
      const state = live.current
      if (state.playing) {
        timeRef.current = Math.min(state.round.seconds, timeRef.current + ((now - last) / 1000) * state.speed)
        if (timeRef.current >= state.round.seconds) setPlaying(false)
      }
      last = now
      paint()
      if (now - shownAt > 100) { shownAt = now; setShownTime(timeRef.current) }
    }
    frameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameRef.current)
  }, [paint])

  const pickRound = (number: number) => { timeRef.current = 0; setShownTime(0); setRoundNumber(number); setPlaying(false) }
  const seek = (value: number) => { timeRef.current = value; setShownTime(value); paint() }
  const togglePlay = () => {
    if (!playing && timeRef.current >= round.seconds) seek(0)
    setPlaying((current) => !current)
  }

  const feed = round.events.filter((event) => event.t <= shownTime).reverse()
  const sideOf = (index: number) => (replay.players[index]!.team === "team1" ? round.team1Side : otherSide(round.team1Side))
  const current = pose(replay, round, shownTime)

  return (
    <div className="flex flex-col gap-4">
      <div role="group" aria-label="Round" className="flex gap-1 overflow-x-auto pb-1">
        {replay.rounds.map((entry) => (
          <button
            key={entry.number}
            type="button"
            aria-pressed={entry.number === round.number}
            title={`Round ${entry.number}${entry.winnerSide ? ` · ${entry.winnerSide.toUpperCase()} won` : ""}`}
            onClick={() => pickRound(entry.number)}
            className={cn(
              "h-7 min-w-7 shrink-0 rounded-md border px-1.5 text-[11px] font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/50",
              entry.winnerSide ? SIDE_TILE[entry.winnerSide] : "border-[var(--line)] text-[var(--text-muted)]",
              entry.number === round.number ? "ring-2 ring-[var(--text)]" : "opacity-70 hover:opacity-100",
            )}
          >
            {entry.number}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="flex min-w-0 flex-col gap-3">
          <canvas
            ref={canvasRef}
            role="img"
            aria-label={`Round ${round.number} replay, ${replay.mapName}`}
            className="mx-auto aspect-square w-full max-w-[560px] rounded-xl border border-[var(--line)] bg-[var(--panel)]"
          />
          <div className="mx-auto flex w-full max-w-[560px] flex-col gap-2">
            <div className="flex items-center gap-3">
              <button type="button" onClick={togglePlay} aria-label={playing ? "Pause" : "Play"} className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--raised)] text-[var(--text)] transition-colors hover:border-[var(--line-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/50">
                {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
              </button>
              <input
                type="range"
                aria-label="Round time"
                min={0}
                max={round.seconds}
                step={0.5}
                value={shownTime}
                onChange={(event) => seek(Number(event.target.value))}
                className="min-w-0 flex-1 accent-[var(--accent-solid)]"
              />
              <span className="w-20 shrink-0 text-right text-xs text-[var(--text-muted)]">{clock(shownTime)} / {clock(round.seconds)}</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {SPEEDS.map((option) => (
                <button key={option} type="button" aria-pressed={speed === option} onClick={() => setSpeed(option)} className={cn("h-7 rounded-full border px-3 text-[11px] font-medium transition-colors duration-150", speed === option ? "border-[var(--line-strong)] bg-[var(--raised)] text-[var(--text)]" : "border-[var(--line)] bg-[var(--glass-fill)] text-[var(--text-muted)] hover:text-[var(--text)]")}>{option}x</button>
              ))}
              <button type="button" aria-pressed={names} onClick={() => setNames((value) => !value)} className={cn("ml-auto h-7 rounded-full border px-3 text-[11px] font-medium transition-colors duration-150", names ? "border-[var(--line-strong)] bg-[var(--raised)] text-[var(--text)]" : "border-[var(--line)] bg-[var(--glass-fill)] text-[var(--text-muted)] hover:text-[var(--text)]")}>Names</button>
            </div>
            {!replay.radar.image && <p className="text-[11px] leading-4 text-[var(--text-dim)]">The map picture is not available, so a plain layout is drawn.</p>}
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          {(["ct", "t"] as const).map((side) => (
            <div key={side}>
              <div className={cn("mb-1.5 text-[10px] font-semibold uppercase tracking-wider", SIDE_TEXT[side])}>{side === "ct" ? "Counter-Terrorists" : "Terrorists"}</div>
              <ul className="flex flex-col gap-1">
                {replay.players.map((player, index) => sideOf(index) === side && (
                  <li key={player.steamId} className={cn("flex items-center gap-2 text-xs", current[index]?.alive ? "text-[var(--text)]" : "text-[var(--text-faint)] line-through")}>
                    <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: current[index]?.alive ? `var(--team-${side})` : "var(--text-faint)" }} />
                    <span className="truncate">{player.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-dim)]">Round events</div>
            {feed.length === 0 ? (
              <p className="text-xs text-[var(--text-dim)]">Nothing has happened yet.</p>
            ) : (
              <ul className="flex max-h-56 flex-col gap-1.5 overflow-y-auto">
                {feed.map((event, index) => <EventRow key={`${event.t}-${index}`} event={event} replay={replay} round={round} />)}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function MatchReplayView({ matchId, mapNumber, enabled }: { matchId: string; mapNumber: number; enabled: boolean }) {
  const { data, loading, error, refetch } = useApiQuery<MatchReplay>(
    (signal) => matchesService.getMatchReplay(matchId, mapNumber, { signal }),
    { enabled, queryKey: `match-replay:${matchId}:${mapNumber}` },
  )

  if (error?.code === "not_found") {
    return <p className="rounded-xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-muted-foreground">No replay was recorded for this match.</p>
  }
  if (data && data.rounds.length > 0) return <ReplayPlayer key={`${data.matchId}:${data.mapNumber}`} replay={data} />
  return (
    <QueryState
      loading={loading}
      error={error}
      onRetry={refetch}
      empty={Boolean(data)}
      emptyMessage="This replay has no rounds."
      skeleton={<div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]"><div className="mx-auto aspect-square w-full max-w-[560px] animate-pulse rounded-xl bg-white/[0.04]" /><div className="h-64 animate-pulse rounded-xl bg-white/[0.04]" /></div>}
    />
  )
}
