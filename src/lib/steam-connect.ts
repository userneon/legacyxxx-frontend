/**
 * Join a game server: the desktop app opens Steam through its own bridge (a page cannot navigate to steam:// inside it), a browser follows a
 * steam://connect link that the visitor's click started. Returns false for anything that is not an "ip:port" address.
 */
const ADDRESS = /^[a-zA-Z0-9.-]{1,253}:\d{1,5}$/

type DesktopBridge = { connect?: (address: string, password?: string) => Promise<boolean> }

/** Starts CS2 (app 730) with +connect; the address is already checked to hold only letters, digits, dots, dashes and one colon. */
export const steamRunUrl = (address: string) => `steam://rungameid/730//+connect%20${address}`

export const isServerAddress = (address: string | null | undefined): address is string => Boolean(address && ADDRESS.test(address.trim()))

export function steamConnect(address: string | null | undefined): boolean {
  if (!isServerAddress(address)) return false
  const target = address.trim()
  const desktop = (window as unknown as { legacyxDesktop?: DesktopBridge }).legacyxDesktop
  if (desktop?.connect) {
    void desktop.connect(target)
    return true
  }
  // A real link click is what browsers accept for a protocol hand-off; assigning location after an await or a toast is often dropped.
  // CS2 often ignores steam://connect/ (Steam asks, the game opens, nothing connects), so the game is started with the connect command in its
  // launch options instead (steam://rungameid, the form Steam documents) (owner report 2026-11-02). The command is also copied, for a game that is already open: press ~ and paste.
  void navigator.clipboard?.writeText(`connect ${target}`).catch(() => undefined)
  const link = document.createElement("a")
  link.href = steamRunUrl(target)
  link.rel = "noopener"
  link.style.display = "none"
  document.body.appendChild(link)
  link.click()
  link.remove()
  return true
}
