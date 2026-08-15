import { ChangeEvent, useEffect, useRef, useState } from 'react'
import { DocumentPane } from './components/DocumentPane'
import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'
import { RedPenDialog } from './components/RedPenDialog'
import { ReviewLockDialog } from './components/ReviewLockDialog'
import { MarkdownStructureDialog } from './components/MarkdownStructureDialog'
import { PolishingConfirmDialog } from './components/PolishingConfirmDialog'
import { MarkdownExportDialog } from './components/MarkdownExportDialog'
import type { DocumentSelection, RedPenAnnotation } from './types/annotation'
import { areAllReviewersCompleted, type Reviewer, type ReviewRound } from './types/review'
import { reanchorPendingAnnotations } from './utils/reanchor'
import { detectMarkdownStructureChanges, type MarkdownStructureChange } from './utils/markdownStructure'

type MobilePane = 'original' | 'draft'
type PolishingView = 'draftFocus' | 'split'
type StructureAfterAction = 'stay' | 'preview' | 'export' | 'apply-proposal'

const initialRound = (): ReviewRound => ({ id: 'round_001', number: 1, phase: 'reviewing', lockedAt: null })
const initialReviewers = (): Reviewer[] => [{ id: 'reviewer_001', name: '校正者', status: 'working' }]

function App() {
  const [originalMarkdown, setOriginalMarkdown] = useState('')
  const [draftMarkdown, setDraftMarkdown] = useState('')
  const [fileName, setFileName] = useState('')
  const [swapped, setSwapped] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobilePane, setMobilePane] = useState<MobilePane>('original')
  const [annotations, setAnnotations] = useState<RedPenAnnotation[]>([])
  const [documentSelection, setDocumentSelection] = useState<DocumentSelection | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null)
  const [draftEditing, setDraftEditing] = useState(false)
  const [reviewRound, setReviewRound] = useState<ReviewRound>(initialRound)
  const [reviewers, setReviewers] = useState<Reviewer[]>(initialReviewers)
  const [lockDialogOpen, setLockDialogOpen] = useState(false)
  const [editingDraftMarkdown, setEditingDraftMarkdown] = useState('')
  const [structureChanges, setStructureChanges] = useState<MarkdownStructureChange[]>([])
  const [structureDialogOpen, setStructureDialogOpen] = useState(false)
  const [polishingView, setPolishingView] = useState<PolishingView>('draftFocus')
  const [polishingDialogOpen, setPolishingDialogOpen] = useState(false)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')
  const [structureAfterAction, setStructureAfterAction] = useState<StructureAfterAction>('stay')
  const [pendingProposalId, setPendingProposalId] = useState<string | null>(null)
  const [editSelection, setEditSelection] = useState<{ start: number; end: number; requestId: number } | null>(null)
  const [editingAnnotationId, setEditingAnnotationId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const reanchorTimerRef = useRef<number | null>(null)
  const polishingTimerRef = useRef<number | null>(null)
  const lastWarnedEditingRef = useRef('')
  const allReviewersCompleted = areAllReviewersCompleted(reviewers)
  const currentReviewer = reviewers[0]
  const canAddAnnotations = reviewRound.phase === 'reviewing' && currentReviewer?.status === 'working'

  const clearDocumentSelection = () => {
    setDocumentSelection(null)
    setDialogOpen(false)
    setNotice('')
    window.getSelection()?.removeAllRanges()
  }

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && documentSelection) clearDocumentSelection()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [documentSelection])

  const loadMarkdown = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const markdown = await file.text()
    setOriginalMarkdown(markdown)
    setDraftMarkdown(markdown)
    setFileName(file.name)
    setAnnotations([])
    setDocumentSelection(null)
    setDialogOpen(false)
    setNotice('')
    setActiveAnnotationId(null)
    setDraftEditing(false)
    setReviewRound(initialRound())
    setReviewers(initialReviewers())
    setLockDialogOpen(false)
    setEditingDraftMarkdown(markdown)
    setStructureChanges([])
    setStructureDialogOpen(false)
    setPolishingView('draftFocus')
    setPolishingDialogOpen(false)
    setExportDialogOpen(false)
    setExporting(false)
    setExportError('')
    setStructureAfterAction('stay')
    setPendingProposalId(null)
    setEditSelection(null)
    setEditingAnnotationId(null)
    lastWarnedEditingRef.current = ''
    event.target.value = ''
  }

  const captureDocumentSelection = () => {
    if (!canAddAnnotations) {
      setNotice('校正はロックされています。修正フェーズでは赤ペン指示を追加できません。')
      return
    }
    const browserSelection = window.getSelection()
    if (!browserSelection || browserSelection.isCollapsed || !browserSelection.rangeCount) return
    const range = browserSelection.getRangeAt(0)
    const originalPane = document.querySelector('.document-pane.original .markdown-body')
    if (!originalPane?.contains(range.commonAncestorContainer)) return

    const targetText = browserSelection.toString()
    if (!targetText.trim()) return
    const containerType = (node: Node) => node.nodeType === Node.TEXT_NODE ? '#text' : node.nodeName.toLowerCase()
    const startParent = range.startContainer.nodeType === Node.TEXT_NODE ? range.startContainer.parentElement : range.startContainer as HTMLElement
    const endParent = range.endContainer.nodeType === Node.TEXT_NODE ? range.endContainer.parentElement : range.endContainer as HTMLElement
    const startBlock = startParent?.closest<HTMLElement>('[data-source-block="true"]')
    const endBlock = endParent?.closest<HTMLElement>('[data-source-block="true"]')
    const debugInfo: Record<string, unknown> = {
      selectedText: targetText,
      startContainerType: containerType(range.startContainer),
      endContainerType: containerType(range.endContainer),
      startBlockId: startBlock?.dataset.paragraphId,
      endBlockId: endBlock?.dataset.paragraphId,
      multipleNodes: range.startContainer !== range.endContainer,
    }
    const rejectSelection = (reason: string) => {
      setDocumentSelection(null)
      setNotice(reason)
      debugInfo.rejectionReason = reason
      if (import.meta.env.DEV) console.debug('[RpenProof selection]', debugInfo)
    }

    if (range.startContainer.nodeType !== Node.TEXT_NODE || range.endContainer.nodeType !== Node.TEXT_NODE) {
      rejectSelection('現在この範囲の校正には対応していません。テキスト部分を選択してください。')
      return
    }
    if (!startBlock || !endBlock || startBlock.dataset.paragraphId !== endBlock.dataset.paragraphId) {
      rejectSelection('複数の段落・見出し・リスト項目をまたぐ校正には現在対応していません。')
      return
    }
    if (startBlock.closest('pre') || endBlock.closest('pre')) {
      rejectSelection('コードブロックを含む校正には現在対応していません。')
      return
    }

    const resolveBoundary = (container: Node, offset: number, edge: 'start' | 'end', block: HTMLElement) => {
      const parent = container.parentElement
      const sourceElement = parent?.closest<HTMLElement>('[data-source-start][data-source-end]')
      if (!sourceElement || !block.contains(sourceElement)) return null
      const elementStart = Number(sourceElement.dataset.sourceStart)
      const elementEnd = Number(sourceElement.dataset.sourceEnd)
      if (!Number.isSafeInteger(elementStart) || !Number.isSafeInteger(elementEnd)) return null
      const textLength = container.textContent?.length ?? 0
      if (offset < 0 || offset > textLength) return null
      let sourceOffset = elementStart + offset

      if ((edge === 'start' && offset === 0) || (edge === 'end' && offset === textLength)) {
        let inline = parent?.closest<HTMLElement>('[data-inline-source-start][data-inline-source-end]')
        while (inline && block.contains(inline)) {
          const inlineStart = Number(inline.dataset.inlineSourceStart)
          const inlineEnd = Number(inline.dataset.inlineSourceEnd)
          if (edge === 'start' && Number.isSafeInteger(inlineStart)) sourceOffset = Math.min(sourceOffset, inlineStart)
          if (edge === 'end' && Number.isSafeInteger(inlineEnd)) sourceOffset = Math.max(sourceOffset, inlineEnd)
          inline = inline.parentElement?.closest<HTMLElement>('[data-inline-source-start][data-inline-source-end]') ?? null
        }
      }
      return sourceOffset
    }

    const sourceStart = resolveBoundary(range.startContainer, range.startOffset, 'start', startBlock)
    const sourceEnd = resolveBoundary(range.endContainer, range.endOffset, 'end', endBlock)
    debugInfo.sourceStart = sourceStart
    debugInfo.sourceEnd = sourceEnd
    const blockStart = Number(startBlock.dataset.sourceStart)
    const blockEnd = Number(startBlock.dataset.sourceEnd)
    if (sourceStart === null || sourceEnd === null || !Number.isSafeInteger(blockStart) || !Number.isSafeInteger(blockEnd) || sourceStart < blockStart || sourceEnd > blockEnd || sourceStart >= sourceEnd) {
      rejectSelection('原文位置を安全に取得できませんでした。別の範囲を選択してください。')
      return
    }

    const rangeText = range.cloneContents().textContent ?? ''
    if (rangeText !== targetText) {
      rejectSelection('表示上の選択範囲を安全に確認できませんでした。別の範囲を選択してください。')
      return
    }
    const sourceText = originalMarkdown.slice(sourceStart, sourceEnd)
    if (!sourceText || sourceText.trim().length === 0) {
      rejectSelection('原文上の対応範囲を安全に確認できませんでした。')
      return
    }
    if (annotations.some(annotation => sourceStart < annotation.sourceEnd && sourceEnd > annotation.sourceStart)) {
      rejectSelection('既存の赤ペン指示と重なる範囲は選択できません。')
      return
    }

    const contextLength = 60
    const lineAt = (offset: number) => originalMarkdown.slice(0, offset).split('\n').length
    setDocumentSelection({
      targetText,
      sourceText,
      contextBefore: originalMarkdown.slice(Math.max(0, sourceStart - contextLength), sourceStart),
      contextAfter: originalMarkdown.slice(sourceEnd, Math.min(originalMarkdown.length, sourceEnd + contextLength)),
      sourceStart,
      sourceEnd,
      startLine: lineAt(sourceStart),
      endLine: lineAt(Math.max(sourceStart, sourceEnd - 1)),
      nodePath: startBlock.tagName.toLowerCase(),
      paragraphId: startBlock.dataset.paragraphId,
      blockText: originalMarkdown.slice(blockStart, blockEnd),
      blockType: startBlock.dataset.paragraphId?.split('_')[0] ?? startBlock.tagName.toLowerCase(),
      range: {
        startOffset: range.startOffset,
        endOffset: range.endOffset,
        startContainerType: containerType(range.startContainer),
        endContainerType: containerType(range.endContainer),
        multipleNodes: range.startContainer !== range.endContainer,
      },
    })
    debugInfo.rejectionReason = null
    if (import.meta.env.DEV) console.debug('[RpenProof selection]', debugInfo)
    setNotice('校正対象を保持しました。ヘッダーの「赤ペン」を押してください。Escで選択を解除できます。')
    browserSelection.removeAllRanges()
  }

  const addAnnotation = (replacementText: string) => {
    if (!documentSelection || !canAddAnnotations) return
    const originalAnchor = {
      targetText: documentSelection.targetText,
      sourceText: documentSelection.sourceText,
      contextBefore: documentSelection.contextBefore,
      contextAfter: documentSelection.contextAfter,
      sourceStart: documentSelection.sourceStart,
      sourceEnd: documentSelection.sourceEnd,
      startLine: documentSelection.startLine,
      endLine: documentSelection.endLine,
      nodePath: documentSelection.nodePath,
      paragraphId: documentSelection.paragraphId,
      blockText: documentSelection.blockText,
      blockType: documentSelection.blockType,
    }
    const annotation: RedPenAnnotation = {
      id: `anno_${String(annotations.length + 1).padStart(4, '0')}`,
      type: 'red_pen',
      targetText: documentSelection.targetText,
      sourceText: documentSelection.sourceText,
      replacementText,
      contextBefore: documentSelection.contextBefore,
      contextAfter: documentSelection.contextAfter,
      sourceStart: documentSelection.sourceStart,
      sourceEnd: documentSelection.sourceEnd,
      startLine: documentSelection.startLine,
      endLine: documentSelection.endLine,
      nodePath: documentSelection.nodePath,
      paragraphId: documentSelection.paragraphId,
      blockText: documentSelection.blockText,
      blockType: documentSelection.blockType,
      status: 'pending',
      anchorStatus: 'resolved',
      originalAnchor,
      draftAnchor: { start: documentSelection.sourceStart, end: documentSelection.sourceEnd, method: 'offset', confidence: 1 },
    }
    setAnnotations(current => [...current, annotation])
    setActiveAnnotationId(annotation.id)
    setDialogOpen(false)
    setDocumentSelection(null)
    setNotice(`赤ペン修正「${annotation.targetText} → ${annotation.replacementText}」を登録しました。`)
  }

  const beginDraftEditing = () => {
    if (reviewRound.phase !== 'revising' && reviewRound.phase !== 'polishing') return
    setEditingDraftMarkdown(draftMarkdown)
    setStructureChanges([])
    setStructureAfterAction('stay')
    lastWarnedEditingRef.current = ''
    setEditingAnnotationId(null)
    setEditSelection(null)
    setDraftEditing(true)
  }

  const cancelDraftEditing = () => {
    setEditingDraftMarkdown(draftMarkdown)
    setStructureChanges([])
    setStructureDialogOpen(false)
    setEditingAnnotationId(null)
    setEditSelection(null)
    setDraftEditing(false)
  }

  const commitDraftEditing = () => {
    if (editingAnnotationId && editingDraftMarkdown !== draftMarkdown) {
      setAnnotations(current => current.map(annotation => {
        if (annotation.id !== editingAnnotationId || annotation.anchorStatus !== 'resolved' || !annotation.draftAnchor) return annotation
        const before = draftMarkdown
        const after = editingDraftMarkdown
        let prefix = 0
        while (prefix < before.length && prefix < after.length && before[prefix] === after[prefix]) prefix += 1
        let suffix = 0
        while (suffix < before.length - prefix && suffix < after.length - prefix && before[before.length - 1 - suffix] === after[after.length - 1 - suffix]) suffix += 1
        const oldChangeEnd = before.length - suffix
        if (oldChangeEnd < annotation.draftAnchor.start || prefix > annotation.draftAnchor.end) return annotation
        const start = Math.min(annotation.draftAnchor.start, prefix)
        const end = Math.max(start, annotation.draftAnchor.end + (after.length - before.length))
        return {
          ...annotation,
          draftAnchorText: after.slice(start, end),
          draftAnchor: { start, end, method: 'offset', confidence: 1 },
        }
      }))
    }
    setDraftMarkdown(editingDraftMarkdown)
    setStructureDialogOpen(false)
    setStructureChanges([])
    lastWarnedEditingRef.current = ''
    setEditingAnnotationId(null)
    setEditSelection(null)
    if (structureAfterAction === 'apply-proposal' && pendingProposalId) {
      setAnnotations(current => current.map(annotation => {
        if (annotation.id !== pendingProposalId || !annotation.draftAnchor) return annotation
        const start = annotation.draftAnchor.start
        return {
          ...annotation,
          proposalApplied: true,
          draftAnchorText: annotation.replacementText,
          anchorStatus: 'resolved',
          draftAnchor: { start, end: start + annotation.replacementText.length, method: 'offset', confidence: 1 },
        }
      }))
      setPendingProposalId(null)
      setNotice('修正案を本文へ適用しました。内容を確認・加筆してから「修正完了」を押してください。')
      setStructureAfterAction('stay')
    } else if (reviewRound.phase === 'polishing') {
      if (structureAfterAction === 'preview') setDraftEditing(false)
      if (structureAfterAction === 'export') setExportDialogOpen(true)
      setStructureAfterAction('stay')
    } else setDraftEditing(false)
  }

  const returnToStructureEditing = () => {
    setEditingDraftMarkdown(draftMarkdown)
    setStructureChanges([])
    setStructureDialogOpen(false)
    setStructureAfterAction('stay')
    setPendingProposalId(null)
    setEditingAnnotationId(null)
    setEditSelection(null)
    lastWarnedEditingRef.current = ''
  }

  const requestDraftCommit = () => {
    const changes = detectMarkdownStructureChanges(draftMarkdown, editingDraftMarkdown)
    if (!changes.length) {
      commitDraftEditing()
      return
    }
    setStructureChanges(changes)
    setStructureAfterAction('preview')
    setStructureDialogOpen(true)
  }

  const updatePolishingDraft = (markdown: string) => {
    setEditingDraftMarkdown(markdown)
  }

  const requestPolishingPreview = () => {
    if (reviewRound.phase !== 'polishing') return
    const changes = detectMarkdownStructureChanges(draftMarkdown, editingDraftMarkdown)
    if (changes.length) {
      lastWarnedEditingRef.current = editingDraftMarkdown
      setStructureChanges(changes)
      setStructureAfterAction('preview')
      setStructureDialogOpen(true)
      return
    }
    setDraftMarkdown(editingDraftMarkdown)
    setDraftEditing(false)
  }

  useEffect(() => {
    if (reviewRound.phase !== 'polishing' || !draftEditing || structureDialogOpen) return
    if (editingDraftMarkdown === draftMarkdown || editingDraftMarkdown === lastWarnedEditingRef.current) return
    if (polishingTimerRef.current !== null) window.clearTimeout(polishingTimerRef.current)
    polishingTimerRef.current = window.setTimeout(() => {
      const changes = detectMarkdownStructureChanges(draftMarkdown, editingDraftMarkdown)
      if (!changes.length) setDraftMarkdown(editingDraftMarkdown)
      else {
        lastWarnedEditingRef.current = editingDraftMarkdown
        setStructureChanges(changes)
        setStructureAfterAction('stay')
        setStructureDialogOpen(true)
      }
      polishingTimerRef.current = null
    }, 400)
    return () => {
      if (polishingTimerRef.current !== null) window.clearTimeout(polishingTimerRef.current)
    }
  }, [draftEditing, draftMarkdown, editingDraftMarkdown, reviewRound.phase, structureDialogOpen])

  useEffect(() => {
    if (reviewRound.phase !== 'revising') return
    if (reanchorTimerRef.current !== null) window.clearTimeout(reanchorTimerRef.current)
    reanchorTimerRef.current = window.setTimeout(() => {
      setAnnotations(current => reanchorPendingAnnotations(draftMarkdown, current))
      reanchorTimerRef.current = null
    }, 300)
    return () => {
      if (reanchorTimerRef.current !== null) window.clearTimeout(reanchorTimerRef.current)
    }
  }, [draftMarkdown, reviewRound.phase])

  const pulseAnnotation = (annotationId: string, location: 'draft' | 'original') => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      const element = document.querySelector<HTMLElement>(`.document-pane.${location} [data-annotation-id="${annotationId}"]`)
      if (!element) return
      element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
      element.classList.remove('jump-highlight')
      void element.offsetWidth
      element.classList.add('jump-highlight')
      window.setTimeout(() => element.classList.remove('jump-highlight'), 1500)
    }))
  }

  const selectAnnotation = (annotationId: string) => {
    const annotation = annotations.find(item => item.id === annotationId)
    if (!annotation) return
    setActiveAnnotationId(annotationId)
    if (annotation.anchorStatus === 'resolved' && !draftEditing) {
      pulseAnnotation(annotationId, 'draft')
    } else {
      pulseAnnotation(annotationId, 'original')
    }
  }

  const completeAnnotation = (annotationId: string, changed: boolean) => {
    if (reviewRound.phase !== 'revising') return
    setAnnotations(current => current.map(annotation => annotation.id === annotationId ? {
      ...annotation,
      status: changed ? 'completed_changed' : 'completed_unchanged',
      completedText: annotation.draftAnchor && annotation.anchorStatus === 'resolved'
        ? draftMarkdown.slice(annotation.draftAnchor.start, annotation.draftAnchor.end)
        : annotation.completedText,
    } : annotation))
    setNotice(changed ? '校正指示を「修正完了」にしました。' : '校正指示を「変更せず完了」にしました。')
  }

  const applyAnnotationProposal = (annotationId: string) => {
    if (reviewRound.phase !== 'revising') return
    const annotation = annotations.find(item => item.id === annotationId)
    if (!annotation || annotation.status !== 'pending' || annotation.proposalApplied) return
    if (annotation.anchorStatus !== 'resolved' || !annotation.draftAnchor) {
      setNotice('修正文書内の対応位置を特定できないため、修正案を自動適用できません。')
      return
    }
    const { start, end } = annotation.draftAnchor
    const nextMarkdown = `${draftMarkdown.slice(0, start)}${annotation.replacementText}${draftMarkdown.slice(end)}`
    const changes = detectMarkdownStructureChanges(draftMarkdown, nextMarkdown)
    setEditingDraftMarkdown(nextMarkdown)
    setPendingProposalId(annotationId)
    setActiveAnnotationId(annotationId)
    setDraftEditing(true)
    setEditingAnnotationId(annotationId)
    setEditSelection({ start, end: start + annotation.replacementText.length, requestId: Date.now() })
    if (changes.length) {
      setStructureChanges(changes)
      setStructureAfterAction('apply-proposal')
      setStructureDialogOpen(true)
      return
    }
    setDraftMarkdown(nextMarkdown)
    setAnnotations(current => current.map(item => item.id === annotationId ? {
      ...item,
      proposalApplied: true,
      draftAnchorText: item.replacementText,
      anchorStatus: 'resolved',
      draftAnchor: { start, end: start + item.replacementText.length, method: 'offset', confidence: 1 },
    } : item))
    setPendingProposalId(null)
    setNotice('修正案を本文へ適用しました。内容を確認・加筆してから「修正完了」を押してください。')
  }

  const editAnnotation = (annotationId: string) => {
    if (reviewRound.phase !== 'revising') return
    const annotation = annotations.find(item => item.id === annotationId)
    if (!annotation) return
    setActiveAnnotationId(annotationId)
    setEditingDraftMarkdown(draftMarkdown)
    setDraftEditing(true)
    setEditingAnnotationId(annotationId)
    const anchor = annotation.draftAnchor
    if (annotation.anchorStatus === 'resolved' && anchor) {
      setEditSelection({ start: anchor.start, end: anchor.end, requestId: Date.now() })
      setNotice('対象箇所を選択しました。本文を修正・加筆し、「変更を反映」を押してください。')
    } else {
      setEditSelection({ start: 0, end: 0, requestId: Date.now() })
      setNotice('対応位置を特定できません。原本と修正案を確認し、修正文書を手動で編集してください。')
    }
  }

  const reopenAnnotation = (annotationId: string) => {
    if (reviewRound.phase !== 'revising') return
    setAnnotations(current => current.map(annotation => annotation.id === annotationId ? {
      ...annotation,
      status: 'pending',
      proposalApplied: false,
    } : annotation))
    setActiveAnnotationId(annotationId)
    setNotice('完了済みの校正指示を再修正として開きました。現在の本文は変更していません。')
  }

  const pendingAnnotations = annotations.filter(annotation => annotation.status === 'pending')

  const completeCurrentReview = () => {
    if (reviewRound.phase !== 'reviewing') return
    const nextReviewers = reviewers.map((reviewer, index) => index === 0 ? { ...reviewer, status: 'completed' as const } : reviewer)
    setReviewers(nextReviewers)
    setDocumentSelection(null)
    setDialogOpen(false)
    if (areAllReviewersCompleted(nextReviewers)) setLockDialogOpen(true)
  }

  const confirmReviewLock = () => {
    if (!allReviewersCompleted || reviewRound.phase !== 'reviewing') return
    setLockDialogOpen(false)
    setReviewRound(current => ({ ...current, phase: 'locked', lockedAt: new Date().toISOString() }))
    window.setTimeout(() => setReviewRound(current => current.phase === 'locked' ? { ...current, phase: 'revising' } : current), 0)
    setNotice('校正内容をロックし、修正フェーズへ移行しました。')
  }

  const enterPolishing = () => {
    if (reviewRound.phase !== 'revising' || pendingAnnotations.length > 0) return
    setPolishingDialogOpen(false)
    setReviewRound(current => ({ ...current, phase: 'polishing' }))
    setPolishingView('draftFocus')
    setSidebarOpen(false)
    setActiveAnnotationId(null)
    setEditingDraftMarkdown(draftMarkdown)
    setDraftEditing(true)
    setNotice('校正指示の処理が完了しました。Markdown本文を自由に全体編集できます。')
  }

  const completedFileName = (() => {
    const baseName = fileName.replace(/\.md$/i, '') || 'akapen-proof'
    const roundNumber = String(reviewRound.number).padStart(3, '0')
    return `${baseName}_round${roundNumber}.md`
  })()

  const requestPolishingCompletion = () => {
    if (reviewRound.phase !== 'polishing') return
    const changes = detectMarkdownStructureChanges(draftMarkdown, editingDraftMarkdown)
    if (draftEditing && changes.length) {
      lastWarnedEditingRef.current = editingDraftMarkdown
      setStructureChanges(changes)
      setStructureAfterAction('export')
      setStructureDialogOpen(true)
      return
    }
    if (draftEditing && editingDraftMarkdown !== draftMarkdown) setDraftMarkdown(editingDraftMarkdown)
    setExportError('')
    setExportDialogOpen(true)
  }

  const exportCompletedMarkdown = () => {
    if (reviewRound.phase !== 'polishing' || exporting) return
    setExporting(true)
    setExportError('')
    let objectUrl = ''
    try {
      const blob = new Blob([draftMarkdown], { type: 'text/markdown;charset=utf-8' })
      objectUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = objectUrl
      anchor.download = completedFileName
      anchor.style.display = 'none'
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      setExportDialogOpen(false)
      setReviewRound(current => ({ ...current, phase: 'completed' }))
      setDraftEditing(false)
      setPolishingView('draftFocus')
      setSidebarOpen(false)
      setNotice('完成版Markdownを出力し、このラウンドを完了しました。')
    } catch {
      setExportError('Markdownの出力を開始できませんでした。全体編集の内容は保持されています。もう一度お試しください。')
    } finally {
      if (objectUrl) window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
      setExporting(false)
    }
  }
  const movePending = (direction: -1 | 1) => {
    if (!pendingAnnotations.length) return
    const currentIndex = pendingAnnotations.findIndex(annotation => annotation.id === activeAnnotationId)
    const nextIndex = currentIndex < 0
      ? (direction === 1 ? 0 : pendingAnnotations.length - 1)
      : (currentIndex + direction + pendingAnnotations.length) % pendingAnnotations.length
    selectAnnotation(pendingAnnotations[nextIndex].id)
  }

  const isPolishing = reviewRound.phase === 'polishing'
  const hideDraftAnnotations = isPolishing || reviewRound.phase === 'completed'
  const panes = {
    original: <DocumentPane kind="original" markdown={originalMarkdown} fileName={fileName} annotations={annotations} documentSelection={documentSelection} activeAnnotationId={activeAnnotationId} onOriginalSelection={canAddAnnotations ? captureDocumentSelection : undefined} onAnnotationClick={selectAnnotation} />,
    draft: <DocumentPane kind="draft" markdown={draftMarkdown} fileName={fileName} annotations={hideDraftAnnotations ? [] : annotations} activeAnnotationId={activeAnnotationId} draftEditing={draftEditing} draftCanEdit={reviewRound.phase === 'revising' || reviewRound.phase === 'polishing'} editingMarkdown={editingDraftMarkdown} directEditing={isPolishing} editSelection={editSelection} onAnnotationClick={selectAnnotation} onDraftEditingChange={setDraftEditing} onBeginDraftEditing={beginDraftEditing} onEditingDraftChange={isPolishing ? updatePolishingDraft : setEditingDraftMarkdown} onCancelDraftEditing={cancelDraftEditing} onApplyDraftEditing={requestDraftCommit} onRequestPreview={requestPolishingPreview} />,
  }
  const paneOrder: MobilePane[] = swapped ? ['draft', 'original'] : ['original', 'draft']
  const visiblePanes = isPolishing && polishingView === 'draftFocus' ? ['draft' as const] : paneOrder
  const showSidebar = sidebarOpen && (!isPolishing || polishingView === 'split')

  return (
    <div className="app-shell">
      <input ref={fileInputRef} className="visually-hidden" type="file" accept=".md,text/markdown,text/plain" onChange={loadMarkdown} />
      <Header onOpenFile={() => fileInputRef.current?.click()} onSwap={() => setSwapped(value => !value)} onToggleSidebar={() => {
        if (isPolishing && polishingView === 'draftFocus') {
          setPolishingView('split')
          setSidebarOpen(true)
        } else setSidebarOpen(value => !value)
      }} onRedPen={() => canAddAnnotations && documentSelection && setDialogOpen(true)} sidebarOpen={showSidebar} canUseRedPen={canAddAnnotations && Boolean(documentSelection)} annotationCount={annotations.length} pendingCount={pendingAnnotations.length} onPreviousPending={() => movePending(-1)} onNextPending={() => movePending(1)} phase={reviewRound.phase} reviewerCompletedCount={reviewers.filter(reviewer => reviewer.status === 'completed').length} reviewerCount={reviewers.length} onCompleteReview={completeCurrentReview} canStartPolishing={reviewRound.phase === 'revising' && pendingAnnotations.length === 0} onStartPolishing={() => setPolishingDialogOpen(true)} canCompletePolishing={!structureDialogOpen} onCompletePolishing={requestPolishingCompletion} />
      {notice && <div className={`selection-notice ${documentSelection ? 'ready' : ''}`} role="status"><span>{notice}</span><button className="notice-close" type="button" onClick={clearDocumentSelection} aria-label="選択または通知を閉じる">×</button></div>}
      {(!isPolishing || polishingView === 'split') && <div className="mobile-tabs" role="tablist" aria-label="表示する文書">
        <button type="button" role="tab" aria-selected={mobilePane === 'original'} onClick={() => setMobilePane('original')}>原本</button>
        <button type="button" role="tab" aria-selected={mobilePane === 'draft'} onClick={() => setMobilePane('draft')}>修正文書</button>
      </div>}
      <main className={`workspace ${showSidebar ? '' : 'sidebar-closed'} ${isPolishing ? `polishing ${polishingView}` : ''}`}>
        <div className={`document-grid ${isPolishing && polishingView === 'draftFocus' ? 'draft-focus-grid' : ''}`}>
          {visiblePanes.map(kind => <div className={`pane-slot mobile-${kind} ${mobilePane === kind || (isPolishing && polishingView === 'draftFocus') ? 'mobile-active' : ''}`} key={kind}>{panes[kind]}</div>)}
        </div>
        {showSidebar && <Sidebar annotations={annotations} activeAnnotationId={activeAnnotationId} onClose={() => setSidebarOpen(false)} onSelectAnnotation={selectAnnotation} onComplete={completeAnnotation} onApplyProposal={applyAnnotationProposal} onEdit={editAnnotation} onReopen={reopenAnnotation} phase={reviewRound.phase} />}
      </main>
      {isPolishing && <div className="polishing-view-switch">
        {polishingView === 'draftFocus'
          ? <button type="button" onClick={() => { setPolishingView('split'); setSidebarOpen(true) }}>▸ 校正済み原稿・修正履歴を表示</button>
          : <button type="button" onClick={() => { setPolishingView('draftFocus'); setSidebarOpen(false) }}>修正文書メイン表示へ戻る</button>}
      </div>}
      {dialogOpen && documentSelection && <RedPenDialog selection={documentSelection} onCancel={clearDocumentSelection} onSubmit={addAnnotation} />}
      {lockDialogOpen && <ReviewLockDialog onCancel={() => setLockDialogOpen(false)} onConfirm={confirmReviewLock} />}
      {structureDialogOpen && <MarkdownStructureDialog changes={structureChanges} onBack={returnToStructureEditing} onApply={commitDraftEditing} applyLabel={isPolishing ? 'このまま変更' : 'このまま反映'} />}
      {polishingDialogOpen && <PolishingConfirmDialog onCancel={() => setPolishingDialogOpen(false)} onConfirm={enterPolishing} />}
      {exportDialogOpen && <MarkdownExportDialog fileName={completedFileName} exporting={exporting} error={exportError} onBack={() => { setExportDialogOpen(false); setExportError('') }} onExport={exportCompletedMarkdown} />}
    </div>
  )
}

export default App
