import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"

import "../index.css"
import { AdminApp } from "./admin-app"
import { ThemeProvider } from "@/components/theme-provider.tsx"
import { AuthProvider } from "@/hooks/use-auth.tsx"
import { Toaster } from "@/components/ui/sonner"

/** The staff site (admin.legacyx.cc): the Staff page on its own, with the same sign-in and look as the website. */
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider defaultTheme="dark">
        <AuthProvider>
          <AdminApp />
          <Toaster richColors position="top-center" />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>
)
