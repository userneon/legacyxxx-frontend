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
- `--accent-solid` `#fafafa` (on `#0a0a0a`): progress fills, unread dots
- `--brand` `#8b5cf6` (fills, borders, glows), `--brand-bright` `#a78bfa` (text, icons), `--brand-deep`
  `#2e1065`, `--brand-on` `#f5f3ff`. Violet is used sparingly (owner request 2026-10-01: too much of it).
  It belongs to: the wordmark's "-X", the active sidebar item, the Home hero's accent word and the soft glow behind its art, the flagship "Players Online" figure, the #1 leader
  and the viewer's own row, the active sort column, the Pro League card, the rank/EXP progress fill, the "equipped" verified seal
  on Skinchanger cards and the Owner badge, and **the Shop** (owner request 2026-10-24; the picked item lives in the **Spotlight bar** across the top of the list since 2026-10-26, owner pick "S8": the item on you at the left, its colours, then length and Buy at the right, stuck while the list scrolls; on the Featured tab it appears only once an item is picked, so the Genesis card is the first thing there; phones keep the bottom sheet; whole-page violet look: `.lx-shop-tile` cards that light up and carry the brand border when picked, `.lx-shop-price` pills, `.lx-shop-heading` bars, the preview stage as an add-box, a soft violet light behind the page; buttons stay white). No other page has a glow or a hero banner (owner request 2026-10-06; Home keeps its hero): a page starts with
  `PageBar` (`components/page-tabs.tsx`: underlined tabs on the left, hint and controls on the right, one hairline) and the page
  name lives in the top bar. Everything else is neutral: section-heading bars
  (`--text-faint`), hover borders (`--line-strong`), hover fills (`--raised`), focus rings (`--accent-solid`),
  icon tiles, slot dots (`--text-2`). A primary button stays neutral (`.lx-primary-button`). Before adding violet somewhere new,
  ask whether it is one of the spots above; if not, leave it neutral.
- `--status-green` `#22c55e` (online/live/verified) and `--status-red` `#ef4444` (limits, bans) are the status colors
- Rank emblems use the CS2 rarity ladder (`--rank-<tier>`) **only** inside emblem
  images and the rank name next to one — never on buttons, backgrounds, or chrome
- Font: Exo 2 (400/500/600/700, Google Fonts, with Cyrillic) for the whole site (owner pick 2026-10-12, replaces Onest), except the digits and `, . %`: those come from Inter (loaded as a `text=` subset, so it holds nothing else) listed first in the body stack, because Exo 2's numerals read badly (owner request 2026-10-24).
  Keep its default proportional figures: no `tabular-nums` (owner request 2026-09-28, numbers like "11" must not spread out)

### One scale for everything (use these, not new values)

- **Radius:** 8px controls (`rounded-lg`), 10–12px cards (`rounded-[10px]`, `rounded-xl`), 14–16px floating
  panels (`rounded-2xl`), 999px pills (`rounded-full`). An avatar or tile may use a proportional radius
  (about a quarter of its size), and a thing nested in a padded box uses the box's radius minus the padding;
  nothing else gets its own number.
- **Text:** 10–11px meta and labels, 13px body and controls, 15px emphasis, 22px+ headings, `font-display`
  only for the wordmark and page titles. Don't add a new pixel size.
