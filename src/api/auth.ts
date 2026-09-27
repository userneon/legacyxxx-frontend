import { API_BASE_URL, MOCK_API, get, post, setAccessToken, type CallOptions } from "./client"
import type { AuthSession, UserProfile } from "./types"

/**
 * Authentication service. Responsible for Steam OIDC session lifecycle.
 * On successful login the returned access token is persisted so subsequent
 * requests are authenticated automatically.
 */
export const authService = {
  getSteamLoginUrl(): string {
    // Design preview: "sign in" as a sample player by handing the app the callback token directly.
    if (MOCK_API) return `${window.location.pathname}?access_token=mock-session`
    // Same origin as every other request, including the production API when VITE_API_URL is unset.
    return `${API_BASE_URL}/api/v1/auth/steam`
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
