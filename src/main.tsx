import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter, Route, Routes } from "react-router-dom"

import "./index.css"
import "./event-themes.css"
import App from "./App.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"
import { AuthProvider } from "@/hooks/use-auth.tsx"
import { Toaster } from "@/components/ui/sonner"
import { comingSoonActive } from "@/lib/coming-soon"
import { ComingSoonPage } from "@/pages/coming-soon"
import { PrivacyPage } from "@/pages/privacy"
import { TermsPage } from "@/pages/terms"
import { preloadPageArt } from "@/lib/preload-art"


// While the site is "coming soon" (lib/coming-soon.ts) only that page is drawn, with the Terms and Privacy pages: no sign-in, no API call.
if (comingSoonActive()) {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <BrowserRouter>
        <ThemeProvider defaultTheme="dark">
          <Routes>
            <Route path="/terms" element={<div className="min-h-svh bg-[var(--bg)]"><TermsPage /></div>} />
            <Route path="/privacy" element={<div className="min-h-svh bg-[var(--bg)]"><PrivacyPage /></div>} />
            <Route path="*" element={<ComingSoonPage />} />
          </Routes>
        </ThemeProvider>
      </BrowserRouter>
    </StrictMode>
  )
} else {
  window.addEventListener("load", preloadPageArt, { once: true })

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <BrowserRouter>
        <ThemeProvider defaultTheme="dark">
          <AuthProvider>
            <App />
            <Toaster richColors position="top-center" />
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </StrictMode>
  )
}
