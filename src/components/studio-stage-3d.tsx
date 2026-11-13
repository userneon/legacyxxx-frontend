/**
 * The Advanced studio's 3D view of a gun (three.js, loaded only when a gun has a model, see lib/weapon-models.ts): the Weapon Paints models, painted with
 * the skin's own texture. Turn it with the pointer; grab a sticker or the charm and it moves along the gun's side, and what is dropped is the offsets the
 * plugin stores (lib/studio-layout.ts). Stickers are laid on the gun's surface (decals). The charm hangs on a small chain from near the back as a thick plaque with its picture, and swings when it is moved (the source has no charm models, so this is a stand-in).
 */
import { useEffect, useRef, useState } from "react"
import { RotateCcw } from "lucide-react"
import * as THREE from "three"
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { DecalGeometry } from "three/examples/jsm/geometries/DecalGeometry.js"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"

import { Skeleton } from "@/components/ui/skeleton"
import { offsetOnPlane, pointOnPlane, type SlotFrame } from "@/lib/studio-layout"
import type { WeaponModelChoice } from "@/lib/weapon-models"

export interface StageSticker { slot: number; imageUrl: string | null; offsetX: number; offsetY: number; scale: number; rotation: number; wear: number }
export interface StageCharm { imageUrl: string | null; offsetX: number; offsetY: number; offsetZ: number }
export type StageSelection = { kind: "sticker"; slot: number } | { kind: "charm" } | null

interface Pick { kind: "sticker" | "charm"; slot: number }
/** What the loaded gun is measured as: its side view's box, and the slots on it. */
interface Geometry {
  target: THREE.Mesh
  size: THREE.Vector3
  reach: [number, number]
  slots: Array<SlotFrame | null>
  charm: SlotFrame
}
/** The hanging charm: `anchor` sits where it is fixed to the gun, `swing` turns about it; `plaque` holds the layers that give the picture some thickness. */
interface CharmRig {
  anchor: THREE.Group
  swing: THREE.Group
  materials: THREE.MeshStandardMaterial[]
  meshes: THREE.Mesh[]
  length: number
  angle: number
  speed: number
  last: THREE.Vector3
  lastVelocity: number
}
interface Ctx {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  controls: OrbitControls
  items: Map<string, THREE.Mesh>
  markers: THREE.Mesh[]
  textures: Map<string, THREE.Texture>
  loader: THREE.TextureLoader
  geometry: Geometry | null
  charm: CharmRig | null
}

/** The sticker's picture worn the way the game wears it: random scratches and scuffs rub the ink away, more of them the higher the wear. */
function scratchedTexture(source: THREE.Texture, wear: number, seed: number): THREE.Texture {
  const image = source.image as CanvasImageSource & { width: number; height: number }
  const width = Math.max(64, Math.min(256, image.width || 256))
  const height = Math.max(64, Math.min(256, image.height || 256))
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext("2d")
  if (!context) return source
  context.drawImage(image, 0, 0, width, height)
  context.globalCompositeOperation = "destination-out"
  let state = (seed + 1) * 2654435761 >>> 0
  const random = () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 4294967296 }
  const lines = Math.round(wear * 46)
  for (let i = 0; i < lines; i += 1) {
    context.globalAlpha = 0.55 + random() * 0.45
    context.lineWidth = 0.6 + random() * 1.8
    context.lineCap = "round"
    const x = random() * width
    const y = random() * height
    const angle = random() * Math.PI
    const length = 10 + random() * width * 0.45
    context.beginPath()
    context.moveTo(x, y)
    context.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length)
    context.stroke()
  }
  const scuffs = Math.round(wear * 140)
  for (let i = 0; i < scuffs; i += 1) {
    context.globalAlpha = 0.5 + random() * 0.5
    context.beginPath()
    context.arc(random() * width, random() * height, 0.5 + random() * (1 + wear * 3), 0, Math.PI * 2)
    context.fill()
  }
  const worn = new THREE.CanvasTexture(canvas)
  worn.colorSpace = THREE.SRGBColorSpace
  return worn
}

