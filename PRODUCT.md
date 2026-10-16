# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Mongolian CS2 (and CSGO) players on PC, who join the LEGACY-X servers to play ranked 5x5, fun modes and Pro League, and use the site to see their rank and EXP, equip skins, find a server, join a clan, check penalties and read or write reviews. Secondary users: staff (Owner, Manager, Admin) who run penalties, checks and servers from the Staff pages, and content creators who are listed on a Creators page. Guests can look around; Shop, Skinchanger, Pro League and profiles need a Steam sign-in.

## Product Purpose
The community platform of LEGACY-X, a Mongolian CS2 community. One site holds everything around the game servers: matches and the live server list (Play), one LEGACY-X rank and EXP system, a Skinchanger, a Leaderboard, clans, penalties and reviews, tournaments and a wallet and shop. Success is a player who finds a server in a few seconds, trusts that their rank and penalties are real, and comes back. Launch is 1 December 2026.

## Positioning
Every match on our own servers counts toward one LEGACY-X rank, and rank, skins, clans, penalties and reviews live on the same site, run by a local Mongolian community.

## Operating Context
- Data comes only from the community's own API (`/api/public/*` read endpoints, session-based sign-in with Steam). The browser never calls the operator API.
- Game servers run CounterStrikeSharp plugins and MatchZy; a Discord bot posts penalties, news and a welcome card.
- Staff work in the site's Staff pages (player case view, checks, team, creators, server actions) during normal community hours.
- Mock data exists for development only and is never shown as real.

## Capabilities and Constraints
- Stack: React, TypeScript, Tailwind v4, shadcn, lucide-react; Exo 2 font; main branch only, one commit per logical change.
- Never fabricate data: loading is a skeleton, empty is a short neutral line, error is one line with Retry.
- All user-typed text (names, reviews, penalty reasons) is escaped, never raw HTML.
- Security: no secrets, plugin tokens, RCON or service-role credentials in this repo.
- Language: the site is in English. The UI copy is not translated.
- Undecided: whether guests may see Skinchanger, Shop and Pro League (currently closed); an in-game [CREATOR] tag and a Discord creator role.

## Brand Commitments
- Wordmark "LEGACY-X" with a violet "-X"; logo mark and rank emblems are existing assets in `public/`.
- Neutral dark surfaces, white as the main accent, violet only in the places listed in `CLAUDE.md` (owner request: used sparingly).
- Rank colours only in rank emblems; green and red only as status colours.
- The design spec of record is `CLAUDE.md` and `docs/design/`; they outrank any suggestion from a tool.

## Evidence on Hand
- Real data from the production API: players, matches, servers, penalties, clans, reviews, one content creator.
- Owner-supplied CS2 agent pictures (`src/assets/home/mode-*.webp`), CS2 map art, skinchanger assets, rank SVGs.
- No real testimonials, press, or case studies exist; do not invent them. No server-wide figures per mode exist in the API, so none are shown.

## Product Principles
1. Real data or nothing: every number comes from the API.
2. Fast path first: a player reaches a server, their rank or their penalties in as few clicks as possible.
3. Restraint: flat outline surfaces, one accent, motion that is smooth rather than loud.
4. Staff tools are built around what staff do all day, and show only real counts.
5. The owner decides product questions; options are shown as pictures before anything is changed.

## Accessibility & Inclusion
No formal standard has been set. Existing practice: visible focus rings, text contrast on dark surfaces, and decorative motion switched off for `prefers-reduced-motion` in most CSS (some JS motion always runs by owner choice). A target standard is undecided.
