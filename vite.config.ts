import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv, type Plugin } from "vite"

import { legalStatic } from "./legal-static-plugin"

const siteUrl = (process.env.VITE_SITE_URL || loadEnv("production", process.cwd(), "VITE_").VITE_SITE_URL || "https://legacyx.cc").replace(/\/+$/, "")
const discordInvite = process.env.VITE_DISCORD_INVITE_URL || loadEnv("production", process.cwd(), "VITE_").VITE_DISCORD_INVITE_URL || "https://discord.gg/legacyx"

/** The share tags in index.html name the site the build is for (VITE_SITE_URL, which ops/site-env.sh takes from the DOMAIN line). */
function siteUrlInHtml(): Plugin {
  return { name: "site-url-in-html", transformIndexHtml: (html) => html.replaceAll("__SITE_URL__", siteUrl) }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), siteUrlInHtml(), legalStatic(siteUrl, discordInvite)],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
