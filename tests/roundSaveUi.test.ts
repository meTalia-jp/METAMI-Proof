import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { RoundCompletionDialog } from '../src/components/RoundCompletionDialog'
import { setLocale } from '../src/i18n'

const assert = (condition: unknown, message: string) => { if (!condition) throw new Error(message) }
const props = {
  currentRound: 1,
  nextRound: 2,
  fileName: 'article_round001_review.html',
  saving: false,
  error: '',
  onCancel: () => undefined,
  onFinish: () => undefined,
  onStartNext: () => undefined,
}

setLocale('ja')
const unsupportedJa = renderToStaticMarkup(createElement(RoundCompletionDialog, { ...props, saveCanBeConfirmed: false }))
assert(unsupportedJa.includes('一部のブラウザでは保存完了を確認できません'), '保存確認不可時の日本語注意書きがありません')
assert(unsupportedJa.includes('再校正') && unsupportedJa.includes('Round 2として開始'), '日本語の再校正UIが不正です')
const supportedJa = renderToStaticMarkup(createElement(RoundCompletionDialog, { ...props, saveCanBeConfirmed: true }))
assert(!supportedJa.includes('一部のブラウザでは保存完了を確認できません'), '保存確認可能時にも注意書きが表示されています')

setLocale('en')
const unsupportedEn = renderToStaticMarkup(createElement(RoundCompletionDialog, { ...props, saveCanBeConfirmed: false }))
assert(unsupportedEn.includes('Some browsers do not allow METAMI Proof to confirm'), '保存確認不可時の英語注意書きがありません')
assert(unsupportedEn.includes('Review Again') && unsupportedEn.includes('Starts as Round 2'), '英語の再校正UIが不正です')
setLocale('ja')

console.log('Round save UI tests: PASS')
