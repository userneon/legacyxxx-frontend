/**
 * Kill feed artwork: one silhouette per CS2 weapon, plus the small tags a kill can carry.
 *
 * The server may name a weapon either the way the scoreboard shows it ("AK-47") or the way the
 * game event does ("weapon_ak47"), so lookups go through a normalised key.
 */
import ak47 from "@/assets/killfeed/weapons/ak-47.png"
import aug from "@/assets/killfeed/weapons/aug.png"
import awp from "@/assets/killfeed/weapons/awp.png"
import cz75 from "@/assets/killfeed/weapons/cz75-auto.png"
import deagle from "@/assets/killfeed/weapons/desert-eagle.png"
import duals from "@/assets/killfeed/weapons/dual-berettas.png"
import famas from "@/assets/killfeed/weapons/famas.png"
import fiveSeven from "@/assets/killfeed/weapons/five-seven.png"
import g3sg1 from "@/assets/killfeed/weapons/g3sg1.png"
import galil from "@/assets/killfeed/weapons/galil-ar.png"
import glock from "@/assets/killfeed/weapons/glock-18.png"
import m249 from "@/assets/killfeed/weapons/m249.png"
import m4a1s from "@/assets/killfeed/weapons/m4a1-s.png"
import m4a4 from "@/assets/killfeed/weapons/m4a4.png"
import mac10 from "@/assets/killfeed/weapons/mac-10.png"
import mag7 from "@/assets/killfeed/weapons/mag-7.png"
import mp5sd from "@/assets/killfeed/weapons/mp5-sd.png"
import mp7 from "@/assets/killfeed/weapons/mp7.png"
import mp9 from "@/assets/killfeed/weapons/mp9.png"
import negev from "@/assets/killfeed/weapons/negev.png"
import nova from "@/assets/killfeed/weapons/nova.png"
import p2000 from "@/assets/killfeed/weapons/p2000.png"
import p250 from "@/assets/killfeed/weapons/p250.png"
import p90 from "@/assets/killfeed/weapons/p90.png"
import bizon from "@/assets/killfeed/weapons/pp-bizon.png"
import r8 from "@/assets/killfeed/weapons/r8-revolver.png"
import sawedOff from "@/assets/killfeed/weapons/sawed-off.png"
import scar20 from "@/assets/killfeed/weapons/scar-20.png"
import sg553 from "@/assets/killfeed/weapons/sg-553.png"
import ssg08 from "@/assets/killfeed/weapons/ssg-08.png"
import tec9 from "@/assets/killfeed/weapons/tec-9.png"
import ump45 from "@/assets/killfeed/weapons/ump-45.png"
import usps from "@/assets/killfeed/weapons/usp-s.png"
import xm1014 from "@/assets/killfeed/weapons/xm1014.png"
import zeus from "@/assets/killfeed/weapons/zeus-x27.png"

import knifeTag from "@/assets/killfeed/tags/knife.png"
import headshotTag from "@/assets/killfeed/tags/headshot.webp"
import noscopeTag from "@/assets/killfeed/tags/noscope.webp"
import blindTag from "@/assets/killfeed/tags/blind.webp"
import smokeTag from "@/assets/killfeed/tags/smoke.webp"
import wallbangTag from "@/assets/killfeed/tags/wallbang.webp"
import assistTag from "@/assets/killfeed/tags/assist.webp"

export const killFeedTags = {
  knife: knifeTag,
  headshot: headshotTag,
  noscope: noscopeTag,
  blind: blindTag,
  smoke: smokeTag,
  wallbang: wallbangTag,
  assist: assistTag,
}

/** "M4A1-S", "weapon_m4a1_silencer" and "m4a1 silencer" all land on the same key. */
function key(name: string) {
  return name.toLowerCase().replace(/^weapon_/, "").replace(/[^a-z0-9]/g, "")
}

const WEAPONS: Record<string, string> = {}
const add = (image: string, ...aliases: string[]) => {
  for (const alias of aliases) WEAPONS[key(alias)] = image
}

add(ak47, "AK-47", "ak47")
add(m4a4, "M4A4", "m4a1")
add(m4a1s, "M4A1-S", "m4a1_silencer")
add(galil, "Galil AR", "galilar")
add(famas, "FAMAS", "famas")
add(aug, "AUG", "aug")
add(sg553, "SG 553", "sg556", "sg553")
add(awp, "AWP", "awp")
add(ssg08, "SSG 08", "ssg08", "scout")
add(scar20, "SCAR-20", "scar20")
add(g3sg1, "G3SG1", "g3sg1")
add(glock, "Glock-18", "glock", "glock18")
add(usps, "USP-S", "usp_silencer", "usp")
add(p2000, "P2000", "hkp2000")
add(p250, "P250", "p250")
add(fiveSeven, "Five-SeveN", "fiveseven")
add(tec9, "Tec-9", "tec9")
add(cz75, "CZ75-Auto", "cz75a", "cz75")
add(duals, "Dual Berettas", "elite", "dualberettas")
add(deagle, "Desert Eagle", "deagle")
add(r8, "R8 Revolver", "revolver")
add(mac10, "MAC-10", "mac10")
add(mp9, "MP9", "mp9")
add(mp7, "MP7", "mp7")
add(mp5sd, "MP5-SD", "mp5sd")
add(ump45, "UMP-45", "ump45")
add(p90, "P90", "p90")
add(bizon, "PP-Bizon", "bizon")
add(nova, "Nova", "nova")
add(xm1014, "XM1014", "xm1014")
add(mag7, "MAG-7", "mag7")
add(sawedOff, "Sawed-Off", "sawedoff")
add(m249, "M249", "m249")
add(negev, "Negev", "negev")
add(zeus, "Zeus x27", "taser", "zeus")

const KNIFE = /knife|bayonet|karambit|daggers|talon|ursus|stiletto|navaja|nomad|skeleton|paracord|survival|butterfly|falchion|shadow|huntsman|bowie|gut|flip|classic/

/** The silhouette for this weapon, or null when the name is unknown (then the feed prints it). */
export function killFeedWeaponIcon(weapon: string): string | null {
  const normalised = key(weapon)
  if (WEAPONS[normalised]) return WEAPONS[normalised]
  if (KNIFE.test(normalised)) return knifeTag
  return null
}
