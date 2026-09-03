import type { AnnotationStatus, DraftAnchorMethod, HighlightColor, ReviewTag } from './annotation'
import type { ReviewerStatus, ReviewPhase } from './review'

export type ReviewSemantics = { red_pen: string; highlight: string; tag: string }
export type TagSemantics = Record<ReviewTag, string>
export type AiHandlingPolicy = { purpose: string; toolUse: string; reviewRule: string }

export type ExportOriginalAnchor = {
  sourceStart: number
  sourceEnd: number
  sourceText: string
  targetText: string
  contextBefore: string
  contextAfter: string
  block?: { id?: string; type?: string; text?: string }
}

export type ExportDraftAnchor = { start: number; end: number; text: string; method: DraftAnchorMethod; confidence?: number }

export type ExportAnnotationBase = {
  id: string
  reviewerId: string
  createdAt: string
  originalAnchor: ExportOriginalAnchor
  tag?: ReviewTag
}

export type ExportRedPenAnnotation = ExportAnnotationBase & {
  type: 'red_pen'
  reviewText?: string
  replacementText?: string
  status: AnnotationStatus
  resultText?: string
  draftAnchor: ExportDraftAnchor | null
}

export type ExportHighlightAnnotation = ExportAnnotationBase & {
  type: 'highlight'
  color: HighlightColor
  comment?: string
}

export type ExportAnnotation = ExportRedPenAnnotation | ExportHighlightAnnotation

export type ReviewExportDataV2 = {
  schemaVersion: '2.0'
  schemaStatus: 'nightly'
  schemaRevision: 1
  generator: { name: string; version: string }
  exportedAt: string
  aiHandlingPolicy: AiHandlingPolicy
  reviewSemantics: ReviewSemantics
  tagSemantics: TagSemantics
  document: { sourceFileName?: string; originalMarkdown: string; draftMarkdown: string }
  round: { id: string; number: number; phase: ReviewPhase; lockedAt?: string }
  reviewers: Array<{ id: string; name: string; status: ReviewerStatus }>
  annotations: ExportAnnotation[]
  extensions?: Record<string, unknown>
}
