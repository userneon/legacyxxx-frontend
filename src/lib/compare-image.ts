/**
 * Draws a finished comparison as a PNG: both players, the stats-led score and every stat row in green / red / grey.
 * It is drawn on a canvas from the same numbers the page shows, so nothing depends on a screenshot library.
 */
import { rankImageSrc, rankTier } from "@/components/competitive-rank-badge"

export interface ComparePngPlayer {
  name: string
  avatar: string
  rankId: number | null
  rankName: string | null
  rankImageKey: string | null
  exp: number | null
}

export interface ComparePngRow {
  label: string
  a: string | null
  b: string | null
  /** Who is ahead; null for a draw. Rows with a hidden value pass `compared: false`. */
  lead: "a" | "b" | null
  compared: boolean
  gap: string | null
  /** Player 1's share of the two values, 0..1. */
  share: number
}

export interface ComparePngInput {
  players: [ComparePngPlayer, ComparePngPlayer]
  score: { a: number; b: number } | null
  rows: ComparePngRow[]
}

const WIDTH = 1200
const SCALE = 2
const PAD = 48
const FONT = 'Onest, system-ui, "Segoe UI", sans-serif'

function loadImage(src: string, cors: boolean) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image()
    if (cors) image.crossOrigin = "anonymous"
    image.onload = () => resolve(image)
    image.onerror = () => resolve(null)
    image.src = src
  })
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  if (typeof ctx.roundRect === "function") ctx.roundRect(x, y, w, h, r)
  else ctx.rect(x, y, w, h)
}