const SKIP_MATERIAL = /bare_arm|scope/i

/** The biggest mesh of the model, which is the gun's body: the stickers go on it. */
function bodyMesh(root: THREE.Object3D): THREE.Mesh | null {
  let best: THREE.Mesh | null = null
  let bestScore = -Infinity
  root.traverse((node) => {
    const mesh = node as THREE.Mesh
    if (!mesh.isMesh || !mesh.geometry || !mesh.material) return
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    if (materials.some((material) => SKIP_MATERIAL.test(String(material?.name ?? "")))) return
    mesh.geometry.computeBoundingBox()
    const box = mesh.geometry.boundingBox
    if (!box) return
    const s = box.getSize(new THREE.Vector3())
    const score = s.x * s.y + s.x * s.z + s.y * s.z
    if (score > bestScore) { bestScore = score; best = mesh }
  })
  return best
}

/** A keychain: three chain links and a plaque made of layers of the charm's picture, so it has thickness seen from the side. */
function buildCharm(edge: number): CharmRig {
  const anchor = new THREE.Group()
  const swing = new THREE.Group()
  anchor.add(swing)
  const metal = new THREE.MeshStandardMaterial({ color: 0xb9bdc6, metalness: 1, roughness: 0.35 })
  const meshes: THREE.Mesh[] = []
  const linkGeometry = new THREE.TorusGeometry(edge * 0.07, edge * 0.018, 8, 16)
  for (let i = 0; i < 3; i++) {
    const link = new THREE.Mesh(linkGeometry, metal)
    link.position.y = -(edge * 0.07 + i * edge * 0.11)
    link.rotation.y = i % 2 ? Math.PI / 2 : 0
    swing.add(link)
    meshes.push(link)
  }
  const chain = edge * 0.1 + 3 * edge * 0.11
  const layers = 9
  const thickness = edge * 0.14
  const plane = new THREE.PlaneGeometry(edge, edge)
  const materials: THREE.MeshStandardMaterial[] = []
  for (let k = 0; k < layers; k++) {
    const outer = k === 0 || k === layers - 1
    const material = new THREE.MeshStandardMaterial({ color: outer ? 0xffffff : 0x8a8d96, transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.55, metalness: 0.1 })
    const layer = new THREE.Mesh(plane, material)
    layer.position.set(0, -(chain + edge / 2), (k / (layers - 1) - 0.5) * thickness)
    swing.add(layer)
    materials.push(material)
    meshes.push(layer)
  }
  return { anchor, swing, materials, meshes, length: chain + edge / 2, angle: 0, speed: 3, last: new THREE.Vector3(), lastVelocity: 0 }
}

