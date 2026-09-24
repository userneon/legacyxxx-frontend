import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { Check, Copy, KeyRound, Lock, Plus, RotateCcw, Save, Trash2, UserMinus, UserPlus } from "lucide-react"

import { adminService, type AnnouncementItem, type NameFilter, type PermissionInfo, type Product, type RoleDetail } from "@/api/admin"
import { useApiQuery } from "@/hooks/use-api-query"
import { useStaff } from "@/hooks/use-staff"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  ChoiceGroup, EmptyState, ErrorState, LoadingRows, Panel, PanelPage, PlayerCell, ReauthBanner, RelativeTime, Rows, StatusPill, TypeToConfirmDialog, toastError,
} from "./ui"

/* ---------------------------------------------------------------------------
 * Staff & Roles
 * ------------------------------------------------------------------------- */

export function StaffRolesPage() {
  const { can, refresh: refreshStaff } = useStaff()
  const roles = useApiQuery((signal) => adminService.roles({ signal }))
  const reauth = useApiQuery((signal) => adminService.reauthStatus({ signal }))
  const reload = () => { roles.refetch(); refreshStaff() }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const result = params.get("reauth")
    if (!result) return
    if (result === "done") toast.success("Re-authenticated. Role changes are unlocked for 10 minutes.")
    else toast.error("Steam re-authentication failed")
    params.delete("reauth")
    window.history.replaceState({}, "", `${window.location.pathname}${params.size ? `?${params}` : ""}`)
  }, [])

  return (
    <PanelPage title="Staff & Roles" description="Every change here needs a fresh Steam sign-in and the role name typed out. Nobody can act on a rank equal to or above their own.">
      {reauth.data && <ReauthBanner fresh={reauth.data.fresh} expiresAt={reauth.data.expiresAt} returnTo="/panel/staff" />}
      {roles.error ? <Panel><ErrorState error={roles.error} onRetry={roles.refetch} /></Panel> : roles.loading ? <Panel><LoadingRows /></Panel> : (
        <div className="grid gap-4 xl:grid-cols-2">
          {roles.data!.roles.map((role) => (
            <RoleCard key={role.id} role={role} catalogue={roles.data!.permissions} canAssign={can("roles.assign")} canRevoke={can("roles.revoke")} canEditPermissions={can("roles.permissions.edit")} canEditImmunity={can("roles.immunity.edit")} onChanged={() => { reload(); reauth.refetch() }} />
          ))}
        </div>
      )}
    </PanelPage>
  )
}

