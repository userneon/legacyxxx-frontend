// Dev-only tool page for scripts/record-clan-effects.mjs: paints one effect in white on black, 400×225, so it can be recorded into public/clan-fx/<effect>.gif.
import { createRoot } from "react-dom/client"

import "@/index.css"

import { EffectLayer } from "@/components/clan-background"
import type { ClanPageEffect } from "@/api"

const effect = new URLSearchParams(location.search).get("effect") as ClanPageEffect | null
// Lightning is coloured by hue only, so it gets a bright hue instead of white (white has hue 0, a dark red once turned grey).
const color = effect === "lightning" ? "#ffff00" : "#ffffff" // palette-exempt: capture tool, never shown on the site
if (effect) createRoot(document.getElementById("root")!).render(<div className="size-full" style={{ background: "#000" }}><EffectLayer effect={effect} color={color} base="#000000" /></div>)
