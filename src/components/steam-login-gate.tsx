import { useState } from "react"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"

interface SteamLoginGateProps {
  pageName: string
}

const STEAM_LOGO_PATH = "/steam-logo-png_seeklogo-290636.png"

export function SteamLoginGate({ pageName }: SteamLoginGateProps) {
  const { loginWithSteam } = useAuth()
  const [logoAvailable, setLogoAvailable] = useState(true)

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-5 p-12 md:min-h-[calc(100vh-3.5rem)]">
      <div className="glass flex size-20 items-center justify-center rounded-2xl p-3">
        {logoAvailable ? (
          <img
            src={STEAM_LOGO_PATH}
            alt="Steam"
            className="size-full rounded-full object-cover"
            onError={() => setLogoAvailable(false)}
          />
        ) : (
          <SteamIcon className="size-10 text-foreground" />
        )}
      </div>
      <div className="text-center">
        <h2 className="text-lg font-semibold">{pageName} requires sign-in</h2>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          Sign in with Steam to access this section.
        </p>
      </div>
      <Button size="lg" onClick={loginWithSteam} className="gap-2">
        {logoAvailable ? (
          <img
            src={STEAM_LOGO_PATH}
            alt=""
            className="size-5 rounded-full object-cover"
            onError={() => setLogoAvailable(false)}
          />
        ) : (
          <SteamIcon className="size-5" />
        )}
        Login with Steam
      </Button>
    </div>
  )
}

export function SteamIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 0C5.4 0 .1 5.3 0 11.8l6.4 2.6c.5-.7 1.4-1.1 2.3-1.1h.2l2.8-4.1v-.1c0-2.5 2-4.6 4.6-4.6 2.5 0 4.6 2 4.6 4.6 0 2.5-2 4.6-4.6 4.6h-.1l-4 2.9v.1c0 1.7-1.4 3.1-3.1 3.1-1.5 0-2.7-1-3-2.4L.3 15.3C1.8 20.3 6.5 24 12 24c6.6 0 12-5.4 12-12S18.6 0 12 0zm-4.5 18.4l-1.5-.6c.3.6.7 1 1.4 1.3 1.4.6 3-.1 3.6-1.5.3-.7.3-1.4 0-2.1-.3-.7-.8-1.2-1.5-1.5-.7-.3-1.4-.3-2 0l1.5.6c1 .4 1.5 1.6 1.1 2.6-.4 1-1.6 1.5-2.6 1.1zm9.9-7.2c0-1.7-1.4-3.1-3.1-3.1-1.7 0-3.1 1.4-3.1 3.1 0 1.7 1.4 3.1 3.1 3.1 1.7 0 3.1-1.4 3.1-3.1zm-5.5 0c0-1.3 1.1-2.4 2.4-2.4 1.3 0 2.4 1.1 2.4 2.4 0 1.3-1.1 2.4-2.4 2.4-1.3 0-2.4-1.1-2.4-2.4z" />
    </svg>
  )
}
