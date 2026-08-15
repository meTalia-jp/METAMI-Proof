export type ReviewPhase = 'reviewing' | 'locked' | 'revising' | 'polishing' | 'completed'

export type ReviewRound = {
  id: string
  number: number
  phase: ReviewPhase
  lockedAt: string | null
}

export type ReviewerStatus = 'working' | 'completed'

export type Reviewer = {
  id: string
  name: string
  status: ReviewerStatus
}

export const areAllReviewersCompleted = (reviewers: Reviewer[]) =>
  reviewers.length > 0 && reviewers.every(reviewer => reviewer.status === 'completed')