export async function renderComparePng(input: ComparePngInput): Promise<Blob> {
  const style = getComputedStyle(document.documentElement)
  const token = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback
  const color = {
    bg: token("--bg", "#0a0a0a"), panel: token("--panel", "#0f0f0f"), raised: token("--raised", "#1a1a1a"), line: token("--line", "#262626"), track: token("--line-soft", "#1f1f1f"),
    text: token("--text", "#fafafa"), dim: token("--text-dim", "#737373"), faint: token("--text-faint", "#525252"), brand: token("--brand-bright", "#ff3d6e"),
    win: token("--result-win", "#22c55e"), loss: token("--result-loss", "#ef4444"), draw: token("--result-draw", "#a3a3a3"),
  }
  const outcomeColor = (lead: "a" | "b" | null, side: "a" | "b") => (lead === null ? color.draw : lead === side ? color.win : color.loss)

  // Fonts must be ready, or the canvas silently falls back.
  try { await Promise.all([document.fonts.load(`700 24px ${FONT}`), document.fonts.load(`500 14px ${FONT}`)]) } catch { /* use the fallback font */ }

  const ROW = 78
  const HEADER = 96
  const PLAYERS = 214
  const height = HEADER + PLAYERS + 28 + input.rows.length * ROW + 110
  const canvas = document.createElement("canvas")
  canvas.width = WIDTH * SCALE
  canvas.height = height * SCALE
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas is not available")
  ctx.scale(SCALE, SCALE)

  ctx.fillStyle = color.bg
  ctx.fillRect(0, 0, WIDTH, height)

  // Header: wordmark and title.
  ctx.textBaseline = "alphabetic"
  ctx.font = `800 30px ${FONT}`
  ctx.textAlign = "left"
  ctx.fillStyle = color.text
  ctx.fillText("LEGACY", PAD, 62)
  const legacyWidth = ctx.measureText("LEGACY").width
  ctx.fillStyle = color.text
  ctx.fillText("-", PAD + legacyWidth, 62)
  ctx.fillStyle = color.brand
  ctx.fillText("X", PAD + legacyWidth + ctx.measureText("-").width, 62)
  ctx.textAlign = "right"
  ctx.fillStyle = color.dim
  ctx.font = `500 16px ${FONT}`
  ctx.fillText("Player comparison", WIDTH - PAD, 60)

  // Player cards.
  const cardW = (WIDTH - PAD * 2 - 140) / 2
  const cardY = HEADER
  const images = await Promise.all(input.players.map(async (player) => ({
    avatar: player.avatar ? await loadImage(player.avatar, true) : null,
    emblem: player.rankId !== null ? await loadImage(rankImageSrc(player.rankId, player.rankImageKey), false) : null,
  })))
  input.players.forEach((player, index) => {
    const x = index === 0 ? PAD : WIDTH - PAD - cardW
    ctx.fillStyle = color.panel
    roundedRect(ctx, x, cardY, cardW, PLAYERS - 20, 16)
    ctx.fill()
    ctx.strokeStyle = color.line
    ctx.lineWidth = 1
    ctx.stroke()
    const cx = x + cardW / 2
    // Avatar, or the initials when the picture cannot be used.
    const avatarSize = 76
    ctx.save()
    roundedRect(ctx, cx - avatarSize / 2, cardY + 24, avatarSize, avatarSize, 18)
    ctx.clip()
    const avatar = images[index]!.avatar
    if (avatar) {
      ctx.drawImage(avatar, cx - avatarSize / 2, cardY + 24, avatarSize, avatarSize)
    } else {
      ctx.fillStyle = color.raised
      ctx.fillRect(cx - avatarSize / 2, cardY + 24, avatarSize, avatarSize)
      ctx.fillStyle = color.text
      ctx.font = `700 26px ${FONT}`
      ctx.textAlign = "center"
      ctx.fillText(player.name.slice(0, 2).toUpperCase(), cx, cardY + 24 + avatarSize / 2 + 9)
    }
    ctx.restore()
    ctx.textAlign = "center"
    ctx.fillStyle = color.text
    ctx.font = `700 26px ${FONT}`
    let name = player.name
    while (name.length > 1 && ctx.measureText(name).width > cardW - 40) name = name.slice(0, -1)
    ctx.fillText(name === player.name ? name : `${name}…`, cx, cardY + 24 + avatarSize + 36)
    // Rank emblem, name in its tier colour, EXP.
    const rankLabel = player.rankName ?? "Unranked"
    const tierColor = player.rankId !== null ? token(`--rank-${rankTier(player.rankId)}`, color.text) : color.dim
    ctx.font = `600 16px ${FONT}`
    const labelW = ctx.measureText(rankLabel).width
    const expText = player.exp !== null ? `${player.exp.toLocaleString()} EXP` : ""
    ctx.font = `500 15px ${FONT}`
    const expW = expText ? ctx.measureText(expText).width + 12 : 0
    const emblem = images[index]!.emblem
    const emblemW = emblem ? 30 : 0
    const total = emblemW + (emblem ? 8 : 0) + labelW + expW
    let at = cx - total / 2
    const baseline = cardY + 24 + avatarSize + 72
    if (emblem) { ctx.drawImage(emblem, at, baseline - 22, 30, 30); at += 38 }
    ctx.textAlign = "left"
    ctx.fillStyle = tierColor
    ctx.font = `600 16px ${FONT}`
    ctx.fillText(rankLabel, at, baseline)
    if (expText) {
      ctx.fillStyle = color.dim
      ctx.font = `500 15px ${FONT}`
      ctx.fillText(expText, at + labelW + 12, baseline)
    }
  })

  // Score between the cards.
  const mid = WIDTH / 2
  ctx.textAlign = "center"
  if (input.score) {
    const lead = input.score.a === input.score.b ? null : input.score.a > input.score.b ? "a" : "b"
    ctx.font = `800 52px ${FONT}`
    ctx.fillStyle = outcomeColor(lead, "a")
    ctx.textAlign = "right"
    ctx.fillText(String(input.score.a), mid - 16, cardY + 86)
    ctx.fillStyle = color.faint
    ctx.textAlign = "center"
    ctx.fillText(":", mid, cardY + 82)
    ctx.fillStyle = outcomeColor(lead, "b")
    ctx.textAlign = "left"
    ctx.fillText(String(input.score.b), mid + 16, cardY + 86)
    ctx.textAlign = "center"
    ctx.fillStyle = color.dim
    ctx.font = `500 13px ${FONT}`
    ctx.fillText("STATS LED", mid, cardY + 116)
  } else {
    ctx.fillStyle = color.faint
    ctx.font = `800 22px ${FONT}`
    ctx.fillText("VS", mid, cardY + 90)
  }

  // Stat rows.
  let y = HEADER + PLAYERS + 28
  const half = 470
  input.rows.forEach((row) => {
    const mark = (value: string | null, side: "a" | "b") => {
      const known = row.compared
      ctx.font = `700 34px ${FONT}`
      ctx.fillStyle = value === null ? color.faint : known ? outcomeColor(row.lead, side) : color.text
      ctx.textAlign = side === "a" ? "right" : "left"
      const x = side === "a" ? mid - 110 : mid + 110
      ctx.fillText(value ?? "—", x, y + 34)
      const valueW = ctx.measureText(value ?? "—").width
      const tag = value === null ? "Hidden" : !known ? "" : row.lead === null ? "Draw" : row.lead === side ? `+${row.gap}` : ""
      if (tag) {
        ctx.font = `600 14px ${FONT}`
        ctx.fillStyle = value === null ? color.faint : outcomeColor(row.lead, side)
        ctx.fillText(tag, side === "a" ? x - valueW - 12 : x + valueW + 12, y + 32)
      }
    }
    mark(row.a, "a")
    mark(row.b, "b")
    ctx.textAlign = "center"
    ctx.fillStyle = color.dim
    ctx.font = `600 13px ${FONT}`
    ctx.fillText(row.label.toUpperCase(), mid, y + 31)
    // Two bars, each growing away from the centre.
    const barY = y + 52
    ctx.fillStyle = color.track
    roundedRect(ctx, mid - 6 - half, barY, half, 8, 4); ctx.fill()
    roundedRect(ctx, mid + 6, barY, half, 8, 4); ctx.fill()
    if (row.compared) {
      const widthA = half * row.share
      const widthB = half * (1 - row.share)
      ctx.fillStyle = outcomeColor(row.lead, "a")
      roundedRect(ctx, mid - 6 - widthA, barY, widthA, 8, 4); ctx.fill()
      ctx.fillStyle = outcomeColor(row.lead, "b")
      roundedRect(ctx, mid + 6, barY, widthB, 8, 4); ctx.fill()
    }
    ctx.strokeStyle = color.track
    ctx.beginPath(); ctx.moveTo(PAD, y + ROW - 1); ctx.lineTo(WIDTH - PAD, y + ROW - 1); ctx.stroke()
    y += ROW
  })

  // Legend and footer.
  ctx.textAlign = "left"
  ctx.font = `500 14px ${FONT}`
  let lx = PAD
  for (const [label, tone] of [["Ahead", color.win], ["Behind", color.loss], ["Draw", color.draw]] as const) {
    ctx.fillStyle = tone
    ctx.beginPath(); ctx.arc(lx + 5, y + 36, 5, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = color.dim
    ctx.fillText(label, lx + 18, y + 41)
    lx += 18 + ctx.measureText(label).width + 28
  }
  ctx.textAlign = "right"
  ctx.fillStyle = color.faint
  ctx.fillText(`legacyx.cc · ${new Date().toISOString().slice(0, 10)}`, WIDTH - PAD, y + 41)

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("The image could not be created"))), "image/png")
  })
}
