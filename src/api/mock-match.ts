/**
 * Sample match details and replay for the design preview (see mock.ts). Everything here is generated, deterministic per
 * match id, and never reaches the network. The replay has no real map: players walk between invented spawns and sites.
 */
import type { MatchDetail, MatchDetailPlayer, MatchDetailRound, MatchReplay, MatchReplayEvent, MatchReplayFrame, MatchReplayRound, MatchReplaySide, MatchRoundOutcome } from "./types"

function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const hash = (text: string) => [...text].reduce((total, char) => (total * 31 + char.charCodeAt(0)) >>> 0, 7)

const PLAYERS = ["Temuulen", "xBataa", "Khuslen_AWP", "Enkh.", "Gansukh", "ZoloMN", "Nomin", "Anand", "Bilguun", "Tsogoo"]
const steamIdOf = (index: number) => `7656119800000${String(index).padStart(4, "0")}`

const cache = new Map<string, { detail: MatchDetail; replay: MatchReplay }>()

/** Round 1-12 team1 is CT, 13+ it is T (overtime is not simulated; matches end at 13). */
const team1SideIn = (round: number): MatchReplaySide => (round <= 12 ? "ct" : "t")

// Invented layout in 0..1 radar space.
const T_SPAWN = { x: 0.16, y: 0.84 }
const CT_SPAWN = { x: 0.84, y: 0.16 }
const SITES = { A: { x: 0.82, y: 0.7 }, B: { x: 0.18, y: 0.3 } }
const MID = { x: 0.5, y: 0.5 }

function build(matchId: string, mapNumber: number): { detail: MatchDetail; replay: MatchReplay } {
  const random = rng(hash(`${matchId}:${mapNumber}`))
  const mapName = ["de_dust2", "de_mirage", "de_inferno", "de_nuke"][hash(matchId) % 4]!

  // Rounds: first to 13.
  const rounds: MatchDetailRound[] = []
  let score1 = 0
  let score2 = 0
  const team1Strength = 0.5 + (random() - 0.5) * 0.3
  while (score1 < 13 && score2 < 13) {
    const number = rounds.length + 1
    const team1Wins = random() < team1Strength
    team1Wins ? score1++ : score2++
    const team1Side = team1SideIn(number)
    const winnerSide: MatchReplaySide = team1Wins ? team1Side : team1Side === "ct" ? "t" : "ct"
    const roll = random()
    const outcome: MatchRoundOutcome = winnerSide === "t"
      ? roll < 0.55 ? "elimination" : "bomb_exploded"
      : roll < 0.5 ? "elimination" : roll < 0.8 ? "bomb_defused" : "time_expired"
    rounds.push({ number, winnerTeam: team1Wins ? "team1" : "team2", winnerSide, outcome, score: { team1: score1, team2: score2 } })
  }

  const player = (index: number): MatchDetailPlayer => {
    const kills = 8 + Math.floor(random() * 18)
    const deaths = 6 + Math.floor(random() * 16)
    return {
      userId: `mock-${index}`, steamId: steamIdOf(index), username: PLAYERS[index]!, avatar: "", kills, deaths, assists: Math.floor(random() * 8),
      kdDiff: kills - deaths, headshotPercent: 30 + Math.floor(random() * 40), adr: 55 + Math.floor(random() * 60), kastPercent: 55 + Math.floor(random() * 30),
      mvps: Math.floor(random() * 6), utilityDamage: Math.floor(random() * 120), enemiesFlashed: Math.floor(random() * 8), firstKills: Math.floor(random() * 5),
      firstDeaths: Math.floor(random() * 5), multiKills: { k3: Math.floor(random() * 3), k4: Math.floor(random() * 2), k5: 0 }, clutchesWon: Math.floor(random() * 3),
      ratingDelta: Math.round((random() - 0.45) * 40), roundsPlayed: rounds.length,
    }
  }
  const detail: MatchDetail = {
    matchId, mapNumber, mapName, playedAt: new Date(Date.now() - 9 * 3_600_000).toISOString(),
    winner: score1 > score2 ? "team1" : "team2",
    teams: [
      { key: "team1", name: "Team Khan", score: score1, won: score1 > score2, players: [0, 1, 2, 3, 4].map(player) },
      { key: "team2", name: "Team Gobi", score: score2, won: score2 > score1, players: [5, 6, 7, 8, 9].map(player) },
    ],
    rounds,
  }

  const replayRounds = rounds.map((round) => buildRound(round, random))
  const replay: MatchReplay = {
    matchId, mapNumber, mapName, sampleRate: 2, radar: { image: null }, sites: SITES,
    players: PLAYERS.map((name, index) => ({ steamId: steamIdOf(index), name, team: index < 5 ? "team1" : "team2" })),
    rounds: replayRounds,
  }
  return { detail, replay }
}

type Point = { x: number; y: number }
const lerp = (a: number, b: number, k: number) => a + (b - a) * k
const smooth = (k: number) => k * k * (3 - 2 * k)

/** Walks along waypoints at an even pace over `duration` seconds, then stands still. */
function along(points: Point[], t: number, duration: number): Point & { yaw: number } {
  const lengths = points.slice(1).map((point, i) => Math.hypot(point.x - points[i]!.x, point.y - points[i]!.y))
  const total = lengths.reduce((a, b) => a + b, 0) || 1
  let distance = smooth(Math.min(1, Math.max(0, t / duration))) * total
  for (let i = 0; i < lengths.length; i++) {
    if (distance <= lengths[i]! || i === lengths.length - 1) {
      const k = lengths[i]! ? Math.min(1, distance / lengths[i]!) : 1
      const from = points[i]!
      const to = points[i + 1]!
      return { x: lerp(from.x, to.x, k), y: lerp(from.y, to.y, k), yaw: Math.atan2(to.y - from.y, to.x - from.x) }
    }
    distance -= lengths[i]!
  }
  const last = points[points.length - 1]!
  return { ...last, yaw: 0 }
}

