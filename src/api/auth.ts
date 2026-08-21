import { get, post, setAccessToken, type CallOptions } from "./client"
import type { AuthSession, UserProfile } from "./types"

/**
 * Authentication service. Responsible for Steam OIDC session lifecycle.
 * On successful login the returned access token is persisted so subsequent
 * requests are authenticated automatically.
 */
export const authService = {
  getSteamLoginUrl(): string {
    const baseUrl = import.meta.env.VITE_API_URL ?? ""
    return `${baseUrl}/api/v1/auth/steam`
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
    return get<UserProfile>("/api/v1/auth/me", undefined, options)
  },
}
