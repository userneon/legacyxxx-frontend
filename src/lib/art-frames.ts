import pine from "@/assets/frames/ny-pine.webp"
import frost from "@/assets/frames/ny-frost.webp"
import santa from "@/assets/frames/ny-santa.webp"
import midnight from "@/assets/frames/ny-midnight.webp"
import discord from "@/assets/frames/discord.webp"
import pet_cat from "@/assets/frames/pet-cat.webp"
import pet_dog from "@/assets/frames/pet-dog.webp"
import pet_bunny from "@/assets/frames/pet-bunny.webp"
import pet_panda from "@/assets/frames/pet-panda.webp"
import pet_bear from "@/assets/frames/pet-bear.webp"
import pet_fox from "@/assets/frames/pet-fox.webp"
import pet_penguin from "@/assets/frames/pet-penguin.webp"
import pet_reindeer from "@/assets/frames/pet-reindeer.webp"
import plush_cat from "@/assets/frames/plush-cat.webp"
import plush_penguin from "@/assets/frames/plush-penguin.webp"
import plush_bear from "@/assets/frames/plush-bear.webp"
import plush_bunny from "@/assets/frames/plush-bunny.webp"

/**
 * Picture frames round the square avatar (owner 2026-11-18: four New Year frames, "all square"). Each is a transparent picture with an empty window; `hole` is that window as
 * fractions of the picture (left, top, width, height), measured from the pictures, so the avatar's own box can be made to sit exactly in it and the decorations (a bow, a hat,
 * snowflakes) overflow the box a little. Later sets (owner 2026-11-20): the Pets (frame-pet-*), the Plush winter frames (frame-plush-*) and the Discord frame. The catalogue rows are in the API's supabase/legacy_x_ny_frames.sql.
 */
export interface ArtFrameDef { src: string; hole: { x: number; y: number; w: number; h: number }; accent: string }

const f = (x0: number, y0: number, x1: number, y1: number) => ({ x: x0 / 512, y: y0 / 512, w: (x1 - x0) / 512, h: (y1 - y0) / 512 })

export const ART_FRAMES: Record<string, ArtFrameDef> = {
  "frame-ny-pine": { src: pine, hole: f(73, 86, 430, 443), accent: "#3f7a45" }, // palette-exempt: the art's own colours
  "frame-ny-frost": { src: frost, hole: f(79, 77, 433, 432), accent: "#8fd0f0" }, // palette-exempt
  "frame-ny-santa": { src: santa, hole: f(83, 85, 437, 435), accent: "#d23a3a" }, // palette-exempt
  "frame-ny-midnight": { src: midnight, hole: f(74, 61, 437, 425), accent: "#c9a24a" }, // palette-exempt
  "frame-discord": { src: discord, hole: f(40, 52, 469, 471), accent: "#5865f2" }, // palette-exempt: the art's own colours
  "frame-pet-cat": { src: pet_cat, hole: f(88, 110, 424, 432), accent: "#e58aa3" }, // palette-exempt: the art's own colours
  "frame-pet-dog": { src: pet_dog, hole: f(91, 104, 418, 414), accent: "#b9844a" }, // palette-exempt: the art's own colours
  "frame-pet-bunny": { src: pet_bunny, hole: f(78, 120, 415, 442), accent: "#f0a6bb" }, // palette-exempt: the art's own colours
  "frame-pet-panda": { src: pet_panda, hole: f(80, 105, 432, 441), accent: "#cfd2d6" }, // palette-exempt: the art's own colours
  "frame-pet-bear": { src: pet_bear, hole: f(85, 99, 425, 407), accent: "#a8693b" }, // palette-exempt: the art's own colours
  "frame-pet-fox": { src: pet_fox, hole: f(79, 117, 419, 441), accent: "#e08a3c" }, // palette-exempt: the art's own colours
  "frame-pet-penguin": { src: pet_penguin, hole: f(89, 113, 422, 429), accent: "#5f7fa6" }, // palette-exempt: the art's own colours
  "frame-pet-reindeer": { src: pet_reindeer, hole: f(87, 128, 423, 448), accent: "#b8774a" }, // palette-exempt: the art's own colours
  "frame-plush-cat": { src: plush_cat, hole: f(69, 96, 438, 445), accent: "#f0b0c0" }, // palette-exempt: the art's own colours
  "frame-plush-penguin": { src: plush_penguin, hole: f(86, 131, 424, 437), accent: "#d23a3a" }, // palette-exempt: the art's own colours
  "frame-plush-bear": { src: plush_bear, hole: f(81, 117, 412, 435), accent: "#a8693b" }, // palette-exempt: the art's own colours
  "frame-plush-bunny": { src: plush_bunny, hole: f(81, 106, 417, 442), accent: "#f3e7d9" }, // palette-exempt: the art's own colours
}

export const isArtFrame = (id: string | null | undefined): boolean => Boolean(id && Object.hasOwn(ART_FRAMES, id))
