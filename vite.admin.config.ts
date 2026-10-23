import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vite"

/** In dev, every page address opens admin.html (the staff site is a single-page app like the website). */
const adminFallback = (): Plugin => ({
  name: "admin-html-fallback",
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      const url = req.url ?? ""
      if (req.method === "GET" && !url.includes(".") && !url.startsWith("/@") && !url.startsWith("/api")) req.url = "/admin.html"
      next()
    })
  },
})

// The staff site, admin.legacyx.cc: `npm run build:admin` writes dist-admin/ (admin.html is published as index.html). The website's own build does not include it.
export default defineConfig({
  plugins: [react(), tailwindcss(), adminFallback()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  server: { port: 5200 },
  build: { outDir: "dist-admin", emptyOutDir: true, rollupOptions: { input: path.resolve(__dirname, "admin.html") } },
})
