import type { Reviewer, ReviewRound } from '../types/review'

export type SaveFilePicker = (options: { suggestedName: string; types: { description: string; accept: Record<string, string[]> }[] }) => Promise<{
  createWritable: () => Promise<{ write: (data: Blob) => Promise<void>; close: () => Promise<void> }>
}>
export type DownloadStarter = (blob: Blob, fileName: string) => void

export function canConfirmRoundSave(picker: SaveFilePicker | undefined): picker is SaveFilePicker {
  return typeof picker === 'function'
}

const withoutExtension = (fileName: string) => fileName.replace(/\.(?:md|markdown|html?)$/i, '')

export function reviewRoundArchiveFileName(sourceFileName: string, roundNumber: number) {
  let baseName = withoutExtension(sourceFileName.trim()) || 'pasted_markdown'
  while (/_round\d{3}(?:_review)?$/i.test(baseName)) baseName = baseName.replace(/_round\d{3}(?:_review)?$/i, '')
  return `${baseName}_round${String(roundNumber).padStart(3, '0')}_review.html`
}

export function nextReviewRound(current: ReviewRound): ReviewRound {
  const number = current.number + 1
  return { id: `round_${String(number).padStart(3, '0')}`, number, phase: 'reviewing', lockedAt: null }
}

export function completedReviewRound(current: ReviewRound): ReviewRound {
  return { ...current, phase: 'completed' }
}

export function resetReviewersForNextRound(reviewers: Reviewer[]): Reviewer[] {
  return reviewers.map(reviewer => ({ ...reviewer, status: 'working' }))
}

export function createNextRoundWorkspace(current: ReviewRound, draftMarkdown: string, reviewers: Reviewer[]) {
  return {
    originalMarkdown: draftMarkdown,
    draftMarkdown,
    annotations: [] as never[],
    highlights: [] as never[],
    round: nextReviewRound(current),
    reviewers: resetReviewersForNextRound(reviewers),
  }
}

export function startBlobDownload(blob: Blob, fileName: string) {
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = fileName
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
}

export async function saveRoundReviewHtml(
  picker: SaveFilePicker | undefined,
  blob: Blob,
  fileName: string,
  startDownload: DownloadStarter = startBlobDownload,
): Promise<'saved' | 'cancelled' | 'download-started'> {
  if (!picker) {
    startDownload(blob, fileName)
    return 'download-started'
  }
  try {
    const handle = await picker({ suggestedName: fileName, types: [{ description: 'Review HTML', accept: { 'text/html': ['.html'] } }] })
    const writable = await handle.createWritable()
    await writable.write(blob)
    await writable.close()
    return 'saved'
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'
    throw error
  }
}
