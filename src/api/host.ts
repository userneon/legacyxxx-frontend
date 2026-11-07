import { get, post, type CallOptions } from "./client"

export type HostCheckStatus = "ok" | "warn" | "fail"
export interface HostCheck { id: string; label: string; status: HostCheckStatus; detail: string }
/** One button a host offers (its own script lists them): deploy something, or restart a server / service. */
export interface HostOffer { action: "deploy" | "restart"; target: string | null; label: string }

export interface HostState {
  id: string
  label: string
  kind: "game" | "web"
  reachable: boolean
  error?: string | null
  generatedAt?: string
  checks?: HostCheck[]
  info?: { repo?: { commit: string; subject: string }; actions?: HostOffer[] }
}
export interface HostStatus { configured: boolean; hosts: HostState[] }

export interface HostActionResult { ok: boolean; log: string | null; error: string | null }

/** Owner only. The API reaches each machine over a locked-down SSH key (backend docs/HOST_ACCESS.md). */
export const hostService = {
  status: (options?: CallOptions) => get<HostStatus>("/api/v1/staff/host/status", undefined, options),
  run: (hostId: string, offer: Pick<HostOffer, "action" | "target">, options?: CallOptions) =>
    post<HostActionResult>("/api/v1/staff/host/actions", { hostId, action: offer.action, ...(offer.target ? { target: offer.target } : {}) }, options),
}
