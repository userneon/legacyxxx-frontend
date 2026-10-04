import { useCallback, useEffect, useRef, useState } from "react"
import { RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Skin3dSource } from "@/lib/skin-3d"

export interface ViewerSticker { slot: number; image: string; scale: number; rotation: number }
export interface ViewerCharm { image: string }

interface SceneContext {
  THREE: typeof import("three")
  Decal: typeof import("three/examples/jsm/geometries/DecalGeometry.js").DecalGeometry
  extras: import("three").Group
  body: import("three").Mesh
  box: import("three").Box3
}


/** Frees the GPU memory of an object that was added for a sticker or the charm. */
function disposeExtra(object: import("three").Object3D) {
  object.traverse((node) => {
    const item = node as import("three").Object3D & { geometry?: import("three").BufferGeometry; material?: import("three").Material | import("three").Material[] }
    item.geometry?.dispose()
    ;[item.material].flat().forEach((material) => {
      if (!material) return
      ;(material as import("three").Material & { map?: import("three").Texture | null }).map?.dispose()
      material.dispose()
    })
  })
}

/** Fixed camera angles: azimuth in radians around the weapon (PI = left side, muzzle to the right), elevation in degrees. */
const VIEWS = [
  { id: "side", label: "Side", azimuth: Math.PI, elevation: 7 },
  { id: "side2", label: "Other side", azimuth: 0, elevation: 7 },
  { id: "front", label: "Front", azimuth: -Math.PI / 2, elevation: 12 },
  { id: "rear", label: "Rear", azimuth: Math.PI / 2, elevation: 12 },
  { id: "top", label: "Top", azimuth: Math.PI, elevation: 62 },
] as const

type ViewId = (typeof VIEWS)[number]["id"]

interface Props {
  source: Skin3dSource
  label: string
  /** Stickers by slot and the charm, drawn on the weapon. */
  stickers?: ViewerSticker[]
  charm?: ViewerCharm | null
  className?: string
  /** Called when this browser cannot draw 3D, so the caller can fall back to the picture. */
  onUnavailable?: () => void
}

/**
 * A weapon in 3D at a few fixed angles (no free rotation). three.js is loaded on first use, so the rest of the site
 * does not pay for it.
 */
