import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { HighlightAnnotation, RedPenAnnotation, ReviewTag } from '../src/types/annotation'
import { MarkdownViewer } from '../src/components/MarkdownViewer'
import { getAttentionBadges } from '../src/utils/attentionBadges'

const assert = (condition: unknown, message: string) => { if (!condition) throw new Error(message) }
const anchor = { sourceStart: 0, sourceEnd: 2, sourceText: '本文', targetText: '本文', contextBefore: '', contextAfter: '' }
const reviewer = { id: 'reviewer', name: '校正者' }
const red = (values: Partial<RedPenAnnotation>): RedPenAnnotation => ({ ...anchor, id: 'anno', type: 'red_pen', originalAnchor: anchor, draftAnchor: { start: 0, end: 2, text: '本文', method: 'offset' }, status: 'pending', anchorStatus: 'resolved', reviewer, ...values })
const highlight = (values: Partial<HighlightAnnotation>): HighlightAnnotation => ({ ...anchor, id: 'highlight', type: 'highlight', originalAnchor: anchor, color: 'yellow', comment: null, reviewer, createdAt: '2026-09-05T00:00:00.000Z', ...values })

for (const tag of ['question', 'rewrite', 'delete', 'add', 'fact_check', 'note'] as ReviewTag[]) {
  assert(getAttentionBadges(red({ tag, reviewText: 'コメント' }))[0].label === tag, `${tag}バッジが生成されません`)
}
assert(getAttentionBadges(red({ reviewText: 'コメント' }))[0].label === 'has_comment', 'コメント有バッジがありません')
assert(getAttentionBadges(red({ replacementText: '本文案' }))[0].label === 'proposal', '本文案バッジがありません')
assert(getAttentionBadges(red({ replacementText: '' }))[0].label === 'deletion_proposal', '削除案バッジがありません')
assert(getAttentionBadges(red({ tag: 'rewrite', reviewText: '理由', replacementText: '案' })).length === 2, 'tagと本文案の複数バッジがありません')
assert(getAttentionBadges(highlight({ comment: 'コメント' }))[0].label === 'has_comment', '蛍光コメント有バッジがありません')
assert(getAttentionBadges(highlight({ tag: 'question', comment: 'コメント' })).length === 1, '蛍光tagとコメントの表示が重複しています')
assert(getAttentionBadges(highlight({})).length === 0, '空の蛍光にバッジが表示されています')

const commentOnlyHtml = renderToStaticMarkup(createElement(MarkdownViewer, { markdown: '本文', annotations: [red({ reviewText: '挿入してはいけないコメント' })], highlights: [], mode: 'original' }))
assert(commentOnlyHtml.includes('[コメント有]'), '本文上にコメント有バッジがありません')
assert(commentOnlyHtml.includes('role="button"') && commentOnlyHtml.includes('tabindex="0"'), 'バッジのキーボード操作属性がありません')
assert(!commentOnlyHtml.includes('class="ins"'), 'reviewTextが修正文として表示されています')
assert(!commentOnlyHtml.includes('💬'), '旧吹き出しアイコンが残っています')

const proposalHtml = renderToStaticMarkup(createElement(MarkdownViewer, { markdown: '本文', annotations: [red({ replacementText: '新本文' })], highlights: [], mode: 'original' }))
assert(proposalHtml.includes('class="ins"') && proposalHtml.includes('新本文') && proposalHtml.includes('[本文案]'), '本文案の文章とバッジが表示されません')
const deletionHtml = renderToStaticMarkup(createElement(MarkdownViewer, { markdown: '本文', annotations: [red({ replacementText: '' })], highlights: [], mode: 'original' }))
assert(!deletionHtml.includes('class="ins"') && deletionHtml.includes('[削除案]'), '削除案表示が正しくありません')

console.log('Attention display tests: PASS')
