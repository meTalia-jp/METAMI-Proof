export const DEVELOPER_MODE_STORAGE_KEY = 'metami-proof.developer-mode'
export const THEME_STORAGE_KEY = 'metami-proof.theme'
export const LOCALE_STORAGE_KEY = 'metami-proof.locale'
export type AppTheme = 'paper' | 'monochrome'
export type AppLocale = 'ja' | 'en'

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

export function readThemeSetting(): AppTheme {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    return stored === 'monochrome' || stored === 'high-contrast' ? 'monochrome' : 'paper'
  } catch {
    return 'paper'
  }
}

export function writeThemeSetting(theme: AppTheme): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // The in-memory setting remains usable when browser storage is unavailable.
  }
}

export function readLocaleSetting(): AppLocale {
  try {
    return window.localStorage.getItem(LOCALE_STORAGE_KEY) === 'en' ? 'en' : 'ja'
  } catch {
    return 'ja'
  }
}

export function writeLocaleSetting(locale: AppLocale): void {
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  } catch {
    // The in-memory setting remains usable when browser storage is unavailable.
  }
}
