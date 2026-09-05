import type { HighlightAnnotation, RedPenAnnotation, ReviewTag } from '../types/annotation'

export type AttentionBadge = {
  kind: 'intent' | 'comment' | 'proposal' | 'deletion'
  label: ReviewTag | 'has_comment' | 'proposal' | 'deletion_proposal'
}

export function getAttentionBadges(annotation: RedPenAnnotation | HighlightAnnotation): AttentionBadge[] {
  const badges: AttentionBadge[] = []
  if (annotation.tag) badges.push({ kind: 'intent', label: annotation.tag })
  const hasComment = annotation.type === 'red_pen'
    ? Boolean(annotation.reviewText)
    : Boolean(annotation.comment)
  if (!annotation.tag && hasComment) badges.push({ kind: 'comment', label: 'has_comment' })
  if (annotation.type === 'red_pen' && annotation.replacementText !== undefined) {
    badges.push(annotation.replacementText === ''
      ? { kind: 'deletion', label: 'deletion_proposal' }
      : { kind: 'proposal', label: 'proposal' })
  }
  return badges
}
