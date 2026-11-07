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
  /** With a mask: the opening's bounding box as fractions of the frame box [left, top, width, height] (from the mask's own picture); the avatar is fitted to it, so it is seen whole instead of cut to the middle of the box. */
  box?: [number, number, number, number]
}

const FRAMES: Record<string, FrameArt> = {
  // Premium animated frames (owner request 2026-10-25), drawn by scripts/premium-frames.html: the opening is the middle 380 of 512.
  // Painted frames from the owner's sheet (2026-10-27); `python3 scripts/measure-frame-openings.py` measures these.
  // Rank frames (owner sheet 2026-10-30, one per rank, earned) and twenty frog frames; `python3 scripts/measure-frame-openings.py` measures these.
  "frog-jungle": { opening: 0.61, dx: 0.025, dy: 0.074, mask: true, box: [0.234, 0.309, 0.582, 0.531] },
  "frog-boss": { opening: 0.63, dx: 0.023, dy: 0.057, mask: true, box: [0.219, 0.266, 0.609, 0.582] },
  "frog-tears": { opening: 0.64, dx: 0.014, dy: 0.082, mask: true, box: [0.207, 0.316, 0.613, 0.531] },
  "frog-hearts": { opening: 0.66, dx: 0.014, dy: 0.068, mask: true, box: [0.195, 0.293, 0.637, 0.551] },
  "frog-wizard": { opening: 0.67, dx: 0.020, dy: 0.086, mask: true, box: [0.199, 0.297, 0.641, 0.578] },
  "frog-gamer": { opening: 0.64, dx: 0.016, dy: 0.053, mask: true, box: [0.207, 0.27, 0.617, 0.566] },
  "frog-rage": { opening: 0.64, dx: 0.008, dy: 0.039, mask: true, box: [0.199, 0.246, 0.617, 0.586] },
  "frog-storm": { opening: 0.64, dx: 0.018, dy: 0.062, mask: true, box: [0.211, 0.289, 0.613, 0.547] },
  "frog-money": { opening: 0.62, dx: 0.031, dy: 0.041, mask: true, box: [0.234, 0.262, 0.594, 0.559] },
  "frog-hood": { opening: 0.63, dx: 0.020, dy: 0.061, mask: true, box: [0.219, 0.281, 0.602, 0.559] },
  "frog-sleepy": { opening: 0.63, dx: 0.029, dy: 0.062, mask: true, box: [0.227, 0.281, 0.605, 0.562] },
  "frog-angel": { opening: 0.68, dx: 0.018, dy: 0.068, mask: true, box: [0.191, 0.289, 0.652, 0.559] },
  "frog-devil": { opening: 0.60, dx: 0.033, dy: 0.057, mask: true, box: [0.246, 0.289, 0.574, 0.535] },
  "frog-explorer": { opening: 0.65, dx: 0.023, dy: 0.068, mask: true, box: [0.211, 0.285, 0.625, 0.566] },
  "frog-sakura": { opening: 0.66, dx: 0.020, dy: 0.059, mask: true, box: [0.203, 0.266, 0.633, 0.586] },
  "frog-samurai": { opening: 0.67, dx: 0.018, dy: 0.051, mask: true, box: [0.195, 0.262, 0.645, 0.578] },
  "frog-astronaut": { opening: 0.61, dx: 0.012, dy: 0.041, mask: true, box: [0.219, 0.273, 0.586, 0.535] },
  "frog-christmas": { opening: 0.65, dx: 0.008, dy: 0.051, mask: true, box: [0.195, 0.266, 0.625, 0.57] },
  "frog-pumpkin": { opening: 0.63, dx: 0.021, dy: 0.057, mask: true, box: [0.219, 0.277, 0.605, 0.559] },
  "frog-glitch": { opening: 0.65, dx: 0.010, dy: 0.037, mask: true, box: [0.195, 0.254, 0.629, 0.566] },
}

