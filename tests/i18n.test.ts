import { en } from '../src/i18n/en.ts'
import { ja } from '../src/i18n/ja.ts'

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
assert(Object.keys(en).length < Object.keys(ja).length, 'English辞書が完成扱いになっています')

console.log('i18n foundation tests: PASS')
