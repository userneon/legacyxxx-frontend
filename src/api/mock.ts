/**
 * Local design preview data. Only loaded when the app is started with VITE_MOCK_API=1 (see
 * client.ts); a normal build never includes this file. Every endpoint not listed here answers 404,
 * so the page shows its real empty / error state and nothing reaches the network.
 */
import type { ApiError } from "./types"

type Query = Record<string, string | number | boolean | undefined | null> | undefined

const NAMES = ["Temuulen", "xBataa", "Khuslen_AWP", "Enkh.", "Gansukh", "ZoloMN", "Nomin", "Anand", "Bilguun", "Tsogoo", "Dulguun", "Erdene", "Munkh", "Batka", "Sukhee", "Ariunaa", "Tengis", "Boldoo"]
const RANKS: [number, string][] = [
  [18, "Legacy"], [16, "Apex III"], [15, "Apex II"], [13, "Ace III"], [12, "Ace II"], [11, "Ace I"],
  [10, "Vanguard III"], [9, "Vanguard II"], [8, "Vanguard I"], [7, "Operator III"], [6, "Operator II"], [5, "Operator I"],
  [4, "Recruit III"], [3, "Recruit II"], [2, "Recruit I"], [2, "Recruit I"], [1, "Recruit I"], [1, "Recruit I"],
]

function leaderboard(sort: string) {
  const entries = NAMES.map((username, index) => ({
    user_id: `mock-${index}`,
    steam_id: `7656119800000${String(index).padStart(4, "0")}`,
    username,
    avatar: null,
    rank_id: RANKS[index][0],
    rank_name: RANKS[index][1],
    rank_image_key: null,
    current_exp: 4200 - index * 190,
    matches_completed: 180 - index * 9,
    wins: 110 - index * 6,
    deaths: 900 - index * 30,
    kd_ratio: 1.62 - index * 0.05 + (index % 3) * 0.04,
    win_rate: 0.64 - index * 0.012 + (index % 4) * 0.01,
    played_hours: 120 - index * 5,
  }))
  const key = sort === "kd" ? "kd_ratio" : sort === "win" ? "win_rate" : "current_exp"
  return entries.sort((a, b) => b[key] - a[key]).map((entry, index) => ({ ...entry, position: index + 1 }))
}

type Status = "waiting" | "warmup" | "live" | "full" | "offline"
function server(id: string, name: string, map: string, mode: "5x5" | "fun" | "pro", modeLabel: string, status: Status, players: number, maxPlayers: number) {
  const live = status === "live"
  return {
    id, name, map, mode, modeLabel, status, players, maxPlayers,
    round: live ? 14 : null,
    score: live ? { t: 7, ct: 6 } : null,
    connectAddress: status === "offline" ? null : `203.0.113.10:270${id.slice(-2)}`,
    gotvAddress: live ? `203.0.113.10:280${id.slice(-2)}` : null,
    joinable: status === "waiting" || status === "warmup" || (mode === "fun" && players < maxPlayers),
  }
}

const SERVERS = {
  "5x5": [
    server("5x5-01", "LEGACY-X #1 | MIRAGE", "de_mirage", "5x5", "5x5", "live", 10, 10),
    server("5x5-02", "LEGACY-X #2 | INFERNO", "de_inferno", "5x5", "5x5", "waiting", 6, 10),
    server("5x5-03", "LEGACY-X #3 | DUST II", "de_dust2", "5x5", "5x5", "warmup", 9, 10),
    server("5x5-04", "LEGACY-X #4 | ANCIENT", "de_ancient", "5x5", "5x5", "live", 10, 10),
    server("5x5-05", "LEGACY-X #5 | NUKE", "de_nuke", "5x5", "5x5", "waiting", 2, 10),
    server("5x5-06", "LEGACY-X #6 | ANUBIS", "de_anubis", "5x5", "5x5", "offline", 0, 10),
  ],
  fun: [
    server("fun-01", "LEGACY-X FUN | SURF", "surf_kitsune", "fun", "fun_surf", "live", 14, 24),
    server("fun-02", "LEGACY-X FUN | AIM", "aim_map", "fun", "fun_aim", "live", 9, 16),
    server("fun-03", "LEGACY-X FUN | DEATHMATCH", "de_dust2", "fun", "fun_dm", "live", 7, 20),
    server("fun-04", "LEGACY-X FUN | RETAKE", "de_vertigo", "fun", "fun_retake", "live", 18, 18),
  ],
  pro: [
    server("pro-01", "LEGACY-X PRO | MIRAGE", "de_mirage", "pro", "pro", "live", 10, 10),
    server("pro-02", "LEGACY-X PRO | OVERPASS", "de_overpass", "pro", "pro", "waiting", 4, 10),
  ],
}

