import { useEffect, useState } from "react"
import { Clapperboard, Download, Loader2, RotateCcw } from "lucide-react"
import { toast } from "sonner"

import { creatorsService, downloadKitFile, type KitRender } from "@/api/creators"
import { useApiQuery } from "@/hooks/use-api-query"
import { cn } from "@/lib/utils"

const LAST = "legacyx_kit_render"
const read = () => { try { return window.localStorage.getItem(LAST) } catch { return null } }
const write = (id: string | null) => { try { if (id) window.localStorage.setItem(LAST, id); else window.localStorage.removeItem(LAST) } catch { /* a private window */ } }
const size = (bytes: number) => (bytes >= 1_000_000 ? `${(bytes / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1000))} KB`)
const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 24)

/**
 * The animated kit: slide-in lower third and code bar (transparent WebM), an end card and two GIFs, made by the server with the name and the code typed above
 * (a minute or so). Only for content creators and staff: for anyone else the server refuses the list and this shows nothing.
 */
export function CreatorKitAnimated({ name, code }: { name: string; code: string }) {
  const config = useApiQuery((signal) => creatorsService.kitRenderConfig({ signal }), { queryKey: "kit-render-config" })
  const [picked, setPicked] = useState<Set<string> | null>(null)
  const [job, setJob] = useState<KitRender | null>(null)
  const [busy, setBusy] = useState(false)
  const [saving, setSaving] = useState("")
  const [error, setError] = useState("")
  const items = config.data?.items ?? []
  // The big MOV copies (for video editors) are never ticked until asked for.
  const defaults = () => new Set(items.filter((item) => !item.heavy).map((item) => item.id))
  const chosen = picked ?? defaults()

  // Pick up the last job again after a reload.
  useEffect(() => {
    const id = read()
    if (!id || !config.data?.enabled) return
    creatorsService.kitRender(id).then(setJob).catch(() => write(null))
  }, [config.data?.enabled])

  const running = job?.status === "queued" || job?.status === "rendering"
  useEffect(() => {
    if (!running || !job) return
    const timer = window.setInterval(() => {
      creatorsService.kitRender(job.id).then(setJob).catch(() => undefined)
    }, 3000)
    return () => window.clearInterval(timer)
  }, [running, job])

  if (config.error || !config.data) return null
  const missing = items.filter((item) => chosen.has(item.id)).some((item) => (item.needs === "name" && !name) || (item.needs === "code" && code.length < 4) || (item.needs === "either" && !name && code.length < 4))

  const start = async () => {
    setBusy(true)
    setError("")
    try {
      const made = await creatorsService.startKitRender({ name, code, items: items.filter((item) => chosen.has(item.id)).map((item) => item.id) })
      write(made.id)
      setJob(await creatorsService.kitRender(made.id))
    } catch (failure) {
      setError((failure as { message?: string }).message ?? "Could not start")
    } finally {
      setBusy(false)
    }
  }
  const save = async (file: KitRender["files"][number]) => {
    setSaving(file.id)
    try { await downloadKitFile(file, `legacyx-${file.id}${name ? `-${slug(name)}` : ""}.${file.ext}`) } catch (failure) { toast.error((failure as Error).message) } finally { setSaving("") }
  }

  return (
    <section aria-label="Animated kit" className="flex flex-col gap-2.5">
      <h3 className="text-[11px] font-semibold uppercase tracking-[1.2px] text-[var(--text-faint)]">Animated <span className="font-normal normal-case tracking-normal text-[var(--text-dim)]">· made for you with your name and code, about a minute</span></h3>
      {!config.data.enabled ? (
        <p className="text-[13px] text-[var(--text-dim)]">Animations are not switched on yet. Ask staff.</p>
      ) : (
        <>
          <ul className="grid gap-2 sm:grid-cols-2">
            {items.map((item) => {
              const on = chosen.has(item.id)
              return (
                <li key={item.id}>
                  <label className={cn("flex cursor-pointer items-start gap-2.5 rounded-[10px] border bg-[var(--card-surface)] px-3 py-2.5 text-[13px] transition-colors", on ? "border-[var(--line-strong)] text-[var(--text)]" : "border-[var(--line)] text-[var(--text-dim)]")}>
                    <input type="checkbox" checked={on} onChange={() => setPicked((current) => { const next = new Set(current ?? defaults()); if (next.has(item.id)) next.delete(item.id); else next.add(item.id); return next })} className="mt-0.5 size-4 accent-[var(--accent-solid)]" />
                    <span className="flex flex-col"><span>{item.label}</span><span className="text-[11px] text-[var(--text-dim)]">{item.needs === "none" ? "the same for everyone" : `writes ${item.needs === "name" ? "your name" : item.needs === "code" ? "your code" : "your name and code"}`}{item.heavy ? " · large file (up to about 100 MB), takes longer" : ""}</span></span>
                  </label>
                </li>
              )
            })}
          </ul>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" disabled={busy || running || chosen.size === 0 || missing} onClick={() => void start()} className="lx-primary-button inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-[13px] font-semibold disabled:opacity-60">
              {busy || running ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Clapperboard className="size-4" aria-hidden="true" />}
              {running ? "Rendering…" : "Make my animations"}
            </button>
            <span className="text-[12px] text-[var(--text-dim)]">{missing ? "Type your name and your code above first." : `${config.data.dailyLimit} a day · kept for ${config.data.keepHours} hours`}</span>
          </div>
          {error && <p role="alert" className="text-[13px] text-[var(--status-red)]">{error}</p>}
          {running && <p className="text-[13px] text-[var(--text-2)]" role="status">{job?.status === "queued" ? `Waiting for its turn (${Math.max(1, job.position ?? 1)} in line)…` : "Rendering. This page can stay open; it takes about a minute for each animation."}</p>}
          {job?.status === "failed" && (
            <p className="flex items-center gap-2 text-[13px] text-[var(--text-dim)]" role="alert">{job.error ?? "The render failed."}<button type="button" onClick={() => { write(null); setJob(null) }} className="inline-flex items-center gap-1 text-[var(--text-2)] hover:text-[var(--text)]"><RotateCcw className="size-3.5" aria-hidden="true" />Clear</button></p>
          )}
          {job?.status === "done" && (
            <ul className="grid gap-2 sm:grid-cols-2">
              {job.files.map((file) => (
                <li key={file.id} className="flex items-center justify-between gap-2 rounded-[10px] border border-[var(--line)] bg-[var(--card-surface)] px-3 py-2.5">
                  <span className="flex min-w-0 flex-col"><span className="truncate text-[13px] text-[var(--text)]">{file.label}</span><span className="text-[11px] text-[var(--text-dim)]">.{file.ext} · {size(file.bytes)}</span></span>
                  <button type="button" disabled={saving === file.id} onClick={() => void save(file)} aria-label={`Download ${file.label}`} className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-[var(--line)] text-[var(--text-2)] hover:border-[var(--line-strong)] hover:bg-[var(--raised)] hover:text-[var(--text)] disabled:opacity-50">{saving === file.id ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Download className="size-4" aria-hidden="true" />}</button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}
