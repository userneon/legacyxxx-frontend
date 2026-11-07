import { useState } from "react"
import { Plus, RotateCcw, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { hostService, type HostCheck, type HostOffer, type HostState, type NewServer } from "@/api/host"
import { CS2_MAP_KEYS } from "@/lib/cs2-map-art"
import { STAFF_BODY, StaffSection } from "@/components/staff-ui"
import { Skeleton } from "@/components/ui/skeleton"
import { useApiQuery } from "@/hooks/use-api-query"

const button = "inline-flex h-9 items-center justify-center gap-1.5 border border-[var(--line)] bg-[var(--raised)] px-3 text-[13px] text-[var(--text-2)] transition-colors hover:border-[var(--line-strong)] hover:text-[var(--text)] disabled:opacity-50"
const MARK = { ok: "text-[var(--status-green)]", warn: "text-[var(--tone-amber)]", fail: "text-[var(--status-red)]" } as const
const WORD = { ok: "OK", warn: "WARN", fail: "FAIL" } as const

const field = "h-9 w-full border border-[var(--line)] bg-[var(--bg)] px-2 text-[13px] text-[var(--text)] focus:border-[var(--text-2)] focus:outline-none"
const MODES: Array<[NewServer["mode"], string]> = [["competitive", "Competitive"], ["wingman", "Wingman"], ["casual", "Casual"], ["deathmatch", "Deathmatch"]]
// Which page of the website lists the server (the Play sidebar's modes); empty = the host's default.
const SITE_MODES: Array<[string, string]> = [["", "Host default"], ["competitive_5v5", "5x5"], ["proleague", "Pro League"], ["fun", "Fun"], ["tournaments", "Tournaments"]]

/** Add a game server on a new port to one game host, and remove one (owner request 2026-11-07: "add a new port from the Host tab"). */
function ServerPorts({ host, onDone }: { host: HostState; onDone: () => void }) {
  const ports = (host.info?.servers ?? []).map((server) => server.port)
  const [open, setOpen] = useState(false)
  const [port, setPort] = useState(String(ports.length ? Math.max(...ports) + 1 : 27015))
  const [gslt, setGslt] = useState("")
  const [mode, setMode] = useState<NewServer["mode"]>("competitive")
  const [map, setMap] = useState("de_dust2")
  const [maxPlayers, setMaxPlayers] = useState("10")
  const [siteMode, setSiteMode] = useState("")
  const [busy, setBusy] = useState(false)
  const [removing, setRemoving] = useState<number | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const portNumber = Number(port)
  const taken = ports.includes(portNumber)
  const valid = Number.isInteger(portNumber) && portNumber >= 1024 && portNumber <= 65535 && !taken && /^[A-Fa-f0-9]{32}$/.test(gslt.trim()) && Number(maxPlayers) >= 2 && Number(maxPlayers) <= 64

  const add = async () => {
    if (!valid || busy) return
    setBusy(true); setMessage(null)
    try {
      const result = await hostService.addServer(host.id, { port: portNumber, gslt: gslt.trim(), mode, map, maxPlayers: Number(maxPlayers), siteMode })
      setMessage(result.log ?? result.error)
      if (result.ok) { toast.success(`Server on ${portNumber} started. It shows on the website within 30 seconds.`); setGslt(""); setOpen(false); onDone() }
      else toast.error(result.error ?? "The host refused")
    } catch { toast.error("Could not reach the API") } finally { setBusy(false) }
  }
  const remove = async (target: number) => {
    setBusy(true); setMessage(null)
    try {
      const result = await hostService.removeServer(host.id, target)
      setMessage(result.log ?? result.error)
      if (result.ok) { toast.success(`Server ${target} removed`); onDone() } else toast.error(result.error ?? "The host refused")
    } catch { toast.error("Could not reach the API") } finally { setBusy(false); setRemoving(null) }
  }

  return (
    <div className="flex flex-col gap-3 border border-[var(--glass-line)] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="adm-lbl text-[var(--text-faint)]">PORTS</span>
        {ports.length === 0 && <span className="text-[13px] text-[var(--text-dim)]">No server yet.</span>}
        {ports.map((value) => removing === value
          ? <button key={value} type="button" disabled={busy} onClick={() => void remove(value)} className={`${button} border-[var(--status-red)] text-[var(--status-red)]`}>{busy ? "Removing…" : `Yes, remove ${value}`}</button>
          : <span key={value} className="inline-flex h-9 items-center gap-2 border border-[var(--line)] bg-[var(--raised)] pl-3 text-[13px] text-[var(--text)]">{value}<button type="button" aria-label={`Remove the server on ${value}`} onClick={() => setRemoving(value)} className="grid h-full w-8 place-items-center text-[var(--text-dim)] hover:text-[var(--status-red)]"><Trash2 className="size-3.5" /></button></span>)}
        <button type="button" onClick={() => setOpen((v) => !v)} className={`${button} ml-auto`}><Plus className="size-3.5" />Add a server</button>
      </div>
      {removing !== null && <p className="text-[12px] text-[var(--text-dim)]">Removing stops that server and deletes its settings; the people on it are dropped. Press again to confirm.</p>}
      {open && (
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-[12px] text-[var(--text-dim)]">Port<input className={field} inputMode="numeric" value={port} onChange={(event) => setPort(event.target.value.replace(/\D/g, "").slice(0, 5))} />{taken && <span className="text-[var(--status-red)]">Already used on this host</span>}</label>
          <label className="flex flex-col gap-1 text-[12px] text-[var(--text-dim)] sm:col-span-2">GSLT (Steam game server token, 32 characters)<input className={field} type="password" autoComplete="off" spellCheck={false} value={gslt} onChange={(event) => setGslt(event.target.value)} /></label>
          <label className="flex flex-col gap-1 text-[12px] text-[var(--text-dim)]">Game mode<select className={field} value={mode} onChange={(event) => setMode(event.target.value as NewServer["mode"])}>{MODES.map(([value, name]) => <option key={value} value={value}>{name}</option>)}</select></label>
          <label className="flex flex-col gap-1 text-[12px] text-[var(--text-dim)]">First map<select className={field} value={map} onChange={(event) => setMap(event.target.value)}>{CS2_MAP_KEYS.filter((key) => /^[a-z0-9_]+$/.test(key)).map((key) => <option key={key} value={key}>{key}</option>)}</select></label>
          <label className="flex flex-col gap-1 text-[12px] text-[var(--text-dim)]">Players<input className={field} inputMode="numeric" value={maxPlayers} onChange={(event) => setMaxPlayers(event.target.value.replace(/\D/g, "").slice(0, 2))} /></label>
          <label className="flex flex-col gap-1 text-[12px] text-[var(--text-dim)]">Listed on the website as<select className={field} value={siteMode} onChange={(event) => setSiteMode(event.target.value)}>{SITE_MODES.map(([value, name]) => <option key={value} value={value}>{name}</option>)}</select></label>
          <div className="flex items-end sm:col-span-2"><button type="button" disabled={!valid || busy} onClick={() => void add()} className={`${button} w-full sm:w-auto`}>{busy ? "Setting up…" : `Start the server on ${port || "…"}`}</button></div>
        </div>
      )}
      {message && <pre className="max-h-40 overflow-auto bg-[var(--bg)] p-2 text-[11px] text-[var(--text-2)]">{message}</pre>}
      <p className="text-[12px] text-[var(--text-faint)]">The firewall opens the port (TCP and UDP) on the host itself; if the provider has its own firewall panel, open it there too. The GSLT is sent once to the host and is not kept here.</p>
    </div>
  )
}

/** Staff → Host (Owner only): what is installed and loaded on the game host, and a deploy / restart that go over a locked-down SSH key. */
export function StaffHost({ isOwner }: { isOwner: boolean }) {
  const { data, loading, error, refetch } = useApiQuery((signal) => hostService.status({ signal }), { enabled: isOwner, queryKey: `staff-host:${isOwner}` })
  const [busy, setBusy] = useState<string | null>(null)
  const [log, setLog] = useState<string | null>(null)
  const [asked, setAsked] = useState<string | null>(null)
  if (!isOwner) return <div className={STAFF_BODY}><p className="text-[13px] text-[var(--text-dim)]">Only the Owner can see the host.</p></div>

  const run = async (hostId: string, key: string, offer: HostOffer) => {
    setBusy(key); setAsked(null); setLog(null)
    try {
      const result = await hostService.run(hostId, offer)
      setLog(result.log ?? result.error)
      if (result.ok) toast.success(result.log?.startsWith("Deploy of") ? "Deploy started. Check again in a minute." : `${offer.label}: done`)
      else toast.error(result.error ?? "The host refused")
      refetch()
    } catch {
      toast.error("Could not reach the API")
    } finally { setBusy(null) }
  }
  const confirm = (hostId: string, offer: HostOffer) => {
    const key = `${hostId}:${offer.action}:${offer.target ?? ""}`
    return asked === key
      ? <button type="button" disabled={busy !== null} onClick={() => run(hostId, key, offer)} className={`${button} border-[var(--status-red)] text-[var(--status-red)]`}>{busy === key ? "Working…" : `Yes, ${offer.label.toLowerCase()}`}</button>
      : <button type="button" disabled={busy !== null} onClick={() => setAsked(key)} className={button}>{offer.label}</button>
  }

  return (
    <div className={STAFF_BODY}>
      <p className="text-[13px] text-[var(--text-muted)]">What is installed, running and loaded on each machine, read by one locked-down script over SSH. A deploy pulls the latest code and installs it; on a game host it does not restart a server.</p>
      {loading && !data ? (
        <div className="flex flex-col gap-2" aria-hidden="true">{[0, 1, 2, 3, 4].map((index) => <Skeleton key={index} className="h-9 bg-[var(--glass-fill)]" />)}</div>
      ) : error && !data ? (
        <p className="flex items-center gap-3 text-[13px] text-[var(--text-dim)]">Could not load the hosts.<button type="button" onClick={refetch} className="inline-flex items-center gap-1.5 text-[var(--text-2)] hover:text-[var(--text)]"><RotateCcw className="size-3.5" />Retry</button></p>
      ) : data && !data.configured ? (
        <p className="text-[13px] text-[var(--text-dim)]">No host is set up. Set HOST_SSH_HOSTS and HOST_SSH_KEY in the API's environment (see docs/HOST_ACCESS.md in the backend), then restart the API.</p>
      ) : data ? (
        <>
          <div className="flex justify-end"><button type="button" onClick={refetch} className={button}><RotateCcw className="size-3.5" />Check again</button></div>
          {data.hosts.map((host) => (
            <StaffSection key={host.id} title={host.label} count={host.checks?.length}>
              {!host.reachable ? (
                <p className="text-[13px] text-[var(--status-red)]">{host.error ?? "Could not reach this host."}</p>
              ) : (
                <>
                  <ul className="divide-y divide-[var(--line-soft)] border border-[var(--glass-line)]">
                    {(host.checks ?? []).map((check: HostCheck) => (
                      <li key={check.id} className="grid grid-cols-[3.5rem_minmax(0,12rem)_minmax(0,1fr)] items-baseline gap-3 px-3 py-2 text-[13px] max-md:grid-cols-[3.5rem_minmax(0,1fr)]">
                        <span className={`adm-lbl ${MARK[check.status]}`}>{WORD[check.status]}</span>
                        <span className="truncate text-[var(--text)]">{check.label}</span>
                        <span className="text-[var(--text-dim)] max-md:col-start-2">{check.detail}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="adm-lbl text-[var(--text-faint)]">Read {host.generatedAt ? new Date(host.generatedAt).toLocaleTimeString() : ""}{host.info?.repo ? ` · ${host.info.repo.commit} ${host.info.repo.subject}` : ""}</p>
                  {host.kind === "game" && <ServerPorts host={host} onDone={refetch} />}
                  <div className="flex flex-wrap items-center gap-2">
                    {(host.info?.actions ?? []).map((offer) => <span key={`${offer.action}:${offer.target}`}>{confirm(host.id, offer)}</span>)}
                  </div>
                </>
              )}
            </StaffSection>
          ))}
          {asked && <p className="text-[13px] text-[var(--text-dim)]">Press again to confirm. A restart drops the people on it.</p>}
          {log && <pre className="max-h-72 overflow-auto border border-[var(--glass-line)] bg-[var(--bg)] p-3 text-[11px] text-[var(--text-2)]">{log}</pre>}
        </>
      ) : null}
    </div>
  )
}
