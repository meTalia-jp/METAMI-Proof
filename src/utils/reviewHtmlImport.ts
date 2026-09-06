import { translate } from '../i18n'

type ReviewHtmlExtractionResult =
  | { ok: true; value: unknown }
  | { ok: false; error: string }

export const getReviewHtmlFormatError = () => translate('reviewHtml.formatError')

export function extractReviewJsonFromHtml(html: string): ReviewHtmlExtractionResult {
  const document = new DOMParser().parseFromString(html, 'text/html')
  const formatMarker = document.head.querySelector('meta[name="metami-proof-format"][content="review"]')
  if (!formatMarker) return { ok: false, error: getReviewHtmlFormatError() }

  const reviewData = document.getElementById('metami-proof-review-data')
  if (!reviewData || reviewData.tagName !== 'SCRIPT' || reviewData.getAttribute('type') !== 'application/json') {
    return { ok: false, error: translate('reviewHtml.jsonMissing') }
  }

  try {
    return { ok: true, value: JSON.parse(reviewData.textContent ?? '') }
  } catch {
    return { ok: false, error: translate('reviewHtml.jsonInvalid') }
  }
}
