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

/** Every item sold with LX carries what each rental length costs, like the API's; what was bought runs out in a week. */
const mockCustomColours: Record<string, string> = {}
const mockCustomColours2: Record<string, string> = {}
/** A design the player colours (owner request 2026-10-26): grey until they pick, like the API. */
function mockDesign(id: string, name: string, price: number, rarity: number, fx?: string, field: "color" | "glow" = "color") {
  const two = fx === "dual"
  return { id, name, nameMn: name, unlock: "coin" as const, price, requirement: "", owned: mockFrameState.owned.has(id), rarity, featured: id === "name-drift" || id === "trail-inferno", owners: (id.length * 3) % 7, custom: true, [field]: mockCustomColours[id] ?? "#d4d4d4", ...(two ? { twoColours: true, color2: mockCustomColours2[id] ?? "#737373" } : {}), ...(fx ? { fx } : {}) } // palette-exempt: the neutral grey every design starts in
}
function withRentals<T extends Record<string, unknown>>(cosmetics: T): T {
  const rent = (list: unknown) => (Array.isArray(list) ? list.map((item) => {
    const entry = item as { id: string; unlock: string; price: number; owned: boolean }
    if (entry.unlock !== "coin") return item
    const prices = { "1d": Math.round(entry.price * 0.25), "7d": Math.round(entry.price * 0.6), "30d": entry.price, forever: entry.price * 3 }
    return { ...entry, prices, ...(entry.owned ? { expiresAt: new Date(Date.now() + 7 * 86_400_000).toISOString() } : {}) }
  }) : list)
  return Object.fromEntries(Object.entries(cosmetics).map(([key, value]) => [key, rent(value)])) as T
}
const mockPings = new Set<string>(["updates"])
const mockNadeSlots: Record<string, Record<string, string | null>> = {}
const mockFrameState = { equipped: null as string | null, nameColor: null as string | null, nameGlow: null as string | null, smoke: null as string | null, trail: null as string | null, light: null as string | null, kill: null as string | null, flash: null as string | null, he: null as string | null, owned: new Set<string>() }
function mockNameItems(kind: "color" | "glow"): Array<{ id: string; name: string; nameMn: string; unlock: "free" | "coin" | "achievement"; price: number; requirement: string; owned: boolean; rarity: number; featured: boolean; owners: number | null; color?: string; glow?: string; fx?: string; custom?: boolean }> {
  if (kind === "color") return [
    mockDesign("name-solid", "Solid", 150, 1), mockDesign("name-gradient", "Gradient", 400, 2, "gradient"), mockDesign("name-fire", "Fire", 500, 3, "fire"), mockDesign("name-chrome", "Chrome", 500, 3, "chrome"), mockDesign("name-foil", "Foil", 600, 3, "foil"), mockDesign("name-drift", "Drift", 700, 4, "drift"),
    { id: "color-spectrum", name: "Spectrum", nameMn: "Spectrum", unlock: "coin", price: 900, requirement: "", owned: mockFrameState.owned.has("color-spectrum"), rarity: 4, featured: false, owners: 1, color: "#ffffff", fx: "spectrum" }, // palette-exempt: a fixed look
    { id: "color-void", name: "Void", nameMn: "Void", unlock: "achievement", price: 0, requirement: "Reach the Apex rank", owned: false, rarity: 4, featured: false, owners: 0, color: "#a855f7", fx: "void" }, // palette-exempt: an earned look
  ]
  return [
    ...([["glow-halo", "Halo", 300, 1, "halo"], ["glow-breathe", "Breathe", 400, 2, "breathe"], ["glow-neon", "Neon", 450, 2, "neon"], ["glow-spark", "Spark", 450, 2, "spark"], ["glow-aura", "Aura", 500, 3, "aura"], ["glow-flame", "Flame", 500, 3, "flame"], ["glow-electric", "Electric", 500, 3, "electric"], ["glow-pulse", "Pulse", 500, 3, "pulse"]] as const).map(([id, name, price, rarity, fx]) => mockDesign(id, name, price, rarity, fx, "glow")),
    { id: "glow-aurora", name: "Aurora", nameMn: "Aurora", unlock: "achievement", price: 0, requirement: "Clan tournament winner", owned: false, rarity: 4, featured: false, owners: 0, glow: "#2dd4bf", fx: "neon" }, // palette-exempt: an earned look
  ]
}
function mockNameStyle() {
  const colorItem = mockNameItems("color").find((item) => item.id === mockFrameState.nameColor)
  const glowItem = mockNameItems("glow").find((item) => item.id === mockFrameState.nameGlow)
  return colorItem || glowItem ? { color: colorItem?.color ?? null, glow: glowItem?.glow ?? null, colorFx: colorItem?.fx ?? null, glowFx: glowItem?.fx ?? null } : null
}
/** Design preview only: open /shop?founder=1 once, or set localStorage legacyx_mock_founder=1, to see a Genesis member's profile and Appearance. */
function mockIsFounder() {
  try { return typeof localStorage !== "undefined" && localStorage.getItem("legacyx_mock_founder") === "1" } catch { return false }
}
function mockFrames() {
  const list: Array<[string, string, "free" | "coin" | "achievement", number, string]> = [
    ["dragon-ember", "Dragon Ember", "coin", 2500, ""],
    ["frost-royale", "Frost Royale", "coin", 2500, ""],
    ["void-rift", "Void Rift", "coin", 3000, ""],
    ["hologram", "Hologram", "coin", 3500, ""],
    ["celestial-crown", "Celestial Crown", "coin", 4000, ""],
    ["diamond-prestige", "Diamond Prestige", "coin", 5000, ""],
    ["sapphire-shards", "Sapphire Shards", "coin", 1000, ""],
    ["gold-circuit", "Gold Circuit", "coin", 1000, ""],
    ["blossom-branch", "Blossom Branch", "coin", 1000, ""],
    ["jasmine-vine", "Jasmine Vine", "coin", 1000, ""],
    ["iron-chains", "Iron Chains", "coin", 1000, ""],
    ["amethyst-spire", "Amethyst Spire", "coin", 1000, ""],
    ["cyber-cyan", "Cyber Cyan", "coin", 1000, ""],
    ["rose-thorn", "Rose Thorn", "coin", 1000, ""],
    ["hellfire-thorns", "Hellfire Thorns", "coin", 1000, ""],
    ["water-surge", "Water Surge", "coin", 1000, ""],
    ["gilded-thorns", "Gilded Thorns", "coin", 1000, ""],
    ["opal-prism", "Opal Prism", "coin", 1000, ""],
    ["blood-talons", "Blood Talons", "coin", 1000, ""],
    ["golden-blossom", "Golden Blossom", "coin", 1000, ""],
    ["void-orb", "Void Orb", "coin", 1000, ""],
    ["black-regalia", "Black Regalia", "coin", 1000, ""],
    ["marble-angel", "Marble Angel", "coin", 1000, ""],
    ["obsidian-dragon", "Obsidian Dragon", "coin", 1000, ""],
    ["royal-drape", "Royal Drape", "coin", 1000, ""],
    ["seraph-wings", "Seraph Wings", "coin", 1000, ""],
    ["starlight-corners", "Starlight Corners", "free", 0, ""],
    ["red-circuit", "Red Circuit", "free", 0, ""],
    ["charcoal-ring", "Charcoal Ring", "coin", 200, ""],
    ["silent-waves", "Silent Waves", "coin", 200, ""],
    ["neon-violet", "Neon Violet", "coin", 250, ""],
    ["liquid-metal", "Liquid Metal", "coin", 300, ""],
    ["sakura-blossom", "Sakura Blossom", "coin", 350, ""],
    ["blue-lightning", "Blue Lightning", "coin", 350, ""],
    ["crimson-lightning", "Crimson Lightning", "coin", 350, ""],
    ["toxic-lightning", "Green Lightning", "coin", 350, ""],
    ["prism-glass", "Prism Glass", "coin", 400, ""],
    ["film-and-butterflies", "Film and Butterflies", "coin", 400, ""],
    ["planet-orbit", "Planet Orbit", "coin", 700, ""],
    ["ice-crystals", "Ice Crystals", "coin", 700, ""],
    ["golden-moon", "Golden Moon", "achievement", 0, "Reach the Legacy rank"],
    ["angel-wings", "Angel Wings", "achievement", 0, "Reach the Apex rank"],
    ["eclipse-clouds", "Eclipse Clouds", "achievement", 0, "Clan tournament winner"],
    ["glitch", "Glitch", "achievement", 0, "Season 1 winner"],
    ["founder", "Genesis", "achievement", 0, "Genesis pack"],
    ["booster-gold", "Booster Gold", "achievement", 0, "The #1 server booster"],
    ["booster-silver", "Booster Silver", "achievement", 0, "The #2 server booster"],
    ["booster-bronze", "Booster Bronze", "achievement", 0, "The #3 server booster"],
  ]
  const featured = new Set(["planet-orbit", "ice-crystals"])
  return list.map(([id, name, unlock, price, requirement]) => ({ id, name, nameMn: name, unlock, price, requirement, owned: unlock === "free" || mockFrameState.owned.has(id) || (id === "founder" && mockIsFounder()), rarity: unlock === "achievement" ? 4 : unlock === "free" || price <= 250 ? 1 : price <= 500 ? 2 : 3, featured: featured.has(id), owners: unlock === "free" ? null : (id.length * 3) % 7 }))
}
function leaderboard(sort: string) {
  const entries = NAMES.map((username, index) => ({
    user_id: `mock-${index}`,
    steam_id: `7656119800000${String(index).padStart(4, "0")}`,
    username,
    discord_linked: index % 3 !== 1,
    clan_tag: index % 4 === 0 ? "WOLF" : index % 4 === 1 ? "SKY" : null,
    avatar: null,
    frame: ["blue-lightning", "red-circuit", null, "golden-moon", "sakura-blossom", "planet-orbit"][index % 6] ?? null,
    name_style: [{ color: "#cbd5e1", colorFx: "chrome", glow: null, glowFx: null }, { color: "#f5c542", colorFx: "gold", glow: "#fbbf24", glowFx: "aura" }, { color: null, colorFx: null, glow: "#38bdf8", glowFx: "neon" }, { color: "#22d3ee", colorFx: "aurora", glow: null, glowFx: null }, { color: "#a5f3fc", colorFx: "holo", glow: null, glowFx: null }, { color: "#ff9100", colorFx: "fire", glow: "#fb923c", glowFx: "flame" }, { color: null, colorFx: null, glow: "#f43f5e", glowFx: "pulse" }, { color: "#ff9cbc", colorFx: "sakura", glow: null, glowFx: null }][index] ?? null, // palette-exempt: cosmetic data
    rank_id: RANKS[index][0],
    rank_name: RANKS[index][1],
    rank_image_key: null,
    current_exp: 4200 - index * 190,
    exp_change: [18, -12, 9, null, -7, 14][index % 6] ?? null,
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
    teams: status === "offline" || players === 0 ? null : { t: Math.ceil(players / 2), ct: Math.floor(players / 2) },
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

/** A few players wearing frames and name looks, so every page that shows players can be seen with them. */
function mockLook(index: number) {
  const frames = ["blue-lightning", null, "sakura-blossom", "golden-moon", null, "planet-orbit"]
  const names = [{ color: "#cbd5e1", colorFx: "chrome", glow: null, glowFx: null }, null, { color: null, colorFx: null, glow: "#38bdf8", glowFx: "neon" }, { color: "#f5c542", colorFx: "gold", glow: "#fbbf24", glowFx: "aura" }, null, { color: "#ff9100", colorFx: "fire", glow: "#fb923c", glowFx: "flame" }] // palette-exempt: cosmetic data
  return { frame: frames[index % frames.length] ?? null, nameStyle: names[index % names.length] ?? null } // palette-exempt: cosmetic data
}

function feedback() {
  return REVIEWS.map((review, index) => ({
    id: `mock-review-${index}`,
    name: NAMES[index + 2],
    rating: review.rating,
    message: review.message,
    date: new Date(Date.now() - index * 86_400_000 * 2).toISOString(),
    reactions: { like: (index * 3) % 7, love: index % 3, funny: index % 2 },
    myReaction: index === 1 ? "like" : null,
    ...mockLook(index),
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
    admin: "LEGACY-X Admin",
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
    ...mockLook(index),
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
    name: "LEGACY-X Autumn Cup 2026",
    description: "Eight teams, single elimination, best of one until the final. Played on LEGACY-X servers with GOTV on every match.",
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
      { id: "mock-summer", name: "LEGACY-X Summer Cup 2026", startsAt: new Date(Date.now() - 70 * 24 * HOUR).toISOString(), winner: "Khan Esports" },
      { id: "mock-spring", name: "Spring Clash 2026", startsAt: new Date(Date.now() - 160 * 24 * HOUR).toISOString(), winner: "Steppe Wolves" },
      { id: "mock-winter", name: "Winter Showdown 2025", startsAt: new Date(Date.now() - 280 * 24 * HOUR).toISOString(), winner: "Gobi Snipers" },
    ],
  }
}

/* ------------------------------------------------------------------ sign-in (design preview) */

const COLLECTION_PICKS: Array<[string, string, string, string]> = [
  ["AK-47", "weapon_ak47", "Redline", "Classified"], ["AWP", "weapon_awp", "Asiimov", "Covert"], ["M4A4", "weapon_m4a1", "Neo-Noir", "Covert"],
  ["Desert Eagle", "weapon_deagle", "Printstream", "Covert"], ["Glock-18", "weapon_glock", "Fade", "Restricted"], ["USP-S", "weapon_usp_silencer", "Kill Confirmed", "Covert"],
  ["Karambit", "weapon_knife_karambit", "Doppler", "Covert"], ["Butterfly Knife", "weapon_knife_butterfly", "Slaughter", "Covert"],
]
function collectionItems(offset: number, count: number) {
  return Array.from({ length: count }, (_, index) => {
    const [weaponClass, file, skin, rarity] = COLLECTION_PICKS[(offset + index) % COLLECTION_PICKS.length]
    const knife = file.includes("knife")
    return { slot: knife ? "knife" : "weapon", weaponClass, name: `${knife ? "★ " : ""}${weaponClass} | ${skin}`, imageUrl: `${ICON}/${file}_png.png`, rarity }
  })
}
const mockCollections = () => [
  { id: "col-1", name: "Steppe Fire", description: "Red and orange across the whole loadout.", author: { steamId: "76561198000000001", username: "Temuujin", avatar: "" }, applies: 842, likes: 311, liked: true, items: collectionItems(0, 7), days: 3 },
  { id: "col-2", name: "Clean Slate", description: "Quiet, high contrast. Nothing loud.", author: { steamId: "76561198000000002", username: "Nomin", avatar: "" }, applies: 615, likes: 244, liked: false, items: collectionItems(2, 6), days: 9 },
  { id: "col-3", name: "Gobi Sniper Kit", description: "AWP first. The rest follows.", author: { steamId: "76561198000000003", username: "Bayar", avatar: "" }, applies: 377, likes: 120, liked: false, items: collectionItems(1, 5), days: 14 },
  { id: "col-4", name: "Ice Pack", description: "Cold blues and whites.", author: { steamId: "76561198000000004", username: "Oyuna", avatar: "" }, applies: 158, likes: 64, liked: false, items: collectionItems(4, 6), days: 1 },
  { id: "col-5", name: "Pistol Round Only", description: "Every pistol, one theme.", author: { steamId: "76561198000000005", username: "Ganzo", avatar: "" }, applies: 96, likes: 31, liked: false, items: collectionItems(3, 4), days: 22 },
  { id: "col-6", name: "Knife Drawer", description: "Four knives for four moods.", author: { steamId: "mock-me", username: "Legacy Player", avatar: "" }, applies: 12, likes: 5, liked: false, items: collectionItems(6, 2), days: 5 },
]
function skinCollections(query: Query) {
  const sort = String(query?.sort ?? "popular")
  const search = String(query?.query ?? "").toLowerCase()
  let list = mockCollections().filter((entry) => !search || `${entry.name} ${entry.author.username}`.toLowerCase().includes(search))
  if (sort === "mine") list = list.filter((entry) => entry.author.steamId === "mock-me")
  list = [...list].sort((a, b) => (sort === "new" ? a.days - b.days : b.applies - a.applies))
  return { collections: list.map(({ days, ...entry }) => ({ ...entry, itemCount: entry.items.length, mine: entry.author.steamId === "mock-me", createdAt: new Date(Date.now() - days * 24 * HOUR).toISOString() })) }
}

const MOCK_TOKEN = "mock-session"

function signedIn() {
  try {
    return window.localStorage.getItem("legacyx_access_token") === MOCK_TOKEN
  } catch {
    return false
  }
}

const MOCK_USER = {
  id: "mock-me",
  steamId: "76561198000009999",
  username: "LegacyTester",
  avatar: "",
  role: "Player",
  moderationStatus: "Clear",
}

/* ------------------------------------------------------------------ skinchanger */

const ICON = "https://raw.githubusercontent.com/ByMykel/counter-strike-image-tracker/main/static/panorama/images/econ/weapons/base_weapons"

/** weapon_class, file name of its base render, buy-menu group. */
const FIREARMS: [string, string, string][] = [
  ["Glock-18", "glock", "Pistols"], ["USP-S", "usp_silencer", "Pistols"], ["P2000", "hkp2000", "Pistols"], ["P250", "p250", "Pistols"],
  ["Desert Eagle", "deagle", "Pistols"], ["Dual Berettas", "elite", "Pistols"], ["Five-SeveN", "fiveseven", "Pistols"], ["Tec-9", "tec9", "Pistols"],
  ["CZ75-Auto", "cz75a", "Pistols"], ["R8 Revolver", "revolver", "Pistols"],
  ["MAC-10", "mac10", "SMGs"], ["MP9", "mp9", "SMGs"], ["MP7", "mp7", "SMGs"], ["MP5-SD", "mp5sd", "SMGs"], ["UMP-45", "ump45", "SMGs"], ["P90", "p90", "SMGs"], ["PP-Bizon", "bizon", "SMGs"],
  ["AK-47", "ak47", "Rifles"], ["M4A4", "m4a1", "Rifles"], ["M4A1-S", "m4a1_silencer", "Rifles"], ["FAMAS", "famas", "Rifles"], ["Galil AR", "galilar", "Rifles"], ["AUG", "aug", "Rifles"], ["SG 553", "sg556", "Rifles"],
  ["AWP", "awp", "Sniper Rifles"], ["SSG 08", "ssg08", "Sniper Rifles"], ["SCAR-20", "scar20", "Sniper Rifles"], ["G3SG1", "g3sg1", "Sniper Rifles"],
  ["Nova", "nova", "Heavy"], ["XM1014", "xm1014", "Heavy"], ["MAG-7", "mag7", "Heavy"], ["Sawed-Off", "sawedoff", "Heavy"], ["Negev", "negev", "Heavy"], ["M249", "m249", "Heavy"],
  ["Zeus x27", "taser", "Equipment"],
]
const KNIVES: [string, string][] = [["Knife", "knife"], ["Karambit", "knife_karambit"], ["Butterfly Knife", "knife_butterfly"], ["M9 Bayonet", "knife_m9_bayonet"], ["Talon Knife", "knife_widowmaker"], ["Skeleton Knife", "knife_skeleton"]]
const GLOVES = ["Sport Gloves", "Driver Gloves", "Specialist Gloves", "Moto Gloves"]
const SKIN_NAMES = ["Redline", "Asiimov", "Neon Rider", "Vulcan", "Fade", "Slate", "Printstream", "Case Hardened", "Bloodsport", "Phantom Disruptor"]
const RARITIES = ["Covert", "Classified", "Restricted", "Mil-Spec Grade", "Industrial Grade", "Consumer Grade"]

type MockItem = { id: string; external_key: string; category: string; weapon_class: string | null; display_name: string; weapon_defindex: null; paint_id: number | null; model: null; image_key: null; image_url: string | null; metadata: Record<string, unknown> }

function item(id: string, category: string, weaponClass: string | null, name: string, image: string | null, metadata: Record<string, unknown> = {}, paint: number | null = null): MockItem {
  return { id, external_key: id, category, weapon_class: weaponClass, display_name: name, weapon_defindex: null, paint_id: paint, model: null, image_key: null, image_url: image, metadata }
}

const firearmModel = ([weaponClass, file, group]: [string, string, string]) => item(`weapon-${file}`, "weapon", weaponClass, weaponClass, `${ICON}/weapon_${file}_png.png`, { weaponGroup: group })
const knifeModel = ([name, file]: [string, string]) => item(`knife-${file}`, "knife", name, name, `${ICON}/weapon_${file}_png.png`)
const gloveModel = (name: string) => item(`glove-${name.toLowerCase().replace(/\s+/g, "-")}`, "glove", name, name, null)

/** Skins for one model: the model's render with a rarity, so the picker shows real rarity bars. */
function skinsFor(weaponClass: string, category: "weapon_skin" | "knife" | "glove") {
  const firearm = FIREARMS.find(([name]) => name === weaponClass)
  const knife = KNIVES.find(([name]) => name === weaponClass)
  const image = firearm ? `${ICON}/weapon_${firearm[1]}_png.png` : knife ? `${ICON}/weapon_${knife[1]}_png.png` : null
  const prefix = category === "weapon_skin" ? "" : "★ "
  return SKIN_NAMES.map((skin, index) => item(
    `skin-${weaponClass.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${index}`,
    category,
    weaponClass,
    `${prefix}${weaponClass} | ${skin}`,
    image,
    { rarity: category === "weapon_skin" ? RARITIES[index % RARITIES.length] : "Covert", minWear: 0, maxWear: 1 },
    100 + index,
  ))
}

function catalog(query: Record<string, string | number | boolean | undefined | null> | undefined) {
  const category = String(query?.category ?? "")
  const weaponClass = query?.weaponClass ? String(query.weaponClass) : null
  const search = String(query?.query ?? "").toLowerCase()
  const limit = Number(query?.limit ?? 36)
  const offset = Number(query?.offset ?? 0)
  let items: MockItem[] = []
  if (category === "weapon") items = FIREARMS.map(firearmModel)
  else if (category === "knife") items = weaponClass ? skinsFor(weaponClass, "knife") : KNIVES.map(knifeModel)
  else if (category === "glove") items = weaponClass ? skinsFor(weaponClass, "glove") : GLOVES.map(gloveModel)
  else if (category === "weapon_skin") items = skinsFor(weaponClass ?? "AK-47", "weapon_skin")
  else if (category === "agent") items = ["Sir Bloody Darryl", "Cmdr. Mae", "Number K", "Lt. Commander Ricksaw"].map((name, index) => item(`agent-${index}`, "agent", null, name, null, { rarity: index % 2 ? "Classified" : "Covert", team: query?.team === "ct" ? "Counter-Terrorist" : "Terrorist" }))
  else if (category === "music_kit") items = ["Neck Deep", "Amon Tobin", "Knock2", "The Verkkars"].map((name, index) => item(`music-${index}`, "music_kit", null, `Music Kit | ${name}`, null))
  else if (category === "pin") items = ["Dust II Pin", "Mirage Pin", "Guardian Pin", "Howl Pin"].map((name, index) => item(`pin-${index}`, "pin", null, name, null))
  else if (category === "sticker" || category === "charm") items = ["LEGACY-X", "Mongolia", "Headshot", "Clutch King"].map((name, index) => item(`${category}-${index}`, category, null, `${category === "sticker" ? "Sticker" : "Charm"} | ${name}`, null))
  const matching = search ? items.filter((entry) => entry.display_name.toLowerCase().includes(search)) : items
  return { data: matching.slice(offset, offset + limit), pagination: { limit, offset, total: matching.length } }
}

function loadout() {
  const entry = (skin: MockItem, slot: string, slotKey: string, team: string) => ({
    catalog_item_id: skin.id,
    slot,
    slot_key: slotKey,
    team_scope: team,
    options: { wear: 0.02, seed: 0, statTrak: false, stickers: [] },
    skinchanger_catalog_items: skin,
    resolved_accessories: [],
  })
  const skin = (weaponClass: string, index: number, category: "weapon_skin" | "knife" = "weapon_skin") => skinsFor(weaponClass, category)[index]
  return {
    loadout: {
      version: 3,
      updated_at: new Date().toISOString(),
      skinchanger_loadout_entries: [
        entry(skin("AK-47", 0), "weapon", "weapon:ak-47", "t"),
        entry(skin("M4A1-S", 6), "weapon", "weapon:m4a1-s", "ct"),
        entry(skin("AWP", 1), "weapon", "weapon:awp", "all"),
        entry(skin("Desert Eagle", 2), "weapon", "weapon:desert-eagle", "all"),
        entry(skin("Glock-18", 4), "weapon", "weapon:glock-18", "t"),
        entry(skin("USP-S", 3), "weapon", "weapon:usp-s", "ct"),
        entry(skin("Karambit", 4, "knife"), "knife", "knife:karambit", "t"),
      ],
    },
  }
}

/* ------------------------------------------------------------------ profile */

/** Sample Respect for the sample Owner; it resets when the page is reloaded. */
const OWNER_RESPECT_BASE = 1284
let ownerRespect = { count: OWNER_RESPECT_BASE, given: false }

function profileOverview(identity: string) {
  const own = identity === "me" || identity === MOCK_USER.id || identity === MOCK_USER.steamId
  if (own && !signedIn()) throw unauthorized()
  // A profile address can also be a player's name (/profile/Temuulen), like the real API accepts.
  const byName = NAMES.findIndex((candidate) => candidate.toLowerCase() === identity.toLowerCase())
  const found = byName >= 0 ? byName : NAMES.findIndex((_, i) => identity.endsWith(String(i).padStart(4, "0")))
  const variant = own ? 0 : Math.max(0, found) + 1
  const index = own ? -1 : Math.max(0, found)
  const name = own ? MOCK_USER.username : NAMES[index]
  const [rankId, rankName] = own ? [7, "Operator III"] : RANKS[index]
  const exp = own ? 1180 : 4200 - index * 190
  const maps = ["de_mirage", "de_inferno", "de_dust2", "de_ancient", "de_nuke", "de_anubis"]
  const results = ["Win", "Win", "Loss", "Win", "Win", "Loss", "Win", "Loss", "Win", "Win"]
  return {
    user: { id: own ? MOCK_USER.id : `mock-${index}`, steamId: own ? MOCK_USER.steamId : byName >= 0 ? `7656119800000${String(index).padStart(4, "0")}` : identity, username: name, avatar: "", role: own ? "Player" : index === 0 ? "Owner" : "Player", memberSince: new Date(Date.now() - 400 * 24 * HOUR).toISOString(), steamBackground: null, steamMedia: null, frame: own ? (mockIsFounder() ? "founder" : mockFrameState.equipped) : null, nameStyle: own ? mockNameStyle() : null, banner: own && mockIsFounder() ? "goldfoil" : null, title: own && mockIsFounder() ? "Genesis" : null, founder: own && mockIsFounder() ? 1 : null },
    viewer: { isOwner: own, isStaff: false },
    // Only the sample Owner has Respect and links, like the real Owner profile will.
    ...(index === 0 ? {
      respect: ownerRespect,
      message: "LEGACY-X will always be on top.",
      team: [
        { steamId: "7656119800000001", username: NAMES[1], avatar: "", role: "Manager" },
        { steamId: "7656119800000002", username: NAMES[2], avatar: "", role: "Admin" },
        { steamId: "7656119800000005", username: NAMES[5], avatar: "", role: "Developer" },
        { steamId: "7656119800000006", username: NAMES[6], avatar: "", role: "Designer" },
      ],
      updates: [
        { id: "mock-update-1", title: "CS2 update installed on every server", at: new Date(Date.now() - 3 * HOUR).toISOString() },
        { id: "mock-update-2", title: "New Compare page for players", at: new Date(Date.now() - 2 * 24 * HOUR).toISOString() },
        { id: "mock-update-3", title: "Tournament check-in is open", at: new Date(Date.now() - 6 * 24 * HOUR).toISOString() },
      ],
      links: [
        { url: "https://instagram.com/example" },
        { url: "https://facebook.com/example" },
        { url: "https://discord.gg/example" },
        { url: "https://example.com", label: "Website" },
      ],
    } : {}),
    visibility: own ? { stats: true, matches: true, faceit: true, loadout: true } : null,
    hidden: [],
    competitive: { exp, rankId, rankName, rankImageKey: null, currentRankMinExp: Math.floor(exp / 200) * 200 - 100, nextRankName: "Vanguard I", nextRankMinExp: Math.floor(exp / 200) * 200 + 220, proLeagueUnlocked: false, position: own ? 42 : index + 1, expLimits: own ? { day: { used: 150, cap: 150, resetsAt: new Date(Date.now() + 6 * 3_600_000).toISOString() }, week: { used: 380, cap: 600, resetsAt: new Date(Date.now() + 4 * 24 * 3_600_000).toISOString() } } : null },
    lastPlayedAt: new Date(Date.now() - 3 * HOUR).toISOString(),
    trust: { steamAccountCreatedAt: new Date(Date.now() - 6.5 * 365 * 24 * HOUR).toISOString(), activePenalty: null },
    // Each sample player gets different numbers, so comparing two of them shows a real difference.
    stats: [
      { key: "matches", label: "Matches", value: 184 - variant * 11 + ((variant * 17) % 40), average: 62, percentile: 94 },
      { key: "winRate", label: "Win rate", value: 58 + ((variant * 7) % 13) - 6, average: 49, percentile: 78 },
      { key: "kd", label: "K/D", value: Number((1.27 + (((variant * 5) % 9) - 4) * 0.07).toFixed(2)), average: 1.04, percentile: 71 },
      { key: "hs", label: "Headshot %", value: 46 + ((variant * 11) % 17) - 8, average: 41, percentile: 64 },
      { key: "avgKills", label: "Avg. kills", value: 19 + ((variant * 3) % 7) - 3, average: 17.4, percentile: 38 },
    ],
    recentMatches: results.map((result, i) => ({
      map: maps[i % maps.length],
      result,
      score: result === "Win" ? `13 : ${6 + (i % 5)}` : `${7 + (i % 4)} : 13`,
      kd: (0.8 + ((i * 37) % 90) / 100).toFixed(2),
      playedAt: new Date(Date.now() - (i + 1) * 9 * HOUR).toISOString(),
      expDelta: result === "Win" ? (i === 1 ? 5 : i === 3 ? 0 : 18 + (i % 7)) : -(12 + (i % 5)),
      expBreakdown: i === 1 ? { limited: "daily" } : i === 3 && result === "Win" ? { limited: "weekly" } : null,
      matchId: `mock-${variant}-${i}`,
      expAfter: 4200 + variant * 130 - i * 15 + (i % 3) * 22,
    })),
    // Per-map results with different sizes and rates, including a map with too few matches to rank.
    maps: [["de_mirage", 34, 24], ["de_inferno", 28, 15], ["de_dust2", 31, 16], ["de_ancient", 12, 9], ["de_nuke", 9, 3], ["de_anubis", 6, 2], ["de_overpass", 2, 1]].map(([map, matches, wins], i) => { const played = Math.max(2, (matches as number) + ((variant * (i + 2)) % 7) - 3); const won = Math.min(played, Math.max(0, (wins as number) + ((variant * (i + 3)) % 5) - 2)); return { map: map as string, matches: played, wins: won, winRate: Math.round((won / played) * 100) } }),
    penalties: [],
    penaltyCount: 0,
    loadout: {
      side: "t",
      items: [
        { key: "knife", label: "Knife", name: "★ Karambit | Fade", image: `${ICON}/weapon_knife_karambit_png.png` },
        { key: "rifle", label: "AK-47", name: "AK-47 | Redline", image: `${ICON}/weapon_ak47_png.png` },
        { key: "awp", label: "AWP", name: "AWP | Asiimov", image: `${ICON}/weapon_awp_png.png` },
        { key: "pistol", label: "Glock-18", name: "Glock-18 | Fade", image: `${ICON}/weapon_glock_png.png` },
      ],
    },
    staff: null,
    presence: own ? null : { serverId: "5x5-01", serverName: "LEGACY-X #1 | MIRAGE", connectAddress: "203.0.113.10:27001", map: "de_mirage" },
    discordLinked: index % 3 !== 1,
    discordBoosting: index % 3 === 0,
    boosterPlace: index === 0 ? 1 : index === 3 ? 2 : index === 6 ? 3 : null,
    clan: index % 4 === 0 ? { id: "c1", number: 1, name: "Steppe Wolves", tag: "WOLF" } : null,
  }
}

function faceit(identity: string) {
  return {
    linked: true,
    playerId: `faceit-${identity}`,
    nickname: identity === "me" ? "LegacyTester" : "legacy_player",
    avatar: "",
    country: "mn",
    region: "EU",
    elo: 1845,
    level: 8,
    faceitUrl: "https://www.faceit.com/",
    stats: { matches: 612, wins: 331, winRate: 54, averageKd: 1.14, averageKills: 18, headshots: 49 },
  }
}

function unauthorized(): ApiError {
  return { status: 401, code: "unauthorized", message: "You are not logged in. Please sign in and try again." }
}

function notFound(): ApiError {
  return { status: 404, code: "not_found", message: "The requested resource could not be found." }
}

/** Resolves a mock response for a GET request, or throws the API's 404 shape. */
const MOCK_CLAN_LOOK_ITEMS = [
  { id: "tag-custom", kind: "tag_color", name: "Solid", price: 150, rarity: 1, color: "#d4d4d4", custom: true },
  { id: "tag-gradient", kind: "tag_color", name: "Gradient", price: 350, rarity: 2, color: "#d4d4d4", fx: "gradient", custom: true },
  { id: "tag-chrome", kind: "tag_color", name: "Chrome", price: 350, rarity: 2, color: "#d4d4d4", fx: "chrome", custom: true },
  { id: "tag-inferno", kind: "tag_color", name: "Fire", price: 500, rarity: 3, color: "#d4d4d4", fx: "fire", custom: true },
  { id: "tag-goldfoil", kind: "tag_color", name: "Foil", price: 500, rarity: 3, color: "#d4d4d4", fx: "foil", custom: true },
  { id: "tag-aurora", kind: "tag_color", name: "Drift", price: 600, rarity: 4, color: "#d4d4d4", fx: "drift", custom: true },
  { id: "clan-glow-custom", kind: "tag_glow", name: "Neon", price: 250, rarity: 1, glow: "#d4d4d4", fx: "neon", custom: true },
  { id: "clan-glow-halo", kind: "tag_glow", name: "Halo", price: 250, rarity: 1, glow: "#d4d4d4", fx: "halo", custom: true },
  { id: "clan-glow-breathe", kind: "tag_glow", name: "Breathe", price: 350, rarity: 2, glow: "#d4d4d4", fx: "breathe", custom: true },
  { id: "glow-pulse", kind: "tag_glow", name: "Pulse", price: 400, rarity: 2, glow: "#d4d4d4", fx: "pulse", custom: true },
  { id: "clan-glow-spark", kind: "tag_glow", name: "Spark", price: 400, rarity: 2, glow: "#d4d4d4", fx: "spark", custom: true },
  { id: "glow-flame", kind: "tag_glow", name: "Flame", price: 450, rarity: 3, glow: "#d4d4d4", fx: "flame", custom: true },
  { id: "glow-electric", kind: "tag_glow", name: "Electric", price: 450, rarity: 3, glow: "#d4d4d4", fx: "electric", custom: true },
  { id: "glow-royal", kind: "tag_glow", name: "Aura", price: 600, rarity: 4, glow: "#d4d4d4", fx: "aura", custom: true },
  { id: "back-custom", kind: "backdrop", name: "Gradient", price: 300, rarity: 2, from: "#d4d4d4", to: "#0a0a0a", custom: true },
  { id: "page-custom-slats", kind: "page", name: "Micro Slats", price: 1500, rarity: 4, from: "#d4d4d4", to: "#0a0a0a", effect: "slats", custom: true },
  { id: "page-custom-waves", kind: "page", name: "Pattern Waves", price: 1500, rarity: 4, from: "#d4d4d4", to: "#0a0a0a", effect: "waves", custom: true },
  { id: "page-custom-dots", kind: "page", name: "Dot Field", price: 1300, rarity: 4, from: "#d4d4d4", to: "#0a0a0a", effect: "dots", custom: true },
  { id: "page-custom-aurora", kind: "page", name: "Aurora Veil", price: 1400, rarity: 4, from: "#d4d4d4", to: "#0a0a0a", effect: "aurora", custom: true },
  { id: "page-custom-threads", kind: "page", name: "Silk Threads", price: 1300, rarity: 4, from: "#d4d4d4", to: "#0a0a0a", effect: "threads", custom: true },
  { id: "page-custom-particles", kind: "page", name: "Star Dust", price: 1300, rarity: 4, from: "#d4d4d4", to: "#0a0a0a", effect: "particles", custom: true },
  { id: "page-custom-lightning", kind: "page", name: "Lightning", price: 1500, rarity: 4, from: "#d4d4d4", to: "#0a0a0a", effect: "lightning", custom: true },
  { id: "page-custom-rays", kind: "page", name: "Light Rays", price: 1400, rarity: 4, from: "#d4d4d4", to: "#0a0a0a", effect: "rays", custom: true },
  { id: "page-custom-lines", kind: "page", name: "Wave Lines", price: 1100, rarity: 4, from: "#d4d4d4", to: "#0a0a0a", effect: "lines", custom: true },
  { id: "page-custom-plasma", kind: "page", name: "Plasma", price: 1500, rarity: 4, from: "#d4d4d4", to: "#0a0a0a", effect: "plasma", custom: true },
  { id: "page-custom-starfield", kind: "page", name: "Warp Speed", price: 1500, rarity: 4, from: "#d4d4d4", to: "#0a0a0a", effect: "starfield", custom: true },
  { id: "page-custom-matrix", kind: "page", name: "Code Rain", price: 1400, rarity: 4, from: "#d4d4d4", to: "#0a0a0a", effect: "matrix", custom: true },
  { id: "page-custom-orbs", kind: "page", name: "Lava Lamp", price: 1300, rarity: 4, from: "#d4d4d4", to: "#0a0a0a", effect: "orbs", custom: true },
  { id: "page-custom-grid", kind: "page", name: "Retro Grid", price: 1500, rarity: 4, from: "#d4d4d4", to: "#0a0a0a", effect: "grid", custom: true },
  { id: "page-custom-embers", kind: "page", name: "Embers", price: 1400, rarity: 4, from: "#d4d4d4", to: "#0a0a0a", effect: "embers", custom: true },
  { id: "page-custom-vortex", kind: "page", name: "Galaxy", price: 1600, rarity: 4, from: "#d4d4d4", to: "#0a0a0a", effect: "vortex", custom: true },
  { id: "page-custom-hex", kind: "page", name: "Honeycomb", price: 1300, rarity: 4, from: "#d4d4d4", to: "#0a0a0a", effect: "hex", custom: true },
] // palette-exempt: clan look colours chosen by the clan
const mockClanLooks = { custom: {} as Record<string, { a: string; b: string | null }>, owned: new Set<string>(), worn: { tag_color: null as string | null, tag_glow: null as string | null, backdrop: null as string | null, page: null as string | null } }

const MOCK_CLANS = [
  { id: "c1", number: 1, name: "Steppe Wolves", tag: "WOLF", logo: "", thumbnail: "data:image/jpeg;base64,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", currentPlayers: 7, maxPlayers: 10, region: "Mongolia", joinMode: "open" },
  { id: "c2", number: 2, name: "Blue Sky Five", tag: "SKY", logo: "", thumbnail: null, currentPlayers: 10, maxPlayers: 10, region: "Mongolia", joinMode: "open" },
  { id: "c3", number: 3, name: "Night Riders", tag: "NRDR", logo: "", thumbnail: "data:image/jpeg;base64,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", currentPlayers: 3, maxPlayers: 10, region: "Mongolia", joinMode: "request", recruit: { questions: ["How many hours do you play?", "Do you have a microphone?"] } },
]

/** Notification settings for the session, so the switches in Settings really toggle. */
let mockCreatorApplication: { status: "pending" | "approved" | "declined"; note: string; createdAt: string; decidedAt: string | null } | null = null
const mockChat: Array<{ id: string; body: string; createdAt: string; author: { steamId: string; name: string; avatar: string | null; frame: string | null; nameStyle: null; staffRole: "OWNER" | "MANAGER" | "ADMIN" | null } }> = [
  { id: "c1", body: "gg wp everyone, Mirage was close", createdAt: new Date(Date.now() - 14 * 60_000).toISOString(), author: { steamId: "76561198000000001", name: "xBataa", avatar: null, frame: null, nameStyle: null, staffRole: null } },
  { id: "c2", body: "anyone for 5x5 at 8.30?", createdAt: new Date(Date.now() - 9 * 60_000).toISOString(), author: { steamId: "76561198000000004", name: "Enkh.", avatar: null, frame: null, nameStyle: null, staffRole: null } },
  { id: "c3", body: "Servers are up. Report cheaters with the Reviews page.", createdAt: new Date(Date.now() - 4 * 60_000).toISOString(), author: { steamId: "76561198000000005", name: "Gansukh", avatar: null, frame: null, nameStyle: null, staffRole: "ADMIN" } },
]
let notificationPrefs = { tournaments: true, rankChanges: false, penalties: true }

let mockCreatorAbout = "CS2 streams every evening, Mongolian commentary"

/** Design preview only: the links a clan leader saved on the mock clan page. */
let mockClanLinks: Record<string, string> = { discord: "https://discord.gg/legacyx", youtube: "https://www.youtube.com/@legacyx" }

export async function mockResponse(method: string, path: string, query: Query, body?: unknown): Promise<unknown> {
  // A short, realistic delay so loading states and entrance animations show.
  await new Promise((resolve) => window.setTimeout(resolve, 250 + Math.random() * 250))
  if (path === "/api/v1/auth/logout") {
    try { window.localStorage.removeItem("legacyx_access_token") } catch { /* storage blocked */ }
    return undefined
  }
  if (path === "/api/v1/creators/me/about" && method === "PUT") { mockCreatorAbout = String((body as { bio: string }).bio); return { about: mockCreatorAbout } }
  if (path === "/api/v1/creators/applications/me") {
    // Design preview only: set localStorage legacyx_mock_creator=1 to see a creator's "Edit my about".
    const creator = (() => { try { return typeof localStorage !== "undefined" && localStorage.getItem("legacyx_mock_creator") === "1" } catch { return false } })()
    return { isCreator: creator, about: creator ? mockCreatorAbout : null, application: mockCreatorApplication, canApplyAgainAt: null }
  }
  if (path === "/api/v1/creators/applications" && method === "POST") { mockCreatorApplication = { status: "pending", note: "", createdAt: new Date().toISOString(), decidedAt: null }; return { id: "ca1", status: "pending" } }
  if (path === "/api/v1/staff/creators/applications" && method === "GET") return { applications: mockCreatorApplication ? [] : [{ id: "ca2", bio: "Mirage and Dust II clips with Mongolian commentary.", links: { youtube: "https://youtube.com/@clips", tiktok: "https://tiktok.com/@clips" }, createdAt: new Date(Date.now() - 3 * HOUR).toISOString(), player: { steamId: "76561198000000009", username: "ClipMaker", avatar: null } }] }
  if (path.startsWith("/api/v1/staff/creators/applications/") && method === "PUT") return { id: path.split("/").pop(), status: (body as { decision: string }).decision === "approve" ? "approved" : "declined" }
  if (path === "/api/v1/staff/shop/orders" && method === "GET") return { orders: [
    { id: "o1", productId: "p1", productName: "Genesis pack", productKind: "founder", grantsLx: 0, quantity: 1, unitPriceMnt: 30000, status: "new", createdAt: new Date(Date.now() - 2 * HOUR).toISOString(), phone: "99112233", note: "Call after 6 pm", player: { steamId: "76561198000000001", username: "xBataa" } },
    { id: "o2", productId: "p2", productName: "LEGACY-X NFC charm", productKind: "charm", grantsLx: 0, quantity: 2, unitPriceMnt: 12000, status: "contacted", createdAt: new Date(Date.now() - 20 * HOUR).toISOString(), phone: "88001122", note: "", player: { steamId: "76561198000000004", username: "Enkh." } },
  ] }
  if (path === "/api/v1/staff/shop/products" && method === "GET") return { products: [
    { id: "p1", slug: "genesis", name: "Genesis pack", description: "", kind: "founder", priceMnt: 30000, imageUrl: null, stock: 500, grantsLx: 0, enabled: true, sort: 0 },
    { id: "p2", slug: "nfc-charm", name: "LEGACY-X NFC charm", description: "", kind: "charm", priceMnt: 12000, imageUrl: null, stock: 40, grantsLx: 0, enabled: true, sort: 1 },
    { id: "p3", slug: "lx-5000", name: "5,000 LX", description: "", kind: "lx", priceMnt: 15000, imageUrl: null, stock: 0, grantsLx: 5000, enabled: false, sort: 2 },
  ] }
  if (path === "/api/v1/moderation/roster") {
    const needle = String(query?.query ?? "").trim().toLowerCase()
    return { players: NAMES.map((name, index) => ({ steamId: `7656119800000${String(index).padStart(4, "0")}`, name, avatar: "", level: 24 - index })).filter((player) => !needle || player.name.toLowerCase().includes(needle)) }
  }
  if (path === "/api/v1/staff/settings" && method === "GET") return { settings: [
    { key: "play.leave_window_hours", group: "Play", label: "Leave counting window", hint: "Leaves of ranked matches are counted over this many hours.", unit: "hours", def: 24, min: 1, max: 168, value: 24, changed: false, updatedAt: null },
    { key: "play.leave_block_from", group: "Play", label: "Block from the Nth leave", hint: "Earlier leaves only cost EXP; this one and later ones also block playing.", unit: "leaves", def: 3, min: 1, max: 20, value: 2, changed: true, updatedAt: new Date().toISOString() },
    { key: "play.leave_block_step_minutes", group: "Play", label: "Block length per leave", hint: "The block starts at this many minutes and grows by it with every further leave.", unit: "minutes", def: 30, min: 1, max: 1440, value: 30, changed: false, updatedAt: null },
    { key: "checks.code_minutes", group: "Checks", label: "Check code lifetime", hint: "How long the one-time code works after staff ask for a check.", unit: "minutes", def: 60, min: 5, max: 1440, value: 60, changed: false, updatedAt: null },
    { key: "checks.retention_days", group: "Checks", label: "Keep checks for", hint: "Finished checks and their results are removed after this long.", unit: "days", def: 30, min: 1, max: 365, value: 30, changed: false, updatedAt: null },
    { key: "checks.max_downloads", group: "Checks", label: "Downloads per check", hint: "How many times one code may download the checker.", unit: "times", def: 3, min: 1, max: 20, value: 3, changed: false, updatedAt: null },
    { key: "creators.reapply_days", group: "Creators", label: "Apply again after a decline", hint: "A player whose creator application was declined may ask again after this long.", unit: "days", def: 7, min: 0, max: 365, value: 7, changed: false, updatedAt: null },
  ] }
  if (path.startsWith("/api/v1/staff/settings/") && method === "PUT") return { key: path.split("/").pop(), value: (body as { value: number | null }).value ?? 0 }
  if (path === "/api/v1/staff/cosmetics" && method === "GET") return { items: [
    { id: "frost-ring", kind: "frame", nameEn: "Frost Ring", nameMn: "Мөсөн цагираг", unlock: "coin", price: 200, requirement: "", sort: 4, enabled: true, owners: 38 },
    { id: "blood-moon", kind: "frame", nameEn: "Blood Moon", nameMn: "Цус сар", unlock: "coin", price: 300, requirement: "", sort: 7, enabled: true, owners: 12 },
    { id: "golden-crown", kind: "frame", nameEn: "Golden Crown", nameMn: "Алтан титэм", unlock: "achievement", price: 0, requirement: "Reach the Legacy rank", sort: 13, enabled: true, owners: 2 },
    { id: "red-dragon", kind: "frame", nameEn: "Red Dragon", nameMn: "Улаан луу", unlock: "free", price: 0, requirement: "", sort: 1, enabled: false, owners: 120 },
    { id: "ember", kind: "name_color", nameEn: "Ember", nameMn: "Нүүрс", unlock: "coin", price: 150, requirement: "", sort: 2, enabled: true, owners: 21 },
  ] }
  if (path.startsWith("/api/v1/staff/cosmetics/") && method === "PUT") return { id: path.split("/").pop() }
  if (path.startsWith("/api/v1/staff/clans/") && path.endsWith("/transfer") && method === "POST") return undefined
  if (path === "/api/v1/public/chat") return { messages: mockChat }
  if (path === "/api/v1/chat" && method === "POST") {
    const message = { id: `c${mockChat.length + 1}`, body: String((body as { body: string }).body), createdAt: new Date().toISOString(), author: { steamId: "76561198000000000", name: "LegacyTester", avatar: null, frame: null, nameStyle: null, staffRole: "OWNER" as const } }
    mockChat.push(message)
    return { message }
  }
  if (path.startsWith("/api/v1/staff/chat/") && method === "DELETE") { const at = mockChat.findIndex((entry) => entry.id === path.split("/").pop()); if (at >= 0) mockChat.splice(at, 1); return undefined }
  if (path === "/api/v1/play/status") return { leavesToday: 0, cooldown: null, next: { cooldownMinutes: 0 } }
  if (path === "/api/v1/notifications" && method === "GET") {
    const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString()
    const entries = [
      { id: "n1", kind: "penalty", title: "Voice mute", body: "Muted for 1 hour: mic spam.", metadata: {}, readAt: null, createdAt: ago(4) },
      { id: "n2", kind: "match", title: "Match finished", body: "Win 13-9 on de_mirage, +24 EXP.", metadata: {}, readAt: null, createdAt: ago(35) },
      { id: "n3", kind: "clan", title: "Clan invite", body: "WOLF invited you to join.", metadata: {}, readAt: ago(60), createdAt: ago(90) },
      { id: "n4", kind: "system", title: "Unban approved", body: "Your unban request was approved.", metadata: { kind: "lift_decision" }, readAt: ago(120), createdAt: ago(200) },
      { id: "n5", kind: "system", title: "Message from staff", body: "Welcome to LEGACY-X.", metadata: { kind: "staff_message" }, readAt: ago(300), createdAt: ago(400) },
    ]
    return { entries, unreadCount: 2 }
  }
  if (path === "/api/v1/auth/me") {
    if (!signedIn()) throw unauthorized()
    return MOCK_USER
  }
  if (path === "/api/v1/auth/refresh") throw unauthorized()
  if (path === "/api/v1/clan-looks" || /^\/api\/v1\/clan-looks\/[^/]+\/buy$/.test(path)) {
    if (method === "POST") mockClanLooks.owned.add(decodeURIComponent(path.split("/")[4]))
    return { items: MOCK_CLAN_LOOK_ITEMS.map((item) => ({ ...item, owned: mockClanLooks.owned.has(item.id) })), equipped: { tag_color: null, tag_glow: null, backdrop: null, page: null } }
  }
  if (/^\/api\/v1\/clans\/[^/]+\/looks/.test(path)) {
    const parts = path.split("/")
    if (method === "POST" && parts[6] === "buy") mockClanLooks.owned.add(decodeURIComponent(parts[5]))
    if (method === "PUT" && parts[5] === "equip") { const { kind, item } = body as { kind: "tag_color" | "tag_glow" | "backdrop" | "page"; item: string | null }; mockClanLooks.worn[kind] = item }
    if (method === "PUT" && parts[5] === "custom") {
      const { item, a, b } = body as { item: string; a: string; b: string | null }
      mockClanLooks.custom[item] = { a, b }
      const kind = MOCK_CLAN_LOOK_ITEMS.find((entry) => entry.id === item)?.kind as "tag_color" | "tag_glow" | "backdrop" | "page" | undefined
      if (kind) mockClanLooks.worn[kind] = item
    }
    return { items: MOCK_CLAN_LOOK_ITEMS.map((item) => ({ ...item, owned: mockClanLooks.owned.has(item.id) })), equipped: { ...mockClanLooks.worn }, custom: mockClanLooks.custom }
  }
  if (path.startsWith("/api/v1/checks")) {
    if (!signedIn()) throw unauthorized()
    const base = { codeHint: "9QX4", targetSteamId: "76561198000000001", requestedBy: "Owner", expiresAt: new Date(Date.now() + HOUR).toISOString(), checkerVersion: "1.0.0" }
    const done = { ...base, id: "k1", targetName: "xBataa", status: "completed", createdAt: new Date(Date.now() - 3 * HOUR).toISOString(), completedAt: new Date(Date.now() - 2 * HOUR).toISOString(), summary: { detections: 2, suspicions: 1, matchesTarget: true, bannedAccounts: 1 } }
    if (method === "POST") return { id: "k9", code: "K7F2-9QX4", expiresAt: new Date(Date.now() + HOUR).toISOString(), steamId: "76561198000000001", downloadAvailable: true, downloadPath: "/api/v1/checks/code/K7F2-9QX4/download", checkerSha256: "3f1c9a7e5b2d8046a9c1e7f30b52d4a86e9f0c13a7b5d2e48f60c1a9b3d7e5f2" }
    if (method === "DELETE") return undefined
    if (path === "/api/v1/checks/k1") return { ...done, hwid: { saved: true, shared: [{ steamId: "76561198000000042", name: "Temuujin", avatar: null, kinds: ["board", "cpu", "disk"], banned: true }] }, report: { consent: true, checkerVersion: "1.0.0", steamIds: ["76561198000000001", "76561198000000099"], steamAccounts: [{ steamId: "76561198000000001", accountName: "bataa_login", personaName: "xBataa", lastLogin: "2026-10-08T19:20:00Z", mostRecent: true, cs2LastPlayed: "2026-10-08T21:45:00Z", cs2Hours: 812.5, launchOptions: "-novid -insecure" }, { steamId: "76561198000000099", accountName: "spare_acc", personaName: "spare", lastLogin: "2026-09-20T10:00:00Z", cs2LastPlayed: "2026-09-18T12:00:00Z", cs2Hours: 41 }], steamBans: [{ steamId: "76561198000000001", personaName: "xBataa", createdAt: "2019-03-02T00:00:00Z", profilePublic: true, vacBanned: false, gameBans: 0, communityBanned: false, economyBan: "none", daysSinceLastBan: null }, { steamId: "76561198000000099", personaName: "spare", createdAt: "2025-12-01T00:00:00Z", profilePublic: false, vacBanned: true, gameBans: 1, communityBanned: false, economyBan: "none", daysSinceLastBan: 214 }], cs2: { installed: true, lastUpdated: "2026-10-05T00:00:00Z" }, antiCheats: [{ name: "FACEIT AC", installed: true, load: "manual", running: false }, { name: "Riot Vanguard", installed: false, running: false }], filesScanned: 373454, durationSeconds: 412, detections: 2, suspicions: 1, matchesTarget: true, findings: [{ name: "loader.exe", kind: "file", confidence: "detection", path: "C:\\Users\\***\\Downloads\\loader.exe" }, { name: "Injected module", kind: "process", confidence: "detection", note: "Loaded into cs2.exe" }, { name: "Prefetch cleared", kind: "tamper", confidence: "suspicion", note: "No Prefetch entries in the last 7 days" }] } }
    return [done, { ...done, id: "k4", targetName: "Temuujin", targetSteamId: "76561198000000004", createdAt: new Date(Date.now() - 5 * HOUR).toISOString(), summary: { detections: 0, suspicions: 2, matchesTarget: true, bannedAccounts: 0 } }, { ...base, id: "k2", targetName: null, targetSteamId: "76561198000000002", status: "pending", createdAt: new Date(Date.now() - 600_000).toISOString(), completedAt: null, summary: undefined }, { ...base, id: "k3", targetName: "Gansukh", status: "completed", createdAt: new Date(Date.now() - 30 * HOUR).toISOString(), completedAt: new Date(Date.now() - 29 * HOUR).toISOString(), summary: { detections: 0, suspicions: 0, matchesTarget: true } }]
  }
  if (path === "/api/v1/clans/me") {
    if (!signedIn()) throw unauthorized()
    return { membership: null, pendingClanIds: ["c3"], invites: [{ clan: { ...MOCK_CLANS[2], joinMode: "request" }, at: new Date(Date.now() - HOUR).toISOString() }] }
  }
  if (method === "GET" && /^\/api\/v1\/skinchanger\/collections\/col-\d$/.test(path)) {
    const found = skinCollections({ sort: "popular" }).collections.find((entry) => path.endsWith(entry.id))
    if (!found) throw notFound()
    const full = collectionItems(Number(found.id.slice(4)) * 2 - 2, found.itemCount)
    return { collection: { ...found, items: full.map((entry, index) => ({ ...entry, teamScope: entry.slot === "knife" ? "all" : index % 2 ? "ct" : "t", wear: [0.01, 0.07, 0.18, 0.4][index % 4], statTrak: index === 0, stickers: entry.slot === "weapon" ? index % 3 : 0, hasCharm: index === 1, stickerItems: entry.slot === "weapon" ? ["Crown (Foil)", "Headshot Guarantee", "Nelu the Bear"].slice(0, index % 3).map((name) => ({ name, imageUrl: null })) : [], charm: index === 1 ? { name: "Lil' Ava", imageUrl: null } : null })) } }
  }
  if (/^\/api\/v1\/skinchanger\/collections\/[^/]+\/apply$/.test(path)) return { version: 2, applied: 6, skipped: 0 }
  if (/^\/api\/v1\/skinchanger\/collections\/[^/]+\/like$/.test(path)) return { likes: 1, liked: true }
  if (method === "POST" && path === "/api/v1/skinchanger/collections") return { id: "col-new" }
  if (method === "DELETE" && path.startsWith("/api/v1/skinchanger/collections/")) return { removed: true }
  if (path === "/api/v1/clans") return MOCK_CLANS
  if (path === "/api/v1/public/discord/community") {
    const people = [["Temuulen", 6, 41], ["xBataa", 4, 18], ["Khuslen_AWP", 3, 27], ["Enkh.", 2, 9], ["Gansukh", 1, 3], ["Bold", 1, 2], ["Ariunaa", 0, 0], ["Nomin", 0, 0]] as const
    const by = query?.sort === "invites" ? 2 : 1
    return { entries: [...people].sort((x, y) => y[by] - x[by]).map(([username, boosts, invites], index) => ({ position: index + 1, discordId: `10000000000000000${index}`, name: username, username: username.toLowerCase().replace(/[^a-z0-9]/g, ""), avatar: "", boosting: boosts > 0 && index !== 1 && index < 4, steamId: username === "Bold" ? "76561198000009999" : `7656119800000000${index}`, boosts, boostingSince: boosts > 0 ? new Date(Date.now() - (index + 2) * 40 * 24 * HOUR).toISOString() : null, invites })) }
  }
  if (path === "/api/v1/clans/leaderboard") return { clans: MOCK_CLANS.map((clan, index) => ({ ...clan, rank: index + 1, totalExp: 9400 - index * 2100, matches: 120 - index * 30, wins: 70 - index * 20 })) }
  if (path.endsWith("/activity")) return [{ id: "1", text: "Member 2 joined", at: new Date(Date.now() - 2 * HOUR).toISOString() }, { id: "2", text: "Member 4 asked to join", at: new Date(Date.now() - 5 * HOUR).toISOString() }, { id: "3", text: "Leader created the clan", at: new Date(Date.now() - 3 * 24 * HOUR).toISOString() }]
  if (path.endsWith("/invites")) return [{ id: "p1", name: "xBataa", avatar: "", at: new Date().toISOString(), answers: [{ q: "How many hours do you play?", a: "About 1,800 hours, mostly evenings." }, { q: "Do you have a microphone?", a: "Yes" }] }]
  if (path.endsWith("/requests")) return [{ id: "p2", name: "Gansukh", avatar: "", at: new Date().toISOString(), answers: [{ q: "How many hours do you play?", a: "About 1,800 hours, mostly evenings." }, { q: "Do you have a microphone?", a: "Yes" }] }]
  if (path === "/api/v1/compare/head-to-head") {
    const at = (days: number) => new Date(Date.now() - days * 24 * HOUR).toISOString()
    return { hidden: false, against: { matches: 5, aWins: 3, bWins: 2, draws: 0, aKills: 96, bKills: 88 }, together: { matches: 4, wins: 3, losses: 1, draws: 0 }, recent: [
      { matchId: "h1", map: "de_mirage", at: at(1), together: false, outcome: "a", aKills: 24, bKills: 17 },
      { matchId: "h2", map: "de_inferno", at: at(2), together: true, outcome: "win", aKills: 19, bKills: 21 },
      { matchId: "h3", map: "de_nuke", at: at(4), together: false, outcome: "b", aKills: 15, bKills: 22 },
      { matchId: "h4", map: "de_ancient", at: at(6), together: true, outcome: "loss", aKills: 12, bKills: 14 },
    ] }
  }
  if (path === "/api/v1/clans/war-ladder") return { clans: MOCK_CLANS.map((clan, index) => ({ ...clan, rank: index + 1, war: { rating: 1064 - index * 40, wins: 5 - index, losses: 1 + index, draws: 0 } })) }
  if (/^\/api\/v1\/clans\/[^/]+\/stats$/.test(path)) {
    const person = (index: number, value: number) => ({ id: `m${index}`, steamId: "", name: index === 0 ? "Leader" : `Member ${index}`, avatar: "", value })
    return {
      totals: { matches: 64, wins: 38, draws: 3, losses: 23, kills: 3120, deaths: 2710, assists: 980, headshots: 1490, aces: 4, clutches: 37, rounds: 1490, kd: 1.15, winRate: 59.4, headshotRate: 47.8 },
      leaders: { kills: person(1, 912), kd: person(0, 1.34), wins: person(1, 31), weekMvp: person(2, 184) },
      achievements: [["wins", "Wins", 1, 4, 38, 50], ["matches", "Matches played", 1, 3, 64, 250], ["aces", "Aces", 1, 3, 4, 10], ["clutches", "Clutches", 1, 3, 37, 50], ["wars", "Clan Wars won", 1, 3, 3, 10], ["level", "Clan level", 0, 3, 4, 5], ["members", "Members", 0, 2, 5, 10]].map(([id, title, tier, tiers, value, goal]) => ({ id, title, tier, tiers, value, goal, complete: false })),
      progress: { level: 4, xp: 1310, floor: 1050, next: 1600, perks: [[2, 0, "Level badge on the clan card"], [3, 1, "+1 member slot"], [5, 1, "+1 member slot, silver level ring"], [7, 1, "+1 member slot"], [10, 2, "+2 member slots, gold level ring"], [15, 2, "+2 member slots, violet level ring"]].map(([level, slots, perk]) => ({ level, slots, perk, unlocked: Number(level) <= 4 })), war: { rating: 1048, wins: 3, losses: 1, draws: 0 } },
    }
  }
  if (/^\/api\/v1\/clans\/[^/]+\/wars\/[^/]+\/(accept|decline|cancel)$/.test(path)) return { status: path.endsWith("accept") ? "accepted" : path.endsWith("decline") ? "declined" : "cancelled" }
  if (/^\/api\/v1\/clans\/[^/]+\/wars$/.test(path)) {
    if (method === "POST") return { id: "w-new" }
    const at = (hours: number) => new Date(Date.now() + hours * HOUR).toISOString()
    const war = (id: string, other: number, status: string, side: string, map: string, hours: number, extra: Record<string, unknown> = {}) => ({ id, status, side, map, scheduledAt: at(hours), note: null, opponent: MOCK_CLANS[other], result: null, score: null, ratingChange: null, matchId: null, ...extra })
    return { war: { rating: 1048, wins: 3, losses: 1, draws: 0 }, wars: [
      war("w1", 1, "pending", "opponent", "de_inferno", 20, { note: "Best of one, server 5x5 #1" }),
      war("w2", 2, "accepted", "challenger", "de_mirage", 46),
      war("w3", 1, "finished", "challenger", "de_ancient", -30, { result: "win", score: { us: 13, them: 9 }, ratingChange: 18 }),
      war("w4", 2, "finished", "opponent", "de_nuke", -80, { result: "loss", score: { us: 10, them: 13 }, ratingChange: -14 }),
      war("w5", 1, "declined", "challenger", "de_dust2", -120),
    ] }
  }
  if (/^\/api\/v1\/clans\/[^/]+\/bank\/donate$/.test(path)) return { balance: 2450 }
  if (/^\/api\/v1\/clans\/[^/]+\/bank$/.test(path)) return { balance: 2350, slotPrice: 300, donors: [["Member 1", 1200], ["Leader", 800], ["Member 3", 650]].map(([name, total], index) => ({ id: `m${index}`, steamId: "", name, avatar: "", total })), log: [{ amount: 500, reason: "gift", at: new Date(Date.now() - 2 * HOUR).toISOString(), name: "Member 1" }, { amount: -300, reason: "member slots 8 to 10", at: new Date(Date.now() - 26 * HOUR).toISOString(), name: "Leader" }, { amount: 800, reason: "gift", at: new Date(Date.now() - 50 * HOUR).toISOString(), name: "Leader" }] }
  if (path.startsWith("/api/v1/clans/")) {
    const clan = MOCK_CLANS.find((entry) => path === `/api/v1/clans/${entry.id}` || path === `/api/v1/clans/${entry.number}`)
    if (!clan) throw notFound()
    if (method === "PUT" && path === `/api/v1/clans/${clan.id}` && (body as { links?: Record<string, string> } | undefined)?.links) mockClanLinks = Object.fromEntries(Object.entries((body as { links: Record<string, string> }).links).map(([id, url]) => [id, /^https:\/\//.test(url) ? url : `https://${url}`]))
    return { ...clan, links: mockClanLinks, level: 4, description: "Ranked five-stack. Evenings, Ulaanbaatar time.", members: Array.from({ length: clan.currentPlayers }, (_, index) => ({ id: `m${index}`, name: index === 0 ? "Leader" : `Member ${index}`, role: index === 0 ? "leader" : index === 1 ? "co-leader" : "member", avatar: "", description: "", ...mockLook(index) })), viewer: { role: "leader", canModerate: true } }
  }
  if (path === "/api/v1/staffpanel/staff" && method === "GET") return [
    { id: "s1", userId: "u0", username: "Owner", steamId: "76561198000000000", avatar: "", role: "OWNER", status: "active", stamina: 1000, immunity: 1000, expiresAt: null, createdAt: "2026-09-01T00:00:00Z" },
    { id: "s2", userId: "u5", username: "Gansukh", steamId: "76561198000000005", avatar: "", role: "ADMIN", status: "active", stamina: 500, immunity: 500, expiresAt: "2026-11-11T15:59:59Z", createdAt: "2026-09-20T00:00:00Z" },
    { id: "s3", userId: "u6", username: "Temuulen", steamId: "76561198000000006", avatar: "", role: "MANAGER", status: "active", stamina: 750, immunity: 750, expiresAt: null, createdAt: "2026-09-21T00:00:00Z" },
    { id: "s4", userId: "u7", username: "Bold", steamId: "76561198000000007", avatar: "", role: "DEVELOPER", status: "active", stamina: 0, immunity: 0, expiresAt: null, createdAt: "2026-09-22T00:00:00Z" },
    { id: "s5", userId: "u8", username: "Saran", steamId: "76561198000000008", avatar: "", role: "DESIGNER", status: "suspended", stamina: 0, immunity: 0, expiresAt: null, createdAt: "2026-09-23T00:00:00Z" },
  ]
  if (path.startsWith("/api/v1/staffpanel/staff") || path.startsWith("/api/v1/staffpanel/creators")) return { ok: true, label: "Content Creator" }
  if (path === "/api/v1/moderation/access") return { canManage: true, role: "OWNER", canApprove: true, requestedPenaltyIds: [], can: { ban: true, unban: true, edit: true } }
  if (path === "/api/v1/staffpanel/access") return { role: "OWNER", username: "LegacyTester", capabilities: [] }
  if (path === "/api/v1/staffpanel/overview") return { role: "OWNER", servers: [{ server_id: "s1", name: "5x5 #1", map_name: "de_mirage", mode: "5vs5", player_count: 7, last_heartbeat_at: new Date().toISOString() }, { server_id: "s2", name: "Fun #1", map_name: "de_dust2", mode: "fun", player_count: 0, last_heartbeat_at: null }], pendingActions: [{ id: "a1", status: "pending", action_type: "ban", server_id: "s1", created_at: new Date().toISOString() }] }
  if (path === "/api/v1/staffpanel/database") return { tables: [{ name: "users", count: 8 }, { name: "penalties", count: 3 }, { name: "clans", count: 3 }, { name: "player_checks", count: 4 }] }
  if (path === "/api/v1/moderation/lift-requests") return [{ id: "r1", penaltyId: "p1", type: "ban", player: "Enkh.", avatar: "", penaltyReason: "Aimbot", reason: null, requestedBy: "Admin", at: new Date(Date.now() - 2 * HOUR).toISOString() }]
  if (path.startsWith("/api/v1/feedback/") && path.endsWith("/reaction")) return { reactions: { like: 3, love: 1, funny: 0 }, myReaction: (body as { reaction: string | null } | undefined)?.reaction ?? null }
  if (path === "/api/v1/discord/pings") {
    if (method === "PUT") { const { topic, enabled } = body as { topic: string; enabled: boolean }; if (enabled) mockPings.add(topic); else mockPings.delete(topic); return { topic, enabled } }
    return { linked: true, topics: [["updates", "Updates", "Website and game server updates"], ["news", "News", "Counter-Strike 2 news"], ["live", "Creators live", "A LEGACY-X creator goes live"], ["play", "Servers need players", "A server is short of players"]].map(([key, label, description]) => ({ key, label, description, enabled: mockPings.has(key) })) }
  }
  if (path === "/api/v1/discord/link/start") return { url: "https://discord.com/oauth2/authorize" }
  if (path === "/api/v1/discord/link") return { available: true, link: { discordId: "987654321098765432", discordName: "Legacy Player", inServer: true, linkedAt: new Date(Date.now() - 3 * 24 * HOUR).toISOString() } }
  if (path === "/api/v1/moderation/notify") return undefined
  if (path.startsWith("/api/v1/moderation/lift-requests/")) return undefined
  if (path.startsWith("/api/v1/moderation/penalties") && method !== "GET") return path === "/api/v1/moderation/penalties" ? { penaltyId: "new" } : undefined
  if (path === "/api/v1/shop/founder/buy" && method === "POST") { mockFrameState.owned.add("founder"); return { number: 38, label: "#0038" } }
  if (path === "/api/v1/shop/products") {
    const lx = (id: string, grantsLx: number, priceMnt: number) => ({ id, slug: id, name: `${grantsLx.toLocaleString()} LX`, description: "", kind: "lx", priceMnt, imageUrl: null, stock: 100000, grantsLx })
    return { products: [lx("lx-750", 750, 5000), lx("lx-1500", 1500, 10000), lx("lx-3000", 3000, 20000), lx("lx-3300", 3300, 20000), lx("lx-8500", 8500, 50000), { id: "founder-pack", slug: "founder-pack", name: "LEGACY-X Genesis", description: "", kind: "founder", priceMnt: 30000, imageUrl: null, stock: 500, grantsLx: 0, founder: { limit: 500, taken: 37, remaining: 463, endsAt: "2026-11-30T15:59:59Z", open: true, priceLx: 4500 } }, { id: "charm", slug: "charm", name: "LEGACY-X NFC charm", description: "Tap it to open your profile.", kind: "charm", priceMnt: 15000, imageUrl: null, stock: 12, grantsLx: 0 }] }
  }
  if (path === "/api/v1/shop/orders/me") return { orders: [{ id: "o1", productId: "lx-3000", productName: "3,000 LX", productKind: "lx", grantsLx: 3000, quantity: 1, unitPriceMnt: 20000, status: "contacted", createdAt: new Date(Date.now() - 3 * HOUR).toISOString() }, { id: "o2", productId: "lx-750", productName: "750 LX", productKind: "lx", grantsLx: 750, quantity: 1, unitPriceMnt: 5000, status: "paid", createdAt: new Date(Date.now() - 30 * HOUR).toISOString() }] }
  if (path === "/api/v1/staff/shop/orders") return { orders: [] }
  if (path === "/api/v1/staff/shop/products") return { products: [] }
  if (path.startsWith("/api/v1/cosmetics")) {
    if (!signedIn()) throw unauthorized()
    const frames = mockFrames()
    if (method === "PUT" && path.endsWith("/nade-slot")) {
      const { nade, kind, item, inherit } = body as { nade: string; kind: string; item?: string | null; inherit?: boolean }
      if (inherit) { delete mockNadeSlots[nade]?.[kind]; if (mockNadeSlots[nade] && Object.keys(mockNadeSlots[nade]).length === 0) delete mockNadeSlots[nade] }
      else (mockNadeSlots[nade] ??= {})[kind] = item ?? null
      return { nade, kind }
    }
    if (method === "PUT" && path.endsWith("/custom")) {
      const { item, color, color2 } = body as { item: string; color: string; color2?: string }
      mockCustomColours[item] = color
      if (color2) mockCustomColours2[item] = color2
      const kind = item.startsWith("name-") ? "name_color" : item.startsWith("glow-") ? "name_glow" : item.startsWith("smoke-") ? "smoke_color" : item.startsWith("trail-") ? "grenade_trail" : item.startsWith("light-") ? "grenade_light" : "flash_effect"
      return { kind, item, color }
    }
    if (method === "PUT") {
      const { kind, item } = body as { kind: "frame" | "name_color" | "name_glow" | "smoke_color" | "grenade_trail" | "grenade_light" | "flash_effect"; item: string | null }
      if (kind === "frame") mockFrameState.equipped = item
      else if (kind === "name_color") mockFrameState.nameColor = item
      else if (kind === "smoke_color") mockFrameState.smoke = item
      else if (kind === "grenade_trail") mockFrameState.trail = item
      else if (kind === "grenade_light") mockFrameState.light = item
      else if (kind === "flash_effect") mockFrameState.flash = item
      else mockFrameState.nameGlow = item
      return { kind, item }
    }
    if (method === "POST") {
      mockFrameState.owned.add(decodeURIComponent(path.split("/")[4]))
      return { owned: true }
    }
    return withRentals({ players: 8, equippedSmokeColor: mockFrameState.smoke, smokeColors: [mockDesign("smoke-solid", "Smoke", 200, 1), mockDesign("smoke-dual", "Dual smoke", 400, 3, "dual")], equippedFrame: mockFrameState.equipped, equippedNameColor: mockFrameState.nameColor, equippedNameGlow: mockFrameState.nameGlow, banners: [{ id: "banner-gold-foil", name: "Gold Foil", nameMn: "Алтан тугалга", unlock: "achievement" as const, price: 0, requirement: "Genesis pack", owned: mockIsFounder(), rarity: 4, featured: false, owners: 0, fx: "goldfoil" }], titles: [{ id: "title-founder", name: "Genesis", nameMn: "Genesis", unlock: "achievement" as const, price: 0, requirement: "Genesis pack", owned: mockIsFounder(), rarity: 4, featured: false, owners: 0 }], equippedBanner: mockIsFounder() ? "banner-gold-foil" : null, equippedTitle: mockIsFounder() ? "title-founder" : null, frames, nameColors: mockNameItems("color"), nameGlows: mockNameItems("glow"), equippedGrenadeTrail: mockFrameState.trail ?? null, grenadeTrails: [...([["trail-line", "Line", 150, 1, "line"], ["trail-dash", "Dash", 350, 2, "dash"], ["trail-double", "Double", 450, 3, "double"], ["trail-comet", "Comet", 500, 3, "comet"], ["trail-helix", "Helix", 600, 3, "helix"], ["trail-zigzag", "Zigzag", 650, 3, "zigzag"], ["trail-flare", "Flare", 700, 3, "flare"], ["trail-sparks", "Sparks", 750, 3, "sparks"], ["trail-starfall", "Starfall", 850, 4, "starfall"], ["trail-inferno", "Inferno", 1000, 4, "inferno"], ["trail-pulse", "Pulse", 900, 4, "pulse"], ["trail-stardust", "Stardust", 1000, 4, "stardust"], ["trail-ribbon", "Ribbon", 1100, 4, "ribbon"], ["trail-lightning", "Lightning", 1200, 4, "lightning"]] as const).map(([id, name, price, rarity, fx]) => mockDesign(id, name, price, rarity, fx)), { id: "trail-rainbow", name: "Rainbow", nameMn: "Rainbow", unlock: "coin" as const, price: 800, requirement: "", owned: mockFrameState.owned.has("trail-rainbow"), rarity: 4, featured: false, owners: 2, color: "#ffffff", fx: "rainbow" }], equippedFlashEffect: mockFrameState.flash ?? null, nadeSlots: mockNadeSlots, flashEffects: [mockDesign("flash-starburst", "Starburst", 400, 2, "starburst"), mockDesign("flash-ring", "Shockwave", 500, 2, "ring"), mockDesign("flash-nova", "Nova", 550, 3, "nova"), { id: "flash-prism", name: "Prism", nameMn: "Prism", unlock: "coin" as const, price: 750, requirement: "", owned: mockFrameState.owned.has("flash-prism"), rarity: 3, featured: false, owners: 1, color: "#ffffff", fx: "prism" }], equippedGrenadeLight: mockFrameState.light ?? null, grenadeLights: [mockDesign("light-glow", "Light", 300, 2)] })
  }
  if (path === "/api/v1/wallet/me") {
    if (!signedIn()) throw unauthorized()
    return {
      earn: [{ id: "match", label: "Ranked match", coins: 20 }, { id: "win", label: "Ranked win", coins: 30 }, { id: "first-win", label: "First win of the day", coins: 25 }, { id: "rank-up", label: "Each new rank", coins: 50 }, { id: "streak-3", label: "3 days in a row", coins: 30 }, { id: "streak-7", label: "7 days in a row", coins: 100 }, { id: "discord", label: "Link Discord (once)", coins: 50 }],
      clanPrices: { create: 3000, rename: 200, slots: 300, slotStep: 2, slotCap: 50 },
      summary: {
        todayEarned: 75, weekEarned: 310, todayMatches: 3, weekMatches: 12, spentTotal: 1050, spentCount: 5, streakDays: 5,
        daily: [40, 0, 70, 50, 0, 0, 95, 60, 25, 80, 110, 0, 75, 125].map((earned, index, all) => ({ day: new Date(Date.now() - (all.length - 1 - index) * 86_400_000).toISOString().slice(0, 10), earned })),
        week: [true, true, true, true, true, false, false].map((played, index) => ({ day: new Date(Date.now() - (6 - index) * 86_400_000).toISOString().slice(0, 10), played })),
      },
      balance: 600,
      transactions: [
        { id: "4", amount: -40, kind: "penalty", reason: "Penalty", balanceAfter: 600, at: new Date(Date.now() - 1 * HOUR).toISOString() },
        { id: "3", amount: 50, kind: "grant", reason: "Ranked match won", balanceAfter: 640, at: new Date(Date.now() - 2 * HOUR).toISOString() },
        { id: "2", amount: 20, kind: "grant", reason: "Ranked match played", balanceAfter: 590, at: new Date(Date.now() - 5 * HOUR).toISOString() },
        { id: "1", amount: 570, kind: "grant", reason: "Tournament prize", balanceAfter: 570, at: new Date(Date.now() - 3 * 24 * HOUR).toISOString() },
      ],
    }
  }
  if (path === "/api/v1/settings/notifications") {
    if (!signedIn()) throw unauthorized()
    if (method === "PUT") notificationPrefs = { ...notificationPrefs, ...(body as Partial<typeof notificationPrefs>), penalties: true }
    return notificationPrefs
  }
  const respectRoute = /^\/api\/v1\/profile\/([^/]+)\/respect$/.exec(path)
  if (respectRoute && (method === "POST" || method === "DELETE")) {
    if (!signedIn()) throw unauthorized()
    ownerRespect = { given: method === "POST", count: OWNER_RESPECT_BASE + (method === "POST" ? 1 : 0) }
    return ownerRespect
  }
  if (method !== "GET") throw notFound()

  const liveMatch = /^\/api\/v1\/public\/servers\/([^/]+)\/live-match$/.exec(path)
  if (liveMatch) {
    const all = [...SERVERS["5x5"], ...SERVERS.fun, ...SERVERS.pro]
    const wanted = decodeURIComponent(liveMatch[1])
    const found = all.find((entry) => entry.id === wanted) ?? (wanted === "s1" ? all[0] : wanted === "s2" ? all[1] : undefined)
    if (!found) throw notFound()
    const roster = (offset: number, count: number) => Array.from({ length: count }, (_, i) => ({
      steamId: `76561198${offset + i}`, name: NAMES[(offset + i) % NAMES.length], connected: i !== 3, rankId: RANKS[(offset + i) % RANKS.length][0], rankName: RANKS[(offset + i) % RANKS.length][1], rankImageKey: null,
      avatar: (offset + i) % 2 === 0 ? `${location.origin}/logolegacyx.webp` : null,
      adr: 60 + ((offset + i) * 13) % 70, ping: 20 + i * 7, kills: 18 - i * 3 + (offset % 3), deaths: 9 + i, assists: 3 + (i % 4),
    }))
    const tCount = Math.ceil(found.players / 2)
    return {
      liveMatch: {
        serverId: found.id, serverName: found.name, connectAddress: found.connectAddress, gotvAddress: found.gotvAddress, players: found.players, maxPlayers: found.maxPlayers,
        map: found.map, mode: found.modeLabel, state: found.status === "live" ? "live" : "waiting", round: found.round, score: found.score,
        teams: { t: roster(0, tCount), ct: roster(5, found.players - tCount) }, spectators: [], connectedPlayers: roster(0, found.players),
        updatedAt: new Date().toISOString(), availability: found.players > 0 ? "live_snapshot" : "unavailable",
      },
    }
  }

  const profile = /^\/api\/v1\/profile\/([^/]+)\/(overview|faceit)$/.exec(path)
  if (profile) return profile[2] === "overview" ? profileOverview(decodeURIComponent(profile[1])) : faceit(decodeURIComponent(profile[1]))

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
    case "/api/v1/competitive/me/access":
      return { competitive: { current_exp: 1180, rank_id: 7, rank_name: "Operator III", rank_image_key: null, pro_league_unlocked: false }, proLeagueUnlocked: false, requiredRankId: 8, requiredRankName: "Vanguard I" }
    case "/api/v1/skinchanger/catalog":
      return catalog(query)
    case "/api/v1/skinchanger/loadout":
      return loadout()
    case "/api/v1/skinchanger/collections":
      return skinCollections(query)
    case "/api/v1/public/staff":
      return { team: [["Owner", 0], ["Manager", 1], ["Manager", 2], ["Admin", 3], ["Admin", 4], ["Admin", 5], ["Developer", 6], ["Designer", 7]].map(([role, index]) => ({ steamId: `7656119800000010${index}`, username: NAMES[index as number], avatar: "", role, since: new Date(Date.UTC(2026, 6 + ((index as number) % 4), 3)).toISOString(), clanTag: (index as number) % 3 === 0 ? "LX" : null, rank: { id: RANKS[index as number][0], name: RANKS[index as number][1], imageKey: null }, stats: index === 7 ? null : { matches: 40 + (index as number) * 17, wins: 22 + (index as number) * 8, kills: 600 + (index as number) * 90, deaths: 480 + (index as number) * 70 } })) }
    case "/api/v1/public/creators":
      return { creators: [
        { userId: "u1", steamId: "76561198000000001", username: "Temuulen", avatar: null, tier: "main", label: "Main Content Creator", bio: "CS2 streams every evening on LEGACY-X servers.", links: { twitch: "https://twitch.tv/temuulen", youtube: "https://youtube.com/@temuulen" }, rank: { id: 16, name: "Apex III", imageKey: null }, frame: null, nameStyle: null },
        { userId: "u2", steamId: "76561198000000002", username: "xBataa", avatar: null, tier: "main", label: "Main Content Creator", bio: "Highlights and AWP clips.", links: { youtube: "https://youtube.com/@xbataa", tiktok: "https://tiktok.com/@xbataa" }, rank: { id: 15, name: "Apex II", imageKey: null }, frame: null, nameStyle: null },
        { userId: "u3", steamId: "76561198000000003", username: "Khuslen_AWP", avatar: null, tier: "creator", label: "Content Creator", bio: "", links: { kick: "https://kick.com/khuslen" }, rank: { id: 14, name: "Apex I", imageKey: null }, frame: null, nameStyle: null },
        { userId: "u4", steamId: "76561198000000004", username: "Enkh.", avatar: null, tier: "creator", label: "Content Creator", bio: "Fun Mode surf videos.", links: { facebook: "https://facebook.com/enkh", instagram: "https://instagram.com/enkh" }, rank: null, frame: null, nameStyle: null },
        { userId: "u5", steamId: "76561198000000005", username: "Gansukh", avatar: null, tier: "creator", label: "Content Creator", bio: "Pro League match reviews every week.", links: { youtube: "https://youtube.com/@gansukh" }, rank: { id: 12, name: "Ace II", imageKey: null }, frame: null, nameStyle: null },
        { userId: "u6", steamId: "76561198000000006", username: "ZoloMN", avatar: null, tier: "creator", label: "Content Creator", bio: "Short clips and funny moments.", links: { tiktok: "https://tiktok.com/@zolomn" }, rank: { id: 9, name: "Vanguard II", imageKey: null }, frame: null, nameStyle: null },
      ] }
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
