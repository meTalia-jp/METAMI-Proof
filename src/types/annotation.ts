export type AnnotationStatus = 'pending' | 'completed_changed' | 'completed_unchanged'
export type AnchorStatus = 'resolved' | 'unresolved'
export type DraftAnchorMethod = 'offset' | 'context' | 'block' | 'fuzzy' | 'manual'

export type TextAnchor = {
  targetText: string
  sourceText: string
  contextBefore: string
  contextAfter: string
  sourceStart: number
  sourceEnd: number
  startLine?: number
  endLine?: number
  nodePath?: string
  paragraphId?: string
  blockText?: string
  blockType?: string
}

export type OriginalAnchor = TextAnchor

export type DraftAnchor = {
  start: number
  end: number
  method: DraftAnchorMethod
  confidence?: number
}

export type RedPenAnnotation = TextAnchor & {
  id: string
  type: 'red_pen'
  replacementText: string
  status: AnnotationStatus
  anchorStatus: AnchorStatus
  originalAnchor: OriginalAnchor
  draftAnchor: DraftAnchor | null
  draftAnchorText?: string
  proposalApplied?: boolean
  completedText?: string
}

export type DocumentSelection = TextAnchor & {
  range: {
    startOffset: number
    endOffset: number
    startContainerType: string
    endContainerType: string
    multipleNodes: boolean
  }
}
