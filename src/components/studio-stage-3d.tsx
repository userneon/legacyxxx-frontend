/**
 * The Advanced studio's 3D view of a gun (three.js, loaded only when a gun has a model, see public/models/weapons/README.md). Turn it with the pointer on the
 * gun itself; grab a sticker or the charm and it moves on its own slot's plane, and what you drop is the same offsets the game stores (lib/studio-layout.ts).
 * The skin's texture, when the skin has one, goes on the material called "skin" (or the only material).
 */
import { useEffect, useRef, useState } from "react"
import { RotateCcw } from "lucide-react"
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"

import { Skeleton } from "@/components/ui/skeleton"
import { frameAxes, offsetOnPlane, pointOnPlane, type SlotFrame } from "@/lib/studio-layout"
import type { WeaponModelChoice } from "@/lib/weapon-models"

export interface StageSticker { slot: number; imageUrl: string | null; offsetX: number; offsetY: number; scale: number; rotation: number; wear: number }
export interface StageCharm { imageUrl: string | null; offsetX: number; offsetY: number; offsetZ: number }
export type StageSelection = { kind: "sticker"; slot: number } | { kind: "charm" } | null

interface Pick { kind: "sticker" | "charm"; slot: number }
interface Ctx {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  controls: OrbitControls
  root: THREE.Group
  items: Map<string, THREE.Mesh>
  markers: THREE.Mesh[]
  textures: Map<string, THREE.Texture>
  loader: THREE.TextureLoader
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
    scene.add(new THREE.HemisphereLight(0xffffff, 0x404040, 1.6))
    const key1 = new THREE.DirectionalLight(0xffffff, 2.2)
    key1.position.set(3, 4, 5)
    scene.add(key1)
    const rim = new THREE.DirectionalLight(0xffffff, 0.8)
    rim.position.set(-4, 1, -3)
    scene.add(rim)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enablePan = false
    controls.enableDamping = true
    const root = new THREE.Group()
    scene.add(root)
    const loader = new THREE.TextureLoader()
    loader.setCrossOrigin("anonymous")
    const context: Ctx = { scene, camera, renderer, controls, root, items: new Map(), markers: [], textures: new Map(), loader }
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