function serverList(mode: keyof typeof SERVERS) {
  const servers = SERVERS[mode]
  const online = servers.filter((entry) => entry.status !== "offline")
  return { players: online.reduce((sum, entry) => sum + entry.players, 0), onlineServers: online.length, servers }
}

const WEAPONS = ["ak-47", "awp", "m4a4", "usp-s", "desert-eagle", "mp9", "famas"]
function killfeed() {
  const now = Date.now()
  const entries = Array.from({ length: 10 }, (_, index) => ({
    eventId: `mock-kill-${Math.floor(now / 4000)}-${index}`,
    serverId: "5x5-01",
    attackerName: NAMES[(index * 3) % NAMES.length],
    attackerSteamId: null,
    victimName: NAMES[(index * 5 + 2) % NAMES.length],
    victimSteamId: null,
    weapon: WEAPONS[index % WEAPONS.length],
    headshot: index % 3 === 0,
    at: new Date(now - (10 - index) * 3000).toISOString(),
  }))
  return { entries, cursor: null }
}

const REVIEWS = [
  { rating: 5, message: "Best CS2 servers in Mongolia. Ping is low and the admins are fair." },
  { rating: 5, message: "The 5x5 queue fills fast every evening. Love the rank system." },
  { rating: 4, message: "Fun Mode surf is great for warming up before matches." },
  { rating: 5, message: "Skinchanger works perfectly, and the site looks clean." },
  { rating: 4, message: "Tournaments are well organised. Hope there are more of them." },
  { rating: 5, message: "Anti-cheat keeps the games clean. Highly recommend." },
  { rating: 3, message: "Good servers, but evenings can get crowded and the queue takes a while." },
  { rating: 4, message: "Clean website, easy to find a server. The kill feed on top is a nice touch." },
  { rating: 2, message: "Got matched with much stronger players a few times. Hope the ranks balance out." },
  { rating: 5, message: "Played here for a year. Friendly community and the staff actually answer on Discord." },
]

function feedback() {
  return REVIEWS.map((review, index) => ({
    id: `mock-review-${index}`,
    name: NAMES[index + 2],
    rating: review.rating,
    message: review.message,
    date: new Date(Date.now() - index * 86_400_000 * 2).toISOString(),
  }))
}

const HOUR = 3_600_000
const PENALTIES: [type: "ban" | "comm" | "gag", reason: string, term: string, permanent: boolean, unbanned: boolean, ageHours: number, lengthHours: number | null][] = [
  ["ban", "Wallhack detected by anti-cheat", "Permanent", true, false, 5, null],
  ["comm", "Toxic voice chat", "1 day", false, false, 3, 24],
  ["gag", "Chat spam", "6 hours", false, false, 1, 6],
  ["ban", "Leaving competitive matches", "3 days", false, false, 20, 72],
  ["ban", "Aimbot", "Permanent", true, true, 400, null],
  ["comm", "Mic spam", "2 hours", false, false, 30, 2],
  ["gag", "Insulting players", "1 day", false, false, 60, 24],
  ["ban", "Griefing teammates", "7 days", false, false, 240, 168],
  ["comm", "Toxic voice chat", "12 hours", false, false, 90, 12],
  ["ban", "Ban evasion", "Permanent", true, false, 700, null],
  ["gag", "Advertising", "3 days", false, true, 300, 72],
  ["ban", "Exploiting map bugs", "1 day", false, false, 500, 24],
]

