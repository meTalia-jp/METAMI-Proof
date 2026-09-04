export const DEVELOPER_MODE_STORAGE_KEY = 'metami-proof.developer-mode'

export function readDeveloperModeSetting(): boolean {
  try {
    return window.localStorage.getItem(DEVELOPER_MODE_STORAGE_KEY) === 'enabled'
  } catch {
    return false
  }
}

export function writeDeveloperModeSetting(enabled: boolean): void {
  try {
    if (enabled) window.localStorage.setItem(DEVELOPER_MODE_STORAGE_KEY, 'enabled')
    else window.localStorage.removeItem(DEVELOPER_MODE_STORAGE_KEY)
  } catch {
    // The in-memory setting remains usable when browser storage is unavailable.
  }
}
