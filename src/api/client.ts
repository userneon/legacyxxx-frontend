import type { ApiError } from "./types"

/**
 * Base URL for all API requests. Configured via the VITE_API_URL env var.
 */
const configuredApiUrl = import.meta.env.VITE_API_URL?.trim()
const productionApiFallback = import.meta.env.PROD ? "https://api.legacyx.cc" : ""
const BASE_URL = (configuredApiUrl || productionApiFallback).replace(/\/$/, "")

/** localStorage key holding the access token. */
export const ACCESS_TOKEN_KEY = "legacyx_access_token"

/** Default request timeout in milliseconds. */
const DEFAULT_TIMEOUT_MS = 15_000

/** Query parameters are expressed as a flat record of scalar values. */
export type QueryParams = Record<string, string | number | boolean | undefined | null>

/** Options accepted by the low-level request helper. */
export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  /** Query string parameters. */
  query?: QueryParams
  /** JSON-serializable request body. */
  body?: unknown
  /** Optional AbortSignal supplied by the caller (e.g. a hook). */
  signal?: AbortSignal
  /** Per-request timeout in milliseconds. */
  timeoutMs?: number
  /** Send the request without attaching the Bearer token. */
  skipAuth?: boolean
  /** Additional headers to merge into the request. */
  headers?: Record<string, string>
}

/**
 * Passthrough options accepted by service functions. Excludes the fields
 * the convenience verbs manage themselves, so callers only control
 * cancellation, timeout, auth, and headers.
 */
export type CallOptions = Omit<RequestOptions, "method" | "query" | "body">

/* ---------------------------------------------------------------------------
 * Token helpers
 * ------------------------------------------------------------------------- */

/** Reads the persisted access token, if present. */
export function getAccessToken(): string | null {
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY)
  } catch {
    return null
  }
}

/** Persists (or clears) the access token. */
export function setAccessToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(ACCESS_TOKEN_KEY, token)
    } else {
      localStorage.removeItem(ACCESS_TOKEN_KEY)
    }
  } catch {
    /* localStorage may be unavailable (private mode); ignore. */
  }
}

/* ---------------------------------------------------------------------------
 * Error normalization
 * ------------------------------------------------------------------------- */

/** Maps an HTTP status code to a stable machine-readable error code. */
function errorCodeForStatus(status: number): string {
  switch (status) {
    case 400:
      return "bad_request"
    case 401:
      return "unauthorized"
    case 403:
      return "forbidden"
    case 404:
      return "not_found"
    case 409:
      return "conflict"
    case 422:
      return "validation_error"
    case 429:
      return "rate_limited"
    case 500:
      return "internal_server_error"
    case 503:
      return "service_unavailable"
    default:
      return status >= 500 ? "server_error" : "client_error"
  }
}

/** A human-readable default message for each supported status code. */
function defaultMessageForStatus(status: number): string {
  switch (status) {
    case 400:
      return "The request was invalid. Please check your input and try again."
    case 401:
      return "You are not logged in. Please sign in and try again."
    case 403:
      return "You do not have permission to perform this action."
    case 404:
      return "The requested resource could not be found."
    case 409:
      return "This action conflicts with the current state of the resource."
    case 422:
      return "Some of the provided values are invalid."
    case 429:
      return "Too many requests. Please slow down and try again shortly."
    case 500:
      return "Something went wrong on our end. Please try again later."
    case 503:
      return "The service is temporarily unavailable. Please try again soon."
    default:
      return "An unexpected error occurred. Please try again."
  }
}

/**
 * Converts a fetch response (or network failure) into a standardized
 * `ApiError`. Attempts to read a structured error body from the API but
 * always falls back to a safe, non-empty message.
 */
async function toApiError(response: Response): Promise<ApiError> {
  const status = response.status
  const code = errorCodeForStatus(status)
  let message = defaultMessageForStatus(status)
  let fields: Record<string, string[]> | undefined

  try {
    const contentType = response.headers.get("content-type") ?? ""
    if (contentType.includes("application/json")) {
      const body = await response.json()
      if (body && typeof body === "object") {
        const apiMessage = (body as { message?: unknown }).message
        if (typeof apiMessage === "string" && apiMessage.trim()) {
          message = apiMessage
        }
        const apiError = (body as { error?: unknown }).error
        if (typeof apiError === "string" && apiError.trim() && !apiMessage) {
          message = apiError
        }
        const apiFields = (body as { fields?: unknown }).fields
        if (apiFields && typeof apiFields === "object") {
          fields = apiFields as Record<string, string[]>
        }
      }
    }
  } catch {
    /* Response body could not be parsed; keep the default message. */
  }

  return { status, code, message, fields }
}

/* ---------------------------------------------------------------------------
 * URL + header construction
 * ------------------------------------------------------------------------- */

/** Builds a URL from a base, a path, and optional query parameters. */
function buildUrl(path: string, query?: QueryParams): string {
  const url = `${BASE_URL}${path}`

  if (!query) return url

  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue
    params.append(key, String(value))
  }
  const qs = params.toString()
  return qs ? `${url}?${qs}` : url
}

