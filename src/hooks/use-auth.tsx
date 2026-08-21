import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import { authService, getAccessToken, setAccessToken } from "@/api"
import type { UserProfile } from "@/api/types"

interface AuthContextValue {
  user: UserProfile | null
  loading: boolean
  isAuthenticated: boolean
  loginWithSteam: () => void
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const CALLBACK_TOKEN_KEYS = ["access_token", "accessToken", "token", "jwt"]
const SILENT_REFRESH_INTERVAL_MS = 10 * 60 * 1000

function consumeSteamCallbackToken(): string | null {
  const url = new URL(window.location.href)
  const hash = new URLSearchParams(url.hash.startsWith("#") ? url.hash.slice(1) : url.hash)
  let token: string | null = null
  let changed = false

  for (const key of CALLBACK_TOKEN_KEYS) {
    const queryValue = url.searchParams.get(key)
    const hashValue = hash.get(key)
    if (!token && (queryValue || hashValue)) token = queryValue || hashValue
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key)
      changed = true
    }
    if (hash.has(key)) {
      hash.delete(key)
      changed = true
    }
  }

  if (token) setAccessToken(token)
  if (changed) {
    const remainingHash = hash.toString()
    const cleanUrl = `${url.pathname}${url.search}${remainingHash ? `#${remainingHash}` : ""}`
    window.history.replaceState({}, document.title, cleanUrl)
  }
  return token
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const rotateSession = useCallback(async () => {
    // Never attach an expired access bearer token here: the API needs the
    // HttpOnly refresh cookie to rotate a durable browser session.
    const session = await authService.refresh({ skipAuth: true })
    setUser(session.user)
    return session.user
  }, [])

  const refreshUser = useCallback(async () => {
    const callbackToken = consumeSteamCallbackToken()
    const token = callbackToken ?? getAccessToken()
    try {
      // A successful Steam callback can provide either a token or an HttpOnly cookie session.
      // In both cases /auth/me is the authority for whether the user is signed in.
      const profile = await authService.me({ skipAuth: !token })
      setUser(profile)
    } catch {
      try {
        // Access JWTs deliberately expire quickly. Do not send the expired
        // bearer token here: the API must rotate the HttpOnly refresh cookie.
        await rotateSession()
      } catch {
        if (token) setAccessToken(null)
        setUser(null)
      }
    } finally {
      setLoading(false)
    }
  }, [rotateSession])

  useEffect(() => {
    void refreshUser()
  }, [refreshUser])

  useEffect(() => {
    if (!user) return

    let refreshing = false
    const silentlyRotate = async () => {
      if (refreshing) return
      refreshing = true
      try {
        await rotateSession()
      } catch {
        // Transient network failures do not clear the player session. A later
        // interval, visibility event, or browser reload will retry safely.
      } finally {
        refreshing = false
      }
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void silentlyRotate()
    }
    const interval = window.setInterval(() => void silentlyRotate(), SILENT_REFRESH_INTERVAL_MS)
    document.addEventListener("visibilitychange", onVisibilityChange)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener("visibilitychange", onVisibilityChange)
    }
  }, [user?.id, rotateSession])

  const loginWithSteam = useCallback(() => {
    window.location.href = authService.getSteamLoginUrl()
  }, [])

  const logout = useCallback(async () => {
    try {
      await authService.logout()
    } catch {
      // Even if the server call fails, clear local state.
    }
    setAccessToken(null)
    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: user !== null,
      loginWithSteam,
      logout,
      refreshUser,
    }),
    [user, loading, loginWithSteam, logout, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return ctx
}