export default function StudioStage3D({ choice, stickers, charm, selection, label, onSelect, onMove }: {
  choice: WeaponModelChoice
  stickers: StageSticker[]
  charm: StageCharm | null
  selection: StageSelection
  label: string
  onSelect: (selection: StageSelection) => void
  onMove: (pick: Pick, offsetX: number, offsetY: number) => void
}) {
  const host = useRef<HTMLDivElement>(null)
  const ctx = useRef<Ctx | null>(null)
  const [state, setState] = useState<"loading" | "ready" | "error">("loading")
  const [pictureFailed, setPictureFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const live = useRef({ choice, onSelect, onMove })
  live.current = { choice, onSelect, onMove }

  /* ---- the scene and the gun ---------------------------------------------------------------------------------------------------------------------- */
  useEffect(() => {
    const element = host.current
    if (!element) return
    setState("loading")
    let disposed = false
    let frame = 0
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    element.appendChild(renderer.domElement)
    renderer.domElement.style.cssText = "width:100%;height:100%;display:block;touch-action:none"
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(35, 1, 0.005, 100)
    // A plain room's light gives the metal something to reflect without downloading a picture.
    const environment = new THREE.PMREMGenerator(renderer)
    scene.environment = environment.fromScene(new RoomEnvironment(), 0.04).texture
    scene.add(new THREE.HemisphereLight(0xffffff, 0x404040, 0.9))
    const key1 = new THREE.DirectionalLight(0xffffff, 1.6)
    key1.position.set(3, 4, 5)
    scene.add(key1)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enablePan = false
    controls.enableDamping = true
    const root = new THREE.Group()
    scene.add(root)
    const loader = new THREE.TextureLoader()
    loader.setCrossOrigin("anonymous")
    const context: Ctx = { scene, camera, renderer, controls, items: new Map(), markers: [], textures: new Map(), loader, geometry: null, charm: null }
    ctx.current = context

    const resize = () => {
      const { clientWidth: width, clientHeight: height } = element
      if (!width || !height) return
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(element)
    resize()

    // Grabbing: a sticker or the charm moves along the gun's side (the plane of its slot), so the offsets are the ones the plugin stores.
    const raycaster = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    let held: Pick | null = null
    const setPointer = (event: PointerEvent) => {
      const box = renderer.domElement.getBoundingClientRect()
      pointer.set(((event.clientX - box.left) / box.width) * 2 - 1, -((event.clientY - box.top) / box.height) * 2 + 1)
      raycaster.setFromCamera(pointer, camera)
    }
    const down = (event: PointerEvent) => {
      setPointer(event)
      const targets = [...context.items.values(), ...context.markers, ...(context.charm?.meshes ?? [])].filter((mesh) => mesh.visible)
      const hit = raycaster.intersectObjects(targets, false)[0]
      const pick = hit?.object.userData.pick as Pick | undefined
      if (!pick) return
      held = pick
      controls.enabled = false
      renderer.domElement.setPointerCapture(event.pointerId)
      live.current.onSelect(pick.kind === "charm" ? { kind: "charm" } : { kind: "sticker", slot: pick.slot })
    }
    const move = (event: PointerEvent) => {
      if (!held || !context.geometry) return
      setPointer(event)
      const slotFrame = held.kind === "charm" ? context.geometry.charm : context.geometry.slots[held.slot]
      if (!slotFrame) return
      const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -slotFrame.position[2])
      const point = raycaster.ray.intersectPlane(plane, new THREE.Vector3())
      if (!point) return
      const offset = offsetOnPlane(slotFrame, [point.x, point.y, point.z], context.geometry.reach)
      live.current.onMove(held, Math.round(offset.x * 1000) / 1000, Math.round(offset.y * 1000) / 1000)
    }
    const up = (event: PointerEvent) => {
      if (!held) return
      held = null
      controls.enabled = true
      if (renderer.domElement.hasPointerCapture(event.pointerId)) renderer.domElement.releasePointerCapture(event.pointerId)
    }
    // Development only: where an item is on screen, for trying the grab in a browser test.
    if (import.meta.env.DEV) {
      ;(window as unknown as { __studio3d?: (id: string) => [number, number] | null }).__studio3d = (id) => {
        const mesh = id === "charm:0" ? context.charm?.meshes[context.charm.meshes.length - 1] : context.items.get(id)
        if (!mesh) return null
        const box = renderer.domElement.getBoundingClientRect()
        const p = new THREE.Box3().setFromObject(mesh).getCenter(new THREE.Vector3()).project(camera)
        return [box.left + ((p.x + 1) / 2) * box.width, box.top + ((1 - p.y) / 2) * box.height]
      }
    }
    renderer.domElement.addEventListener("pointerdown", down)
    renderer.domElement.addEventListener("pointermove", move)
    renderer.domElement.addEventListener("pointerup", up)
    renderer.domElement.addEventListener("pointercancel", up)

    const choice = live.current.choice
    const textures = choice.textureUrls
      ? Promise.all([loader.loadAsync(choice.textureUrls[0]), choice.textureUrls[1] ? loader.loadAsync(choice.textureUrls[1]).catch(() => null) : Promise.resolve(null)]).catch(() => null)
      : Promise.resolve(null)
    Promise.all([new GLTFLoader().loadAsync(choice.modelUrl), textures])
      .then(([gltf, paint]) => {
        if (disposed) return
        const model = gltf.scene
        if (paint) {
          const [colour, metal] = paint
          for (const texture of [colour, metal]) {
            if (!texture) continue
            texture.flipY = false
            texture.wrapS = THREE.RepeatWrapping
            texture.anisotropy = renderer.capabilities.getMaxAnisotropy()
          }
          colour.colorSpace = THREE.SRGBColorSpace
          if (metal) metal.colorSpace = THREE.NoColorSpace
          model.traverse((node) => {
            const mesh = node as THREE.Mesh
            if (!mesh.isMesh || !mesh.material) return
            const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
            const next = list.map((material) => {
              if (!material || SKIP_MATERIAL.test(String(material.name ?? ""))) return material
              const clone = (material as THREE.MeshStandardMaterial).clone()
              clone.map = colour
              clone.color = new THREE.Color(0xffffff)
              clone.metalnessMap = metal
              if (metal && "metalness" in clone) clone.metalness = 1
              clone.needsUpdate = true
              return clone
            })
            mesh.material = Array.isArray(mesh.material) ? next : next[0]!
          })
        }
        root.add(model)
        root.updateMatrixWorld(true)
        // The camera frames the gun itself: arms and scopes the source ships with the model must not stretch the box (the gun would sit small in the middle of it).
        const all = new THREE.Box3()
        model.traverse((node) => {
          const mesh = node as THREE.Mesh
          if (!mesh.isMesh || !mesh.geometry) return
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
          if (materials.some((material) => SKIP_MATERIAL.test(String(material?.name ?? "")))) return
          all.expandByObject(mesh)
        })
        if (all.isEmpty()) all.setFromObject(model)
        const middle = all.getCenter(new THREE.Vector3())
        const length = Math.max(all.getSize(new THREE.Vector3()).x, 0.0001)
        // The camera looks at the gun from its right side (+z), where the sticker slots are.
        controls.target.copy(middle)
        camera.position.set(middle.x + length * 0.08, middle.y + length * 0.06, middle.z + (length / 2 / Math.tan((camera.fov * Math.PI) / 360)) * 0.9)
        controls.minDistance = length * 0.35
        controls.maxDistance = length * 3
        controls.update()

        const target = bodyMesh(model)
        if (target) {
          const box = new THREE.Box3().setFromObject(target)
          const size = box.getSize(new THREE.Vector3())
          const centre = box.getCenter(new THREE.Vector3())
          const side = box.max.z
          const frameAt = (x: number, y: number): SlotFrame => ({ position: [x, y, side], normal: [0, 0, 1], up: [0, 1, 0] })
          const slots = Array.from({ length: 5 }, (_, slot) => {
            const [fx, fy, distance] = choice.projectors[slot] ?? [0, 0, 0]
            return fx === 0 && fy === 0 && distance === 0 ? null : frameAt(centre.x + fx * size.x, centre.y + fy * size.y)
          })
          // The source has no spot for the charm: it hangs near the back of the gun, low (a guess, move it where it belongs).
          context.geometry = { target, size, reach: [size.x, size.y], slots, charm: frameAt(centre.x - size.x * 0.42, centre.y - size.y * 0.15) }
          slots.forEach((slotFrame, slot) => {
            if (!slotFrame) return
            const radius = size.x * 0.035
            const marker = new THREE.Mesh(new THREE.RingGeometry(radius * 0.75, radius, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, depthTest: false, side: THREE.DoubleSide }))
            marker.userData.pick = { kind: "sticker", slot } satisfies Pick
            marker.position.set(slotFrame.position[0], slotFrame.position[1], slotFrame.position[2] + size.z * 0.01)
            marker.renderOrder = 10
            scene.add(marker)
            context.markers.push(marker)
          })
        }
        setState("ready")
      })
      .catch(() => { if (!disposed) setState("error") })

    let before = performance.now()
    const tick = () => {
      frame = requestAnimationFrame(tick)
      if (document.hidden) return
      const now = performance.now()
      const dt = Math.min(0.05, (now - before) / 1000)
      before = now
      const rig = context.charm
      if (rig && dt > 0) {
        // A pendulum: gravity pulls it straight down, moving the hook sideways swings it, and the swing dies away.
        const velocity = (rig.anchor.position.x - rig.last.x) / dt
        const push = (velocity - rig.lastVelocity) / dt
        rig.last.copy(rig.anchor.position)
        rig.lastVelocity = velocity
        const acceleration = -(9.8 / rig.length) * Math.sin(rig.angle) - 2.2 * rig.speed - (Math.max(-60, Math.min(60, push)) / rig.length) * Math.cos(rig.angle)
        rig.speed += acceleration * dt
        rig.angle = Math.max(-1.2, Math.min(1.2, rig.angle + rig.speed * dt))
        rig.swing.rotation.z = rig.angle
      }
      controls.update()
      renderer.render(scene, camera)
    }
    tick()

    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      observer.disconnect()
      renderer.domElement.removeEventListener("pointerdown", down)
      renderer.domElement.removeEventListener("pointermove", move)
      renderer.domElement.removeEventListener("pointerup", up)
      renderer.domElement.removeEventListener("pointercancel", up)
      controls.dispose()
      scene.traverse((node) => {
        const mesh = node as THREE.Mesh
        if (!mesh.isMesh) return
        mesh.geometry.dispose()
        for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
          for (const value of Object.values(material)) if (value instanceof THREE.Texture) value.dispose()
          material.dispose()
        }
      })
      context.charm?.meshes.forEach((mesh) => { if (!(mesh.geometry instanceof THREE.PlaneGeometry) || mesh === context.charm?.meshes[0]) mesh.geometry.dispose() })
      context.textures.forEach((texture) => texture.dispose())
      scene.environment?.dispose()
      environment.dispose()
      renderer.dispose()
      renderer.domElement.remove()
      ctx.current = null
    }
  }, [choice.modelUrl, choice.textureUrls?.[0], attempt]) // eslint-disable-line react-hooks/exhaustive-deps -- rebuilt only for another gun or texture; the rest is read from `live`

  /* ---- the stickers and the charm, from the editor's state ---------------------------------------------------------------------------------------- */
  useEffect(() => {
    const context = ctx.current
    const geometry = context?.geometry
    if (!context || !geometry || state !== "ready") return
    const { size } = geometry
    const wanted = new Set<string>()

    const texture = (url: string | null, apply: (texture: THREE.Texture) => void, fail: () => void) => {
      if (!url) return
      const cached = context.textures.get(url)
      if (cached) { apply(cached); return }
      const done = (loaded: THREE.Texture) => { loaded.colorSpace = THREE.SRGBColorSpace; context.textures.set(url, loaded); apply(loaded) }
      // WebGL may only read a picture whose host answers with CORS headers, and Steam's CDN does not: then the picture comes through an image proxy that does (wsrv.nl, game art only, no personal data).
      const viaProxy = () => {
        const plain = url.replace(/[?&]catalog_item_id=[^&]*/, "")
        context.loader.load(`https://wsrv.nl/?url=${encodeURIComponent(plain)}&output=png`, done, undefined, () => { setPictureFailed(true); fail() })
      }
      context.loader.load(url, done, undefined, viaProxy)
    }
    const put = (id: string, pick: Pick, build: () => THREE.BufferGeometry, url: string | null, opacity: number, order: number, wear = 0) => {
      wanted.add(id)
      let mesh = context.items.get(id)
      if (!mesh) {
        mesh = new THREE.Mesh(build(), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, side: THREE.DoubleSide }))
        mesh.userData.pick = pick
        mesh.renderOrder = order
        context.scene.add(mesh)
        context.items.set(id, mesh)
      } else {
        mesh.geometry.dispose()
        mesh.geometry = build()
      }
      const material = mesh.material as THREE.MeshBasicMaterial
      material.opacity = opacity
      const wearKey = Math.round(wear * 20)
      const key = url ? `${url}|${wearKey}|${id}` : null
      if (url && material.userData.url !== key) {
        material.userData.url = key
        texture(url, (plain) => { const loaded = wearKey > 0 ? scratchedTexture(plain, wearKey / 20, order) : plain; if (material.userData.url === key) { if (material.map instanceof THREE.CanvasTexture) material.map.dispose(); material.map = loaded; material.color.set(0xffffff); material.needsUpdate = true } }, () => { material.color.set(0x888888); material.needsUpdate = true })
      }
    }

    for (const sticker of stickers) {
      const slotFrame = geometry.slots[sticker.slot]
      if (!slotFrame) continue
      const point = pointOnPlane(slotFrame, { x: sticker.offsetX, y: sticker.offsetY }, geometry.reach)
      const edge = size.x * 0.085 * sticker.scale
      const depth = size.z * 0.5
      // A box laid over the gun's right side, deep enough to catch its surface: the sticker is cut out of the surface inside it.
      const position = new THREE.Vector3(point[0], point[1], slotFrame.position[2] - depth / 2)
      const orientation = new THREE.Euler(0, 0, THREE.MathUtils.degToRad(sticker.rotation))
      put(`sticker:${sticker.slot}`, { kind: "sticker", slot: sticker.slot }, () => new DecalGeometry(geometry.target, position, orientation, new THREE.Vector3(edge, edge, depth)), sticker.imageUrl, 1 - sticker.wear * 0.2, 5 + sticker.slot, sticker.wear)
    }
    if (charm) {
      const edge = size.x * 0.09
      let rig = context.charm
      if (!rig) {
        rig = buildCharm(edge)
        context.charm = rig
        context.scene.add(rig.anchor)
        rig.meshes.forEach((mesh) => { mesh.userData.pick = { kind: "charm", slot: 0 } satisfies Pick })
        rig.speed = 3
      }
      const point = pointOnPlane(geometry.charm, { x: charm.offsetX, y: charm.offsetY }, geometry.reach)
      rig.anchor.position.set(point[0], point[1], geometry.charm.position[2] + size.z * 0.1 + charm.offsetZ * size.z)
      const url = charm.imageUrl
      const first = rig.materials[0]
      if (url && first && first.userData.url !== url) {
        rig.materials.forEach((material) => { material.userData.url = url })
        texture(url, (loaded) => { rig.materials.forEach((material) => { if (material.userData.url === url) { material.map = loaded; material.needsUpdate = true } }) }, () => rig.materials.forEach((material) => { material.color.set(0x888888) }))
      }
    } else if (context.charm) {
      context.scene.remove(context.charm.anchor)
      context.charm.meshes.forEach((mesh) => { if (!(mesh.geometry instanceof THREE.PlaneGeometry)) mesh.geometry.dispose() })
      context.charm.materials.forEach((material) => material.dispose())
      context.charm = null
    }
    for (const [id, mesh] of context.items) {
      if (wanted.has(id)) continue
      context.scene.remove(mesh)
      mesh.geometry.dispose()
      ;(mesh.material as THREE.Material).dispose()
      context.items.delete(id)
    }
    // A slot's ring shows while it is empty or picked.
    context.markers.forEach((marker) => {
      const slot = (marker.userData.pick as Pick).slot
      marker.visible = !wanted.has(`sticker:${slot}`) || (selection?.kind === "sticker" && selection.slot === slot)
    })
  }, [stickers, charm, selection, state])

  return (
    <div className="relative size-full" role="img" aria-label={`${label}, 3D view. Drag a sticker or the charm to move it; drag the gun to turn it.`}>
      <div ref={host} className="size-full cursor-grab active:cursor-grabbing" />
      {pictureFailed && state === "ready" && <p className="pointer-events-none absolute inset-x-0 bottom-2 text-center text-[11px] text-[var(--text-dim)]">A sticker or charm picture could not be loaded.</p>}
      {state === "loading" && <Skeleton className="pointer-events-none absolute inset-0 rounded-xl bg-[var(--line-soft)]" />}
      {state === "error" && (
        <p className="absolute inset-0 flex items-center justify-center gap-3 text-[13px] text-[var(--text-dim)]">
          Could not load the 3D model.
          <button type="button" onClick={() => setAttempt((count) => count + 1)} className="inline-flex items-center gap-1.5 text-[var(--text-2)] hover:text-[var(--text)]"><RotateCcw className="size-3.5" />Retry</button>
        </p>
      )}
    </div>
  )
}
