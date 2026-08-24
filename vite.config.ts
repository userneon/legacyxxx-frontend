import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  publicDir: "/home/ubuntu/webdev-static-assets",
  server: {
    allowedHosts: [".manus.computer"],
    fs: {
      allow: ["/home/ubuntu/legacyxxx-frontend-mock-git-preview", "/home/ubuntu/legacyxxx-frontend-skinchanger-live"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
