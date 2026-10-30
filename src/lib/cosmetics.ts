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
  "torn-tape": { opening: 0.80, dx: 0.000, dy: -0.006 },
  "red-circuit": { opening: 0.78, dx: 0.000, dy: -0.002 },
  "liquid-metal": { opening: 0.83, dx: 0.004, dy: 0.012 },
  "neon-violet": { opening: 0.77, dx: 0.006, dy: 0.002 },
  "charcoal-ring": { opening: 0.76, dx: 0.010, dy: 0.000 },
  "blue-lightning": { opening: 0.76, dx: 0.021, dy: -0.012 },
  "sakura-blossom": { opening: 0.84, dx: 0.002, dy: -0.012 },
  "shattered-crystal": { opening: 0.80, dx: -0.014, dy: -0.018 },
  "crimson-lightning": { opening: 0.76, dx: 0.002, dy: -0.012 },
  "barbed-wire": { opening: 0.84, dx: -0.004, dy: -0.004 },
  "golden-moon": { opening: 0.83, dx: 0.020, dy: 0.004 },
  "silent-waves": { opening: 0.84, dx: 0.0, dy: 0.0 },
  "prism-glass": { opening: 0.77, dx: 0.006, dy: -0.004 },
  "chain-and-tag": { opening: 0.75, dx: 0.012, dy: 0.008 },
  "toxic-lightning": { opening: 0.78, dx: 0.004, dy: 0.010 },
  "angel-wings": { opening: 0.75, dx: 0.035, dy: 0.016 },
  "blood-vine": { opening: 0.75, dx: 0.012, dy: 0.012 },
  "planet-orbit": { opening: 0.75, dx: -0.004, dy: -0.006 },
  "graffiti": { opening: 0.75, dx: -0.008, dy: -0.004 },
  "ice-crystals": { opening: 0.74, dx: 0.002, dy: -0.012 },
  "eclipse-clouds": { opening: 0.76, dx: -0.004, dy: 0.010 },
  "film-and-butterflies": { opening: 0.75, dx: 0.008, dy: -0.014 },
  "glitch": { opening: 0.65, dx: -0.008, dy: -0.031 },
  "booster-gold": { opening: 0.589, dx: -0.002, dy: -0.014, mask: true },
  "booster-silver": { opening: 0.606, dx: 0, dy: -0.002, mask: true },
  "booster-bronze": { opening: 0.602, dx: 0, dy: -0.016, mask: true },
  "server-booster": { opening: 0.68, dx: 0.000, dy: 0.000 },
  // Premium animated frames (owner request 2026-10-25), drawn by scripts/premium-frames.html: the opening is the middle 380 of 512.
  "dragon-ember": { opening: 0.77, dx: 0.000, dy: 0.000 },
  "celestial-crown": { opening: 0.77, dx: 0.000, dy: 0.000 },
  "void-rift": { opening: 0.77, dx: 0.000, dy: 0.002 },
  "frost-royale": { opening: 0.78, dx: 0.000, dy: 0.000 },
  "hologram": { opening: 0.76, dx: 0.000, dy: 0.000 },
  "diamond-prestige": { opening: 0.77, dx: 0.000, dy: 0.000 },
  // Painted frames from the owner's sheet (2026-10-27); `python3 scripts/measure-frame-openings.py` measures these.
  "royal-drape": { opening: 0.63, dx: 0.016, dy: 0.027 },
  "sapphire-shards": { opening: 0.72, dx: 0.004, dy: 0.010 },
  "obsidian-dragon": { opening: 0.74, dx: 0.010, dy: 0.004 },
  "gold-circuit": { opening: 0.74, dx: -0.008, dy: 0.012 },
  "blossom-branch": { opening: 0.72, dx: -0.006, dy: 0.000 },
  "hellfire-thorns": { opening: 0.66, dx: 0.006, dy: 0.004 },
  "marble-angel": { opening: 0.61, dx: -0.012, dy: 0.012 },
  "amethyst-spire": { opening: 0.70, dx: -0.008, dy: 0.014 },
  "jasmine-vine": { opening: 0.71, dx: 0.004, dy: 0.008 },
  "black-regalia": { opening: 0.64, dx: 0.006, dy: 0.006 },
  "water-surge": { opening: 0.69, dx: 0.016, dy: 0.006 },
  "gilded-thorns": { opening: 0.73, dx: 0.000, dy: 0.002 },
  "opal-prism": { opening: 0.69, dx: 0.004, dy: -0.008 },
  "iron-chains": { opening: 0.66, dx: 0.014, dy: 0.006 },
  "blood-talons": { opening: 0.68, dx: -0.010, dy: 0.010 },
  "golden-blossom": { opening: 0.70, dx: 0.008, dy: 0.000 },
  "void-orb": { opening: 0.71, dx: 0.000, dy: 0.033 },
  "seraph-wings": { opening: 0.70, dx: -0.002, dy: 0.004 },
  "cyber-cyan": { opening: 0.69, dx: 0.006, dy: 0.006 },
  "rose-thorn": { opening: 0.70, dx: 0.018, dy: 0.002 },
  // Rank frames (owner sheet 2026-10-30, one per rank, earned) and twenty frog frames; `python3 scripts/measure-frame-openings.py` measures these.
  "rank-1": { opening: 0.70, dx: 0.000, dy: 0.064 },
  "rank-2": { opening: 0.71, dx: 0.002, dy: 0.064 },
  "rank-3": { opening: 0.71, dx: 0.000, dy: 0.066 },
  "rank-4": { opening: 0.70, dx: -0.010, dy: 0.070 },
  "rank-5": { opening: 0.70, dx: -0.004, dy: 0.066 },
  "rank-6": { opening: 0.70, dx: 0.006, dy: 0.064 },
  "rank-7": { opening: 0.71, dx: 0.004, dy: 0.057 },
  "rank-8": { opening: 0.71, dx: 0.004, dy: 0.059 },
  "rank-9": { opening: 0.70, dx: 0.008, dy: 0.057 },
  "rank-10": { opening: 0.71, dx: 0.000, dy: 0.059 },
  "rank-11": { opening: 0.71, dx: 0.000, dy: 0.053 },
  "rank-12": { opening: 0.70, dx: 0.004, dy: 0.053 },
  "rank-13": { opening: 0.70, dx: 0.006, dy: 0.059 },
  "rank-14": { opening: 0.71, dx: 0.004, dy: 0.057 },
  "rank-15": { opening: 0.68, dx: 0.004, dy: 0.064 },
  "rank-16": { opening: 0.68, dx: 0.000, dy: 0.064 },
  "rank-17": { opening: 0.69, dx: 0.006, dy: 0.059 },
  "rank-18": { opening: 0.69, dx: -0.004, dy: 0.059 },
  "frog-jungle": { opening: 0.61, dx: 0.025, dy: 0.074 },
  "frog-boss": { opening: 0.63, dx: 0.023, dy: 0.057 },
  "frog-tears": { opening: 0.64, dx: 0.014, dy: 0.082 },
  "frog-hearts": { opening: 0.66, dx: 0.014, dy: 0.068 },
  "frog-wizard": { opening: 0.67, dx: 0.020, dy: 0.086 },
  "frog-gamer": { opening: 0.64, dx: 0.016, dy: 0.053 },
  "frog-rage": { opening: 0.64, dx: 0.008, dy: 0.039 },
  "frog-storm": { opening: 0.64, dx: 0.018, dy: 0.062 },
  "frog-money": { opening: 0.62, dx: 0.031, dy: 0.041 },
  "frog-hood": { opening: 0.63, dx: 0.020, dy: 0.061 },
  "frog-sleepy": { opening: 0.63, dx: 0.029, dy: 0.062 },
  "frog-angel": { opening: 0.68, dx: 0.018, dy: 0.068 },
  "frog-devil": { opening: 0.60, dx: 0.033, dy: 0.057 },
  "frog-explorer": { opening: 0.65, dx: 0.023, dy: 0.068 },
  "frog-sakura": { opening: 0.66, dx: 0.020, dy: 0.059 },
  "frog-samurai": { opening: 0.67, dx: 0.018, dy: 0.051 },
  "frog-astronaut": { opening: 0.61, dx: 0.012, dy: 0.041 },
  "frog-christmas": { opening: 0.65, dx: 0.008, dy: 0.051 },
  "frog-pumpkin": { opening: 0.63, dx: 0.021, dy: 0.057 },
  "frog-glitch": { opening: 0.65, dx: 0.010, dy: 0.037 },
}

