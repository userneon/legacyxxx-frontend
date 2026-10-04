// Downloads the local 3D demo set (one AK-47 model and one skin texture) into public/skin3d-demo/ for `npm run dev`.
// The files come from the open-source CS2-WeaponPaints-Website project (MIT) and stay out of git (see .gitignore).
// Usage: npm run demo:3d
import { mkdir, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"

const ORIGIN = "https://raw.githubusercontent.com/LielXD/CS2-WeaponPaints-Website/refs/heads/main/src"
const OUT = join(import.meta.dirname, "..", "public", "skin3d-demo")
const FILES = [
  [`${ORIGIN}/%5Bmodels%5D/weapon_ak47.glb`, "models/weapon_ak47.glb"],
  [`${ORIGIN}/%5Btextures%5D/weapon_ak47/1004.png`, "textures/weapon_ak47/1004.png"],
  [`${ORIGIN}/%5Btextures%5D/weapon_ak47/1004_metal.png`, "textures/weapon_ak47/1004_metal.png"],
]

for (const [url, target] of FILES) {
  const response = await fetch(url)
  if (!response.ok) {
    console.error(`Could not download ${target}: HTTP ${response.status} from ${url}`)
    process.exit(1)
  }
  const path = join(OUT, target)
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, Buffer.from(await response.arrayBuffer()))
  console.log(`ok  ${target}`)
}

// Sticker slot positions are the ones CS2-WeaponPaints-Website uses for the AK-47 (fractions of the body box).
const stickerSlots = [{ x: 0.155, y: 0.31 }, { x: 0.065, y: 0.3 }, { x: -0.03, y: 0.31 }, { x: -0.165, y: 0.335 }, { x: 0.37, y: 0.16 }]
const manifest = { weapons: [{ key: "weapon_ak47", classes: ["AK-47"], model: "models/weapon_ak47.glb", paints: { 1004: "textures/weapon_ak47/1004.png" }, stickerSlots, charm: { x: 0.3, y: -0.1 } }] }
await writeFile(join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n")
console.log("ok  manifest.json\nDone. Now: npm run dev, open /skinchanger, pick AK-47 > Paint 1004 > 3D.")
