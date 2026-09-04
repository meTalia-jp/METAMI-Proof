import type { ReviewTag } from './annotation'

export type AiReviewMode = 'consult' | 'revise'

export type AiReviewItem = {
  id: string
  tag?: ReviewTag
  targetText: string
  contextBefore: string
  contextAfter: string
  reviewText?: string
  replacementText?: string
}

export type AiReviewDataV01 = {
  format: 'metami-proof-ai-review'
  version: '0.1'
  task: { mode: AiReviewMode }
  instructions: {
    purpose: string
    sourceContentRule: string
    reviewRule: string
    proposalRule: string
    toolUseRule: string
    uncertaintyRule: string
  }
  tagSemantics: Record<ReviewTag, string>
  originalMarkdown: string
  reviewItems: AiReviewItem[]
}