function RoleCard({ role, catalogue, canAssign, canRevoke, canEditPermissions, canEditImmunity, onChanged }: {
  role: RoleDetail
  catalogue: PermissionInfo[]
  canAssign: boolean
  canRevoke: boolean
  canEditPermissions: boolean
  canEditImmunity: boolean
  onChanged: () => void
}) {
  const [adding, setAdding] = useState(false)
  const [newMember, setNewMember] = useState("")
  const [removing, setRemoving] = useState<string | null>(null)
  const [draft, setDraft] = useState<Set<string>>(new Set(role.permissions))
  const [savingPermissions, setSavingPermissions] = useState(false)
  const [immunity, setImmunity] = useState(String(role.immunity))
  const [savingImmunity, setSavingImmunity] = useState(false)
  useEffect(() => { setDraft(new Set(role.permissions)); setImmunity(String(role.immunity)) }, [role])

  const original = useMemo(() => new Set(role.permissions), [role.permissions])
  const changed = draft.size !== original.size || [...draft].some((key) => !original.has(key))
  const groups = useMemo(() => {
    const map = new Map<string, PermissionInfo[]>()
    for (const permission of catalogue) {
      const group = permission.key.split(".")[0]!
      map.set(group, [...(map.get(group) ?? []), permission])
    }
    return [...map.entries()]
  }, [catalogue])

  return (
    <Panel
      title={<span className="flex items-center gap-2">{role.isLocked && <Lock className="size-3.5 text-amber-300" />}{role.name}<span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">immunity {role.immunity}</span></span>}
      actions={canAssign && <Button size="xs" variant="outline" onClick={() => setAdding(true)}><UserPlus />Add</Button>}
    >
      <Rows>
        {role.members.length === 0 && <EmptyState>No members</EmptyState>}
        {role.members.map((member) => (
          <div key={member.steamId} className="flex items-center justify-between gap-2 px-4 py-2">
            <PlayerCell player={member} subtitle={<>since <RelativeTime value={member.grantedAt} /></>} />
            {canRevoke && <Button size="icon-sm" variant="ghost" aria-label={`Remove ${member.name}`} onClick={() => setRemoving(member.steamId)}><UserMinus /></Button>}
          </div>
        ))}
      </Rows>

      {(canEditPermissions || canEditImmunity) && (
        <details className="border-t border-border/40">
          <summary className="cursor-pointer px-4 py-2.5 text-[12px] text-muted-foreground hover:text-foreground">Permissions and immunity</summary>
          <div className="flex flex-col gap-3 px-4 pb-4">
            {role.isLocked && <p className="text-[12px] text-muted-foreground">This role is locked: it can gain permissions but never lose them, and its immunity cannot go down.</p>}
            {canEditImmunity && (
              <div className="flex items-end gap-2">
                <label className="flex flex-col gap-1 text-[11px] uppercase tracking-wider text-muted-foreground">Immunity
                  <Input type="number" min={0} max={100} value={immunity} onChange={(e) => setImmunity(e.target.value)} className="w-28" disabled={role.isLocked} />
                </label>
                <Button size="sm" variant="outline" disabled={role.isLocked || Number(immunity) === role.immunity} onClick={() => setSavingImmunity(true)}><Save />Save</Button>
              </div>
            )}
            {canEditPermissions && (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  {groups.map(([group, permissions]) => (
                    <div key={group} className="flex flex-col gap-1">
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{group}</span>
                      {permissions.map((permission) => {
                        const checked = draft.has(permission.key)
                        const locked = (role.isLocked && original.has(permission.key)) || (!role.isLocked && permission.ownerOnly)
                        return (
                          <label key={permission.key} className={cn("flex items-start gap-2 text-[12px]", locked && "opacity-50")} title={permission.description}>
                            <Checkbox checked={checked} disabled={locked} onCheckedChange={(value) => {
                              setDraft((current) => { const next = new Set(current); if (value) next.add(permission.key); else next.delete(permission.key); return next })
                            }} />
                            <span className="font-mono">{permission.key}{permission.ownerOnly && <span className="ml-1 text-amber-300">owner</span>}</span>
                          </label>
                        )
                      })}
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="ghost" disabled={!changed} onClick={() => setDraft(new Set(role.permissions))}>Reset</Button>
                  <Button size="sm" disabled={!changed} onClick={() => setSavingPermissions(true)}><Save />Save permissions</Button>
                </div>
              </>
            )}
          </div>
        </details>
      )}

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="glass max-w-md">
          <DialogHeader>
            <DialogTitle>Add to {role.name}</DialogTitle>
            <DialogDescription>The player must have signed in on the website once.</DialogDescription>
          </DialogHeader>
          <Input autoFocus placeholder="SteamID64" value={newMember} onChange={(e) => setNewMember(e.target.value.trim())} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
            <Button disabled={!/^\d{17}$/.test(newMember)} onClick={() => setAdding(false)}>Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <TypeToConfirmDialog
        open={!adding && /^\d{17}$/.test(newMember)}
        onOpenChange={(open) => { if (!open) setNewMember("") }}
        title={`Give ${role.name} to ${newMember}`}
        description={`They get every ${role.name} permission straight away.`}
        expected={role.name}
        confirmLabel="Assign role"
        onConfirm={async (typed) => { await adminService.assignRole(role.id, newMember, typed); toast.success("Role assigned"); setNewMember(""); onChanged() }}
      />
      <TypeToConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => { if (!open) setRemoving(null) }}
        title={`Remove ${role.name}`}
        description={<>Removes the role from <span className="font-mono">{removing}</span>.</>}
        expected={role.name}
        confirmLabel="Remove role"
        onConfirm={async (typed) => { await adminService.removeRole(role.id, removing!, typed); toast.success("Role removed"); onChanged() }}
      />
      <TypeToConfirmDialog
        open={savingPermissions}
        onOpenChange={setSavingPermissions}
        title={`Change ${role.name} permissions`}
        description={`${[...draft].filter((key) => !original.has(key)).length} added · ${[...original].filter((key) => !draft.has(key)).length} removed. The before and after are written to the audit log.`}
        expected={role.name}
        confirmLabel="Save permissions"
        onConfirm={async (typed) => { await adminService.setRolePermissions(role.id, [...draft], typed); toast.success("Permissions saved"); onChanged() }}
      />
      <TypeToConfirmDialog
        open={savingImmunity}
        onOpenChange={setSavingImmunity}
        title={`Set ${role.name} immunity to ${immunity}`}
        description="Immunity decides who can act on whom. It must stay below your own."
        expected={role.name}
        confirmLabel="Save immunity"
        onConfirm={async (typed) => { await adminService.setRoleImmunity(role.id, Number(immunity), typed); toast.success("Immunity saved"); onChanged() }}
      />
    </Panel>
  )
}

/* ---------------------------------------------------------------------------
 * Servers
 * ------------------------------------------------------------------------- */

export function ServersManagePage() {
  const { can } = useStaff()
  const { data, loading, error, refetch } = useApiQuery((signal) => adminService.servers({ signal }))
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: "", ipAddress: "", port: "" })
  const [shownKey, setShownKey] = useState<{ name: string; key: string } | null>(null)
  const [rotating, setRotating] = useState<{ id: string; name: string } | null>(null)
  const [deleting, setDeleting] = useState<{ id: string; name: string } | null>(null)

  const create = async () => {
    try {
      const result = await adminService.createServer({ name: form.name.trim(), ipAddress: form.ipAddress.trim() || undefined, port: form.port ? Number(form.port) : undefined })
      setCreating(false)
      setForm({ name: "", ipAddress: "", port: "" })
      setShownKey({ name: result.server.name, key: result.apiKey })
      refetch()
    } catch (error) { toastError(error) }
  }

  return (
    <PanelPage title="Servers" description="Each game server authenticates with its own API key. The key is shown once; only a hash is stored." actions={can("servers.create") && <Button size="sm" onClick={() => setCreating(true)}><Plus />Register server</Button>}>
      <Panel>
        {error ? <ErrorState error={error} onRetry={refetch} /> : loading ? <LoadingRows /> : (data?.servers.length ?? 0) === 0 ? <EmptyState>No servers yet</EmptyState> : (
          <Rows>
            {data!.servers.map((server) => (
              <div key={server.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className={cn("size-2 rounded-full", server.online ? "bg-emerald-400" : "bg-muted-foreground/40")} />
                <Link to={`/panel/servers/${server.id}`} className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium hover:text-amber-300">{server.name}</div>
                  <div className="truncate text-[11px] text-muted-foreground">{server.address ?? "No address"} · {server.hasApiKey ? <span className="font-mono">{server.apiKeyPrefix}…</span> : "no key"}{server.apiKeyRotatedAt && <> · key set <RelativeTime value={server.apiKeyRotatedAt} /></>}</div>
                </Link>
                {can("servers.rotate_key") && <Button size="sm" variant="outline" onClick={() => setRotating({ id: server.id, name: server.name })}><KeyRound />Rotate key</Button>}
                {can("servers.delete") && <Button size="icon-sm" variant="ghost" aria-label={`Delete ${server.name}`} onClick={() => setDeleting({ id: server.id, name: server.name })}><Trash2 /></Button>}
              </div>
            ))}
          </Rows>
        )}
      </Panel>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent className="glass max-w-md">
          <DialogHeader><DialogTitle>Register a game server</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-2">
            <Input placeholder="Name, e.g. LEGACY-X #1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <div className="flex gap-2">
              <Input placeholder="IP address (optional)" value={form.ipAddress} onChange={(e) => setForm({ ...form, ipAddress: e.target.value })} />
              <Input placeholder="Port" inputMode="numeric" className="w-28" value={form.port} onChange={(e) => setForm({ ...form, port: e.target.value.replace(/\D/g, "") })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreating(false)}>Cancel</Button>
            <Button disabled={form.name.trim().length < 2} onClick={create}>Create and show key</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rotating !== null} onOpenChange={(open) => { if (!open) setRotating(null) }}>
        <DialogContent className="glass max-w-md">
          <DialogHeader>
            <DialogTitle>Rotate the key for {rotating?.name}</DialogTitle>
            <DialogDescription>The old key stops working immediately. Put the new one into the server's .env before it reconnects.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRotating(null)}>Cancel</Button>
            <Button variant="destructive" onClick={async () => {
              try { const result = await adminService.rotateServerKey(rotating!.id); setShownKey({ name: rotating!.name, key: result.apiKey }); setRotating(null); refetch() } catch (error) { toastError(error) }
            }}>Rotate key</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={shownKey !== null} onOpenChange={(open) => { if (!open) setShownKey(null) }}>
        <DialogContent className="glass max-w-lg" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>API key for {shownKey?.name}</DialogTitle>
            <DialogDescription>Copy it now. It will not be shown again.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 rounded-lg bg-black/30 p-3">
            <code className="min-w-0 flex-1 break-all font-mono text-[12px]">{shownKey?.key}</code>
            <Button size="icon-sm" variant="ghost" aria-label="Copy key" onClick={() => { void navigator.clipboard.writeText(shownKey!.key); toast.success("Copied") }}><Copy /></Button>
          </div>
          <p className="text-[12px] text-muted-foreground">On the server: <code className="font-mono">LEGACYX_STAFF_SERVER_KEY={"<key>"}</code></p>
          <DialogFooter><Button onClick={() => setShownKey(null)}><Check />I saved it</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <TypeToConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => { if (!open) setDeleting(null) }}
        title={`Delete ${deleting?.name}`}
        description="Its key stops working. Sessions, chat and reports from this server are kept."
        expected={deleting?.name ?? ""}
        confirmLabel="Delete server"
        onConfirm={async (typed) => { await adminService.deleteServer(deleting!.id, typed); toast.success("Server deleted"); refetch() }}
      />
    </PanelPage>
  )
}

