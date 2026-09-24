const base = "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en"
const endpoints = [
  ["skins", "skins.json"],
  ["agents", "agents.json"],
  ["music_kits", "music_kits.json"],
  ["collectibles", "collectibles.json"],
  ["base_weapons", "base_weapons.json"],
]

const results = {}

for (const [key, file] of endpoints) {
  const response = await fetch(`${base}/${file}`)
  if (!response.ok) throw new Error(`Unable to fetch ${file}: ${response.status}`)
  const items = await response.json()
  results[key] = {
    total: Array.isArray(items) ? items.length : Object.keys(items).length,
    image_items: Array.isArray(items) ? items.filter((item) => Boolean(item.image)).length : 0,
    sample: Array.isArray(items) ? items.slice(0, 3).map((item) => ({ id: item.id, name: item.name, image: item.image })) : [],
  }
}

const skinsResponse = await fetch(`${base}/skins.json`)
if (!skinsResponse.ok) throw new Error(`Unable to fetch skins.json: ${skinsResponse.status}`)
const skins = await skinsResponse.json()

const weaponGroups = new Map()
for (const skin of skins) {
  const weaponName = skin.weapon?.name ?? "Unknown"
  weaponGroups.set(weaponName, (weaponGroups.get(weaponName) ?? 0) + 1)
}

const weaponRows = [...weaponGroups.entries()]
  .sort((a, b) => b[1] - a[1])
  .map(([weapon, skins]) => ({ weapon, skins }))

const knives = skins.filter((skin) => /knife|bayonet|daggers|falchion|karambit|kukri|m9|navaja|nomad|paracord|shadow|skeleton|stiletto|survival|talon|ursus/i.test(`${skin.weapon?.id ?? ""} ${skin.weapon?.name ?? ""}`))
const gloves = skins.filter((skin) => /glove/i.test(`${skin.weapon?.id ?? ""} ${skin.weapon?.name ?? ""}`))
const pins = (await (await fetch(`${base}/collectibles.json`)).json()).filter((item) => /pin/i.test(`${item.name ?? ""} ${item.type ?? ""}`))

console.log(JSON.stringify({
  categories: results,
  weapons_with_skins: weaponRows.length,
  knife_skins: knives.length,
  glove_skins: gloves.length,
  pins: pins.length,
  top_weapon_coverage: weaponRows.slice(0, 10),
}, null, 2))
