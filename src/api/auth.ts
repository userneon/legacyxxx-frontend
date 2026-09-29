import { API_BASE_URL, MOCK_API, get, post, setAccessToken, type CallOptions } from "./client"
import type { AuthSession, UserProfile } from "./types"

/**
 * Authentication service. Responsible for Steam OIDC session lifecycle.
 * On successful login the returned access token is persisted so subsequent
 * requests are authenticated automatically.
 */
/**
 * Where "Sign in with Steam" starts. On the live site that is the page's own origin: its nginx hands
 * /api/v1/auth/steam to the API (ops/nginx/legacyx-frontend.conf), so the address bar never shows the
 * api. host. An API on an unrelated host (a local or test API) is called directly.
 */
export function steamLoginUrl(query = ""): string {
  const apiHost = API_BASE_URL ? new URL(API_BASE_URL).hostname : ""
  const viaSite = !apiHost || apiHost.endsWith(`.${window.location.hostname}`)
  return `${viaSite ? "" : API_BASE_URL}/api/v1/auth/steam${query}`
}

export const authService = {
  getSteamLoginUrl(): string {
    // Design preview: "sign in" as a sample player by handing the app the callback token directly.
    if (MOCK_API) return `${window.location.pathname}?access_token=mock-session`
    return steamLoginUrl()
  },

  async logout(options?: CallOptions): Promise<void> {
    await post<void>("/api/v1/auth/logout", undefined, options)
    setAccessToken(null)
  },

  async refresh(options?: CallOptions): Promise<AuthSession> {
    const session = await post<AuthSession>("/api/v1/auth/refresh", undefined, options)
    if (session.accessToken) {
      setAccessToken(session.accessToken)
    }
    return session
  },

  async me(options?: CallOptions): Promise<UserProfile> {
    const payload = await get<UserProfile | { user: UserProfile }>("/api/v1/auth/me", undefined, options)
    return "user" in payload ? payload.user : payload
  },
}