function buildRound(round: MatchDetailRound, random: () => number): MatchReplayRound {
  const team1Side = team1SideIn(round.number)
  const winnerSide = round.winnerSide!
  const sideOf = (index: number): MatchReplaySide => (index < 5 ? team1Side : team1Side === "ct" ? "t" : "ct")
  const site = random() < 0.5 ? "A" : "B"
  const target = SITES[site]
  const seconds = round.outcome === "elimination" ? 32 + Math.floor(random() * 50) : round.outcome === "time_expired" ? 115 : 100 + Math.floor(random() * 10)

  // Who dies and when.
  const deathAt: number[] = Array(10).fill(Infinity)
  const events: MatchReplayEvent[] = []
  const alive = (side: MatchReplaySide) => [...Array(10).keys()].filter((i) => sideOf(i) === side && deathAt[i] === Infinity)
  const loser: MatchReplaySide = winnerSide === "t" ? "ct" : "t"
  const losses = round.outcome === "elimination" ? 5 : round.outcome === "time_expired" ? 0 : winnerSide === "t" ? Math.floor(random() * 4) : Math.floor(random() * 3) + 1
  const winnerLosses = Math.floor(random() * 3)
  const plantAt = round.outcome === "bomb_exploded" || round.outcome === "bomb_defused" ? 48 + Math.floor(random() * 12) : null
  const killTimes = (count: number, from: number, to: number) => Array.from({ length: count }, () => from + random() * (to - from)).sort((a, b) => a - b)
  const killWindowEnd = plantAt && winnerSide === "t" ? plantAt - 2 : Math.min(seconds - 2, plantAt ?? seconds - 2)
  const assign = (victimSide: MatchReplaySide, count: number) => {
    for (const t of killTimes(count, 12, Math.max(14, killWindowEnd))) {
      const victims = alive(victimSide)
      const killers = alive(victimSide === "t" ? "ct" : "t")
      if (victims.length === 0 || killers.length === 0) continue
      const victim = victims[Math.floor(random() * victims.length)]!
      const actor = killers[Math.floor(random() * killers.length)]!
      deathAt[victim] = t
      events.push({ t, type: "kill", actor, victim, weapon: sideOf(actor) === "t" ? ["AK-47", "AK-47", "Glock-18"][Math.floor(random() * 3)]! : ["M4A1-S", "M4A4", "USP-S"][Math.floor(random() * 3)]!, headshot: random() < 0.45 })
    }
  }
  assign(loser, losses)
  assign(winnerSide, winnerLosses)
  if (plantAt !== null) events.push({ t: plantAt, type: "plant", site })
  if (round.outcome === "bomb_defused") events.push({ t: Math.min(seconds - 1, plantAt! + 30), type: "defuse", site })
  if (round.outcome === "bomb_exploded") events.push({ t: Math.min(seconds - 1, plantAt! + 40), type: "explode", site })
  events.sort((a, b) => a.t - b.t)

  // Movement: T walks to the site through mid or the long way round, CT holds near their spawn then the site.
  const paths = [...Array(10).keys()].map((i): Point[] => {
    const wobble = () => (random() - 0.5) * 0.07
    const start = sideOf(i) === "t" ? T_SPAWN : CT_SPAWN
    const own = { x: start.x + wobble() * 3.2, y: start.y + wobble() * 3.2 }
    const around = random() < 0.5 ? MID : { x: site === "A" ? T_SPAWN.x + 0.5 : T_SPAWN.x, y: site === "A" ? T_SPAWN.y : T_SPAWN.y - 0.5 }
    const spot = { x: target.x + wobble() * 1.4, y: target.y + wobble() * 1.4 }
    return sideOf(i) === "t" ? [own, { x: around.x + wobble(), y: around.y + wobble() }, spot] : [own, { x: lerp(CT_SPAWN.x, target.x, 0.55) + wobble(), y: lerp(CT_SPAWN.y, target.y, 0.55) + wobble() }, spot]
  })
  const arrive = (i: number) => (sideOf(i) === "t" ? 38 : 24) + random() * 8

  const frames: MatchReplayFrame[] = []
  const stopped: Array<Point & { yaw: number } | null> = Array(10).fill(null)
  for (let t = 0; t <= seconds + 1e-9; t += 0.5) {
    frames.push({
      t,
      players: paths.map((points, i) => {
        if (t >= deathAt[i]!) {
          stopped[i] ??= along(points, deathAt[i]!, arrive(i))
          return { x: stopped[i]!.x, y: stopped[i]!.y, yaw: stopped[i]!.yaw, alive: false }
        }
        const now = along(points, t, arrive(i))
        return { x: now.x, y: now.y, yaw: now.yaw, alive: true }
      }),
    })
  }
  return { number: round.number, seconds, team1Side, winnerSide, frames, events }
}

export function mockMatchDetail(matchId: string, mapNumber: number) {
  const key = `${matchId}:${mapNumber}`
  if (!cache.has(key)) cache.set(key, build(matchId, mapNumber))
  return cache.get(key)!.detail
}

export function mockMatchReplay(matchId: string, mapNumber: number) {
  const key = `${matchId}:${mapNumber}`
  if (!cache.has(key)) cache.set(key, build(matchId, mapNumber))
  return cache.get(key)!.replay
}
