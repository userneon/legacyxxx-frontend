/**
 * Avatar frame art (public/frames/<id>.webp, 256px, transparent middle), measured from the art itself.
 * `opening` is the share of the frame's width the picture may fill (a rounded square drawn behind the art and a little larger
 * than the frame's inner border, so it fills the opening and its edges tuck under the border); `dx` / `dy` move it to the middle of that opening, which is not
 * always the middle of the image (both are shares of the frame's width).
 */
interface FrameArt {
  opening: number
  dx: number
  dy: number
  /** The art has a mask (public/frames/<id>-mask.webp, the shape of its opening): FramedAvatar cuts the picture to it, so it fills an opening that is not a square. */
  mask?: boolean
}

const FRAMES: Record<string, FrameArt> = {
  "founder": { opening: 0.6, dx: 0.002, dy: -0.014, mask: true },
  "starlight-corners": { opening: 0.8, dx: -0.002, dy: -0.002 },
  "torn-tape": { opening: 0.83, dx: -0.002, dy: -0.008 },
  "red-circuit": { opening: 0.86, dx: 0.002, dy: 0.004 },
  "liquid-metal": { opening: 0.86, dx: -0.002, dy: 0.01 },
  "neon-violet": { opening: 0.8, dx: 0.004, dy: 0.006 },
  "charcoal-ring": { opening: 0.8, dx: 0.008, dy: -0.002 },
  "blue-lightning": { opening: 0.76, dx: 0.01, dy: -0.03 },
  "sakura-blossom": { opening: 0.86, dx: 0.0, dy: -0.018 },
  "shattered-crystal": { opening: 0.84, dx: -0.018, dy: -0.029 },
  "crimson-lightning": { opening: 0.8, dx: 0.0, dy: -0.006 },
  "barbed-wire": { opening: 0.85, dx: -0.01, dy: -0.008 },
  "golden-moon": { opening: 0.8, dx: 0.012, dy: 0.0 },
  "silent-waves": { opening: 0.84, dx: 0.0, dy: 0.0 },
  "prism-glass": { opening: 0.84, dx: 0.0, dy: 0.0 },
  "chain-and-tag": { opening: 0.74, dx: 0.027, dy: 0.006 },
  "toxic-lightning": { opening: 0.81, dx: 0.016, dy: 0.01 },
  "angel-wings": { opening: 0.75, dx: 0.02, dy: 0.02 },
  "blood-vine": { opening: 0.78, dx: 0.008, dy: 0.01 },
  "planet-orbit": { opening: 0.74, dx: -0.002, dy: -0.008 },
  "graffiti": { opening: 0.74, dx: -0.008, dy: 0.016 },
  "ice-crystals": { opening: 0.75, dx: -0.018, dy: -0.006 },
  "eclipse-clouds": { opening: 0.76, dx: -0.02, dy: 0.0 },
  "film-and-butterflies": { opening: 0.75, dx: -0.03, dy: -0.01 },
  "glitch": { opening: 0.8, dx: 0.0, dy: -0.01 },
  "booster-gold": { opening: 0.589, dx: -0.002, dy: -0.014, mask: true },
  "booster-silver": { opening: 0.606, dx: 0, dy: -0.002, mask: true },
  "booster-bronze": { opening: 0.602, dx: 0, dy: -0.016, mask: true },
  "server-booster": { opening: 0.8, dx: 0, dy: 0 },
}

export function frameArt(id: string | null | undefined): ({ src: string; maskSrc?: string } & FrameArt) | null {
  if (!id || !(id in FRAMES)) return null
  return { src: `/frames/${id}.webp`, ...(FRAMES[id].mask ? { maskSrc: `/frames/${id}-mask.webp` } : {}), ...FRAMES[id] }
}

const COLOR_FX = new Set(["chrome", "gold", "ice", "sakura", "emerald", "aurora", "holo", "fire", "void", "sunrise", "ocean", "lava", "candy", "toxic", "midnight", "rosegold", "platinum", "spectrum", "galaxy"])
const GLOW_FX = new Set(["neon", "pulse", "flame", "electric", "aura", "halo", "breathe", "spark"])
const HEX = /^#[0-9a-f]{6}$/i

/** What a name is painted with: plain colours and short effect keys from the API, never a style string. */
export interface NameLook {
  color?: string | null
  glow?: string | null
  colorFx?: string | null
  glowFx?: string | null
}

/**
 * Props for the element that shows a player's name (className, after `base`, plus style). Only #rrggbb values and effect keys this
 * site knows are used; anything else is ignored, so a bad value can never inject CSS.
 */
export function nameProps(look: NameLook | null | undefined, base = ""): { className: string; style?: React.CSSProperties } {
  const colorFx = look?.colorFx && COLOR_FX.has(look.colorFx) ? look.colorFx : null
  const color = look?.color && HEX.test(look.color) ? look.color : null
  const glow = look?.glow && HEX.test(look.glow) ? look.glow : null
  const glowFx = glow ? (look?.glowFx && GLOW_FX.has(look.glowFx) ? look.glowFx : "neon") : null
  if (!colorFx && !color && !glow) return { className: base }
  return {
    className: [base, "lx-name", colorFx && `lx-fx-${colorFx}`, glowFx && `lx-glow-${glowFx}`].filter(Boolean).join(" "),
    style: { ...(color && !colorFx ? { color } : {}), ...(glow ? ({ "--name-glow": glow } as React.CSSProperties) : {}) },
  }
}

