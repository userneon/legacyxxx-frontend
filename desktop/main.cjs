// LEGACY-X desktop app (owner request 2026-11-01). The website in its own window, plus what a browser cannot do: join a server in one click, stay in the tray and
// send Windows notifications. It never touches the game (no overlay, no injection, no memory reading), so VAC and FACEIT AC have nothing to object to.
const { app, BrowserWindow, Menu, Notification, Tray, ipcMain, nativeImage, shell } = require("electron")
const path = require("node:path")

const SITE = (process.env.LEGACYX_DESKTOP_URL || "https://legacyx.cc").replace(/\/+$/, "")
// Only these hosts open inside the app; every other link opens in the browser.
const INSIDE = new Set([new URL(SITE).host, "legacyx.cc", "admin.legacyx.cc"])

let win = null
let tray = null
let quitting = false

function iconPath() {
  return path.join(__dirname, "build", "icon.png")
}

function createWindow() {
  win = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: "#0a0a0a",
    title: "LEGACY-X",
    autoHideMenuBar: true,
    icon: iconPath(),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  })
  Menu.setApplicationMenu(null)
  void win.loadURL(SITE)
  win.webContents.setWindowOpenHandler(({ url }) => {
    openLink(url)
    return { action: "deny" }
  })
  win.webContents.on("will-navigate", (event, url) => {
    if (!isInside(url)) {
      event.preventDefault()
      openLink(url)
    }
  })
  // The close button hides the app to the tray (it keeps the notifications); Quit in the tray menu really closes it.
  win.on("close", (event) => {
    if (!quitting) {
      event.preventDefault()
      win.hide()
    }
  })
}

function isInside(url) {
  try { return INSIDE.has(new URL(url).host) } catch { return false }
}

// Only web addresses go to the browser; nothing else (file:, javascript:, other programs) is ever opened from the page.
function openLink(url) {
  try {
    const parsed = new URL(url)
    if (parsed.protocol === "https:" || parsed.protocol === "http:") void shell.openExternal(parsed.toString())
    // A "Connect" link on the site: only steam://connect/<ip:port>, nothing else Steam can do.
    else if (parsed.protocol === "steam:" && /^steam:\/\/connect\/[A-Za-z0-9.-]{1,253}:\d{2,5}(\/[A-Za-z0-9_-]{1,32})?$/.test(parsed.toString())) void shell.openExternal(parsed.toString())
  } catch { /* not a link */ }
}

function createTray() {
  const image = nativeImage.createFromPath(iconPath())
  tray = new Tray(image.isEmpty() ? nativeImage.createEmpty() : image.resize({ width: 16, height: 16 }))
  tray.setToolTip("LEGACY-X")
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: "Open LEGACY-X", click: showWindow },
    { type: "separator" },
    { label: "Quit", click: () => { quitting = true; app.quit() } },
  ]))
  tray.on("click", showWindow)
}

function showWindow() {
  if (!win) return
  if (win.isMinimized()) win.restore()
  win.show()
  win.focus()
}

// One window only: a second start brings the first one forward.
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on("second-instance", showWindow)
  app.whenReady().then(() => {
    createWindow()
    createTray()
  })
}

app.on("before-quit", () => { quitting = true })

// ---- what the page may ask the app to do (preload.cjs exposes these as window.legacyxDesktop) -------------------------------------------------------------------
// Join a server: only a plain "ip:port" or host:port becomes steam://connect/<address>; Steam opens the game.
const ADDRESS = /^[A-Za-z0-9.-]{1,253}:\d{2,5}$/
ipcMain.handle("legacyx:connect", (_event, address, password) => {
  if (typeof address !== "string" || !ADDRESS.test(address)) return false
  const suffix = typeof password === "string" && /^[A-Za-z0-9_-]{1,32}$/.test(password) ? `/${password}` : ""
  void shell.openExternal(`steam://connect/${address}${suffix}`)
  return true
})

// A Windows notification (title and a short body, plain text); a click brings the window forward.
ipcMain.handle("legacyx:notify", (_event, title, body) => {
  if (typeof title !== "string" || !Notification.isSupported()) return false
  const note = new Notification({ title: title.slice(0, 80), body: typeof body === "string" ? body.slice(0, 200) : "", silent: false })
  note.on("click", showWindow)
  note.show()
  return true
})
