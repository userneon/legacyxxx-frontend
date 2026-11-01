# LEGACY-X desktop app

The website in its own window (Electron), with what a browser cannot do: join a server in one click (`steam://connect`), stay in the tray and send Windows
notifications. It does **not** touch the game: no overlay, no injection, no memory reading, so VAC and FACEIT AC have nothing to object to.

It opens the live site (`https://legacyx.cc`), so the app improves whenever the site does. `LEGACYX_DESKTOP_URL` points it somewhere else (`npm run start:dev` uses the local dev server).

## Run and build (on Windows)

```bash
cd desktop
npm install
npm start              # runs the app
npm run build          # writes dist/LEGACY-X Setup 0.1.0.exe (not signed: Windows SmartScreen asks "Run anyway" until the app is code signed)
```

`build/icon.ico` (256 px, with the smaller sizes) and `build/icon.png` are needed for the build; use the LEGACY-X mark (`public/logolegacyx.webp`, converted).

## What the page can call (`window.legacyxDesktop`, `preload.cjs`)

| Call | What it does |
|---|---|
| `isDesktop` | `true` inside the app |
| `connect("ip:port", password?)` | opens `steam://connect/ip:port[/password]`; only a plain address is accepted |
| `notify(title, body)` | a Windows notification; a click brings the window forward |

Links to other sites open in the browser, never inside the app. The security rules of the site apply: the app only shows the website, which only calls the public API.
