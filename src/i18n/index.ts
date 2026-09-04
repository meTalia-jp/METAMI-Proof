import { useSyncExternalStore } from 'react'
import { en } from './en'
import { ja, type TranslationKey } from './ja'

export type Locale = 'ja' | 'en'
type TranslationParams = Record<string, string | number>

let currentLocale: Locale = 'ja'
const listeners = new Set<() => void>()

export function setLocale(locale: Locale) {
  if (currentLocale === locale) return
  currentLocale = locale
  listeners.forEach(listener => listener())
}

export const getLocale = () => currentLocale
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } }

export function translate(key: TranslationKey, params: TranslationParams = {}, locale = currentLocale): string {
  const template = locale === 'en' ? en[key] ?? ja[key] : ja[key]
  return Object.entries(params).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), template)
}

export function useTranslation() {
  const locale = useSyncExternalStore(subscribe, getLocale, getLocale)
  return { locale, t: (key: TranslationKey, params?: TranslationParams) => translate(key, params, locale) }
}