function penalties() {
  const now = Date.now()
  return PENALTIES.map(([type, reason, term, isPermanent, isUnbanned, ageHours, lengthHours], index) => ({
    id: `mock-penalty-${index}`,
    type,
    player: NAMES[(index * 7 + 3) % NAMES.length],
    playerSteamId: `765611980000${String(index).padStart(5, "0")}`,
    avatar: "",
    moderationStatus: type === "ban" ? "Banned" : type === "comm" ? "Muted" : "Gag",
    reason,
    term,
    isPermanent,
    isUnbanned,
    admin: "Legacy-X Admin",
    expiresAt: lengthHours === null ? null : new Date(now - ageHours * HOUR + lengthHours * HOUR).toISOString(),
    date: new Date(now - ageHours * HOUR).toISOString(),
  }))
}

function searchPlayers(query: string) {
  const needle = query.trim().toLowerCase()
  const statuses = ["Clear", "Clear", "Banned", "Clear", "Muted", "Clear", "Gag", "Clear"] as const
  const players = NAMES.map((name, index) => ({
    id: `mock-${index}`,
    steamId: `7656119800000${String(index).padStart(4, "0")}`,
    name,
    kills: 2400 - index * 90,
    deaths: 1600 - index * 40,
    kd: 1.5 - index * 0.04,
    headshots: 900 - index * 30,
    matches: 180 - index * 9,
    wins: 110 - index * 6,
    playedHours: 240 - index * 11,
    lastPlayed: new Date(Date.now() - index * 5 * HOUR).toISOString(),
    avatar: "",
    moderationStatus: statuses[index % statuses.length],
  }))
  return { players: players.filter((player) => player.name.toLowerCase().includes(needle) || player.steamId.includes(needle)) }
}

const TEAM_NAMES = ["Steppe Wolves", "Khan Esports", "Ulaanbaatar Five", "Blue Sky", "Gobi Snipers", "Nomad Squad", "Altai Eagles", "Orkhon Kings"]

function tournamentTeam(index: number) {
  return {
    id: `team-${index}`,
    name: TEAM_NAMES[index],
    captainUserId: `mock-${index * 2}`,
    seed: index + 1,
    autoBalanced: index >= 6,
    players: Array.from({ length: 5 }, (_, slot) => {
      const name = NAMES[(index * 5 + slot) % NAMES.length]
      return { userId: `mock-${(index * 5 + slot) % NAMES.length}`, steamId: null, name: `${name}${slot > 0 && index > 2 ? slot : ""}`, avatar: "", checkedIn: true, mode: "team" as const }
    }),
  }
}

