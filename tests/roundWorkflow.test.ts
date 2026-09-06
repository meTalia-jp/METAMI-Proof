import type { Reviewer, ReviewRound } from '../src/types/review'
import { canConfirmRoundSave, completedReviewRound, createNextRoundWorkspace, nextReviewRound, resetReviewersForNextRound, reviewRoundArchiveFileName, saveRoundReviewHtml } from '../src/utils/roundWorkflow'

const assert = (condition: unknown, message: string) => { if (!condition) throw new Error(message) }

assert(reviewRoundArchiveFileName('article.md', 1) === 'article_round001_review.html', 'Round 1保存名が不正です')
assert(reviewRoundArchiveFileName('article_round001_review.html', 2) === 'article_round002_review.html', 'Round名が累積しています')
assert(reviewRoundArchiveFileName('pasted_markdown.md', 3) === 'pasted_markdown_round003_review.html', '貼り付け文書の保存名が不正です')
const round3: ReviewRound = { id: 'round_003', number: 3, phase: 'completed', lockedAt: '2026-09-06T00:00:00.000Z' }
const polishingRound: ReviewRound = { ...round3, phase: 'polishing' }
assert(completedReviewRound(polishingRound).phase === 'completed' && polishingRound.phase === 'polishing', '保存用Roundをcompletedとして非破壊生成できません')
assert(JSON.stringify(nextReviewRound(round3)) === JSON.stringify({ id: 'round_004', number: 4, phase: 'reviewing', lockedAt: null }), 'Round 3からRound 4を生成できません')
const reviewers: Reviewer[] = [{ id: 'reviewer_001', name: 'Reviewer', status: 'completed' }]
const reset = resetReviewersForNextRound(reviewers)
assert(reset[0].id === reviewers[0].id && reset[0].name === reviewers[0].name && reset[0].status === 'working', '校正者を維持してworkingへ戻せません')
assert(reviewers[0].status === 'completed', '元の校正者stateを破壊しています')
const workspace = createNextRoundWorkspace(round3, '# Final', reviewers)
assert(workspace.originalMarkdown === '# Final' && workspace.draftMarkdown === '# Final', '前Roundのdraftを次Roundの原文・修正文へ設定できません')
assert(workspace.annotations.length === 0 && workspace.highlights.length === 0, 'annotationが次Roundへ引き継がれています')
assert(workspace.round.number === 4 && workspace.round.phase === 'reviewing', '次Roundの工程が不正です')
let sequentialRound: ReviewRound = { id: 'round_001', number: 1, phase: 'completed', lockedAt: '2026-09-06T00:00:00.000Z' }
for (const expected of [2, 3, 4]) {
  const sequentialWorkspace = createNextRoundWorkspace(sequentialRound, `# Round ${expected}`, reviewers)
  assert(sequentialWorkspace.round.number === expected && sequentialWorkspace.round.id === `round_${String(expected).padStart(3, '0')}`, `Round ${expected}への連続遷移が不正です`)
  assert(sequentialWorkspace.annotations.length === 0 && sequentialWorkspace.highlights.length === 0, `Round ${expected}へ過去annotationが混入しています`)
  sequentialRound = { ...sequentialWorkspace.round, phase: 'completed' }
}
assert(canConfirmRoundSave(undefined) === false, '保存確認APIがない環境のfeature detectionが不正です')
assert(canConfirmRoundSave(async () => { throw new Error('not called') }) === true, '保存確認APIがある環境のfeature detectionが不正です')

let written = false
const saved = await saveRoundReviewHtml(async options => ({ createWritable: async () => ({ write: async blob => { written = blob.size > 0 && options.suggestedName === 'article_round003_review.html' }, close: async () => undefined }) }), new Blob(['review']), 'article_round003_review.html')
assert(saved === 'saved' && written, 'Review HTMLの書込み完了を判定できません')
const aborted = new DOMException('cancelled', 'AbortError')
const cancelled = await saveRoundReviewHtml(async () => { throw aborted }, new Blob(['review']), 'article_round003_review.html')
assert(cancelled === 'cancelled', '保存キャンセルを判定できません')
let downloadedName = ''
const downloaded = await saveRoundReviewHtml(undefined, new Blob(['review']), 'article_round003_review.html', (_blob, name) => { downloadedName = name })
assert(downloaded === 'download-started' && downloadedName === 'article_round003_review.html', '非対応環境で通常ダウンロードを開始できません')
let writeFailed = false
try { await saveRoundReviewHtml(async () => ({ createWritable: async () => ({ write: async () => { throw new Error('write failed') }, close: async () => undefined }) }), new Blob(['review']), 'article_round003_review.html') } catch { writeFailed = true }
assert(writeFailed, 'write失敗が成功扱いになっています')
let closeFailed = false
try { await saveRoundReviewHtml(async () => ({ createWritable: async () => ({ write: async () => undefined, close: async () => { throw new Error('close failed') } }) }), new Blob(['review']), 'article_round003_review.html') } catch { closeFailed = true }
assert(closeFailed, 'close失敗が成功扱いになっています')
let downloadFailed = false
try { await saveRoundReviewHtml(undefined, new Blob(['review']), 'article_round003_review.html', () => { throw new Error('download failed') }) } catch { downloadFailed = true }
assert(downloadFailed, 'fallback download失敗が成功扱いになっています')

console.log('Round workflow tests: PASS')