export function frameArt(id: string | null | undefined): ({ src: string; maskSrc?: string } & FrameArt) | null {
  if (!id || !(id in FRAMES)) return null
  return { src: `/frames/${id}.webp?v=2`, ...(FRAMES[id].mask ? { maskSrc: `/frames/${id}-mask.webp?v=2` } : {}), ...FRAMES[id] }
}

/** Designs coloured with the player's own pick (--name-color); fire and chrome have a fixed-colour look too, used when no colour comes. */
const TINT_FX: Record<string, string> = { gradient: "gradient", foil: "foil", drift: "drift", fire: "tint-fire", chrome: "tint-chrome" }
const COLOR_FX = new Set(["gradient", "foil", "drift", "chrome", "gold", "ice", "sakura", "emerald", "aurora", "holo", "fire", "void", "sunrise", "ocean", "lava", "candy", "toxic", "midnight", "rosegold", "platinum", "spectrum", "galaxy", "split", "pastel", "stripes", "wave", "duo", "gloss", "frost"])
const GLOW_FX = new Set(["neon", "pulse", "flame", "electric", "aura", "halo", "breathe", "spark", "ring", "bloom", "drop", "twinkle", "strobe", "ripple", "heartbeat", "sway"])
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
  // A design with a picked colour paints from it; the old fixed looks (and earned items) keep their own colours.
  const fxClass = colorFx && (color ? TINT_FX[colorFx] ?? colorFx : colorFx)
  return {
    className: [base, "lx-name", fxClass && `lx-fx-${fxClass}`, glowFx && `lx-glow-${glowFx}`].filter(Boolean).join(" "),
    style: { ...(color && !colorFx ? { color } : {}), ...(color && colorFx ? ({ "--name-color": color } as React.CSSProperties) : {}), ...(glow ? ({ "--name-glow": glow } as React.CSSProperties) : {}) },
  }
}

/** The main colour of each frame's art, used for the soft light behind it in the Shop. */
const ACCENTS: Record<string, string> = {
  "frog-jungle": "#799229", // palette-exempt: the frame's own light
  "frog-boss": "#d69d26", // palette-exempt: the frame's own light
  "frog-tears": "#1a89ce", // palette-exempt: the frame's own light
  "frog-hearts": "#f1567e", // palette-exempt: the frame's own light
  "frog-wizard": "#9f2dda", // palette-exempt: the frame's own light
  "frog-gamer": "#389bb7", // palette-exempt: the frame's own light
  "frog-rage": "#c51b13", // palette-exempt: the frame's own light
  "frog-storm": "#9ca3af", // palette-exempt: the frame's own light
  "frog-money": "#a8b133", // palette-exempt: the frame's own light
  "frog-hood": "#11b1c9", // palette-exempt: the frame's own light
  "frog-sleepy": "#738284", // palette-exempt: the frame's own light
  "frog-angel": "#d49f3c", // palette-exempt: the frame's own light
  "frog-devil": "#cc2514", // palette-exempt: the frame's own light
  "frog-explorer": "#c89a5f", // palette-exempt: the frame's own light
  "frog-sakura": "#df6468", // palette-exempt: the frame's own light
  "frog-samurai": "#ce6850", // palette-exempt: the frame's own light
  "frog-astronaut": "#857b8d", // palette-exempt: the frame's own light
  "frog-christmas": "#97454b", // palette-exempt: the frame's own light
  "frog-pumpkin": "#d16407", // palette-exempt: the frame's own light
  "frog-glitch": "#5f4cc9", // palette-exempt: the frame's own light
}

export function frameAccent(id: string): string {
  return ACCENTS[id] ?? "#d4d4d4" // palette-exempt: neutral light
}

/**
 * The light each frame gives off (owner request 2026-10-27: every frame its own glow): `a` is the close, bright rim, `b` the wide soft halo
 * (the two colours of the art where it has two), `r` how far the halo reaches in px. The premium and special frames reach furthest.
 */
