import { readThemeSetting, THEME_STORAGE_KEY, writeThemeSetting } from '../src/config/settings'

const assert = (condition: unknown, message: string) => { if (!condition) throw new Error(message) }
const values = new Map<string, string>()
const previousWindow = globalThis.window

Object.defineProperty(globalThis, 'window', { configurable: true, value: {
  localStorage: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  },
} })

assert(readThemeSetting() === 'paper', '未設定時のテーマがPaperではありません')
writeThemeSetting('monochrome')
assert(values.get(THEME_STORAGE_KEY) === 'monochrome', 'Monochrome設定が保存されません')
assert(readThemeSetting() === 'monochrome', 'Monochrome設定を復元できません')
values.set(THEME_STORAGE_KEY, 'high-contrast')
assert(readThemeSetting() === 'monochrome', '開発中の旧テーマ値をMonochromeへ正規化できません')
writeThemeSetting('paper')
assert(readThemeSetting() === 'paper', 'Paperへ戻せません')

Object.defineProperty(globalThis, 'window', { configurable: true, value: previousWindow })
console.log('Theme setting tests: PASS')
