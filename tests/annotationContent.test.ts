import type { RedPenAnnotation, HighlightAnnotation } from '../src/types/annotation'
import { updateRedPenContent, updateHighlightContent } from '../src/utils/annotationContent'
import { buildReviewExportData, validateReviewExportData } from '../src/utils/portableReview'
import { convertReviewExportDataToAiReview } from '../src/utils/aiReview'
import { renderReviewHtml } from '../src/utils/renderReviewHtml'

const assert = (value: unknown, message: string) => { if (!value) throw new Error(message) }
const anchor = { sourceStart: 0, sourceEnd: 2, sourceText: '本文', targetText: '本文', contextBefore: '', contextAfter: '' }
const reviewer = { id: 'reviewer_001', name: '校正者', status: 'working' as const }
const red: RedPenAnnotation = { ...anchor, id: 'anno_edit', type: 'red_pen', originalAnchor: anchor, draftAnchor: { start: 0, end: 2, text: '本文', method: 'offset' }, status: 'pending', anchorStatus: 'resolved', reviewText: '質問', reviewer, createdAt: '2026-09-04T00:00:00.000Z' }
const highlight: HighlightAnnotation = { ...anchor, id: 'highlight_edit', type: 'highlight', originalAnchor: anchor, color: 'yellow', comment: '旧コメント', reviewer, createdAt: '2026-09-04T00:00:00.000Z' }
const before = JSON.stringify([red, highlight])
for (const replacementText of [undefined, '新文章', '']) {
  const changed = updateRedPenContent(red, '新しい質問', replacementText, 'question')
  assert(changed.id === red.id && changed.originalAnchor === red.originalAnchor && changed.draftAnchor === red.draftAnchor, 'red identity/anchor changed')
  assert(changed.replacementText === replacementText, 'replacement absence/empty lost')
  for (const key of Object.keys(red) as Array<keyof RedPenAnnotation>) {
    if (!['reviewText', 'replacementText', 'tag'].includes(key)) assert(changed[key] === red[key], `red metadata changed: ${key}`)
  }
}
const updatedRed = updateRedPenContent(red, '更新レビュー', '', 'delete')
const updatedHighlight = updateHighlightContent(highlight, '更新コメント', 'green', 'note')
assert(updatedHighlight.id === highlight.id && updatedHighlight.originalAnchor === highlight.originalAnchor, 'highlight identity/anchor changed')
for (const key of Object.keys(highlight) as Array<keyof HighlightAnnotation>) {
  if (!['comment', 'color', 'tag'].includes(key)) assert(updatedHighlight[key] === highlight[key], `highlight metadata changed: ${key}`)
}
assert(JSON.stringify([red, highlight]) === before, 'original objects mutated')
const data = buildReviewExportData({ sourceFileName: 'test.md', originalMarkdown: '本文', draftMarkdown: '本文', reviewRound: { id: 'round_001', number: 1, phase: 'reviewing', lockedAt: null }, reviewers: [reviewer], corrections: [updatedRed], highlights: [updatedHighlight] })
assert(validateReviewExportData(data).ok, 'updated export rejected')
assert(data.annotations.length === 2 && new Set(data.annotations.map(a => a.id)).size === 2, 'duplicate annotations')
const exportedHighlight = data.annotations.find(a => a.type === 'highlight')!
assert(exportedHighlight.comment === '更新コメント' && exportedHighlight.color === 'green' && exportedHighlight.tag === 'note', 'highlight export lost updates')
const html = renderReviewHtml(data)
const embedded = JSON.parse(html.match(/<script type="application\/json" id="metami-proof-review-data">([\s\S]*?)<\/script>/)![1])
assert(JSON.stringify(embedded) === JSON.stringify(data), 'HTML round trip lost updates')
for (const mode of ['consult', 'revise'] as const) {
  const ai = convertReviewExportDataToAiReview(data, mode)
  assert(ai.reviewItems[0].reviewText === '更新レビュー' && ai.reviewItems[0].replacementText === '', 'TYPE-B red update lost')
  assert(ai.reviewItems[1].reviewText === '更新コメント' && ai.reviewItems[1].tag === 'note', 'TYPE-B highlight update lost')
}
console.log('Annotation content editing tests: PASS')