- **Buttons:** the primary action is `.lx-primary-button`: dark `#262626` with a light `#404040` border and white text (owner pick "3", 2026-10-26, the white was too harsh; also the shadcn Button's default). Where this file still says a "white" primary button, it means this one; a secondary action is a bordered
  `--raised` button; hover on neutral controls is `hover:bg-[var(--raised)]`. Brand violet appears on a
  button only as a selected/active state, never as the default look.
- **Surfaces:** shell and cards use the flat-outline tokens below; a plain `--panel`/`--raised` fill is for nested
  or solid-over-art cases. Overlays that must stay readable over images use a solid `--card-surface` gradient.

### "Add" boxes (owner pick "A", 2026-10-12)

The boxes that create something (New penalty, Add staff, Add creator, Create a clan, Write a review) use `.lx-add-box`: a violet
hairline along the top, a soft violet light in the top-right corner and under the box, a violet icon tile (`.lx-add-icon`) next to
the title, and violet for the field being typed in and the picked option (`aria-pressed` / `aria-checked`). The main button stays
white. These are the only other places violet appears; the Checks dialog keeps its console look.

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

Compare tabs (owner request 2026-10-26): **Players** adds Head to head (`GET /compare/head-to-head`: against each other and together, hidden when either hides matches), Recent form, Ladder place (lower wins), EXP this week and Last 10 wins. **Clans** puts two clans side by side from `/clans/:id` and `/clans/:id/stats`. (A joke "Servers" tab was tried and removed the same day, owner request.)

### Checks page (owner request 2026-10-09)

The staff-only Checks page (`src/pages/checks.tsx`, `src/components/checks/`) has a look of its own: a dark console with a faint grid, one slow
scan line, monospace labels, typed prompts and the status green for "alive", red for serious findings. It lives only inside `.chk-theme`
(`checks.css`), uses translucent fills rather than `backdrop-filter`, and stops moving for `prefers-reduced-motion`. No other page borrows it.

Skin picker tiles (owner request 2026-10-11): on hover the tile lifts 4px with a soft shadow and the weapon picture inside it leans 7° and floats up a little (`rotate` and `translate` only, no scale, so the picture stays sharp); the tile, its name and its text stay straight. Off for reduced motion.

### Staff page (owner request 2026-10-11)

**The Staff page is its own site, `admin.legacyx.cc`** (owner request 2026-10-23): same repo and code, a second entry (`admin.html`, `src/admin/`, `vite.admin.config.ts`;
`npm run dev:admin` on :5200, `npm run build:admin` writes `dist-admin/`, `ops/deploy-admin.sh`, Nginx in `ops/nginx/legacyx-admin.conf`). The website no longer bundles it:
`/staff` and `/checks` there move to the admin site, and the sidebar's Staff entry is a link (`lib/sites.ts`: `ADMIN_URL`, `SITE_URL`). On the admin site a staff
link to a profile, clan or the Penalties list opens the website. The API needs `ADMIN_ORIGIN` (CORS + Steam sign-in that returns there, `?to=admin`); the session cookies are on `.legacyx.cc`, so one sign-in covers both.

Staff lists are **cards, not rows** (owner request 2026-10-23): every tab sits in one centred column (`STAFF_BODY`, max 1320px) and a list is a grid of flat-outline cards (`STAFF_GRID`, `STAFF_CARD`, `StaffSection`, `CardIcon` in `components/staff-ui.tsx`), 1 / 2 / 3 columns. Overview's "Needs you", unban requests, clans, creators, applications, shop orders and products, servers and checks all follow it; the Checks cards keep the console look.
Overview (owner request 2026-10-23, "needed things are missing"): "Needs you" also lists creator applications and new shop orders, a stat cell counts each, a Servers strip shows who is online and how many players, and the page bar tabs carry a count of what is waiting (Checks, Penalties, Creators, Shop). Penalties shows the latest penalties as cards with Open case. The staff site has no animated backdrop, so text never sits on moving lines. All real data from the API.
Servers on the staff site are cards with their map's picture along the top (`components/staff-server-card.tsx`, art from `lib/cs2-map-art.ts`; grey while not reporting), and the Servers console picks the map for "Change map" from a row of map thumbnails (`CS2_MAP_KEYS`).
Nobody types a SteamID on the staff site (owner request 2026-10-23): `PlayerPicker` (`components/player-picker.tsx`) lists the roster at once (the players active last, from `GET /moderation/roster`), a name narrows it, and a pasted Steam ID still works. It is used in Add staff, Add creator, New penalty, Ask for a check and the server console's player field.
Less in the code, more on the staff site (owner request 2026-10-23): Staff → **Settings** (Owner only, `components/staff-settings.tsx`) changes the numbers listed in the API's `settings.ts` (leave block rule, check code lifetime / retention / downloads, creator re-apply days; each with a default, a range and a Reset), and Staff → Shop → **Cosmetics** (`staff-cosmetics.tsx`, Owner or Manager) edits a cosmetic's names, unlock, price, line, order and on/off. Pictures, colours and effects stay in the code. The ranking numbers are deliberately not settings (one formula, `docs/design/RANK-SYSTEM.md`).
The server console shows who is on the picked server as player cards (`components/staff-server-live.tsx`, owner request 2026-10-23): Terrorists, Counter-Terrorists, spectators, each with K/D/A, ADR, ping and the buttons Message, Kick, Mute, Ban and IP; a button asks for the reason on the card and queues the same audited action as the console below. Data is the game server's own live report (`/public/servers/:id/live-match`, refreshed every 5 s); with no report the console says so, nothing is invented.
Who gets the staff site (owner decision 2026-10-23): Admin and above. Developer and Designer do not (team badge only). An **Admin** sees Overview, Checks, Penalties and Players; a **Manager** adds Clans, Creators, Shop and Servers; the **Owner** adds Team and Settings (`tabsFor` in `pages/staff.tsx`; the API enforces the same lines, hiding a tab only spares a refused page).
Clan leader (owner request 2026-10-23): a leader hands the clan to a member from the clan page (already there); Owners and Managers can also do it for any clan from Staff → Clans → Moderate → Leader (`POST /staff/clans/:id/transfer`), picking **any player** from the roster (a member, or a player in no clan, who joins first), for a clan whose leader is gone or banned. The old leader stays as a co-leader and both players get a notification.
Staff cards tell their kind apart by colour (owner request 2026-10-23, the one exception to "neutral" on the staff site): a 2px hairline along the top, a faint wash and a tinted icon tile, set by `data-tone` on a `.lx-tone` card (`--tone-red/amber/green/sky/violet`, palette-exempt). Red = ban, flagged, failed, stop; amber = waiting, new, restart; green = ok, done, online, shown, start; sky = info, contacted, messages; violet = people and moves (creators, unban requests, map). Team roles each have their own colour (Owner violet, Manager red, Admin sky, Developer green, Designer amber) on the card, role pill and role picker. Colour always follows a real state or kind, never decoration; the website itself stays neutral.
The Staff page (`src/pages/staff.tsx`, `src/components/staff-*.tsx`) is built around what staff do all day, not around the data. **Ctrl K** (or the box in the page bar) finds a
player by name or Steam ID and opens their case: penalties with who lifted them, what the checker found, and the buttons to act (B ban, M mute, G gag, `/` find, Esc back).
A finished check also lists whether FACEIT AC and Riot Vanguard are installed and running on the PC (`report.antiCheats`, owner request 2026-10-26; read by the Checker from the Windows service list, nothing is changed). Real answers only; a line is left out when the Checker could not read it.
"Needs you" on Overview lists finished checks, checks still waiting and unban requests, oldest first. It stays inside the site's palette (neutral, white accent); it
shows only counts of real records and never a made-up score.
Staff → **Team** (`src/components/staff-team.tsx`, Owner only; others see why): add a player by SteamID64 with a role (Owner, Manager,
Admin, Developer, Designer; immunity and stamina default from the role), edit role / immunity / stamina, Suspend, Remove, Reactivate.
Staff members are violet cards in a grid (`.lx-add-box`; avatar, name, violet role pill, immunity and stamina, SteamID, actions) (owner request 2026-10-12). A grant can have an end (No end, 7, 30, 90 days, or a date); the API suspends it on that day and the card shows "Until … · N days left". Developer and Designer carry the team badge only: in game they are players. Staff → **Creators** manages content creators.

### Flat outline (owner pick 2026-10-05, replaces the glass look of 2026-09-28)

The whole app sits on a near-black backdrop (`body::before`) with white `<BackgroundBeams />` (owner request 2026-09-30, replaces the Dust II art). The shell — sidebar, top bar and
page panel — is `.lx-glass-shell`: transparent with a 1px `--glass-shell-line` hairline, no fill, no blur. Cards inside use `--glass-fill` (transparent)
(`bg-[var(--glass-fill)]`, `.glass`, `.lx-glass`) with a `--glass-line` hairline. The token and class names keep their old "glass" prefix so everything
follows from `src/index.css`. Nothing may use `backdrop-filter` on the page itself. What scrolls under something (`.glass-strong` sticky toolbars) or floats over
content (dialogs, `.lx-sheet`) stays solid (`--panel`) so text never sits on moving lines; image overlays (`from-[var(--card-surface)]` gradients) stay solid too.
Home adds a soft violet light (`.lx-glass-page`). Stats and timers use `.lx-stat-grid` cells, not a box each.

**Detail sheets (owner request 2026-10-26, "every detail comes up from the bottom and covers the screen").** Match details, a penalty, a server (Play), the skin picker and the
Shop item on a phone all open in `DetailSheetContent` (`components/detail-sheet.tsx`) inside a `<Sheet>`: a solid `.lx-sheet` panel that slides up from the bottom and covers most of the screen,
leaving room at the top (`max(56px, 9dvh)`), inset from the sides, with 24px rounded top corners (owner request, same day), with a grab handle (drag down to close), a close button, and the content in a readable centred column (`width`; `fill` when the content scrolls its own parts).
Forms and confirmations (write a review, register a team, staff actions, alerts) stay small centred dialogs. A new detail view uses the same component.

**Light sweep on cards (owner request 2026-10-11).** The glass and shine look tried the same day was taken back (owner, 2026-10-11): cards stay
flat outline. A card that is an article, link, button or list item (or already has a `hover:` class) catches one soft band of white light
gliding across it when the pointer enters; it fades in and out, is a pseudo-element (the card's own transitions are untouched) and is off for
reduced motion. `.lx-sweep` opts any other element in. No colour in the sweep.

Skin collection page (owner request 2026-10-27, `src/pages/skin-collection.tsx`): a header with the name, author chip, stat cells, a thin rarity bar (a share per rarity from the real item counts) and the three rarest items as a showcase; then the items in one compact grid, rarest first (not split into groups, owner request 2026-10-27). A card shows the stickers and the charm on the weapon as pictures (from `stickerItems` and `charm` in `GET /skinchanger/collections/:id`); hovering or focusing one opens it large with its name, and hovering the weapon opens its details (side, wear, StatTrak, stickers, charm) (owner request 2026-10-27). Cards lift 4px and the picture leans on hover like the skin picker tiles. Rarity colours stay thin indicators (the bar, a dot, the card's bottom line), never surfaces.

### Home mode cards (owner request 2026-10-11)

Four cards (5x5, Fun, Pro League, Tournaments), each with a pill, title, one line, a real status and a CS2 agent picture (`src/assets/home/mode-*.webp`, owner-supplied, transparent) at the right. The card under the pointer (5x5 by default) is the wide one: bright picture, a violet border and soft glow underneath, and a white "Play now"; the others keep their picture dim. No server counts or rank gates are shown, since the API has no per-mode figure for them.

### Play (owner pick 2026-10-11, design "D")

(A boxes-in-a-grid layout was tried on 2026-10-26 and taken back the same day, owner request: the cards looked like other servers' sites.)
Play is a list with the open server beside it (`src/pages/play.tsx`). The header holds the mode's name, one line, the live count and
**Quick play** (white). The mode is chosen only in the sidebar: no mode tabs on the page. The left column (400px) has the map dropdown
(mode on Fun) and a Filter dropdown (state, order, hide full, favourites; all in the URL: `filter`, `status`, `sort`, `full`, `fav`),
then the servers grouped as Live now, Waiting for players and Full or offline, each a small row whose map fills it and fades out from left to right (`.lx-list-art`), with name, state, map,
players and star, inside a solid grey (`--card-surface`) box. The right side (same solid grey box) shows the open server (`?server=`, else the first joinable one): its map with the name and
state, then a CS2-style scoreboard (owner pick "D", 2026-10-12): T rows tinted gold, the score and round between the teams, CT rows
tinted blue, K/D/A live every 5 s; then Copy IP / Connect. The phone sheet uses the same scoreboard. Below 1180px the list fills the page and a server opens in
the sheet. Pro League needs a sign-in; a player below the rank sees the rank lock instead of the servers.
Connect and Quick play are inactive (with the reason in a tooltip and as a line of text) for a visitor who is not signed in and for a player blocked for leaving ranked matches too often (owner request 2026-10-18: within 24 hours the 1st and 2nd leave cost EXP, the 3rd blocks 30 minutes and each later one 30 more; `usePlayGate`, `GET /play/status`). The game servers enforce the same rules, so typing the address does not get a player in.
Notifications in the bell have an icon each: by kind (penalty, match, clan, system) and, for system ones, by `metadata.kind`.

Leaders keeps your own place pinned (owner request 2026-10-27): the Leaders page takes the panel's height (`h-full` in `App.tsx`) so the table scrolls inside it, under a sticky header, and your row ("You", with your real position; players, clans and Boosters ladders) stays at the bottom of the panel whatever the scroll. It shows only when you are on that ladder.

### Leaders → Boosters (owner request 2026-10-16)

A fifth Leaders tab, `Boosters` (`src/pages/leaders-boosters.tsx`): Members who linked Discord, ranked by server boosts or by the people they invited (a switch inside the tab),
same top-three cards and rows as the other ladders, each with the Discord display name, @username and avatar. Real data from `/api/v1/public/discord/community`, which the Discord bot fills; only members who linked Discord to their profile are listed (0 when they did neither), each with a Steam-marked Profile button. Discord
does not give a boost count per member, so the bot counts the boost messages it sees from the day it starts. The cards wear Discord's server boost look
(owner request 2026-10-16): its pink (`--boost`, palette-exempt, only inside `.lx-boost`) and the owner-supplied gem pictures (`src/assets/boosters/`).

Booster reward (owner decision 2026-10-17, changed 2026-10-23): a member who boosts the Discord server and has linked Discord gets the **Server Booster** avatar frame
(`public/frames/server-booster.webp`, achievement type; no LX) **only while they boost**: it is taken back when their last boost ends (one boost ending while another still runs changes nothing).
A pink **Booster** badge sits next to the name on the profile (`components/booster-badge.tsx`) under the same rule. A booster who links Discord later gets the frame then.

Booster podium (owner request 2026-10-23): the three members with the most server boosts (the Boosters ladder's first three, linked and with at least one boost) wear the **Booster Gold**, **Silver**
and **Bronze** frames (`public/frames/booster-*.webp`, masked like the Genesis frame). They are earned and follow the ranking: the API gives each frame to its holder and takes it from whoever loses the place.
The Server Booster frame stays for every member who still boosts; the podium places are worn only while boosting too. The violet in these three comes from the owner-supplied art (a booster look, like the Boosters page's pink), not from site chrome.

### Community and the Staff page (owner request 2026-10-26)

The sidebar's **Community** row opens like Play and holds Clans, Staff and Creators (`COMMUNITY_ITEMS` in `app-sidebar.tsx`); the staff site's own link is now "Staff panel".
**Staff** (`/team`, `src/pages/team.tsx`, owner pick "1") shows the team as trading cards (`.lx-team-card`): a holo frame in the role's colour (the staff-site tones: Owner violet,
Manager red, Admin sky, Developer green, Designer amber, palette-exempt), the role's numeral and name in the corners, the Steam avatar in a ring of that colour. Layout (owner request 2026-10-26,
"bad UX, empty space"): the page bar filters by role (Everyone, Managers, Admins, ... with counts), finds a member by name and has "Contact staff" (Discord); the Owner is one wide card across
the top (rank, Matches / Win / K/D, since), and the rest fill the width in a grid (`.lx-team-grid`, two columns on a phone). A card shows the rank emblem and name, clan tag, ranked
Matches / Win / K/D and "Since <month>"; a role filter adds one line of what that role does. Real data from `GET /public/staff` (active staff only, Owner first, with rank, ranked numbers,
clan tag and staff start date); a card opens the profile.

Notifications in the bell open the page they are about when clicked (`notificationTarget` in `notifications-menu.tsx`; a staff message has none). `useApiQuery` keeps what is on screen while it asks again, so a page does not drop to its skeleton after a buy, wear or accept.

The **Tutorial** button in the top bar (owner request 2026-10-26, `components/site-tour.tsx`) starts a walk through the site: one step per sidebar entry and top-bar control, lit by its aria-label, with Back / Next, arrow keys and Esc. A control that is not on screen (signed out, a hidden feature) is skipped; on a phone the sidebar steps are told in the middle. Plain text, no numbers from the API.

### Public chat (owner request 2026-10-23)

A round button bottom right on every page of the website (`components/public-chat.tsx`) opens the community chat in a solid `--panel` panel (it floats over content). Everyone reads; a signed-in player writes
(300 characters, no links, one message per `chat.cooldown_seconds`, refused while they have an active gag); staff who can ban see a Remove icon on each message; staff roles show a small pill (Owner violet, others neutral).
Real data from `/public/chat`, refreshed every 4 s while open and every 30 s shut (a white dot on the button says something new was written). The staff site has no chat. Neutral palette, white send button.

### Creators (owner request 2026-10-12)

Two creator roles, **Main Content Creator** and **Content Creator**, kept apart from staff (`legacy_x.content_creators`; no
permissions of any kind). They show as a badge next to the name on the profile (Main: white outline and a star; Content Creator:
neutral, clapperboard), a card under the header with their line and channel links, and on the **Creators** page (`/creators`,
sidebar; `src/pages/creators.tsx`): Main creators first in bigger cards, then the others. Links are text buttons with the platform's
name (Twitch, YouTube, Kick, Facebook, Instagram; lucide has no brand icons). TikTok has a button of its own (`.lx-tiktok`,
owner request 2026-10-12): black, TikTok's note with its cyan and red offsets, the `@handle` from the link, and a short glitch on
hover (off for reduced motion); its brand colours are palette-exempt. Owners and Managers manage the list in
Staff → Creators (`src/components/staff-creators.tsx`).
Clan page effects run live on the clan page; the Shop previews play recorded GIFs instead (owner request 2026-10-24, lighter shop): `public/clan-fx/<effect>.gif` (grey on black, ping-pong loop) is multiplied by the clan's colour and screened onto its base (`ClanBackground recorded`). Re-record with `scripts/record-clan-effects.mjs` + `scripts/make-clan-fx-gif.py` only when an effect's look changes. Colours by hand (owner request 2026-10-24, 50% above the plain item): a player buys Custom colour / Custom glow (`name-custom`, `glow-custom`) and a clan leader a custom tag colour, tag glow, backdrop or page background (one per animated effect), then picks the colours with `components/color-row.tsx`; the API stores the picks (`cosmetic_custom`, `clan_look_custom`).
Clan sections (owner request 2026-10-25, "clan features are limited"): the clan page has Roster, Stats, Wars and (members only) Bank under its header (`components/clan-extras.tsx`). Stats: level (XP from members' ranked matches and Clan Wars; levels add member slots, `clanProgress.ts` in the API), totals, best players and achievements, all from real match rows. Wars: a leader or co-leader challenges a clan for a map and time; the other side accepts or declines; the result comes only from the ranked match the two clans play around that time (never typed in), with an Elo war rating. Bank: members give LX, the leader buys member slots from it. The sections tell their numbers apart by colour (owner request 2026-10-25, "tell them apart by colour"): they borrow the staff-site kind tones (`.lx-tone`, `data-tone`: red, amber, green, sky, violet, grey) for each tab, stat cell, best-player card, achievement, war row (green won, red lost, amber waiting, sky accepted, grey off) and bank line (green given, red spent); the level fill is the EXP violet.
Clan links (owner request 2026-10-26, `components/clan-links.tsx`): the clan page header shows the clan's links as text buttons (Discord, Facebook, YouTube, Twitch, Kick, Instagram, TikTok, Steam group); the leader fills them in the clan settings next to the description and join mode (`PUT /clans/:id` with `links`). The API takes only https links on each platform's own host (`clanLinks.ts`), and a link that does not start with https is never drawn.
Link buttons (clans and creators) carry the platform's own mark (owner request 2026-10-26, `components/brand-icons.tsx`: small inline glyphs in `currentColor`, so the site stays neutral; Discord and Steam reuse the marks already in the app). A content creator changes their own About line from **Edit my about** in the Creators page bar (`PUT /creators/me/about`); the tier and the channel links stay with staff.
Clan cards on the Clans page (owner request 2026-10-21, "more colour"): each clan carries its own colour, the backdrop it bought or else one of five calm hues from its tag (violet, orchid, emerald, teal, ruby), for the top hairline, the soft glow, the logo ring, the tag and the member bar. Computed, not a palette; a white primary Join.
Applications (owner request 2026-10-23): a signed-in player who is not a creator sees **Become a creator** in the Creators page bar (`components/creator-apply.tsx`): a short line about their content and at least one https channel link. While it waits the bar says "Application sent"; a declined player sees the staff note and can apply again after 7 days (the API enforces it). Owners and Managers answer in Staff → Creators → Applications (`staff-creators.tsx`): pick Content Creator or Main Content Creator, optional note, Approve or Decline; approving creates the creator and both answers notify the player. Neutral controls, white primary button.
The Creators page is laid out like the other pages (owner request 2026-10-26, replaces the violet `.lx-add-box` cards of 2026-10-16): the page bar has Everyone / Main / Creators with counts, "Find a creator" and Become a creator; Main Content Creators are wide flat-outline cards one per row (name in their look, rank, tier badge, then their line and channels), Content Creators fill the width in `.lx-creator-grid`. Neutral, real data from `/public/creators`.

Colour it yourself (owner request 2026-10-26): every coloured player cosmetic (name colour and glow, smoke, trail, grenade light, flash) is sold as a **design**, never as a ready-made colour. A design shows grey until its owner picks a colour (the Shop tiles show an uncoloured design in a sample colour, `demoColour`, so the designs tell apart; the preview starts grey); picking one in the Shop preview (`ColorRow`, a second row for the dual smoke) works before buying too and is kept on purchase. Name designs Gradient, Fire, Chrome, Foil and Drift are drawn from `--name-color` (`name-effects.css`). Fixed looks (rainbow trail, prism flash, spectrum name) and earned items keep their own colours. The API decides which items take a colour (`custom`, `twoColours`). Clan looks follow the same rule: one tag colour, tag glow, backdrop and page background per design, grey until the clan's leader picks its colours (`clan_look_custom`); anyone can try colours in Shop → Clan.

Per grenade (owner request 2026-10-26, option "A"): a trail and a light are bought once and worn on one kind of grenade only if the player wants: Profile → Appearance → Trail / Light shows "For each grenade" (`components/nade-slots.tsx`): HE, Flashbang, Smoke, Fire (molotov and incendiary) and Decoy, each Default (the item worn in the list above), Nothing, or any trail/light they own. `GET /cosmetics` sends `nadeSlots` (only the grenades that differ), `PUT /cosmetics/nade-slot` sets one. The colour a player picked belongs to the item, so the same trail on two grenades has the same colour.

Profile → Appearance lists only what the player owns, also what staff switched off after they bought it (`retired`: still wearable, not shown in the Shop) (owner request 2026-10-26): no buying, no price, no LX balance, no link to the Shop, no locked items; the Shop is the only place to buy.

Premium animated frames (owner request 2026-10-25, "very valuable profile decorations"): Dragon Ember, Frost Royale, Void Rift, Hologram, Celestial Crown and Diamond Prestige (2,500–5,000 LX) are drawn by `scripts/premium-frames.html` (canvas, nothing drawn over the opening) via `scripts/render-premium-frames.mjs` + `scripts/make-premium-frames.py`, which keeps one still picture per frame in `public/frames/` (`--animated` writes the looping WebP instead). Change the art there and re-run both, never by hand. **No frame moves** (owner request 2026-10-27, "do not animate the frames, add a glow"): every frame, premium or not, gives off its own light (`frameGlow` and `FRAME_GLOW` in `src/lib/cosmetics.ts`: a bright close rim and a wide soft halo, each frame with its own two colours and reach; a static `drop-shadow`, no animation) in `FramedAvatar` and `FrameOverlay`.

### Genesis pack (owner decision 2026-10-23; first called Founder)

A numbered, limited pack bought **with LX** (owner request 2026-10-26: 4,500 LX, the 30,000₮ it cost at the clan fee's rate; `POST /shop/founder/buy`, `COIN_RULES.founderPrice`): the wallet is charged and the pack given at once, no order. (Before that it was a Shop order that staff confirmed; that route still exists.) Buying gives
the buyer the next Genesis number and: the **Genesis frame** (`public/frames/founder.webp`, the owner-supplied art, masked: `founder-mask.webp` cuts the avatar to the shape of
its opening), the **Gold Foil banner** (profile banner, effect key `goldfoil`, `.lx-banner-goldfoil`), the **Genesis title** under the name and a gold **Genesis #0001** badge
(`components/founder-badge.tsx`). It is the only place gold appears: `--founder-1..4` (palette-exempt) on the banner, badge, title and the Featured-tab card
(`components/founder-pack.tsx`). The card shows the API's real numbers (remaining of limit, deadline); nothing is invented. The code keeps the word "founder" (ids, `FounderPack`, `--founder-*`) because "Founder" is also a staff role and only the displayed name changed. Banners and titles are earned cosmetics: they
are worn in Profile → Appearance, not sold in the Shop tabs. Frames can have a `mask` entry in `lib/cosmetics.ts`; `FramedAvatar` then fills the opening exactly.

Profile stats (owner request 2026-10-23): under each number a thin bar shows how many ranked players the player beats, with "Avg …" (the community average) and "Top N%" / "Beats N%". Above the
community average is green (`--result-win`), below is red (`--result-loss`), equal is grey, the same outcome colours as the Compare page (owner request 2026-10-23); still not a general accent. Both come from the API (players with 5+ ranked matches; nothing is shown while fewer than 10 players qualify) and are never computed or guessed on the site.

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
