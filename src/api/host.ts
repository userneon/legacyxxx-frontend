import { get, post, type CallOptions } from "./client"

export type HostCheckStatus = "ok" | "warn" | "fail"
export interface HostCheck { id: string; label: string; status: HostCheckStatus; detail: string }
export interface HostServer { port: number; active: boolean; since: string; plugins: number; failed: string[] }
export interface HostPlugin { name: string; installed: boolean; sizeKb?: number; modified?: string; state?: string }

/** What the host's own script (legacyxxx-plugins/scripts/legacyx-host.sh status) reports. Owner only. */
export type HostStatus =
  | { configured: false }
  | { configured: true; reachable: false; error: string | null }
  | { configured: true; reachable: true; generatedAt: string; checks: HostCheck[]; info: { repo?: { commit: string; subject: string; behind: number | null; dirty: boolean }; servers?: HostServer[]; plugins?: HostPlugin[]; metaFailures?: string[] } }

export type HostAction = { action: "deploy" } | { action: "restart"; port: number }
export interface HostActionResult { ok: boolean; log: string | null; error: string | null }

export const hostService = {
  status: (options?: CallOptions) => get<HostStatus>("/api/v1/staff/host/status", undefined, options),
  run: (action: HostAction, options?: CallOptions) => post<HostActionResult>("/api/v1/staff/host/actions", action, options),
}
