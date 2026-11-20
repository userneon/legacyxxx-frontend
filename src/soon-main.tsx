import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter, Route, Routes } from "react-router-dom"

import "./index.css"
import "./event-themes.css"
import { ThemeProvider } from "@/components/theme-provider.tsx"
import { AuthProvider } from "@/hooks/use-auth.tsx"
import { Toaster } from "@/components/ui/sonner"
import { ComingSoonPage } from "@/pages/coming-soon"
import { PrivacyPage } from "@/pages/privacy"
import { TermsPage } from "@/pages/terms"

/**
 * The Coming Soon site (owner request 2026-11-20): a build of its own (vite.soon.config.ts, `npm run build:soon`) that holds ONLY this page, the Terms and the Privacy policy.
 * The nginx gate (ops/gate.sh) serves it to everyone without the preview cookie until the launch, so the real site's code is not sent at all.
 */
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider defaultTheme="dark">
        <AuthProvider>
          <Routes>
            <Route path="/terms" element={<div className="min-h-svh bg-[var(--bg)]"><TermsPage /></div>} />
            <Route path="/privacy" element={<div className="min-h-svh bg-[var(--bg)]"><PrivacyPage /></div>} />
            <Route path="*" element={<ComingSoonPage />} />
          </Routes>
          <Toaster richColors position="top-center" />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>
)
