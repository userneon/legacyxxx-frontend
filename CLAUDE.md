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
- **Commit subjects are public.** Every deploy posts the subjects of the commits it brought, as
  written, to a Discord channel (`legacyxxx-plugins/scripts/announce.sh`; same in all four repos).
  Write the subject as one plain sentence a player could read. A security fix, or anything that must
  not be announced, gets `[skip announce]` in the commit message. Docs-only commits are skipped.
- **Escape all user text.** Names, review text, penalty reasons — anything a player
  typed — renders as escaped text, never raw HTML.

## Design tokens (`src/index.css`)

Neutral surfaces, white as the workhorse accent, and **violet as the brand accent** (owner decision
2026-10-11; it replaced the crimson of 2026-09-27, `docs/design/PROMPT.md` still describes the crimson).
The earlier orange `#ff5a1f` exception was dropped and no longer exists in `src/`.
- Surfaces: `--bg` `#0a0a0a`, `--panel` `#0f0f0f`, `--card-surface` `#141414`, `--raised` `#1a1a1a`
- Lines: `--line-soft` `#1f1f1f`, `--line` `#262626`, `--line-strong` `#333333`
- Text: `--text` `#fafafa` → `--text-faint` `#525252`
- `--accent-solid` `#fafafa` (on `#0a0a0a`): primary buttons (`.lx-primary-button`), progress fills, unread dots
- `--brand` `#8b5cf6` (fills, borders, glows), `--brand-bright` `#a78bfa` (text, icons), `--brand-deep`
  `#2e1065`, `--brand-on` `#f5f3ff`. Violet is used sparingly (owner request 2026-10-01: too much of it).
  It belongs to: the wordmark's "-X", the active sidebar item, the Home hero's accent word and the soft glow behind its art, the flagship "Players Online" figure, the #1 leader
  and the viewer's own row, the active sort column, the Pro League card, the rank/EXP progress fill, the "equipped" verified seal
  on Skinchanger cards and the Owner badge. No other page has a glow or a hero banner (owner request 2026-10-06; Home keeps its hero): a page starts with
  `PageBar` (`components/page-tabs.tsx`: underlined tabs on the left, hint and controls on the right, one hairline) and the page
  name lives in the top bar. Everything else is neutral: section-heading bars
  (`--text-faint`), hover borders (`--line-strong`), hover fills (`--raised`), focus rings (`--accent-solid`),
  icon tiles, slot dots (`--text-2`). A primary button stays white. Before adding violet somewhere new,
  ask whether it is one of the spots above; if not, leave it neutral.
- `--status-green` `#22c55e` (online/live/verified) and `--status-red` `#ef4444` (limits, bans) are the status colors
- Rank emblems use the CS2 rarity ladder (`--rank-<tier>`) **only** inside emblem
  images and the rank name next to one — never on buttons, backgrounds, or chrome
- Font: Exo 2 (400/500/600/700, Google Fonts, with Cyrillic) for the whole site (owner pick 2026-10-12, replaces Onest).
  Keep its default proportional figures: no `tabular-nums` (owner request 2026-09-28, numbers like "11" must not spread out)

### One scale for everything (use these, not new values)

- **Radius:** 8px controls (`rounded-lg`), 10–12px cards (`rounded-[10px]`, `rounded-xl`), 14–16px floating
  panels (`rounded-2xl`), 999px pills (`rounded-full`). An avatar or tile may use a proportional radius
  (about a quarter of its size), and a thing nested in a padded box uses the box's radius minus the padding;
  nothing else gets its own number.
- **Text:** 10–11px meta and labels, 13px body and controls, 15px emphasis, 22px+ headings, `font-display`
  only for the wordmark and page titles. Don't add a new pixel size.
- **Buttons:** the primary action is `.lx-primary-button` (white); a secondary action is a bordered
  `--raised` button; hover on neutral controls is `hover:bg-[var(--raised)]`. Brand violet appears on a
  button only as a selected/active state, never as the default look.
- **Surfaces:** shell and cards use the flat-outline tokens below; a plain `--panel`/`--raised` fill is for nested
  or solid-over-art cases. Overlays that must stay readable over images use a solid `--card-surface` gradient.

### Limit red (owner request 2026-09-30)

When a player hits the daily or weekly EXP limit (gains count for ¼), the limit bar, the `×¼` label,
its one-line note and the `×¼ limit` pill in the match row are red (`--status-red` `#ef4444`, already in `src/index.css`). Nothing else
uses red; it is a status color like `--status-green`, not a general accent. Reference: `docs/design/exp-limit.png`.

The one other place is the Compare page (owner request 2026-10-04): the player who is ahead on a stat is green
(`--result-win`), the one behind is red (`--result-loss`) and a draw is grey (`--result-draw`). Win/loss/draw outcomes only;
it is still not a general accent.