export function frameArt(id: string | null | undefined): ({ src: string; maskSrc?: string } & FrameArt) | null {
  if (!id || !(id in FRAMES)) return null
  return { src: `/frames/${id}.webp`, ...(FRAMES[id].mask ? { maskSrc: `/frames/${id}-mask.webp` } : {}), ...FRAMES[id] }
}

/** Designs coloured with the player's own pick (--name-color); fire and chrome have a fixed-colour look too, used when no colour comes. */
const TINT_FX: Record<string, string> = { gradient: "gradient", foil: "foil", drift: "drift", fire: "tint-fire", chrome: "tint-chrome" }
const COLOR_FX = new Set(["gradient", "foil", "drift", "chrome", "gold", "ice", "sakura", "emerald", "aurora", "holo", "fire", "void", "sunrise", "ocean", "lava", "candy", "toxic", "midnight", "rosegold", "platinum", "spectrum", "galaxy"])
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
  // A design with a picked colour paints from it; the old fixed looks (and earned items) keep their own colours.
  const fxClass = colorFx && (color ? TINT_FX[colorFx] ?? colorFx : colorFx)
  return {
    className: [base, "lx-name", fxClass && `lx-fx-${fxClass}`, glowFx && `lx-glow-${glowFx}`].filter(Boolean).join(" "),
    style: { ...(color && !colorFx ? { color } : {}), ...(color && colorFx ? ({ "--name-color": color } as React.CSSProperties) : {}), ...(glow ? ({ "--name-glow": glow } as React.CSSProperties) : {}) },
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
  "dragon-ember": "#ff6a00", // palette-exempt: the frame's own light
  "celestial-crown": "#e2b23a", // palette-exempt: the frame's own light
  "void-rift": "#a855f7", // palette-exempt: the frame's own light
  "frost-royale": "#7dd3fc", // palette-exempt: the frame's own light
  "hologram": "#00d4ff", // palette-exempt: the frame's own light
  "diamond-prestige": "#e5e7eb", // palette-exempt: the frame's own light
  "royal-drape": "#e8c766", // palette-exempt: the frame's own light
  "sapphire-shards": "#60a5fa", // palette-exempt: the frame's own light
  "obsidian-dragon": "#d4a017", // palette-exempt: the frame's own light
  "gold-circuit": "#e8b84a", // palette-exempt: the frame's own light
  "blossom-branch": "#f9a8d4", // palette-exempt: the frame's own light
  "hellfire-thorns": "#ef4444", // palette-exempt: the frame's own light
  "marble-angel": "#f5f0e6", // palette-exempt: the frame's own light
  "amethyst-spire": "#a78bfa", // palette-exempt: the frame's own light
  "jasmine-vine": "#86efac", // palette-exempt: the frame's own light
  "black-regalia": "#d4a017", // palette-exempt: the frame's own light
  "water-surge": "#38bdf8", // palette-exempt: the frame's own light
  "gilded-thorns": "#d4a017", // palette-exempt: the frame's own light
  "opal-prism": "#c4b5fd", // palette-exempt: the frame's own light
  "iron-chains": "#a3a3a3", // palette-exempt: the frame's own light
  "blood-talons": "#dc2626", // palette-exempt: the frame's own light
  "golden-blossom": "#f5d36b", // palette-exempt: the frame's own light
  "void-orb": "#a855f7", // palette-exempt: the frame's own light
  "seraph-wings": "#fde68a", // palette-exempt: the frame's own light
  "cyber-cyan": "#22d3ee", // palette-exempt: the frame's own light
  "rose-thorn": "#e11d48", // palette-exempt: the frame's own light
  "rank-1": "#cbd5e1", // palette-exempt: the frame's own light
  "rank-2": "#6e92cd", // palette-exempt: the frame's own light
  "rank-3": "#6993d4", // palette-exempt: the frame's own light
  "rank-4": "#0c9ae6", // palette-exempt: the frame's own light
  "rank-5": "#0c84e7", // palette-exempt: the frame's own light
  "rank-6": "#097ae9", // palette-exempt: the frame's own light
  "rank-7": "#13c3ed", // palette-exempt: the frame's own light
  "rank-8": "#0fafea", // palette-exempt: the frame's own light
  "rank-9": "#0c8feb", // palette-exempt: the frame's own light
  "rank-10": "#0a7aea", // palette-exempt: the frame's own light
  "rank-11": "#6e2fe8", // palette-exempt: the frame's own light
  "rank-12": "#6f31eb", // palette-exempt: the frame's own light
  "rank-13": "#922be9", // palette-exempt: the frame's own light
  "rank-14": "#9c26ea", // palette-exempt: the frame's own light
  "rank-15": "#ea21d0", // palette-exempt: the frame's own light
  "rank-16": "#ea20cd", // palette-exempt: the frame's own light
  "rank-17": "#e92527", // palette-exempt: the frame's own light
  "rank-18": "#ebc230", // palette-exempt: the frame's own light
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
  "server-booster": "#ff73fa", // palette-exempt: Discord Boost brand
}