    // Grabbing: a sticker or the charm moves on its own slot's plane, so the offsets are those of the game.
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
      const targets = [...context.items.values(), ...context.markers].filter((mesh) => mesh.visible)
      const hit = raycaster.intersectObjects(targets, false)[0]
      const pick = hit?.object.userData.pick as Pick | undefined
      if (!pick) return
      held = pick
      controls.enabled = false
      renderer.domElement.setPointerCapture(event.pointerId)
      live.current.onSelect(pick.kind === "charm" ? { kind: "charm" } : { kind: "sticker", slot: pick.slot })
    }
    const move = (event: PointerEvent) => {
      if (!held) return
      setPointer(event)
      const { choice: current } = live.current
      const slotFrame: SlotFrame | null = held.kind === "charm" ? current.charm : current.slots[held.slot] ?? null
      if (!slotFrame) return
      const local = new THREE.Ray(raycaster.ray.origin.clone(), raycaster.ray.direction.clone()).applyMatrix4(root.matrixWorld.clone().invert())
      const axes = frameAxes(slotFrame)
      const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(new THREE.Vector3(...axes.normal), new THREE.Vector3(...slotFrame.position))
      const point = local.intersectPlane(plane, new THREE.Vector3())
      if (!point) return
      const offset = offsetOnPlane(slotFrame, [point.x, point.y, point.z], current.reach)
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
        const mesh = context.items.get(id)
        if (!mesh) return null
        const box = renderer.domElement.getBoundingClientRect()
        const p = mesh.getWorldPosition(new THREE.Vector3()).project(camera)
        return [box.left + ((p.x + 1) / 2) * box.width, box.top + ((1 - p.y) / 2) * box.height]
      }
    }
    renderer.domElement.addEventListener("pointerdown", down)
    renderer.domElement.addEventListener("pointermove", move)
    renderer.domElement.addEventListener("pointerup", up)
    renderer.domElement.addEventListener("pointercancel", up)

    const choice = live.current.choice
    const skinTexture = choice.textureUrl ? loader.loadAsync(choice.textureUrl).catch(() => null) : Promise.resolve(null)
    Promise.all([new GLTFLoader().loadAsync(choice.modelUrl), skinTexture])
      .then(([gltf, texture]) => {
        if (disposed) return
        const model = gltf.scene
        if (texture) {
          texture.flipY = false
          texture.colorSpace = THREE.SRGBColorSpace
          texture.anisotropy = renderer.capabilities.getMaxAnisotropy()
          const materials = new Set<THREE.MeshStandardMaterial>()
          model.traverse((node) => {
            const mesh = node as THREE.Mesh
            if (!mesh.isMesh) return
            for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) if ((material as THREE.MeshStandardMaterial).isMeshStandardMaterial) materials.add(material as THREE.MeshStandardMaterial)
          })
          const list = [...materials]
          for (const material of list.length === 1 ? list : list.filter((entry) => /skin/i.test(entry.name))) {
            material.map = texture
            material.needsUpdate = true
          }
        }
        // The gun sits in `root` unchanged, so the manifest's slot coordinates are its own; only `root` moves it to the middle of the view.
        root.add(model)
        const box = new THREE.Box3().setFromObject(model)
        const size = box.getSize(new THREE.Vector3())
        root.position.copy(box.getCenter(new THREE.Vector3()).multiplyScalar(-1))
        root.updateMatrixWorld(true)
        const longest = Math.max(size.x, size.y, size.z) || 1
        const distance = (longest / 2 / Math.tan((camera.fov * Math.PI) / 360)) * 1.4
        camera.position.set(distance * 0.2, distance * 0.15, distance)
        controls.minDistance = distance * 0.4
        controls.maxDistance = distance * 2.5
        controls.update()
        // A ring on every slot, so an empty slot can be picked on the gun too.
        choice.slots.forEach((slotFrame, slot) => {
          const marker = new THREE.Mesh(new THREE.RingGeometry(choice.reach * 0.35, choice.reach * 0.45, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthTest: false, side: THREE.DoubleSide }))
          marker.userData.pick = { kind: "sticker", slot } satisfies Pick
          placeOnFrame(marker, slotFrame, { x: 0, y: 0 }, choice.reach, 0, 0.0005)
          marker.renderOrder = 10
          root.add(marker)
          context.markers.push(marker)
        })
        setState("ready")
      })
      .catch(() => { if (!disposed) setState("error") })

    const tick = () => {
      frame = requestAnimationFrame(tick)
      if (document.hidden) return
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
      context.textures.forEach((texture) => texture.dispose())
      renderer.dispose()
      renderer.domElement.remove()
      ctx.current = null
    }
  }, [choice.modelUrl, choice.textureUrl, attempt]) // the gun is rebuilt only for another model or texture; slots are read from `live`

  /* ---- the stickers and the charm, from the editor's state ---------------------------------------------------------------------------------------- */
  useEffect(() => {
    const context = ctx.current
    if (!context || state !== "ready") return
    const wanted = new Map<string, { pick: Pick; imageUrl: string | null; frame: SlotFrame; offset: { x: number; y: number }; z: number; size: number; rotation: number; opacity: number }>()
    for (const sticker of stickers) {
      const slotFrame = choice.slots[sticker.slot]
      if (slotFrame) wanted.set(`sticker:${sticker.slot}`, { pick: { kind: "sticker", slot: sticker.slot }, imageUrl: sticker.imageUrl, frame: slotFrame, offset: { x: sticker.offsetX, y: sticker.offsetY }, z: 0, size: choice.reach * 1.1 * sticker.scale, rotation: sticker.rotation, opacity: 1 - sticker.wear * 0.6 })
    }
    if (charm && choice.charm) wanted.set("charm:0", { pick: { kind: "charm", slot: 0 }, imageUrl: charm.imageUrl, frame: choice.charm, offset: { x: charm.offsetX, y: charm.offsetY }, z: charm.offsetZ * choice.reach, size: choice.reach * 1.4, rotation: 0, opacity: 1 })
    for (const [id, mesh] of context.items) {
      if (wanted.has(id)) continue
      context.root.remove(mesh)
      mesh.geometry.dispose()
      ;(mesh.material as THREE.Material).dispose()
      context.items.delete(id)
    }
    for (const [id, item] of wanted) {
      let mesh = context.items.get(id)
      if (!mesh) {
        mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 }))
        mesh.userData.pick = item.pick
        mesh.renderOrder = 5
        context.root.add(mesh)
        context.items.set(id, mesh)
      }
      const material = mesh.material as THREE.MeshBasicMaterial
      material.opacity = item.opacity
      const url = item.imageUrl
      if (url && material.userData.url !== url) {
        material.userData.url = url
        const cached = context.textures.get(url)
        const apply = (texture: THREE.Texture) => { texture.colorSpace = THREE.SRGBColorSpace; material.map = texture; material.color.set(0xffffff); material.needsUpdate = true }
        if (cached) apply(cached)
        else context.loader.load(url, (texture) => { context.textures.set(url, texture); if (material.userData.url === url) apply(texture) }, undefined, () => { material.color.set(0x888888); material.needsUpdate = true })
      }
      mesh.scale.set(item.size, item.size, 1)
      placeOnFrame(mesh, item.frame, item.offset, choice.reach, item.rotation, 0.001 + item.z)
    }
    // A slot's ring shows while it is empty or picked.
    context.markers.forEach((marker, slot) => { marker.visible = !wanted.has(`sticker:${slot}`) || (selection?.kind === "sticker" && selection.slot === slot) })
  }, [stickers, charm, selection, choice, state])

  return (
    <div className="relative size-full" role="img" aria-label={`${label}, 3D view. Drag a sticker or the charm to move it; drag the gun to turn it.`}>
      <div ref={host} className="size-full cursor-grab active:cursor-grabbing" />
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

/** Puts a flat mesh on a slot: on its plane at the offsets, facing out of the surface, turned `rotation` degrees, a little off the surface (`lift`). */
function placeOnFrame(mesh: THREE.Mesh, slotFrame: SlotFrame, offset: { x: number; y: number }, reach: number, rotation: number, lift: number) {
  const axes = frameAxes(slotFrame)
  const point = pointOnPlane(slotFrame, offset, reach)
  const right = new THREE.Vector3(...axes.right), up = new THREE.Vector3(...axes.up), normal = new THREE.Vector3(...axes.normal)
  mesh.position.set(point[0] + axes.normal[0] * lift, point[1] + axes.normal[1] * lift, point[2] + axes.normal[2] * lift)
  mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, up, normal))
  mesh.rotateZ(THREE.MathUtils.degToRad(rotation))
}
