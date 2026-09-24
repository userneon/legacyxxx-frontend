# Legacy-X Frontend

The Legacy-X community site: play (5x5, Fun Mode, Pro League), tournaments, leaders, skinchanger, penalties,
reviews, explore, profiles and settings. React 19, Vite 7, Tailwind CSS 4 and shadcn/ui on Radix.

The design source of truth is `docs/design/` (reference screens, `PROMPT.md`, `RANK-SYSTEM.md`). Rank emblems are
the 18 SVGs in `public/ranks/`.

## Run locally

```bash
npm ci
VITE_API_URL=https://api.legacyx.cc npm run dev
```

Without `VITE_API_URL` a development build calls the API on the same origin (`/api/v1/...`); a production build
falls back to `https://api.legacyx.cc`.

Checks:

```bash
npm run build          # tsc -b && vite build
npm run check:colors   # fails on blue-family colors (hue 180–270°) in src/
```

Browser environment files must never contain API secrets, plugin secrets, RCON credentials or Supabase service-role
keys. Only `VITE_*` values reach the bundle.

## Optional configuration

| Variable | Used for |
| --- | --- |
| `VITE_API_URL` | API origin |
| `VITE_DISCORD_INVITE_URL` | Discord invite (default for the links below) |
| `VITE_DISCORD_APPEALS_URL` | "Appeal" on penalties |
| `VITE_DISCORD_REPORT_URL` | "Report player" on profiles |
| `VITE_DISCORD_ANNOUNCEMENTS_URL` | "Get notified on Discord" on Tournaments |
| `VITE_DISCORD_STAFF_CONTACT_URL` | "Contact on Discord" on staff profiles |
| `VITE_SERVER_RULES_URL`, `VITE_TOURNAMENT_RULES_URL` | Rules links |
| `VITE_DISCORD_GUILD_ID` | Discord widget online count on Home |

## Structure

- `src/api/` — typed services for the `/api/v1` consumer API (the API alone computes EXP and ranks).
- `src/pages/` — one file per page; `src/panel/` and `src/pages/staffpanel.tsx` are the staff tools.
- `src/components/` — app shell (sidebar, top bar, kill feed, menus), rank emblems, states, UI primitives.
- `src/lib/` — rank ladder (display only), formatting, website preferences, config.
- `ops/nginx/` — static asset caching for the production host.

Website preferences (kill feed, collapsed sidebar, motion, time format) are stored per device under
`localStorage["legacyx:website"]` and applied before first paint by `index.html`.

## Deployment

Set `VITE_API_URL` at build time and add the site origin to the API's `FRONTEND_PUBLIC_ORIGINS`. Deploy the API (and
its database migrations) before the frontend: the pages use the v1 routes (`/public/competitive/leaderboard`,
`/public/killfeed`, `/play/:mode/quick-join`, `/profile/:id/loadout`, …).