/** Merges default JSON headers with caller-supplied overrides. */
function buildHeaders(options: RequestOptions): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  }

  if (!options.skipAuth) {
    const token = getAccessToken()
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
  }

  if (options.headers) {
    for (const [key, value] of Object.entries(options.headers)) {
      headers[key] = value
    }
  }

  return headers
}

/* ---------------------------------------------------------------------------
 * Timeout handling
 * ------------------------------------------------------------------------- */

/**
 * Wraps a caller-supplied AbortSignal with a timeout. Returns the combined
 * signal and an `abort()` function that should only be called when the
 * timeout elapses, so it never clobbers an externally aborted signal.
 */
function withTimeout(
  externalSignal: AbortSignal | undefined,
  timeoutMs: number,
): { signal: AbortSignal; clear: () => void } {
  // If the caller already aborted, propagate immediately without a timer.
  if (externalSignal?.aborted) {
    return { signal: externalSignal, clear: () => {} }
  }

  const controller = new AbortController()
  let timedOut = false

  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)

  // If an external signal aborts, abort the combined controller too.
  const onExternalAbort = () => controller.abort()
  if (externalSignal) {
    externalSignal.addEventListener("abort", onExternalAbort, { once: true })
  }

  const clear = () => {
    clearTimeout(timer)
    if (externalSignal) {
      externalSignal.removeEventListener("abort", onExternalAbort)
    }
  }

  // Expose whether the abort was due to a timeout so the caller can report
  // a friendlier message. We attach it as a property on the controller.
  Object.defineProperty(controller, "timedOut", {
    get: () => timedOut,
  })

  return { signal: controller.signal, clear }
}

/** Builds an ApiError for a network failure or timeout. */
function networkError(err: unknown, timedOut: boolean): ApiError {
  if (timedOut) {
    return {
      status: 0,
      code: "timeout",
      message: "The request took too long. Please check your connection and try again.",
    }
  }
  if (err instanceof DOMException && err.name === "AbortError") {
    return {
      status: 0,
      code: "aborted",
      message: "The request was cancelled.",
    }
  }
  return {
    status: 0,
    code: "network_error",
    message: "A network error occurred. Please check your connection and try again.",
  }
}

/* ---------------------------------------------------------------------------
 * Core request helper
 * ------------------------------------------------------------------------- */

/**
 * Performs a JSON request and returns the parsed body. Throws an `ApiError`
 * for any non-2xx response, network failure, or timeout.
 *
 * This is the single low-level primitive used by every service file.
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const {
    method = "GET",
    query,
    body,
    signal,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = options

  const { signal: combinedSignal, clear } = withTimeout(signal, timeoutMs)
  const init: RequestInit = {
    method,
    headers: buildHeaders(options),
    signal: combinedSignal,
    // Steam login may complete with a same-site HttpOnly session cookie.
    // Bearer tokens remain optional and are attached only when present.
    credentials: "include",
  }

  if (body !== undefined && method !== "GET") {
    init.body = JSON.stringify(body)
  }

  let response: Response
  try {
    response = await fetch(buildUrl(path, query), init)
  } catch (err) {
    const timedOut =
      combinedSignal.aborted &&
      (combinedSignal as unknown as { timedOut?: boolean }).timedOut === true
    clear()
    throw networkError(err, timedOut)
  }
  clear()

  if (!response.ok) {
    throw await toApiError(response)
  }

  // A 204 No Content (common for DELETE) has no body to parse.
  if (response.status === 204) {
    return undefined as T
  }

  const contentType = response.headers.get("content-type") ?? ""
  if (!contentType.includes("application/json")) {
    return undefined as T
  }

  return (await response.json()) as T
}

/* ---------------------------------------------------------------------------
 * Convenience verbs
 * ------------------------------------------------------------------------- */

export function get<T>(
  path: string,
  query?: QueryParams,
  options?: Omit<RequestOptions, "method" | "query" | "body">,
): Promise<T> {
  return request<T>(path, { ...options, method: "GET", query })
}

export function post<T>(
  path: string,
  body?: unknown,
  options?: Omit<RequestOptions, "method" | "query" | "body">,
): Promise<T> {
  return request<T>(path, { ...options, method: "POST", body })
}

export function put<T>(
  path: string,
  body?: unknown,
  options?: Omit<RequestOptions, "method" | "query" | "body">,
): Promise<T> {
  return request<T>(path, { ...options, method: "PUT", body })
}

export function patch<T>(
  path: string,
  body?: unknown,
  options?: Omit<RequestOptions, "method" | "query" | "body">,
): Promise<T> {
  return request<T>(path, { ...options, method: "PATCH", body })
}

export function del<T>(
  path: string,
  options?: Omit<RequestOptions, "method" | "query" | "body">,
): Promise<T> {
  return request<T>(path, { ...options, method: "DELETE" })
}

/** Re-export types for callers that import from the client module. */
export type { ApiError }
