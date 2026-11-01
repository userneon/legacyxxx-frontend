// The only things the website may call from inside the app. Nothing else of Electron or Node is reachable from the page.
const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("legacyxDesktop", {
  /** Tells the page it runs in the app. */
  isDesktop: true,
  version: "0.1.0",
  /** Join a server: connect("1.2.3.4:27015"). Steam opens the game. Returns false for anything that is not an address. */
  connect: (address, password) => ipcRenderer.invoke("legacyx:connect", address, password),
  /** A Windows notification. */
  notify: (title, body) => ipcRenderer.invoke("legacyx:notify", title, body),
})