function tournament() {
  const now = Date.now()
  const at = (hours: number) => new Date(now + hours * HOUR).toISOString()
  const ref = (index: number) => ({ id: `team-${index}`, name: TEAM_NAMES[index] })
  const match = (id: string, round: string, order: number, a: number | null, b: number | null, scoreA: number | null, scoreB: number | null, status: "live" | "upcoming" | "completed", hours: number, map: string | null) => ({
    id, round, bracketOrder: order,
    teamA: a === null ? null : ref(a), teamB: b === null ? null : ref(b),
    scoreA, scoreB,
    winnerTeamId: status === "completed" && scoreA !== null && scoreB !== null ? `team-${scoreA > scoreB ? a : b}` : null,
    status, scheduledTime: at(hours), map,
    server: { id: "5x5-01", name: "LEGACY-X #1 | MIRAGE", connectAddress: "203.0.113.10:27001" },
  })
  const quarter = [
    match("qf1", "Quarter-finals", 1, 0, 7, 13, 6, "completed", -5, "de_mirage"),
    match("qf2", "Quarter-finals", 2, 3, 4, 11, 13, "completed", -5, "de_inferno"),
    match("qf3", "Quarter-finals", 3, 1, 6, 13, 9, "completed", -4, "de_nuke"),
    match("qf4", "Quarter-finals", 4, 2, 5, 13, 10, "completed", -4, "de_ancient"),
  ]
  const semi = [
    match("sf1", "Semi-finals", 5, 0, 4, 9, 7, "live", -0.5, "de_dust2"),
    match("sf2", "Semi-finals", 6, 1, 2, null, null, "upcoming", 1.5, null),
  ]
  const final = [match("f1", "Final", 7, null, null, null, null, "upcoming", 4, null)]
  return {
    id: "mock-cup",
    name: "Legacy-X Autumn Cup 2026",
    description: "Eight teams, single elimination, best of one until the final. Played on Legacy-X servers with GOTV on every match.",
    phase: "live" as const,
    format: "5v5 · BO1 · Final BO3",
    prizePool: "1,500,000₮",
    startsAt: at(-6),
    registrationClosesAt: at(-26),
    checkInOpensAt: at(-7),
    nextMatchTime: at(1.5),
    maxPlayers: 40,
    teamSize: 5,
    registeredPlayers: 40,
    checkInOpen: false,
    winner: null,
    teams: Array.from({ length: 8 }, (_, index) => tournamentTeam(index)),
    soloPlayers: [],
    matches: [...quarter, ...semi, ...final],
    bracket: [
      { round: "Quarter-finals", matches: quarter },
      { round: "Semi-finals", matches: semi },
      { round: "Final", matches: final },
    ],
    me: null,
  }
}

function tournamentList() {
  const current = tournament()
  const { checkInOpen: _checkInOpen, winner: _winner, teams: _teams, soloPlayers: _solo, matches: _matches, bracket: _bracket, me: _me, ...summary } = current
  return {
    current: summary,
    past: [
      { id: "mock-summer", name: "Legacy-X Summer Cup 2026", startsAt: new Date(Date.now() - 70 * 24 * HOUR).toISOString(), winner: "Khan Esports" },
      { id: "mock-spring", name: "Spring Clash 2026", startsAt: new Date(Date.now() - 160 * 24 * HOUR).toISOString(), winner: "Steppe Wolves" },
      { id: "mock-winter", name: "Winter Showdown 2025", startsAt: new Date(Date.now() - 280 * 24 * HOUR).toISOString(), winner: "Gobi Snipers" },
    ],
  }
}

function notFound(): ApiError {
  return { status: 404, code: "not_found", message: "The requested resource could not be found." }
}

/** Resolves a mock response for a GET request, or throws the API's 404 shape. */
export async function mockResponse(method: string, path: string, query: Query): Promise<unknown> {
  // A short, realistic delay so loading states and entrance animations show.
  await new Promise((resolve) => window.setTimeout(resolve, 250 + Math.random() * 250))
  if (method !== "GET") throw notFound()

  const play = /^\/api\/v1\/play\/(5x5|fun|pro)\/(servers|quick-join)$/.exec(path)
  if (play) {
    const mode = play[1] as keyof typeof SERVERS
    if (play[2] === "servers") return serverList(mode)
    return { server: SERVERS[mode].find((entry) => entry.joinable) ?? null }
  }
  switch (path) {
    case "/api/v1/public/overview":
      return { playersOnline: 91, liveServers: 11, matchesToday: 37, modes: { "5x5": 37, fun: 48, pro: 14 } }
    case "/api/v1/public/competitive/leaderboard":
      return { entries: leaderboard(String(query?.sort ?? "exp")) }
    case "/api/v1/public/killfeed":
      return killfeed()
    case "/api/v1/feedback":
      return feedback()
    case "/api/v1/search/players":
      return searchPlayers(String(query?.query ?? ""))
    case "/api/v1/moderation/penalties":
      return penalties()
    case "/api/v1/tournaments":
      return tournamentList()
    case "/api/v1/tournaments/mock-cup":
      return tournament()
    default:
      throw notFound()
  }
}
