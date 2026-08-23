import type { HighlightAnnotation, RedPenAnnotation, ReviewTag } from './annotation'
import type { Reviewer, ReviewRound } from './review'

export type ExportCorrection = Omit<RedPenAnnotation, 'reviewer' | 'createdAt' | 'replacementText'> & {
  reviewText: string
  reviewer: { id: string; name: string } | null
  createdAt: string | null
}

export type ExportHighlight = HighlightAnnotation

export type ReviewSemantics = {
  red_pen: string
  highlight: string
  tag: string
}

export type TagSemantics = Record<ReviewTag, string>

export type AiHandlingPolicy = {
  purpose: string
  toolUse: string
  reviewRule: string
}

export type ReviewExportDataV1 = {
  schemaVersion: '1.1'
  generator: {
    name: 'METAMI Proof'
    version: string
  }
  exportedAt: string
  aiHandlingPolicy: AiHandlingPolicy
  reviewSemantics: ReviewSemantics
  tagSemantics: TagSemantics
  document: {
    sourceFileName: string
    originalMarkdown: string
    draftMarkdown: string
  }
  workflow: {
    roundId: string
    roundNumber: number
    phase: ReviewRound['phase']
    lockedAt: string | null
  }
  reviewers: Reviewer[]
  corrections: ExportCorrection[]
  highlights: ExportHighlight[]
}
