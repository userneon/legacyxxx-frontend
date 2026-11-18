import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv, type Plugin } from "vite"

/** The share tags in index.html name the site the build is for (VITE_SITE_URL, which ops/site-env.sh takes from the DOMAIN line). */
function siteUrlInHtml(): Plugin {
  const site = (process.env.VITE_SITE_URL || loadEnv("production", process.cwd(), "VITE_").VITE_SITE_URL || "https://legacyx.cc").replace(/\/+$/, "")
  return { name: "site-url-in-html", transformIndexHtml: (html) => html.replaceAll("__SITE_URL__", site) }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), siteUrlInHtml()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