export function SkinViewer({ source, label, stickers = [], charm = null, className, onUnavailable }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<SceneContext | null>(null)
  const refitRef = useRef<() => void>(() => {})
  const goalRef = useRef<{ azimuth: number; elevation: number }>({ azimuth: Math.PI, elevation: 7 })
  const [view, setView] = useState<ViewId>("side")
  const [progress, setProgress] = useState(0)
  const [state, setState] = useState<"loading" | "ready" | "error">("loading")
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let disposed = false
    let frame = 0
    let cleanup = () => {}
    setState("loading")
    setProgress(0)

    ;(async () => {
      const THREE = await import("three")
      const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js")
      const { RoomEnvironment } = await import("three/examples/jsm/environments/RoomEnvironment.js")
      const { DecalGeometry } = await import("three/examples/jsm/geometries/DecalGeometry.js")
      if (disposed) return

      let renderer: InstanceType<typeof THREE.WebGLRenderer>
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
      } catch {
        onUnavailable?.()
        return
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.outputColorSpace = THREE.SRGBColorSpace
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.domElement.className = "block size-full"
      host.appendChild(renderer.domElement)

      const scene = new THREE.Scene()
      const environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04)
      scene.environment = environment.texture
      const light = new THREE.DirectionalLight(0xffffff, 2.2)
      light.position.set(3, 5, 4)
      scene.add(light)
      const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 1000)

      const resize = () => {
        const { clientWidth: w, clientHeight: h } = host
        if (!w || !h) return
        renderer.setSize(w, h, false)
        camera.aspect = w / h
        camera.updateProjectionMatrix()
        refitRef.current()
      }
      const observer = new ResizeObserver(resize)
      observer.observe(host)
      resize()

      const textures: InstanceType<typeof THREE.Texture>[] = []
      const loadTexture = (url: string) => {
        const texture = new THREE.TextureLoader().load(url)
        texture.colorSpace = THREE.SRGBColorSpace
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping
        texture.flipY = false
        texture.anisotropy = 8
        textures.push(texture)
        return texture
      }

      let distance = 1
      let fitBox = new THREE.Vector3(1, 1, 1)
      // Far enough that the whole weapon fits the canvas, whatever its shape (a wide window or a phone).
      const fit = () => {
        const halfFov = Math.tan((camera.fov * Math.PI) / 360)
        const forHeight = (fitBox.y * 1.7) / 2 / halfFov
        const forWidth = (fitBox.x * 1.12) / 2 / (halfFov * camera.aspect)
        distance = Math.max(forHeight, forWidth) + fitBox.z / 2
      }
      refitRef.current = fit
      const current = { azimuth: goalRef.current.azimuth, elevation: goalRef.current.elevation }
      const place = () => {
        const elevation = (current.elevation * Math.PI) / 180
        camera.position.set(
          distance * Math.sin(current.azimuth) * Math.cos(elevation),
          distance * Math.sin(elevation),
          distance * Math.cos(current.azimuth) * Math.cos(elevation),
        )
        camera.lookAt(0, 0, 0)
      }
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
      const tick = () => {
        frame = requestAnimationFrame(tick)
        const k = reduceMotion.matches ? 1 : 0.12
        current.azimuth += (goalRef.current.azimuth - current.azimuth) * k
        current.elevation += (goalRef.current.elevation - current.elevation) * k
        place()
        renderer.render(scene, camera)
      }

      cleanup = () => {
        cancelAnimationFrame(frame)
        observer.disconnect()
        textures.forEach((texture) => texture.dispose())
        environment.dispose()
        scene.traverse((object) => {
          const mesh = object as InstanceType<typeof THREE.Mesh>
          if (mesh.isMesh) {
            mesh.geometry.dispose()
            ;[mesh.material].flat().forEach((material) => material.dispose())
          }
        })
        renderer.dispose()
        renderer.domElement.remove()
      }
      if (disposed) { cleanup(); return }

      new GLTFLoader().load(
        source.model,
        (gltf) => {
          if (disposed) return
          // The first child is the first-person arms; the weapon is the rest.
          gltf.scene.remove(gltf.scene.children[0]!)
          const map = loadTexture(source.texture)
          const metal = loadTexture(source.textureMetal)
          gltf.scene.traverse((object) => {
            const mesh = object as InstanceType<typeof THREE.Mesh>
            const material = mesh.material as InstanceType<typeof THREE.MeshStandardMaterial> | undefined
            if (mesh.isMesh && material && !/bare_arm|scope/.test(material.name || "")) {
              material.map = map
              material.metalnessMap = metal
              material.needsUpdate = true
            }
          })
          const box = new THREE.Box3().setFromObject(gltf.scene)
          gltf.scene.position.sub(box.getCenter(new THREE.Vector3()))
          const pivot = new THREE.Group()
          pivot.add(gltf.scene)
          pivot.rotation.y = Math.PI
          scene.add(pivot)
          fitBox = box.getSize(new THREE.Vector3())
          fit()
          place()
          // The biggest mesh is the weapon body; stickers are projected onto it.
          pivot.updateMatrixWorld(true)
          let body: InstanceType<typeof THREE.Mesh> | null = null
          let bodyScore = -Infinity
          gltf.scene.traverse((object) => {
            const mesh = object as InstanceType<typeof THREE.Mesh>
            if (!mesh.isMesh || /bare_arm|scope/.test(((mesh.material as { name?: string } | undefined)?.name) || "")) return
            const size = new THREE.Box3().setFromObject(mesh).getSize(new THREE.Vector3())
            const score = size.x * size.y + size.x * size.z + size.y * size.z
            if (score > bodyScore) { bodyScore = score; body = mesh }
          })
          const extras = new THREE.Group()
          scene.add(extras)
          if (body) sceneRef.current = { THREE, Decal: DecalGeometry, extras, body, box: new THREE.Box3().setFromObject(body) }
          setState("ready")
          tick()
        },
        (event) => { if (!disposed && event.total) setProgress(Math.round((event.loaded / event.total) * 100)) },
        () => { if (!disposed) setState("error") },
      )
    })().catch(() => { if (!disposed) setState("error") })

    return () => { disposed = true; sceneRef.current = null; cleanup() }
  }, [source.model, source.texture, source.textureMetal, attempt, onUnavailable])

  // Stickers and the charm: rebuilt whenever the choice changes. Sticker pictures that cannot be fetched (for example a
  // host that refuses cross-origin use) are skipped, so a missing picture never breaks the view.
  const accessoryKey = JSON.stringify([stickers, charm])
  const accessoriesRef = useRef({ stickers, charm })
  accessoriesRef.current = { stickers, charm }
  useEffect(() => {
    const ctx = sceneRef.current
    if (state !== "ready" || !ctx) return
    let cancelled = false
    const { THREE, Decal, extras, body, box } = ctx
    for (const child of [...extras.children]) { extras.remove(child); disposeExtra(child) }
    const { stickers: wanted, charm: wantedCharm } = accessoriesRef.current
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    const loader = new THREE.TextureLoader()
    loader.setCrossOrigin("anonymous")
    const load = (url: string) => loader.loadAsync(url).then((texture) => { texture.colorSpace = THREE.SRGBColorSpace; return texture }).catch(() => null)
    const raycaster = new THREE.Raycaster()

    ;(async () => {
      for (const sticker of wanted) {
        const slot = source.stickerSlots[sticker.slot]
        if (!slot) continue
        const texture = await load(sticker.image)
        if (cancelled) { texture?.dispose(); return }
        if (!texture) continue
        const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1, toneMapped: false })
        const edge = size.x * 0.1 * sticker.scale
        // Shallow on purpose: the weapon is thin, and a deeper box would also print the sticker on the wall behind it.
        const depth = size.z * 0.45
        // A weapon carries each sticker on both sides, at the same place along its length.
        for (const side of [1, -1]) {
          raycaster.set(new THREE.Vector3(center.x + slot.x * size.x, center.y + slot.y * size.y, center.z + side * size.z * 3), new THREE.Vector3(0, 0, -side))
          const hit = raycaster.intersectObject(body, false)[0]
          if (!hit?.face) continue
          const normal = hit.face.normal.clone().transformDirection(body.matrixWorld)
          const aim = new THREE.Matrix4().lookAt(hit.point.clone().add(normal), hit.point, new THREE.Vector3(0, 1, 0))
          const orientation = new THREE.Euler().setFromRotationMatrix(aim)
          orientation.z += (sticker.rotation * Math.PI) / 180
          const decal = new THREE.Mesh(new Decal(body, hit.point, orientation, new THREE.Vector3(edge, edge, depth)), material)
          decal.renderOrder = 2
          extras.add(decal)
        }
      }
      if (wantedCharm && source.charmAnchor) {
        const texture = await load(wantedCharm.image)
        if (cancelled) { texture?.dispose(); return }
        if (texture) {
          // The charm hangs from a point on the weapon; it is a flat picture, not a model.
          const anchor = new THREE.Vector3(center.x + source.charmAnchor.x * size.x, center.y + source.charmAnchor.y * size.y, center.z)
          const height = size.x * 0.09
          const rope = height * 0.5
          extras.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([anchor, anchor.clone().setY(anchor.y - rope)]), new THREE.LineBasicMaterial({ color: 0x8a8a8a })))
          const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, toneMapped: false }))
          sprite.scale.set(height, height, 1)
          sprite.position.copy(anchor).setY(anchor.y - rope - height / 2)
          extras.add(sprite)
        }
      }
    })()

    return () => { cancelled = true }
  }, [state, accessoryKey, source.stickerSlots, source.charmAnchor])

  const pick = useCallback((next: (typeof VIEWS)[number]) => {
    const delta = Math.atan2(Math.sin(next.azimuth - goalRef.current.azimuth), Math.cos(next.azimuth - goalRef.current.azimuth))
    goalRef.current = { azimuth: goalRef.current.azimuth + delta, elevation: next.elevation }
    setView(next.id)
  }, [])

  return (
    <div className="flex flex-col gap-2">
      <div className={cn("relative overflow-hidden", className)} role="img" aria-label={`${label}, 3D view`}>
        <div ref={hostRef} className="absolute inset-0" />
        {state === "loading" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[11px] text-[var(--text-dim)]">
            <span>Loading 3D</span>
            <div className="h-1 w-32 overflow-hidden rounded-full bg-[var(--raised)]"><div className="h-full bg-[var(--accent-solid)] transition-[width]" style={{ width: `${progress}%` }} /></div>
          </div>
        )}
        {state === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center text-[11px] text-[var(--text-dim)]">
            <span>The 3D view could not load.</span>
            <button type="button" onClick={() => setAttempt((n) => n + 1)} className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--raised)] px-2.5 text-[11px] font-medium text-[var(--text)] hover:border-[var(--line-strong)]"><RotateCcw className="size-3.5" />Retry</button>
          </div>
        )}
      </div>
      {state === "ready" && (
        <div role="group" aria-label="Viewing angle" className="flex gap-1.5 overflow-x-auto">
          {VIEWS.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={view === option.id}
              onClick={() => pick(option)}
              className={cn(
                "h-7 shrink-0 rounded-full border px-3 text-[11px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-solid)]/50",
                view === option.id
                  ? "border-[var(--line-strong)] bg-[var(--raised)] text-[var(--text)]"
                  : "border-[var(--line)] bg-[var(--glass-fill)] text-[var(--text-muted)] hover:text-[var(--text)]",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
