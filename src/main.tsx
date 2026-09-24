import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"

import "./index.css"
import App from "./App.tsx"
import { AuthProvider } from "@/hooks/use-auth.tsx"
import { StaffProvider } from "@/hooks/use-staff"
import { LiveServersProvider } from "@/hooks/use-live-servers"
import { MyRankProvider } from "@/hooks/use-my-rank"
import { Toaster } from "@/components/ui/sonner"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <StaffProvider>
          <LiveServersProvider>
            <MyRankProvider>
              <App />
            </MyRankProvider>
          </LiveServersProvider>
        </StaffProvider>
        <Toaster position="bottom-center" />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
)
