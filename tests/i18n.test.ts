import { en } from '../src/i18n/en.ts'
import { ja } from '../src/i18n/ja.ts'
import { getLocale, setLocale, translate } from '../src/i18n/index.ts'
import { getReviewHtmlFormatError } from '../src/utils/reviewHtmlImport.ts'

const assert = (condition: unknown, message: string) => { if (!condition) throw new Error(message) }

assert(ja['menu.document'] === '文書', '文書メニューの日本語が変わっています')
assert(ja['menu.workData'] === '作業データ', '作業データメニューの日本語が変わっています')
assert(ja['menu.output'] === '出力', '出力メニューの日本語が変わっています')
assert(ja['menu.settings'] === '設定', '設定メニューの日本語が変わっています')
assert(ja['settings.paper'] === 'Paper' && ja['settings.monochrome'] === 'Monochrome', 'テーマ表示名が不足しています')
assert(ja['common.cancel'] === 'キャンセル' && ja['common.close'] === '閉じる', '共通ボタンの日本語が変わっています')

const internalTagIds = ['question', 'rewrite', 'delete', 'add', 'fact_check', 'note'] as const
assert(internalTagIds.join(',') === 'question,rewrite,delete,add,fact_check,note', '内部tag IDが変更されています')
assert(internalTagIds.every(tag => `tag.${tag}` in ja), 'tag表示名の辞書キーが不足しています')
assert(ja['tag.fact_check'] === '要確認', 'fact_checkの日本語表示が要確認ではありません')
for (const key of ['redPen.comment', 'redPen.proposal', 'redPen.noProposal', 'redPen.textProposal', 'redPen.deleteProposal', 'badge.hasComment', 'badge.proposal', 'badge.deleteProposal'] as const) {
  assert(Boolean(ja[key]) && Boolean(en[key]), `${key}のja/en表示が不足しています`)
}
for (const key of ['sidebar.title', 'document.originalTitle', 'paste.placeholder', 'structure.title', 'export.title', 'reviewHtml.formatError', 'notice.workLoaded'] as const) {
  assert(Boolean(ja[key]), `${key}の日本語UI辞書が不足しています`)
}
assert(translate('sidebar.count', { count: 3 }) === '3件', '件数パラメータを置換できません')
assert(translate('document.reviewer', { name: '校正者A' }) === '校正者：校正者A', '校正者名パラメータを置換できません')
assert(en['menu.workData'] === 'Work Data', 'Work Dataの英語表記が一致しません')
assert(en['sidebar.originalTarget'] === 'Original text', 'Original textの英語表記が一致しません')
assert(Object.keys(en).length === Object.keys(ja).length, 'English辞書に未翻訳キーがあります')
setLocale('en')
assert(getReviewHtmlFormatError() === en['reviewHtml.formatError'], 'locale変更後にFORMAT MARKERエラーが英語になりません')
setLocale('ja')
assert(getReviewHtmlFormatError() === ja['reviewHtml.formatError'], 'locale変更後にFORMAT MARKERエラーが日本語になりません')
assert(getLocale() === 'ja', 'テスト後のlocaleを日本語へ復元できません')

console.log('i18n foundation tests: PASS')
