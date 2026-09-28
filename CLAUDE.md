# LEGACY-X frontend — working rules

React + TypeScript + Tailwind v4 + shadcn frontend for the LEGACY-X CS2/CSGO community
platform (matches, skinchanger, leaderboard, penalties, reviews, tournaments). The full
design spec of record lives in `docs/design/` (`README.md` first, then `PROMPT.md`,
`RANK-SYSTEM.md`) — read it before touching layout, tokens, or copy. This file is the
short version plus the rules an agent working from `docs/design/` alone would miss or
get wrong (like the accent-color exception below).

## Non-negotiable

- **Never fabricate data.** Every number, name, and list comes from a real API call.
  Loading = skeletons shaped like the reference. Empty = short neutral message in
  `--text-dim`, no illustration. Error = one line + Retry (`RotateCcw`), never a blank
  area or sample data standing in for the real thing.
- **Security boundary.** The browser bundle only ever calls the public, rate-limited
  `/api/public/*` read endpoints. The operator API (`/api/*`, `x-api-secret` header) is
  server/operator-only and must never be reachable from frontend code or env files.
  Never commit `API_SECRET`, plugin secrets, RCON credentials, or Supabase
  service-role credentials into anything under this repo, including `.env` files.
- **Git: main only.** No branches, worktrees, or PRs for this project — work directly
  on `main`, one commit per logical change, push after. If a tool creates a branch
  anyway, merge it back into main and delete it.
- **Escape all user text.** Names, review text, penalty reasons — anything a player
  typed — renders as escaped text, never raw HTML.

## Design tokens (`src/index.css`)

Neutral surfaces + white as the workhorse accent — emphasis normally comes from
brightness and weight, not hue:
- Surfaces: `--bg` `#0a0a0a`, `--panel` `#0f0f0f`, `--card-surface` `#141414`, `--raised` `#1a1a1a`
- Lines: `--line-soft` `#1f1f1f`, `--line` `#262626`, `--line-strong` `#333333`
- Text: `--text` `#fafafa` → `--text-faint` `#525252`
- `--accent-solid` `#fafafa` (on `#0a0a0a`) — primary buttons, active states, focus rings
- `--status-green` `#22c55e` is the only status color (online/live/verified)
- Rank emblems use the CS2 rarity ladder (`--rank-<tier>`) **only** inside emblem
  images and the rank name next to one — never on buttons, backgrounds, or chrome
- Radius: 8px controls, 10–12px cards, 14px floating panels, 999px pills
- Font: Onest (400/500/600/700) with its default proportional figures. Owner request
  2026-09-28: no `tabular-nums` — Onest's tabular "1" made numbers like "11" read as "1 1"

### Brand accent exception (owner request 2026-09-27)

`--brand` `#ff5a1f` was added on top of the rule above. It is **not** a general UI
accent — the original "no hue accent" rule still governs everything else. `--brand`
is reserved for a short, deliberate list of high-signal spots only:
- the `-X` suffix in the LEGACY-X wordmark
- the active sidebar nav indicator bar
- the flagship "Players Online" home stat
- the Pro League mode card's featured/premium treatment

Do not spread `--brand` to buttons, borders, focus rings, or other chrome — that
was tried and explicitly rejected ("бүү full orange болго, чухал хэсэгт л тавь").
When adding a new "this matters most" spot, ask whether it's truly flagship-level
before reaching for `--brand`; when in doubt, leave it white.

`scripts/check-no-blue.mjs` (`npm run check:colors`) fails the build on hex/hsl
colors and Tailwind color classes in `src/**` whose hue falls in the blue/purple
(180–340°) or yellow/orange (25–70°) bands, unless the line is marked
`palette-exempt` or `rarity`. `#ff5a1f` sits at ~16° hue, just under that band, so
it passes today — that's a coincidence of the exact value chosen, not a loophole to
rely on. If `--brand` ever changes, rerun `npm run check:colors` and re-verify by eye
that it still reads as the one deliberate exception, not a second UI accent.

### Glass on Home (owner request 2026-09-28)

Home is the one page with glass surfaces: `.lx-glass-page` puts a soft crimson light behind the
page, and `.lx-glass` (plus `.glass` inside that page) makes surfaces translucent and blurred.
Every other page keeps the flat cards. Don't spread glass to other pages without asking.

## Icons and assets

lucide-react only, stroke 2, no emoji, no placeholder icons. Sizes: 18px nav/top bar,
16px buttons/menus, 14px inline/meta. Real game/brand assets already in the repo
(`public/logolegacyx.webp`, `src/lib/cs2-map-art.ts`, `src/assets/skinchanger/*`,
rank SVGs in `public/ranks/`) — reuse them, don't redraw. CS2 rarity colors appear
only as a thin indicator on skin tiles/equipped weapon cards, never as backgrounds.

## Commands

```bash
npm ci                                   # install from the checked-in lockfile
VITE_API_URL=<api origin> npm run dev    # dev server
npm run build                            # production bundle
npm run check:colors                     # palette lint — must pass before commit
```

## Reference docs

- `docs/design/README.md` — index of every reference screen (HTML spec + PNG)
- `docs/design/PROMPT.md` — the original full build prompt (git workflow, phased
  rebuild plan, per-page component/icon mapping)
- `docs/design/RANK-SYSTEM.md` — EXP/rank calculation spec
