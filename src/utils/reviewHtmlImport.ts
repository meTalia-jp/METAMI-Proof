export const REVIEW_HTML_FORMAT_ERROR = 'このファイルはMETAMI Proofのレビュー形式ではありません。\nMETAMI Proofから出力したレビューHTMLを選択してください。'

type ReviewHtmlExtractionResult =
  | { ok: true; value: unknown }
  | { ok: false; error: string }

export function extractReviewJsonFromHtml(html: string): ReviewHtmlExtractionResult {
  const document = new DOMParser().parseFromString(html, 'text/html')
  const formatMarker = document.head.querySelector('meta[name="metami-proof-format"][content="review"]')
  if (!formatMarker) return { ok: false, error: REVIEW_HTML_FORMAT_ERROR }

  const reviewData = document.getElementById('metami-proof-review-data')
  if (!reviewData || reviewData.tagName !== 'SCRIPT' || reviewData.getAttribute('type') !== 'application/json') {
    return { ok: false, error: 'レビューHTML内にReview JSONが見つかりません。' }
  }

  try {
    return { ok: true, value: JSON.parse(reviewData.textContent ?? '') }
  } catch {
    return { ok: false, error: 'レビューHTML内のReview JSONを解析できません。' }
  }
}