/* ---------------------------------------------------------------------------
 * Products (catalogue only)
 * ------------------------------------------------------------------------- */

type ProductDraft = { id?: string; name: string; description: string; priceMnt: string; isActive: boolean; sortOrder: string }
const emptyProduct: ProductDraft = { name: "", description: "", priceMnt: "0", isActive: false, sortOrder: "0" }

export function ProductsPage() {
  const { can } = useStaff()
  const { data, loading, error, refetch } = useApiQuery((signal) => adminService.products({ signal }))
  const [draft, setDraft] = useState<ProductDraft | null>(null)
  const [deleting, setDeleting] = useState<Product | null>(null)

  const save = async () => {
    if (!draft) return
    const body = { name: draft.name.trim(), description: draft.description.trim() || null, priceMnt: Number(draft.priceMnt) || 0, isActive: draft.isActive, sortOrder: Number(draft.sortOrder) || 0 }
    try {
      if (draft.id) await adminService.updateProduct(draft.id, body)
      else await adminService.createProduct(body)
      toast.success("Product saved")
      setDraft(null)
      refetch()
    } catch (error) { toastError(error) }
  }

  return (
    <PanelPage title="Products" description="The Owner's product catalogue. There is no store attached: nothing here is sold on the site." actions={can("products.create") && <Button size="sm" onClick={() => setDraft({ ...emptyProduct })}><Plus />New product</Button>}>
      <Panel>
        {error ? <ErrorState error={error} onRetry={refetch} /> : loading ? <LoadingRows /> : (data?.items.length ?? 0) === 0 ? <EmptyState>No products</EmptyState> : (
          <Rows>
            {data!.items.map((product) => (
              <div key={product.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium">{product.name}</div>
                  {product.description && <div className="truncate text-[12px] text-muted-foreground">{product.description}</div>}
                </div>
                <span className="text-[13px] tabular-nums">{product.priceMnt.toLocaleString()}₮</span>
                <StatusPill status={product.isActive ? "active" : "expired"} />
                {can("products.update") && <Button size="sm" variant="ghost" onClick={() => setDraft({ id: product.id, name: product.name, description: product.description ?? "", priceMnt: String(product.priceMnt), isActive: product.isActive, sortOrder: String(product.sortOrder) })}>Edit</Button>}
                {can("products.delete") && <Button size="icon-sm" variant="ghost" aria-label={`Delete ${product.name}`} onClick={() => setDeleting(product)}><Trash2 /></Button>}
              </div>
            ))}
          </Rows>
        )}
      </Panel>
      <Dialog open={draft !== null} onOpenChange={(open) => { if (!open) setDraft(null) }}>
        <DialogContent className="glass max-w-md">
          <DialogHeader><DialogTitle>{draft?.id ? "Edit product" : "New product"}</DialogTitle></DialogHeader>
          {draft && (
            <div className="flex flex-col gap-2">
              <Input placeholder="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              <Textarea rows={3} placeholder="Description" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
              <div className="flex gap-2">
                <Input placeholder="Price (₮)" inputMode="numeric" value={draft.priceMnt} onChange={(e) => setDraft({ ...draft, priceMnt: e.target.value.replace(/\D/g, "") })} />
                <Input placeholder="Order" inputMode="numeric" className="w-24" value={draft.sortOrder} onChange={(e) => setDraft({ ...draft, sortOrder: e.target.value.replace(/[^\d-]/g, "") })} />
              </div>
              <label className="flex items-center gap-2 text-[13px]"><Checkbox checked={draft.isActive} onCheckedChange={(value) => setDraft({ ...draft, isActive: value === true })} />Active</label>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDraft(null)}>Cancel</Button>
            <Button disabled={!draft?.name.trim()} onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <TypeToConfirmDialog open={deleting !== null} onOpenChange={(open) => { if (!open) setDeleting(null) }} title={`Delete ${deleting?.name}`} description="This cannot be undone." expected={deleting?.name ?? ""} confirmLabel="Delete" onConfirm={async () => { await adminService.deleteProduct(deleting!.id); toast.success("Product deleted"); refetch() }} />
    </PanelPage>
  )
}

/* ---------------------------------------------------------------------------
 * Announcements
 * ------------------------------------------------------------------------- */

export function AnnouncementsPage() {
  const { can } = useStaff()
  const channels = [can("announce.web") && "web", can("announce.ingame") && "ingame"].filter(Boolean) as ("web" | "ingame")[]
  const { data, loading, error, refetch } = useApiQuery((signal) => adminService.announcements({ signal }))
  const [draft, setDraft] = useState<{ channel: "web" | "ingame"; title: string; body: string; days: string } | null>(null)

  const publish = async () => {
    if (!draft) return
    const days = Number(draft.days)
    try {
      await adminService.createAnnouncement({ channel: draft.channel, title: draft.title.trim(), body: draft.body.trim(), endsAt: days > 0 ? new Date(Date.now() + days * 86_400_000).toISOString() : null })
      toast.success("Announcement published")
      setDraft(null)
      refetch()
    } catch (error) { toastError(error) }
  }

  const toggle = async (item: AnnouncementItem) => {
    try { await adminService.updateAnnouncement(item.id, { isActive: !item.isActive }); refetch() } catch (error) { toastError(error) }
  }

  return (
    <PanelPage title="Announcements" description="Website announcements show as a banner on the site. In-game ones are sent to every server." actions={channels.length > 0 && <Button size="sm" onClick={() => setDraft({ channel: channels[0]!, title: "", body: "", days: "7" })}><Plus />New</Button>}>
      <Panel>
        {error ? <ErrorState error={error} onRetry={refetch} /> : loading ? <LoadingRows /> : (data?.items.length ?? 0) === 0 ? <EmptyState>No announcements</EmptyState> : (
          <Rows>
            {data!.items.map((item) => (
              <div key={item.id} className="flex flex-wrap items-start gap-3 px-4 py-3">
                <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-semibold uppercase">{item.channel === "web" ? "Website" : "In game"}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium">{item.title}</div>
                  <p className="text-[12px] text-muted-foreground">{item.body}</p>
                  <p className="text-[11px] text-muted-foreground"><RelativeTime value={item.createdAt} />{item.endsAt && <> · until {new Date(item.endsAt).toLocaleDateString()}</>}</p>
                </div>
                {channels.includes(item.channel) && (
                  <>
                    <Button size="sm" variant="ghost" onClick={() => toggle(item)}>{item.isActive ? "Hide" : "Show"}</Button>
                    <Button size="icon-sm" variant="ghost" aria-label="Delete announcement" onClick={async () => { try { await adminService.deleteAnnouncement(item.id); refetch() } catch (error) { toastError(error) } }}><Trash2 /></Button>
                  </>
                )}
              </div>
            ))}
          </Rows>
        )}
      </Panel>
      <Dialog open={draft !== null} onOpenChange={(open) => { if (!open) setDraft(null) }}>
        <DialogContent className="glass max-w-md">
          <DialogHeader><DialogTitle>New announcement</DialogTitle></DialogHeader>
          {draft && (
            <div className="flex flex-col gap-3">
              {channels.length > 1 && <ChoiceGroup label="Where" options={["Website", "In game"]} value={draft.channel === "web" ? "Website" : "In game"} onChange={(value) => setDraft({ ...draft, channel: value === "Website" ? "web" : "ingame" })} />}
              <Input placeholder="Title" maxLength={120} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
              <Textarea rows={3} maxLength={1000} placeholder="Message" value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
              <label className="flex items-center gap-2 text-[12px] text-muted-foreground">Show for <Input className="w-20" inputMode="numeric" value={draft.days} onChange={(e) => setDraft({ ...draft, days: e.target.value.replace(/\D/g, "") })} /> days (0 = until hidden)</label>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDraft(null)}>Cancel</Button>
            <Button disabled={!draft?.title.trim() || !draft?.body.trim()} onClick={publish}>Publish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PanelPage>
  )
}

/* ---------------------------------------------------------------------------
 * Website config (versioned)
 * ------------------------------------------------------------------------- */

export function WebsitePage() {
  const { data, loading, error, refetch } = useApiQuery((signal) => adminService.siteConfig({ signal }))
  const [text, setText] = useState("")
  const [note, setNote] = useState("")
  const [rollback, setRollback] = useState<number | null>(null)
  useEffect(() => { if (data) setText(JSON.stringify(data.current.config, null, 2)) }, [data])

  const parsed = useMemo(() => {
    try { const value = JSON.parse(text || "{}"); return value && typeof value === "object" && !Array.isArray(value) ? { value: value as Record<string, unknown> } : { error: "The config must be a JSON object" } }
    catch { return { error: "Not valid JSON" } }
  }, [text])
  const dirty = data ? text.trim() !== JSON.stringify(data.current.config, null, 2) : false

  const save = async () => {
    if (!data || !parsed.value) return
    try { const result = await adminService.saveSiteConfig(parsed.value, data.current.version, note.trim() || undefined); toast.success(`Published v${result.version}`); setNote(""); refetch() } catch (error) { toastError(error) }
  }

  return (
    <PanelPage title="Website" description="Site settings are saved as versions. Rolling back publishes a copy of an older version, so history is never lost.">
      {error ? <Panel><ErrorState error={error} onRetry={refetch} /></Panel> : loading ? <Panel><LoadingRows /></Panel> : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <Panel title={`Current · v${data!.current.version}`}>
            <div className="flex flex-col gap-2 p-4">
              <Textarea rows={16} spellCheck={false} className="font-mono text-[12px]" value={text} onChange={(e) => setText(e.target.value)} />
              {parsed.error && <p className="text-[12px] text-rose-300">{parsed.error}</p>}
              <div className="flex flex-wrap items-center gap-2">
                <Input placeholder="What changed?" maxLength={240} value={note} onChange={(e) => setNote(e.target.value)} className="flex-1" />
                <Button disabled={!dirty || Boolean(parsed.error)} onClick={save}><Save />Publish v{data!.current.version + 1}</Button>
              </div>
            </div>
          </Panel>
          <Panel title="History">
            {data!.versions.length === 0 ? <EmptyState>No versions yet</EmptyState> : (
              <Rows>
                {data!.versions.map((version) => (
                  <div key={version.version} className="flex items-center gap-2 px-4 py-2.5 text-[13px]">
                    <span className="font-mono text-[12px]">v{version.version}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate">{version.note ?? "No note"}</div>
                      <div className="text-[11px] text-muted-foreground">{version.createdBy?.name ?? "Staff"} · <RelativeTime value={version.createdAt} /></div>
                    </div>
                    {version.version !== data!.current.version && <Button size="xs" variant="ghost" onClick={() => setRollback(version.version)}><RotateCcw />Restore</Button>}
                  </div>
                ))}
              </Rows>
            )}
          </Panel>
        </div>
      )}
      <Dialog open={rollback !== null} onOpenChange={(open) => { if (!open) setRollback(null) }}>
        <DialogContent className="glass max-w-md">
          <DialogHeader><DialogTitle>Restore v{rollback}</DialogTitle><DialogDescription>This publishes a new version that copies v{rollback}.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRollback(null)}>Cancel</Button>
            <Button onClick={async () => { try { const result = await adminService.rollbackSiteConfig(rollback!); toast.success(`Restored as v${result.version}`); setRollback(null); refetch() } catch (error) { toastError(error) } }}>Restore</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PanelPage>
  )
}

/* ---------------------------------------------------------------------------
 * Name filter
 * ------------------------------------------------------------------------- */

export function NameFilterPage() {
  const { data, loading, error, refetch } = useApiQuery((signal) => adminService.nameFilters({ signal }))
  const [pattern, setPattern] = useState("")
  const [matchType, setMatchType] = useState<NameFilter["matchType"]>("contains")
  const [action, setAction] = useState<NameFilter["action"]>("flag")

  const add = async () => {
    try { await adminService.createNameFilter({ pattern: pattern.trim(), matchType, action }); setPattern(""); toast.success("Filter added"); refetch() } catch (error) { toastError(error) }
  }
  const update = async (filter: NameFilter, body: Partial<{ isActive: boolean; action: NameFilter["action"] }>) => {
    try { await adminService.updateNameFilter(filter.id, body); refetch() } catch (error) { toastError(error) }
  }

  return (
    <PanelPage title="Name filter" description="Checked when a player connects and at every round start. Flag marks the player for staff; block kicks them until they change their name.">
      <Panel>
        <div className="flex flex-col gap-3 p-4">
          <Input placeholder="Pattern" value={pattern} maxLength={120} onChange={(e) => setPattern(e.target.value)} />
          <div className="flex flex-wrap items-end gap-4">
            <ChoiceGroup label="Match" options={["contains", "exact", "regex"]} value={matchType} onChange={(value) => setMatchType(value as NameFilter["matchType"])} />
            <ChoiceGroup label="Action" options={["flag", "block"]} value={action} onChange={(value) => setAction(value as NameFilter["action"])} danger="block" />
            <Button className="ml-auto" disabled={!pattern.trim()} onClick={add}><Plus />Add filter</Button>
          </div>
        </div>
      </Panel>
      <Panel>
        {error ? <ErrorState error={error} onRetry={refetch} /> : loading ? <LoadingRows /> : (data?.items.length ?? 0) === 0 ? <EmptyState>No filters</EmptyState> : (
          <Rows>
            {data!.items.map((filter) => (
              <div key={filter.id} className={cn("flex flex-wrap items-center gap-3 px-4 py-2.5", !filter.isActive && "opacity-60")}>
                <code className="min-w-0 flex-1 truncate font-mono text-[12px]">{filter.pattern}</code>
                <span className="text-[11px] text-muted-foreground">{filter.matchType}</span>
                <button onClick={() => update(filter, { action: filter.action === "flag" ? "block" : "flag" })}><StatusPill status={filter.action === "block" ? "active" : "pending"} /></button>
                <Button size="sm" variant="ghost" onClick={() => update(filter, { isActive: !filter.isActive })}>{filter.isActive ? "Disable" : "Enable"}</Button>
                <Button size="icon-sm" variant="ghost" aria-label="Delete filter" onClick={async () => { try { await adminService.deleteNameFilter(filter.id); refetch() } catch (error) { toastError(error) } }}><Trash2 /></Button>
              </div>
            ))}
          </Rows>
        )}
      </Panel>
    </PanelPage>
  )
}