Home's Top players (owner request 2026-10-11): a player's EXP figure and bar are green (`--status-green`) with a small "+N" when their latest ranked match
(within two days) added EXP, red (`--status-red`) with "−N" when it took some away, and neutral otherwise. The number is the real `exp_change` from the API,
never made up. Status colours only, not a general accent.

### Checks page (owner request 2026-10-09)

The staff-only Checks page (`src/pages/checks.tsx`, `src/components/checks/`) has a look of its own: a dark console with a faint grid, one slow
scan line, monospace labels, typed prompts and the status green for "alive", red for serious findings. It lives only inside `.chk-theme`
(`checks.css`), uses translucent fills rather than `backdrop-filter`, and stops moving for `prefers-reduced-motion`. No other page borrows it.

Skin picker tiles (owner request 2026-10-11): on hover the tile lifts 4px with a soft shadow and the weapon picture inside it leans 7° and floats up a little (`rotate` and `translate` only, no scale, so the picture stays sharp); the tile, its name and its text stay straight. Off for reduced motion.

### Staff page (owner request 2026-10-11)

The Staff page (`src/pages/staff.tsx`, `src/components/staff-*.tsx`) is built around what staff do all day, not around the data. **Ctrl K** (or the box in the page bar) finds a
player by name or Steam ID and opens their case: penalties with who lifted them, what the checker found, and the buttons to act (B ban, M mute, G gag, `/` find, Esc back).
"Needs you" on Overview lists finished checks, checks still waiting and unban requests, oldest first. It stays inside the site's palette (neutral, white accent); it
shows only counts of real records and never a made-up score.

### Flat outline (owner pick 2026-10-05, replaces the glass look of 2026-09-28)

The whole app sits on a near-black backdrop (`body::before`) with white `<BackgroundBeams />` (owner request 2026-09-30, replaces the Dust II art). The shell — sidebar, top bar and
page panel — is `.lx-glass-shell`: transparent with a 1px `--glass-shell-line` hairline, no fill, no blur. Cards inside use `--glass-fill` (transparent)
(`bg-[var(--glass-fill)]`, `.glass`, `.lx-glass`) with a `--glass-line` hairline. The token and class names keep their old "glass" prefix so everything
follows from `src/index.css`. Nothing may use `backdrop-filter` on the page itself. What scrolls under something (`.glass-strong` sticky toolbars) or floats over
content (dialogs, `.lx-sheet`) stays solid (`--panel`) so text never sits on moving lines; image overlays (`from-[var(--card-surface)]` gradients) stay solid too.
Home adds a soft violet light (`.lx-glass-page`). Stats and timers use `.lx-stat-grid` cells, not a box each.

**Light sweep on cards (owner request 2026-10-11).** The glass and shine look tried the same day was taken back (owner, 2026-10-11): cards stay
flat outline. A card that is an article, link, button or list item (or already has a `hover:` class) catches one soft band of white light
gliding across it when the pointer enters; it fades in and out, is a pseudo-element (the card's own transitions are untouched) and is off for
reduced motion. `.lx-sweep` opts any other element in. No colour in the sweep.

### Home mode cards (owner request 2026-10-11)

Four cards (5x5, Fun, Pro League, Tournaments), each with a pill, title, one line, a real status and a CS2 agent picture (`src/assets/home/mode-*.webp`, owner-supplied, transparent) at the right. The card under the pointer (5x5 by default) is the wide one: bright picture, a violet border and soft glow underneath, and a white "Play now"; the others keep their picture dim. No server counts or rank gates are shown, since the API has no per-mode figure for them.

### Play (owner pick 2026-10-11, design "D")

Play is a list with the open server beside it (`src/pages/play.tsx`). The header holds the mode's name, one line, the live count and
**Quick play** (white). The mode is chosen only in the sidebar: no mode tabs on the page. The left column (400px) has the map dropdown
(mode on Fun) and a Filter dropdown (state, order, hide full, favourites; all in the URL: `filter`, `status`, `sort`, `full`, `fav`),
then the servers grouped as Live now, Waiting for players and Full or offline, each a small row whose map fills it and fades out from left to right (`.lx-list-art`), with name, state, map,
players and star, inside a solid grey (`--card-surface`) box. The right side (same solid grey box) shows the open server (`?server=`, else the first joinable one): its map with the name and
state, then a CS2-style scoreboard (owner pick "D", 2026-10-12): T rows tinted gold, the score and round between the teams, CT rows
tinted blue, K/D/A live every 5 s; then Copy IP / Connect. The phone sheet uses the same scoreboard. Below 1180px the list fills the page and a server opens in
the sheet. Pro League needs a sign-in; a player below the rank sees the rank lock instead of the servers.

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