export function frameAccent(id: string): string {
  return ACCENTS[id] ?? "#d4d4d4" // palette-exempt: neutral light
}

/**
 * The light each frame gives off (owner request 2026-10-27: every frame its own glow): `a` is the close, bright rim, `b` the wide soft halo
 * (the two colours of the art where it has two), `r` how far the halo reaches in px. The premium and special frames reach furthest.
 */
const FRAME_GLOW: Record<string, { a: string; b: string; r: number }> = { // palette-exempt: the frames' own light
  "angel-wings": { a: "#f5f5f5", b: "#a1a1aa", r: 10 }, // palette-exempt: the frame's own light
  "barbed-wire": { a: "#d4d4d4", b: "#525252", r: 8 }, // palette-exempt: the frame's own light
  "blood-vine": { a: "#f87171", b: "#7f1d1d", r: 10 }, // palette-exempt: the frame's own light
  "blue-lightning": { a: "#60a5fa", b: "#1d4ed8", r: 11 }, // palette-exempt: the frame's own light
  "chain-and-tag": { a: "#d4d4d4", b: "#525252", r: 8 }, // palette-exempt: the frame's own light
  "charcoal-ring": { a: "#e5e5e5", b: "#404040", r: 9 }, // palette-exempt: the frame's own light
  "crimson-lightning": { a: "#f87171", b: "#b91c1c", r: 11 }, // palette-exempt: the frame's own light
  "eclipse-clouds": { a: "#cbd5e1", b: "#475569", r: 10 }, // palette-exempt: the frame's own light
  "film-and-butterflies": { a: "#e5e5e5", b: "#737373", r: 9 }, // palette-exempt: the frame's own light
  "glitch": { a: "#22d3ee", b: "#d946ef", r: 11 }, // palette-exempt: the frame's own light
  "golden-moon": { a: "#fde68a", b: "#d97706", r: 10 }, // palette-exempt: the frame's own light
  "graffiti": { a: "#e5e5e5", b: "#737373", r: 8 }, // palette-exempt: the frame's own light
  "ice-crystals": { a: "#bae6fd", b: "#3b82f6", r: 11 }, // palette-exempt: the frame's own light
  "liquid-metal": { a: "#f1f5f9", b: "#64748b", r: 9 }, // palette-exempt: the frame's own light
  "neon-violet": { a: "#d8b4fe", b: "#7e22ce", r: 12 }, // palette-exempt: the frame's own light
  "planet-orbit": { a: "#c4b5fd", b: "#7c3aed", r: 10 }, // palette-exempt: the frame's own light
  "prism-glass": { a: "#a5f3fc", b: "#c4b5fd", r: 10 }, // palette-exempt: the frame's own light
  "red-circuit": { a: "#fca5a5", b: "#dc2626", r: 11 }, // palette-exempt: the frame's own light
  "sakura-blossom": { a: "#fbcfe8", b: "#f472b6", r: 10 }, // palette-exempt: the frame's own light
  "shattered-crystal": { a: "#f5f5f5", b: "#94a3b8", r: 9 }, // palette-exempt: the frame's own light
  "silent-waves": { a: "#cbd5e1", b: "#334155", r: 10 }, // palette-exempt: the frame's own light
  "starlight-corners": { a: "#ffffff", b: "#a1a1aa", r: 9 }, // palette-exempt: the frame's own light
  "torn-tape": { a: "#e5e5e5", b: "#737373", r: 8 }, // palette-exempt: the frame's own light
  "toxic-lightning": { a: "#d9f99d", b: "#4d7c0f", r: 11 }, // palette-exempt: the frame's own light
  "server-booster": { a: "#ff9cfb", b: "#a21caf", r: 11 }, // palette-exempt: the frame's own light
  "booster-gold": { a: "#fde68a", b: "#a16207", r: 12 }, // palette-exempt: the frame's own light
  "booster-silver": { a: "#f1f5f9", b: "#64748b", r: 12 }, // palette-exempt: the frame's own light
  "booster-bronze": { a: "#fdba74", b: "#9a3412", r: 12 }, // palette-exempt: the frame's own light
  "founder": { a: "#fde68a", b: "#b45309", r: 14 }, // palette-exempt: the frame's own light
  "dragon-ember": { a: "#fdba74", b: "#dc2626", r: 13 }, // palette-exempt: the frame's own light
  "frost-royale": { a: "#e0f2fe", b: "#0ea5e9", r: 13 }, // palette-exempt: the frame's own light
  "void-rift": { a: "#e9d5ff", b: "#6d28d9", r: 13 }, // palette-exempt: the frame's own light
  "hologram": { a: "#a5f3fc", b: "#e879f9", r: 13 }, // palette-exempt: the frame's own light
  "celestial-crown": { a: "#fde68a", b: "#b45309", r: 13 }, // palette-exempt: the frame's own light
  "diamond-prestige": { a: "#ffffff", b: "#94a3b8", r: 13 }, // palette-exempt: the frame's own light
  "royal-drape": { a: "#fde68a", b: "#b45309", r: 12 }, // palette-exempt: the frame's own light
  "sapphire-shards": { a: "#93c5fd", b: "#2563eb", r: 12 }, // palette-exempt: the frame's own light
  "obsidian-dragon": { a: "#fcd34d", b: "#92400e", r: 12 }, // palette-exempt: the frame's own light
  "gold-circuit": { a: "#fde68a", b: "#a16207", r: 11 }, // palette-exempt: the frame's own light
  "blossom-branch": { a: "#fbcfe8", b: "#ec4899", r: 11 }, // palette-exempt: the frame's own light
  "hellfire-thorns": { a: "#fca5a5", b: "#dc2626", r: 13 }, // palette-exempt: the frame's own light
  "marble-angel": { a: "#fffbeb", b: "#d6c8a5", r: 12 }, // palette-exempt: the frame's own light
  "amethyst-spire": { a: "#ddd6fe", b: "#7c3aed", r: 12 }, // palette-exempt: the frame's own light
  "jasmine-vine": { a: "#bbf7d0", b: "#16a34a", r: 11 }, // palette-exempt: the frame's own light
  "black-regalia": { a: "#fde68a", b: "#78350f", r: 12 }, // palette-exempt: the frame's own light
  "water-surge": { a: "#bae6fd", b: "#0284c7", r: 12 }, // palette-exempt: the frame's own light
  "gilded-thorns": { a: "#fde68a", b: "#92400e", r: 11 }, // palette-exempt: the frame's own light
  "opal-prism": { a: "#e9d5ff", b: "#38bdf8", r: 12 }, // palette-exempt: the frame's own light
  "iron-chains": { a: "#d4d4d8", b: "#52525b", r: 10 }, // palette-exempt: the frame's own light
  "blood-talons": { a: "#fecaca", b: "#b91c1c", r: 12 }, // palette-exempt: the frame's own light
  "golden-blossom": { a: "#fef3c7", b: "#ca8a04", r: 12 }, // palette-exempt: the frame's own light
  "void-orb": { a: "#d8b4fe", b: "#581c87", r: 13 }, // palette-exempt: the frame's own light
  "seraph-wings": { a: "#fffbeb", b: "#f59e0b", r: 13 }, // palette-exempt: the frame's own light
  "cyber-cyan": { a: "#a5f3fc", b: "#0891b2", r: 12 }, // palette-exempt: the frame's own light
  "rose-thorn": { a: "#fda4af", b: "#be123c", r: 12 }, // palette-exempt: the frame's own light
  "rank-1": { a: "#e5eaf0", b: "#848a92", r: 12 }, // palette-exempt: the frame's own light
  "rank-2": { a: "#b6c8e6", b: "#485f85", r: 12 }, // palette-exempt: the frame's own light
  "rank-3": { a: "#b4c9ea", b: "#44608a", r: 12 }, // palette-exempt: the frame's own light
  "rank-4": { a: "#86ccf2", b: "#086496", r: 12 }, // palette-exempt: the frame's own light
  "rank-5": { a: "#86c2f3", b: "#085696", r: 12 }, // palette-exempt: the frame's own light
  "rank-6": { a: "#84bcf4", b: "#064f97", r: 12 }, // palette-exempt: the frame's own light
  "rank-7": { a: "#89e1f6", b: "#0c7f9a", r: 12 }, // palette-exempt: the frame's own light
  "rank-8": { a: "#87d7f4", b: "#0a7298", r: 12 }, // palette-exempt: the frame's own light
  "rank-9": { a: "#86c7f5", b: "#085d99", r: 12 }, // palette-exempt: the frame's own light
  "rank-10": { a: "#84bcf4", b: "#064f98", r: 12 }, // palette-exempt: the frame's own light
  "rank-11": { a: "#b697f4", b: "#481f97", r: 12 }, // palette-exempt: the frame's own light
  "rank-12": { a: "#b798f5", b: "#482099", r: 12 }, // palette-exempt: the frame's own light
  "rank-13": { a: "#c895f4", b: "#5f1c97", r: 12 }, // palette-exempt: the frame's own light
  "rank-14": { a: "#ce92f4", b: "#651998", r: 12 }, // palette-exempt: the frame's own light
  "rank-15": { a: "#f490e8", b: "#981587", r: 12 }, // palette-exempt: the frame's own light
  "rank-16": { a: "#f490e6", b: "#981585", r: 12 }, // palette-exempt: the frame's own light
  "rank-17": { a: "#f49293", b: "#971819", r: 12 }, // palette-exempt: the frame's own light
  "rank-18": { a: "#f5e098", b: "#997e1f", r: 12 }, // palette-exempt: the frame's own light
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
  const halo = `color-mix(in oklab, ${glow.b} 75%, transparent)`
  return `drop-shadow(0 0 1.5px ${glow.a}) drop-shadow(0 0 ${Math.round(glow.r / 2)}px ${glow.a}) drop-shadow(0 0 ${glow.r}px ${halo})`
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
