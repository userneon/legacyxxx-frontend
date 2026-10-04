import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"

import "./index.css"
import App from "./App.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"
import { AuthProvider } from "@/hooks/use-auth.tsx"
import { Toaster } from "@/components/ui/sonner"
import { LaunchCountdown } from "@/components/launch-countdown.tsx"
import { launchGateActive } from "@/lib/launch.ts"

// Before launch every address shows the countdown; no auth or API request is made.
async function start() {
  const gated = await launchGateActive()

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      {gated ? (
        <ThemeProvider defaultTheme="dark">
          <LaunchCountdown />
        </ThemeProvider>
      ) : (
        <BrowserRouter>
          <ThemeProvider defaultTheme="dark">
            <AuthProvider>
              <App />
              <Toaster richColors position="top-center" />
            </AuthProvider>
          </ThemeProvider>
        </BrowserRouter>
      )}
    </StrictMode>
  )
}

void start()
