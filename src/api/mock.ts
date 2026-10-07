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
    discord_linked: index % 3 !== 1,
    clan_tag: index % 4 === 0 ? "WOLF" : index % 4 === 1 ? "SKY" : null,
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

function feedback() {
  return REVIEWS.map((review, index) => ({
    id: `mock-review-${index}`,
    name: NAMES[index + 2],
    rating: review.rating,
    message: review.message,
    date: new Date(Date.now() - index * 86_400_000 * 2).toISOString(),
    reactions: { like: (index * 3) % 7, love: index % 3, funny: index % 2 },
    myReaction: index === 1 ? "like" : null,
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
  else if (category === "sticker" || category === "charm") items = ["Legacy-X", "Mongolia", "Headshot", "Clutch King"].map((name, index) => item(`${category}-${index}`, category, null, `${category === "sticker" ? "Sticker" : "Charm"} | ${name}`, null))
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
    user: { id: own ? MOCK_USER.id : `mock-${index}`, steamId: own ? MOCK_USER.steamId : byName >= 0 ? `7656119800000${String(index).padStart(4, "0")}` : identity, username: name, avatar: "", role: own ? "Player" : index === 0 ? "Owner" : "Player", memberSince: new Date(Date.now() - 400 * 24 * HOUR).toISOString(), steamBackground: null, steamMedia: null },
    viewer: { isOwner: own, isStaff: false },
    // Only the sample Owner has Respect and links, like the real Owner profile will.
    ...(index === 0 ? {
      respect: ownerRespect,
      message: "Legacy-X will always be on top.",
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
      { key: "matches", label: "Matches", value: 184 - variant * 11 + ((variant * 17) % 40) },
      { key: "winRate", label: "Win rate", value: 58 + ((variant * 7) % 13) - 6 },
      { key: "kd", label: "K/D", value: Number((1.27 + (((variant * 5) % 9) - 4) * 0.07).toFixed(2)) },
      { key: "hs", label: "Headshot %", value: 46 + ((variant * 11) % 17) - 8 },
      { key: "avgKills", label: "Avg. kills", value: 19 + ((variant * 3) % 7) - 3 },
    ],
    recentMatches: results.map((result, i) => ({
      map: maps[i % maps.length],
      result,
      score: result === "Win" ? `13 : ${6 + (i % 5)}` : `${7 + (i % 4)} : 13`,
      kd: (0.8 + ((i * 37) % 90) / 100).toFixed(2),
      playedAt: new Date(Date.now() - (i + 1) * 9 * HOUR).toISOString(),
      expDelta: result === "Win" ? (i === 1 ? 5 : i === 3 ? 0 : 18 + (i % 7)) : -(12 + (i % 5)),
      expBreakdown: i === 1 ? { limited: "daily" } : i === 3 && result === "Win" ? { limited: "weekly" } : null,
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
    clan: index % 4 === 0 ? { id: "c1", name: "Steppe Wolves", tag: "WOLF" } : null,
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
const MOCK_CLANS = [
  { id: "c1", name: "Steppe Wolves", tag: "WOLF", logo: "", thumbnail: "data:image/jpeg;base64,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", currentPlayers: 7, maxPlayers: 10, region: "Mongolia", joinMode: "open" },
  { id: "c2", name: "Blue Sky Five", tag: "SKY", logo: "", thumbnail: null, currentPlayers: 10, maxPlayers: 10, region: "Mongolia", joinMode: "open" },
  { id: "c3", name: "Night Riders", tag: "NRDR", logo: "", thumbnail: "data:image/jpeg;base64,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", currentPlayers: 3, maxPlayers: 10, region: "Mongolia", joinMode: "request" },
]

/** Notification settings for the session, so the switches in Settings really toggle. */
let notificationPrefs = { tournaments: true, rankChanges: false, penalties: true }

export async function mockResponse(method: string, path: string, query: Query, body?: unknown): Promise<unknown> {
  // A short, realistic delay so loading states and entrance animations show.
  await new Promise((resolve) => window.setTimeout(resolve, 250 + Math.random() * 250))
  if (path === "/api/v1/auth/logout") {
    try { window.localStorage.removeItem("legacyx_access_token") } catch { /* storage blocked */ }
    return undefined
  }
  if (path === "/api/v1/auth/me") {
    if (!signedIn()) throw unauthorized()
    return MOCK_USER
  }
  if (path === "/api/v1/auth/refresh") throw unauthorized()
  if (path === "/api/v1/clans/me") {
    if (!signedIn()) throw unauthorized()
    return { membership: null, pendingClanIds: ["c3"], invites: [{ clan: { ...MOCK_CLANS[2], joinMode: "request" }, at: new Date(Date.now() - HOUR).toISOString() }] }
  }
  if (method === "GET" && /^\/api\/v1\/skinchanger\/collections\/col-\d$/.test(path)) {
    const found = skinCollections({ sort: "popular" }).collections.find((entry) => path.endsWith(entry.id))
    if (!found) throw notFound()
    const full = collectionItems(Number(found.id.slice(4)) * 2 - 2, found.itemCount)
    return { collection: { ...found, items: full.map((entry, index) => ({ ...entry, teamScope: entry.slot === "knife" ? "all" : index % 2 ? "ct" : "t", wear: [0.01, 0.07, 0.18, 0.4][index % 4], statTrak: index === 0, stickers: entry.slot === "weapon" ? index % 3 : 0, hasCharm: index === 1 })) } }
  }
  if (/^\/api\/v1\/skinchanger\/collections\/[^/]+\/apply$/.test(path)) return { version: 2, applied: 6, skipped: 0 }
  if (/^\/api\/v1\/skinchanger\/collections\/[^/]+\/like$/.test(path)) return { likes: 1, liked: true }
  if (method === "POST" && path === "/api/v1/skinchanger/collections") return { id: "col-new" }
  if (method === "DELETE" && path.startsWith("/api/v1/skinchanger/collections/")) return { removed: true }
  if (path === "/api/v1/clans") return MOCK_CLANS
  if (path === "/api/v1/clans/leaderboard") return { clans: MOCK_CLANS.map((clan, index) => ({ ...clan, rank: index + 1, totalExp: 9400 - index * 2100, matches: 120 - index * 30, wins: 70 - index * 20 })) }
  if (path.endsWith("/activity")) return [{ id: "1", text: "Member 2 joined", at: new Date(Date.now() - 2 * HOUR).toISOString() }, { id: "2", text: "Member 4 asked to join", at: new Date(Date.now() - 5 * HOUR).toISOString() }, { id: "3", text: "Leader created the clan", at: new Date(Date.now() - 3 * 24 * HOUR).toISOString() }]
  if (path.endsWith("/invites")) return [{ id: "p1", name: "xBataa", avatar: "", at: new Date().toISOString() }]
  if (path.endsWith("/requests")) return [{ id: "p2", name: "Gansukh", avatar: "", at: new Date().toISOString() }]
  if (path.startsWith("/api/v1/clans/")) {
    const clan = MOCK_CLANS.find((entry) => path === `/api/v1/clans/${entry.id}`)
    if (!clan) throw notFound()
    return { ...clan, description: "Ranked five-stack. Evenings, Ulaanbaatar time.", members: Array.from({ length: clan.currentPlayers }, (_, index) => ({ id: `m${index}`, name: index === 0 ? "Leader" : `Member ${index}`, role: index === 0 ? "leader" : index === 1 ? "co-leader" : "member", avatar: "", description: "" })), viewer: { role: "leader", canModerate: true } }
  }
  if (path === "/api/v1/moderation/access") return { canManage: true, role: "OWNER", canApprove: true, requestedPenaltyIds: [], can: { ban: true, unban: true, edit: true } }
  if (path === "/api/v1/moderation/lift-requests") return [{ id: "r1", penaltyId: "p1", type: "ban", player: "Enkh.", avatar: "", penaltyReason: "Aimbot", reason: null, requestedBy: "Admin", at: new Date(Date.now() - 2 * HOUR).toISOString() }]
  if (path.startsWith("/api/v1/feedback/") && path.endsWith("/reaction")) return { reactions: { like: 3, love: 1, funny: 0 }, myReaction: (body as { reaction: string | null } | undefined)?.reaction ?? null }
  if (path === "/api/v1/discord/link/start") return { url: "https://discord.com/oauth2/authorize" }
  if (path === "/api/v1/discord/link") return { available: true, link: { discordId: "987654321098765432", discordName: "Legacy Player", linkedAt: new Date(Date.now() - 3 * 24 * HOUR).toISOString() } }
  if (path === "/api/v1/moderation/notify") return undefined
  if (path.startsWith("/api/v1/moderation/lift-requests/")) return undefined
  if (path.startsWith("/api/v1/moderation/penalties") && method !== "GET") return path === "/api/v1/moderation/penalties" ? { penaltyId: "new" } : undefined
  if (path === "/api/v1/wallet/me") {
    if (!signedIn()) throw unauthorized()
    return {
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
    const found = all.find((entry) => entry.id === decodeURIComponent(liveMatch[1]))
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
    case "/api/v1/skinchanger/active-server":
      return { session: null }
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
