import { en } from "./en"
import { ko } from "./ko"
import { mn } from "./mn"
import { ru } from "./ru"
import { zh } from "./zh"
import type { AboutLang } from "./types"

export type { AboutLang, AboutPage, AboutSection } from "./types"

/** Cyrillic Mongolian as people type it on a phone: ү is u, ө is o (owner 2026-11-20: Latin Mongolian is the sixth language). Latin words (Steam, EXP, !rank) are left alone. */
const CYR: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", ж: "j", з: "z", и: "i", й: "i", к: "k", л: "l", м: "m", н: "n", о: "o", ө: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ү: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sh", ъ: "", ы: "i", ь: "", э: "e", ю: "yu", я: "ya", ё: "yo",
}
const VOWELS = "аеёиоөуүыэюя"
export function latinize(text: string): string {
  let out = ""
  const chars = [...text]
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]
    const low = ch.toLowerCase()
    let mapped: string | undefined
    if (low === "е") {
      const prev = (chars[i - 1] ?? " ").toLowerCase()
      mapped = !VOWELS.includes(prev) && /[а-яөүё]/.test(prev) ? "e" : "ye"
    } else mapped = CYR[low]
    if (mapped === undefined) { out += ch; continue }
    out += ch !== low ? mapped.charAt(0).toUpperCase() + mapped.slice(1) : mapped
  }
  return out
}

const mapDeep = <T>(value: T, fn: (text: string) => string): T => {
  if (typeof value === "string") return fn(value) as T
  if (Array.isArray(value)) return value.map((item) => mapDeep(item, fn)) as T
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, key === "id" || key === "slug" ? item : mapDeep(item, fn)])) as T
  return value
}

const mnLatn: AboutLang = {
  ...(mapDeep(mn, latinize) as AboutLang),
  code: "mn-latn",
  hreflang: "mn-Latn",
  name: "Mongol (latin)",
}

/** The six languages; English is the default and the source. */
export const ABOUT_LANGS: AboutLang[] = [en, mn, mnLatn, ru, zh, ko]
export const DEFAULT_LANG = "en"