/** The main colour of each frame's art, used for the soft light behind it in the Shop. */
const ACCENTS: Record<string, string> = {
  "starlight-corners": "#e5e7eb", // palette-exempt: the frame's own light
  "torn-tape": "#d4d4d4", // palette-exempt: the frame's own light
  "red-circuit": "#ef4444", // palette-exempt: the frame's own light
  "shattered-crystal": "#cbd5e1", // palette-exempt: the frame's own light
  "charcoal-ring": "#a3a3a3", // palette-exempt: the frame's own light
  "barbed-wire": "#a3a3a3", // palette-exempt: the frame's own light
  "silent-waves": "#a3a3a3", // palette-exempt: the frame's own light
  "neon-violet": "#a855f7", // palette-exempt: the frame's own light
  "graffiti": "#e5e5e5", // palette-exempt: the frame's own light
  "liquid-metal": "#cbd5e1", // palette-exempt: the frame's own light
  "chain-and-tag": "#a3a3a3", // palette-exempt: the frame's own light
  "sakura-blossom": "#f9a8d4", // palette-exempt: the frame's own light
  "blue-lightning": "#38bdf8", // palette-exempt: the frame's own light
  "crimson-lightning": "#ef4444", // palette-exempt: the frame's own light
  "toxic-lightning": "#84cc16", // palette-exempt: the frame's own light
  "prism-glass": "#67e8f9", // palette-exempt: the frame's own light
  "blood-vine": "#dc2626", // palette-exempt: the frame's own light
  "film-and-butterflies": "#d4d4d4", // palette-exempt: the frame's own light
  "planet-orbit": "#a855f7", // palette-exempt: the frame's own light
  "ice-crystals": "#38bdf8", // palette-exempt: the frame's own light
  "golden-moon": "#f5c542", // palette-exempt: the frame's own light
  "angel-wings": "#e5e7eb", // palette-exempt: the frame's own light
  "eclipse-clouds": "#9ca3af", // palette-exempt: the frame's own light
  "glitch": "#22d3ee", // palette-exempt: the frame's own light
  "founder": "#f2cd72", // palette-exempt: the frame's own light
  "booster-gold": "#f2cd72", // palette-exempt: the frame's own light
  "booster-silver": "#cbd5e1", // palette-exempt: the frame's own light
  "booster-bronze": "#d98a5f", // palette-exempt: the frame's own light
  "server-booster": "#ff73fa", // palette-exempt: Discord Boost brand
}

export function frameAccent(id: string): string {
  return ACCENTS[id] ?? "#d4d4d4" // palette-exempt: neutral light
}

/** Profile banners the site can draw: the API sends only an effect key, mapped to a CSS class here (anything else draws nothing). */
const BANNER_CLASSES: Record<string, string> = { goldfoil: "lx-banner-goldfoil" }
export function bannerClass(fx: string | null | undefined): string | null {
  return fx && fx in BANNER_CLASSES ? BANNER_CLASSES[fx] : null
}

/** Props for a clan's [TAG]: the colour and glow the clan bought. Same safe handling as a player's name. */
export function clanTagProps(look: { tagColor: string | null; tagColorFx: string | null; tagGlow: string | null; tagGlowFx: string | null } | null | undefined, base = ""): { className: string; style?: React.CSSProperties } {
  return nameProps(look ? { color: look.tagColor, colorFx: look.tagColorFx, glow: look.tagGlow, glowFx: look.tagGlowFx } : null, base)
}

/** The clan page backdrop as a CSS gradient, or undefined when the clan has none (only #rrggbb is ever used). */
export function backdropStyle(backdrop: { from: string; to: string } | null | undefined): string | undefined {
  return backdrop && HEX.test(backdrop.from) && HEX.test(backdrop.to) ? `linear-gradient(135deg, ${backdrop.from}, ${backdrop.to})` : undefined
}

/** The whole clan page background: a soft light from the top in the clan's two colours. */
export function pageBackground(page: { from: string; to: string } | null | undefined): string | undefined {
  return page && HEX.test(page.from) && HEX.test(page.to) ? `radial-gradient(130% 80% at 50% 0%, ${page.from}, ${page.to} 78%)` : undefined
}

/** "3 days left", "5 h left", "under an hour left" for a rented cosmetic; empty for one that is yours for good. */
export function timeLeft(expiresAt?: string | null, now = Date.now()) {
  if (!expiresAt) return ""
  const ms = Date.parse(expiresAt) - now
  if (!(ms > 0)) return "ended"
  const hours = ms / 3_600_000
  if (hours < 1) return "under an hour left"
  if (hours < 24) return `${Math.floor(hours)} h left`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? "" : "s"} left`
}
