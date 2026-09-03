import type { HighlightAnnotation, RedPenAnnotation } from '../src/types/annotation'
import type { Reviewer, ReviewRound } from '../src/types/review'
import { buildReviewExportData, validateReviewExportData } from '../src/utils/portableReview'
import { renderReviewHtml } from '../src/utils/renderReviewHtml'
import { resolveDraftAnchor } from '../src/utils/reanchor'

const assert = (condition: unknown, message: string) => { if (!condition) throw new Error(message) }
const reviewers: Reviewer[] = [{ id: 'reviewer_001', name: '校正者', status: 'completed' }]
const reviewRound: ReviewRound = { id: 'round_001', number: 1, phase: 'revising', lockedAt: '2026-08-30T00:00:00.000Z' }
const originalAnchor = { targetText: 'world', sourceText: 'world', contextBefore: 'Hello ', contextAfter: '', sourceStart: 6, sourceEnd: 11 }
const correction: RedPenAnnotation = {
  ...originalAnchor,
  id: 'anno_1', type: 'red_pen', reviewText: '簡潔にしてください', replacementText: 'earth', status: 'completed_changed',
  anchorStatus: 'resolved', originalAnchor, draftAnchor: { start: 6, end: 11, text: 'earth', method: 'offset', confidence: 1 },
  resultText: 'earth', reviewer: reviewers[0], createdAt: '2026-08-30T00:00:00.000Z', tag: 'rewrite',
}
const highlightAnchor = { targetText: 'Hello', sourceText: 'Hello', contextBefore: '', contextAfter: ' world', sourceStart: 0, sourceEnd: 5 }
const highlight: HighlightAnnotation = {
  ...highlightAnchor, id: 'highlight_1', type: 'highlight', color: 'yellow', comment: null, reviewer: reviewers[0],
  createdAt: '2026-08-30T00:00:00.000Z', originalAnchor: highlightAnchor,
}

const data = buildReviewExportData({ sourceFileName: 'sample.md', originalMarkdown: 'Hello world', draftMarkdown: 'Hello earth', reviewRound, reviewers, corrections: [correction], highlights: [highlight] })
assert(validateReviewExportData(data).ok, '正常なrevision 1を受理できません')
assert(data.annotations.length === 2, 'annotationsへ統合されていません')
assert(!('corrections' in data) && !('highlights' in data) && !('workflow' in data), '旧フィールドが残っています')

const deleted = structuredClone(data)
const deletedRed = deleted.annotations.find(annotation => annotation.type === 'red_pen')!
deleted.document.draftMarkdown = 'Hello '
deletedRed.resultText = ''
deletedRed.replacementText = ''
deletedRed.draftAnchor = { start: 6, end: 6, text: '', method: 'offset', confidence: 1 }
assert(validateReviewExportData(deleted).ok, '削除結果の長さ0 draftAnchorを受理できません')
const deletedInternal = { ...correction, replacementText: '', status: 'pending' as const, resultText: undefined, draftAnchor: { start: 6, end: 6, text: '', method: 'offset' as const, confidence: 1 } }
assert(resolveDraftAnchor('Hello ', deletedInternal).draftAnchor?.start === 6, '長さ0 draftAnchorを再アンカーで維持できません')

const unresolvedComplete = structuredClone(data)
const unresolvedRed = unresolvedComplete.annotations.find(annotation => annotation.type === 'red_pen')!
unresolvedRed.draftAnchor = null
assert(!validateReviewExportData(unresolvedComplete).ok, '未解決の完了annotationを拒否できません')

const emptyReview = structuredClone(data)
const emptyRed = emptyReview.annotations.find(annotation => annotation.type === 'red_pen')!
delete emptyRed.reviewText
delete emptyRed.replacementText
assert(!validateReviewExportData(emptyReview).ok, '無内容red_penを拒否できません')

const unknownField = structuredClone(data) as unknown as Record<string, unknown>
unknownField.unknown = true
assert(!validateReviewExportData(unknownField).ok, '未知フィールドを拒否できません')
assert(!validateReviewExportData({ ...data, schemaVersion: '1.1' }).ok, 'V1形式を拒否できません')

const html = renderReviewHtml(data)
assert(html.includes('<meta name="metami-proof-format" content="review">'), 'FORMAT MARKERがありません')
const embedded = html.match(/<script type="application\/json" id="metami-proof-review-data">([\s\S]*?)<\/script>/)?.[1]
assert(embedded, 'HTML埋め込みJSONがありません')
const roundTrip = JSON.parse(embedded!)
assert(validateReviewExportData(roundTrip).ok, 'HTML埋め込みJSONの往復検証に失敗しました')
assert(JSON.stringify(roundTrip) === JSON.stringify(data), 'HTML埋め込みJSONが元データと一致しません')

console.log('ReviewExportData 2.0 Nightly revision 1 tests: PASS')
