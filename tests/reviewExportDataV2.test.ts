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
const monochromeHtml = renderReviewHtml(data, 'monochrome')
const englishHtml = renderReviewHtml(data, 'paper', 'en')
assert(html.includes('<body class="review-theme-paper">'), 'PaperテーマがReview HTMLへ反映されません')
assert(monochromeHtml.includes('<body class="review-theme-monochrome">'), 'MonochromeテーマがReview HTMLへ反映されません')
assert(monochromeHtml.includes('body.review-theme-monochrome{'), 'Monochrome用HTMLスタイルがありません')
assert(englishHtml.includes('<html lang="en">'), 'English Review HTMLのlang属性がありません')
assert(englishHtml.includes('Highlight・Yellow'), '蛍光色が英語表示されません')
assert(englishHtml.includes('[Rewrite]') && !englishHtml.includes('[修正]'), 'tagが英語表示されません')
assert(englishHtml.includes('aria-label="Original text and review results"'), '本文aria-labelが英語化されません')
assert(englishHtml.includes('aria-label="Highlight comment"'), 'コメントaria-labelが英語化されません')
assert(englishHtml.includes('content:attr(data-label)') && !englishHtml.includes('content:"挿"'), '挿入ラベルがdata-label化されていません')
assert(html.includes('<meta name="metami-proof-format" content="review">'), 'FORMAT MARKERがありません')
assert(html.includes('[修正]') && html.includes('[本文案]'), 'Review HTMLにtag／本文案バッジがありません')
assert(html.includes('<b>コメント：</b>簡潔にしてください'), 'Review HTMLでreviewTextがコメント表示されません')
assert(!html.includes('highlight-comment-marker') && !html.includes('💬'), 'Review HTMLに旧吹き出しが残っています')
const embedded = html.match(/<script type="application\/json" id="metami-proof-review-data">([\s\S]*?)<\/script>/)?.[1]
assert(embedded, 'HTML埋め込みJSONがありません')
const roundTrip = JSON.parse(embedded!)
assert(validateReviewExportData(roundTrip).ok, 'HTML埋め込みJSONの往復検証に失敗しました')
assert(JSON.stringify(roundTrip) === JSON.stringify(data), 'HTML埋め込みJSONが元データと一致しません')
const monochromeEmbedded = monochromeHtml.match(/<script type="application\/json" id="metami-proof-review-data">([\s\S]*?)<\/script>/)?.[1]
assert(monochromeEmbedded && monochromeEmbedded === embedded, 'テーマによってHTML埋め込みReview JSONが変化しています')
const englishEmbedded = englishHtml.match(/<script type="application\/json" id="metami-proof-review-data">([\s\S]*?)<\/script>/)?.[1]
assert(englishEmbedded === embedded, '言語によってHTML埋め込みReview JSONが変化しています')

const englishDeletedHtml = renderReviewHtml(deleted, 'paper', 'en')
assert(englishDeletedHtml.includes('<b>Deletion proposal: </b>Delete target text'), '削除案がEnglish Review HTMLで正しく表示されません')
assert(!englishDeletedHtml.includes('Delete案'), '削除案が部分置換されています')

const emptyAnnotations = structuredClone(data)
emptyAnnotations.annotations = []
const englishEmptyHtml = renderReviewHtml(emptyAnnotations, 'paper', 'en')
assert(englishEmptyHtml.includes('No red pen reviews.'), '赤ペン空一覧の英語表示が不正です')
assert(englishEmptyHtml.includes('No highlight reviews.'), '蛍光空一覧の英語表示が不正です')
const japaneseEmptyHtml = renderReviewHtml(emptyAnnotations, 'paper', 'ja')
assert(japaneseEmptyHtml.includes('赤ペン校正はありません。') && japaneseEmptyHtml.includes('蛍光校正はありません。'), '日本語の空一覧表示が変わっています')

const collidingUserText = structuredClone(data)
collidingUserText.document.originalMarkdown = '修正'
collidingUserText.document.draftMarkdown = '修正'
collidingUserText.reviewers[0].name = '修正'
collidingUserText.annotations = [structuredClone(collidingUserText.annotations.find(annotation => annotation.type === 'red_pen')!)]
const collidingCorrection = collidingUserText.annotations[0]
if (collidingCorrection.type !== 'red_pen') throw new Error('赤ペンfixtureを作成できません')
collidingCorrection.originalAnchor = { targetText: '修正', sourceText: '修正', contextBefore: '', contextAfter: '', sourceStart: 0, sourceEnd: 2 }
collidingCorrection.draftAnchor = { start: 0, end: 2, text: '修正', method: 'offset', confidence: 1 }
collidingCorrection.reviewText = '削除案を検討'
delete collidingCorrection.replacementText
collidingCorrection.resultText = '修正'
const collisionHtml = renderReviewHtml(collidingUserText, 'paper', 'en')
const collisionDisplay = collisionHtml.slice(0, collisionHtml.indexOf('<script type="application/json" id="metami-proof-review-data">'))
assert(collisionDisplay.includes('>修正<'), '原文の「修正」が英訳されています')
assert(collisionDisplay.includes('<b>Comment: </b>削除案を検討'), 'comment内の「削除案」が英訳されています')
assert(collisionDisplay.includes('<b>Reviewer: </b>修正'), 'reviewer名の「修正」が英訳されています')
assert(collisionDisplay.includes('[Rewrite]'), '固定tag rewriteがEnglish HTMLでRewriteになりません')

console.log('ReviewExportData 2.0 Nightly revision 1 tests: PASS')
