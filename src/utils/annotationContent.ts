import type { HighlightAnnotation, HighlightColor, RedPenAnnotation, ReviewTag } from '../types/annotation'

// Only content fields are writable; identity, anchors and workflow metadata stay intact.
export function updateRedPenContent(annotation: RedPenAnnotation, reviewText: string | undefined, replacementText: string | undefined, tag: ReviewTag | null): RedPenAnnotation {
  return { ...annotation, reviewText, replacementText, tag }
}

export function updateHighlightContent(annotation: HighlightAnnotation, comment: string, color: HighlightColor, tag: ReviewTag | null): HighlightAnnotation {
  return { ...annotation, comment: comment || null, color, tag }
}