const FRAME_GLOW: Record<string, { a: string; b: string; r: number }> = { // palette-exempt: the frames' own light
  "frog-jungle": { a: "#bcc894", b: "#4f5f1b", r: 12 }, // palette-exempt: the frame's own light
  "frog-boss": { a: "#eace92", b: "#8b6619", r: 12 }, // palette-exempt: the frame's own light
  "frog-tears": { a: "#8cc4e6", b: "#115986", r: 12 }, // palette-exempt: the frame's own light
  "frog-hearts": { a: "#f8aabe", b: "#9d3852", r: 12 }, // palette-exempt: the frame's own light
  "frog-wizard": { a: "#cf96ec", b: "#671d8e", r: 12 }, // palette-exempt: the frame's own light
  "frog-gamer": { a: "#9ccddb", b: "#246577", r: 12 }, // palette-exempt: the frame's own light
  "frog-rage": { a: "#e28d89", b: "#80120c", r: 12 }, // palette-exempt: the frame's own light
  "frog-storm": { a: "#ced1d7", b: "#656a72", r: 12 }, // palette-exempt: the frame's own light
  "frog-money": { a: "#d4d899", b: "#6d7321", r: 12 }, // palette-exempt: the frame's own light
  "frog-hood": { a: "#88d8e4", b: "#0b7383", r: 12 }, // palette-exempt: the frame's own light
  "frog-sleepy": { a: "#b9c0c2", b: "#4b5456", r: 12 }, // palette-exempt: the frame's own light
  "frog-angel": { a: "#eacf9e", b: "#8a6727", r: 12 }, // palette-exempt: the frame's own light
  "frog-devil": { a: "#e6928a", b: "#85180d", r: 12 }, // palette-exempt: the frame's own light
  "frog-explorer": { a: "#e4ccaf", b: "#82643e", r: 12 }, // palette-exempt: the frame's own light
  "frog-sakura": { a: "#efb2b4", b: "#914144", r: 12 }, // palette-exempt: the frame's own light
  "frog-samurai": { a: "#e6b4a8", b: "#864434", r: 12 }, // palette-exempt: the frame's own light
  "frog-astronaut": { a: "#c2bdc6", b: "#56505c", r: 12 }, // palette-exempt: the frame's own light
  "frog-christmas": { a: "#cba2a5", b: "#622d31", r: 12 }, // palette-exempt: the frame's own light
  "frog-pumpkin": { a: "#e8b283", b: "#884105", r: 12 }, // palette-exempt: the frame's own light
  "frog-glitch": { a: "#afa6e4", b: "#3e3183", r: 12 }, // palette-exempt: the frame's own light
}

/** The soft light round a frame (frames stand still and glow instead of moving): a close rim in one colour and a wide halo in the other. */
export function frameGlow(id: string | null | undefined): string | undefined {
  if (!id || !(id in FRAMES)) return undefined
  const glow = FRAME_GLOW[id] ?? { a: frameAccent(id), b: frameAccent(id), r: 9 }
  // Even all round (owner request 2026-11-01, "make the glow even"): no hard bright rim hugging the ornaments, only two soft halos of one reach
  // that blend, so the light is the same on every side of the frame instead of flaring at its corners and spikes.
  const near = `color-mix(in oklab, ${glow.a} 55%, transparent)`
  const far = `color-mix(in oklab, ${glow.b} 45%, transparent)`
  return `drop-shadow(0 0 ${Math.round(glow.r * 0.6)}px ${near}) drop-shadow(0 0 ${glow.r}px ${far})`
}

/** Profile banners the site can draw: the API sends only an effect key, mapped to a CSS class here (anything else draws nothing). */
const BANNER_CLASSES: Record<string, string> = { goldfoil: "lx-banner-goldfoil", "perk-tier1": "lx-banner-perk lx-banner-perk-1", "perk-tier2": "lx-banner-perk lx-banner-perk-2", "perk-tier3": "lx-banner-perk lx-banner-perk-3" }
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
