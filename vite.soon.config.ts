import { copyFileSync, cpSync, existsSync, mkdirSync } from "node:fs"
import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv, type Plugin } from "vite"

import { legalStatic } from "./legal-static-plugin"

const siteUrl = (process.env.VITE_SITE_URL || loadEnv("production", process.cwd(), "VITE_").VITE_SITE_URL || "https://legacyx.cc").replace(/\/+$/, "")
const discordInvite = process.env.VITE_DISCORD_INVITE_URL || loadEnv("production", process.cwd(), "VITE_").VITE_DISCORD_INVITE_URL || "https://discord.gg/legacyx"

/** The page is built from soon.html; the server wants it as index.html. */
function soonAsIndex(): Plugin {
  return {
    name: "soon-as-index",
    enforce: "post",
    generateBundle(_options, bundle) {
      const page = bundle["soon.html"]
      if (page) { page.fileName = "index.html"; bundle["index.html"] = page; delete bundle["soon.html"] }
    },
    transformIndexHtml: (html) => html.replaceAll("__SITE_URL__", siteUrl),
  }
}

/** Only the few files of public/ the Coming Soon page and the share cards use; the rest of public/ is the real site's art and stays out. */
const PUBLIC_FILES = ["favicon.png", "apple-touch-icon.png", "og-image.png", "lxc-monogram.png", "lxc-monogram-newyear.webp"]
function copyPublic(): Plugin {
  return {
    name: "soon-public",
    apply: "build",
    closeBundle() {
      const out = path.resolve(process.cwd(), "dist-soon")
      mkdirSync(out, { recursive: true })
      for (const file of PUBLIC_FILES) if (existsSync(path.resolve("public", file))) copyFileSync(path.resolve("public", file), path.join(out, file))
      if (existsSync("public/cursors")) cpSync("public/cursors", path.join(out, "cursors"), { recursive: true })
    },
  }
}

// The Coming Soon build: only src/soon-main.tsx and what it imports (no App, no pages of the real site). Output: dist-soon/. Used by ops/gate.sh.
export default defineConfig({
  plugins: [react(), tailwindcss(), soonAsIndex(), legalStatic(siteUrl, discordInvite, "dist-soon"), copyPublic()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  publicDir: false,
  build: { outDir: "dist-soon", emptyOutDir: true, rollupOptions: { input: path.resolve(__dirname, "soon.html") } },
})
