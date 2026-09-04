import { ChangeEvent, useEffect, useRef, useState } from 'react'
import { DocumentPane } from './components/DocumentPane'
import { Header, type ActiveTool, type PaneLayout } from './components/Header'
import { Sidebar } from './components/Sidebar'
import { RedPenDialog } from './components/RedPenDialog'
import { HighlightDialog } from './components/HighlightDialog'
import { ReviewLockDialog } from './components/ReviewLockDialog'
import { MarkdownStructureDialog } from './components/MarkdownStructureDialog'
import { PolishingConfirmDialog } from './components/PolishingConfirmDialog'
import { MarkdownExportDialog } from './components/MarkdownExportDialog'
import { AnnotationDeleteDialog } from './components/AnnotationDeleteDialog'
import { PasteMarkdownDialog } from './components/PasteMarkdownDialog'
import { SettingsDialog } from './components/SettingsDialog'
import { AiReviewExportDialog } from './components/AiReviewExportDialog'
import type { AiReviewMode } from './types/aiReview'
import type { DocumentSelection, HighlightAnnotation, HighlightColor, RedPenAnnotation, ReviewTag } from './types/annotation'
import type { ExportOriginalAnchor } from './types/portableReview'
import { areAllReviewersCompleted, type Reviewer, type ReviewRound } from './types/review'
import { reanchorPendingAnnotations } from './utils/reanchor'
import { detectMarkdownStructureChanges, type MarkdownStructureChange } from './utils/markdownStructure'
import { buildReviewExportData, createAnnotationId, validateReviewExportData } from './utils/portableReview'
import { renderReviewHtml } from './utils/renderReviewHtml'
import { extractReviewJsonFromHtml, REVIEW_HTML_FORMAT_ERROR } from './utils/reviewHtmlImport'
import { readDeveloperModeSetting, writeDeveloperModeSetting } from './config/settings'
import { convertReviewExportDataToAiReview } from './utils/aiReview'

type MobilePane = 'original' | 'draft'
type StructureAfterAction = 'stay' | 'preview' | 'export' | 'apply-proposal'

const initialRound = (): ReviewRound => ({ id: 'round_001', number: 1, phase: 'reviewing', lockedAt: null })
const initialReviewers = (): Reviewer[] => [{ id: 'reviewer_001', name: '校正者', status: 'working' }]
const toInternalOriginalAnchor = (anchor: ExportOriginalAnchor) => ({
  targetText: anchor.targetText,
  sourceText: anchor.sourceText,
  contextBefore: anchor.contextBefore,
  contextAfter: anchor.contextAfter,
  sourceStart: anchor.sourceStart,
  sourceEnd: anchor.sourceEnd,
  paragraphId: anchor.block?.id,
  blockType: anchor.block?.type,
  blockText: anchor.block?.text,
})

const updateResolvedDraftAnchors = (before: string, after: string, items: RedPenAnnotation[]): RedPenAnnotation[] => {
  if (before === after) return items
  let prefix = 0
  while (prefix < before.length && prefix < after.length && before[prefix] === after[prefix]) prefix += 1
  let suffix = 0
  while (suffix < before.length - prefix && suffix < after.length - prefix && before[before.length - 1 - suffix] === after[after.length - 1 - suffix]) suffix += 1
  const oldChangeEnd = before.length - suffix
  const delta = after.length - before.length
  return items.map(annotation => {
    const anchor = annotation.draftAnchor
    if (!anchor) return annotation
    let start = anchor.start
    let end = anchor.end
    if (oldChangeEnd <= start) { start += delta; end += delta }
    else if (prefix < end) { start = Math.min(start, prefix); end = Math.max(start, end + delta) }
    return { ...annotation, anchorStatus: 'resolved' as const, draftAnchor: { start, end, text: after.slice(start, end), method: 'offset', confidence: 1 } }
  })
}

function App() {
  const [originalMarkdown, setOriginalMarkdown] = useState('')
  const [draftMarkdown, setDraftMarkdown] = useState('')
  const [fileName, setFileName] = useState('')
  const [swapped, setSwapped] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobilePane, setMobilePane] = useState<MobilePane>('original')
  const [paneLayout, setPaneLayout] = useState<PaneLayout>('reviewOnly')
  const [activeTool, setActiveTool] = useState<ActiveTool>('redPen')
  const [annotations, setAnnotations] = useState<RedPenAnnotation[]>([])
  const [highlightAnnotations, setHighlightAnnotations] = useState<HighlightAnnotation[]>([])
  const [documentSelection, setDocumentSelection] = useState<DocumentSelection | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [highlightDialogOpen, setHighlightDialogOpen] = useState(false)
  const [redPenReviewDraft, setRedPenReviewDraft] = useState('')
  const [redPenDraft, setRedPenDraft] = useState('')
  const [redPenReplacementEnabled, setRedPenReplacementEnabled] = useState(true)
  const [redPenTagDraft, setRedPenTagDraft] = useState<ReviewTag | null>(null)
  const [highlightCommentDraft, setHighlightCommentDraft] = useState('')
  const [highlightTagDraft, setHighlightTagDraft] = useState<ReviewTag | null>(null)
  const [highlightColor, setHighlightColor] = useState<HighlightColor>('yellow')
  const [notice, setNotice] = useState('')
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null)
  const [draftEditing, setDraftEditing] = useState(false)
  const [reviewRound, setReviewRound] = useState<ReviewRound>(initialRound)
  const [reviewers, setReviewers] = useState<Reviewer[]>(initialReviewers)
  const [lockDialogOpen, setLockDialogOpen] = useState(false)
  const [editingDraftMarkdown, setEditingDraftMarkdown] = useState('')
  const [structureChanges, setStructureChanges] = useState<MarkdownStructureChange[]>([])
  const [structureDialogOpen, setStructureDialogOpen] = useState(false)
  const [polishingDialogOpen, setPolishingDialogOpen] = useState(false)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')
  const [structureAfterAction, setStructureAfterAction] = useState<StructureAfterAction>('stay')
  const [pendingProposalId, setPendingProposalId] = useState<string | null>(null)
  const [editSelection, setEditSelection] = useState<{ start: number; end: number; requestId: number } | null>(null)
  const [editingAnnotationId, setEditingAnnotationId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ kind: 'red_pen' | 'highlight'; id: string } | null>(null)
  const [pasteDialogOpen, setPasteDialogOpen] = useState(false)
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false)
  const [developerMode, setDeveloperMode] = useState(readDeveloperModeSetting)
  const [aiReviewExportDialogOpen, setAiReviewExportDialogOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const workDataInputRef = useRef<HTMLInputElement>(null)
  const reanchorTimerRef = useRef<number | null>(null)
  const polishingTimerRef = useRef<number | null>(null)
  const lastWarnedEditingRef = useRef('')
  const allReviewersCompleted = areAllReviewersCompleted(reviewers)
  const currentReviewer = reviewers[0]
  const canAddAnnotations = reviewRound.phase === 'reviewing' && currentReviewer?.status === 'working'

  const changeDeveloperMode = (enabled: boolean) => {
    setDeveloperMode(enabled)
    writeDeveloperModeSetting(enabled)
  }

  const exportAiReview = (mode: AiReviewMode) => {
    if (!developerMode || !originalMarkdown) return
    let objectUrl = ''
    const rawBaseName = fileName.replace(/\.md$/i, '') || 'metami-proof'
    const safeBaseName = rawBaseName.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').replace(/[. ]+$/g, '') || 'metami-proof'
    const aiReviewFileName = `${safeBaseName}_ai_review.json`
    try {
      const reviewData = buildReviewExportData({
        sourceFileName: fileName,
        originalMarkdown,
        draftMarkdown,
        reviewRound,
        reviewers,
        corrections: annotations,
        highlights: highlightAnnotations,
      })
      const data = convertReviewExportDataToAiReview(reviewData, mode)
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' })
      objectUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = objectUrl
      anchor.download = aiReviewFileName
      anchor.style.display = 'none'
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      setAiReviewExportDialogOpen(false)
      setNotice(`AI向けデータ「${aiReviewFileName}」の保存を開始しました。`)
    } catch {
      setNotice('AI向けデータの保存を開始できませんでした。現在の作業内容は保持されています。')
    } finally {
      if (objectUrl) window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
    }
  }

  const clearDocumentSelection = () => {
    setDocumentSelection(null)
    setDialogOpen(false)
    setHighlightDialogOpen(false)
    setRedPenReviewDraft('')
    setRedPenDraft('')
    setRedPenReplacementEnabled(true)
    setRedPenTagDraft(null)
    setHighlightCommentDraft('')
    setHighlightTagDraft(null)
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

  const startReview = (markdown: string, sourceFileName: string) => {
    setOriginalMarkdown(markdown)
    setDraftMarkdown(markdown)
    setFileName(sourceFileName)
    setAnnotations([])
    setHighlightAnnotations([])
    setDocumentSelection(null)
    setDialogOpen(false)
    setHighlightDialogOpen(false)
    setRedPenReviewDraft('')
    setRedPenDraft('')
    setRedPenReplacementEnabled(true)
    setRedPenTagDraft(null)
    setHighlightCommentDraft('')
    setHighlightTagDraft(null)
    setHighlightColor('yellow')
    setNotice('')
    setActiveAnnotationId(null)
    setDraftEditing(false)
    setReviewRound(initialRound())
    setPaneLayout('reviewOnly')
    setActiveTool('redPen')
    setMobilePane('original')
    setReviewers(initialReviewers())
    setLockDialogOpen(false)
    setEditingDraftMarkdown(markdown)
    setStructureChanges([])
    setStructureDialogOpen(false)
    setPolishingDialogOpen(false)
    setExportDialogOpen(false)
    setExporting(false)
    setExportError('')
    setStructureAfterAction('stay')
    setPendingProposalId(null)
    setEditSelection(null)
    setEditingAnnotationId(null)
    setDeleteTarget(null)
    setPasteDialogOpen(false)
    lastWarnedEditingRef.current = ''
  }

  const loadMarkdown = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    startReview(await file.text(), file.name)
    event.target.value = ''
  }

  const loadWorkData = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const fileText = await file.text()
      let parsed: unknown
      if (/\.html?$/i.test(file.name) || file.type === 'text/html') {
        const extracted = extractReviewJsonFromHtml(fileText)
        if (!extracted.ok) {
          setNotice(extracted.error)
          return
        }
        parsed = extracted.value
      } else {
        parsed = JSON.parse(fileText)
      }
      const validated = validateReviewExportData(parsed)
      if (!validated.ok) {
        setNotice(`作業データを読み込めませんでした。${validated.error}`)
        return
      }

      const data = validated.data
      const phase = data.round.phase === 'locked' ? 'revising' : data.round.phase
      const restoredRound: ReviewRound = {
        id: data.round.id,
        number: data.round.number,
        phase,
        lockedAt: data.round.lockedAt ?? null,
      }
      setOriginalMarkdown(data.document.originalMarkdown)
      setDraftMarkdown(data.document.draftMarkdown)
      setFileName(data.document.sourceFileName ?? 'imported_markdown.md')
      const reviewerById = new Map(data.reviewers.map(reviewer => [reviewer.id, reviewer]))
      setAnnotations(data.annotations.filter(annotation => annotation.type === 'red_pen').map(annotation => {
        const originalAnchor = toInternalOriginalAnchor(annotation.originalAnchor)
        return ({
        ...originalAnchor,
        id: annotation.id,
        type: 'red_pen' as const,
        reviewText: annotation.reviewText,
        replacementText: annotation.replacementText,
        status: annotation.status,
        anchorStatus: annotation.draftAnchor ? 'resolved' as const : 'unresolved' as const,
        originalAnchor,
        draftAnchor: annotation.draftAnchor,
        proposalApplied: false,
        resultText: annotation.resultText,
        reviewer: reviewerById.get(annotation.reviewerId),
        createdAt: annotation.createdAt,
        tag: annotation.tag,
      })}))
      setHighlightAnnotations(data.annotations.filter(annotation => annotation.type === 'highlight').map(annotation => {
        const originalAnchor = toInternalOriginalAnchor(annotation.originalAnchor)
        return ({
        ...originalAnchor,
        id: annotation.id,
        type: 'highlight' as const,
        color: annotation.color,
        comment: annotation.comment ?? null,
        reviewer: reviewerById.get(annotation.reviewerId)!,
        createdAt: annotation.createdAt,
        originalAnchor,
        tag: annotation.tag,
      })}))
      setReviewers(data.reviewers)
      setReviewRound(restoredRound)
      setEditingDraftMarkdown(data.document.draftMarkdown)
      setPaneLayout(phase === 'reviewing' ? 'reviewOnly' : phase === 'revising' ? 'sideBySide' : 'revisionOnly')
      setSidebarOpen(phase === 'reviewing' || phase === 'revising')
      setDraftEditing(phase === 'polishing')
      setActiveTool('redPen')
      setSwapped(false)
      setMobilePane(phase === 'reviewing' ? 'original' : 'draft')
      setActiveAnnotationId(null)
      setDocumentSelection(null)
      setDialogOpen(false)
      setHighlightDialogOpen(false)
      setRedPenReviewDraft('')
      setRedPenDraft('')
      setRedPenReplacementEnabled(true)
      setRedPenTagDraft(null)
      setHighlightCommentDraft('')
      setHighlightTagDraft(null)
      setHighlightColor('yellow')
      setLockDialogOpen(false)
      setStructureChanges([])
      setStructureDialogOpen(false)
      setPolishingDialogOpen(false)
      setExportDialogOpen(false)
      setExporting(false)
      setExportError('')
      setStructureAfterAction('stay')
      setPendingProposalId(null)
      setEditSelection(null)
      setEditingAnnotationId(null)
      setDeleteTarget(null)
      lastWarnedEditingRef.current = ''
      setNotice(`作業データを読み込みました。（Round ${data.round.number}・${phase}）`)
    } catch {
      setNotice('作業データを読み込めませんでした。JSONの内容を確認してください。')
    } finally {
      event.target.value = ''
    }
  }

  const portableFileName = (() => {
    const baseName = fileName.replace(/\.md$/i, '') || 'metami-proof'
    const roundNumber = String(reviewRound.number).padStart(3, '0')
    return `${baseName}_round${roundNumber}_metami-proof.json`
  })()

  const exportWorkData = () => {
    if (!originalMarkdown) return
    if (draftEditing && editingDraftMarkdown !== draftMarkdown) {
      setNotice('未反映のMarkdown編集があります。本文へ反映またはキャンセルしてから作業データを保存してください。')
      return
    }
    let objectUrl = ''
    try {
      const data = buildReviewExportData({
        sourceFileName: fileName,
        originalMarkdown,
        draftMarkdown,
        reviewRound,
        reviewers,
        corrections: annotations,
        highlights: highlightAnnotations,
      })
      const validated = validateReviewExportData(data)
      if (!validated.ok) throw new Error(validated.error)
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' })
      objectUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = objectUrl
      anchor.download = portableFileName
      anchor.style.display = 'none'
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      setNotice(`作業データ「${portableFileName}」の保存を開始しました。`)
    } catch {
      setNotice('作業データの保存を開始できませんでした。現在の作業内容は保持されています。')
    } finally {
      if (objectUrl) window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
    }
  }

  const reviewHtmlFileName = (() => {
    const baseName = fileName.replace(/\.md$/i, '') || 'metami-proof'
    const roundNumber = String(reviewRound.number).padStart(3, '0')
    return `${baseName}_round${roundNumber}_review.html`
  })()

  const exportReviewHtml = () => {
    if (!originalMarkdown) return
    if (draftEditing && editingDraftMarkdown !== draftMarkdown) {
      setNotice('未反映のMarkdown編集があります。本文へ反映またはキャンセルしてから校正結果HTMLを出力してください。')
      return
    }
    let objectUrl = ''
    try {
      const data = buildReviewExportData({
        sourceFileName: fileName,
        originalMarkdown,
        draftMarkdown,
        reviewRound,
        reviewers,
        corrections: annotations,
        highlights: highlightAnnotations,
      })
      const validated = validateReviewExportData(data)
      if (!validated.ok) throw new Error(validated.error)
      const blob = new Blob([renderReviewHtml(data)], { type: 'text/html;charset=utf-8' })
      objectUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = objectUrl
      anchor.download = reviewHtmlFileName
      anchor.style.display = 'none'
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      setNotice(`校正結果HTML「${reviewHtmlFileName}」の保存を開始しました。`)
    } catch {
      setNotice('校正結果HTMLの保存を開始できませんでした。現在の作業内容は保持されています。')
    } finally {
      if (objectUrl) window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
    }
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
      if (import.meta.env.DEV) console.debug('[METAMI Proof selection]', debugInfo)
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
    if (activeTool === 'redPen' && annotations.some(annotation => sourceStart < annotation.sourceEnd && sourceEnd > annotation.sourceStart)) {
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
    setRedPenReviewDraft('')
    setRedPenDraft(targetText)
    setRedPenReplacementEnabled(true)
    setRedPenTagDraft(null)
    setHighlightCommentDraft('')
    setHighlightTagDraft(null)
    debugInfo.rejectionReason = null
    if (import.meta.env.DEV) console.debug('[METAMI Proof selection]', debugInfo)
    if (activeTool === 'redPen') {
      setNotice('赤ペンの校正対象を選択しました。修正案を入力してください。')
      setDialogOpen(true)
    } else if (activeTool === 'highlighter') {
      setNotice('蛍光範囲を選択しました。必要に応じてコメントを入力してください。')
      setHighlightDialogOpen(true)
    } else {
      setNotice('青ペンを選択中です。青ペンannotationは今後のStepで追加予定です。')
    }
    browserSelection.removeAllRanges()
  }

  const addAnnotation = (reviewText: string | undefined, replacementText: string | undefined, tag: ReviewTag | null) => {
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
      id: createAnnotationId('anno'),
      type: 'red_pen',
      targetText: documentSelection.targetText,
      sourceText: documentSelection.sourceText,
      reviewText,
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
      draftAnchor: { start: documentSelection.sourceStart, end: documentSelection.sourceEnd, text: documentSelection.sourceText, method: 'offset', confidence: 1 },
      reviewer: { id: currentReviewer.id, name: currentReviewer.name },
      createdAt: new Date().toISOString(),
      tag,
    }
    setAnnotations(current => [...current, annotation])
    setActiveAnnotationId(annotation.id)
    setDialogOpen(false)
    setDocumentSelection(null)
    setNotice(replacementText !== undefined ? `赤ペン修正「${annotation.targetText}」と置換案を登録しました。` : `赤ペンレビュー「${annotation.targetText}」を登録しました。`)
  }

  const addHighlightAnnotation = (comment: string, tag: ReviewTag | null, color: HighlightColor) => {
    if (!documentSelection || !canAddAnnotations || activeTool !== 'highlighter') return
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
    const highlight: HighlightAnnotation = {
      ...originalAnchor,
      id: createAnnotationId('highlight'),
      type: 'highlight',
      color,
      comment: comment || null,
      reviewer: { id: currentReviewer.id, name: currentReviewer.name },
      createdAt: new Date().toISOString(),
      originalAnchor,
      tag,
    }
    setHighlightAnnotations(current => [...current, highlight])
    setActiveAnnotationId(highlight.id)
    setHighlightDialogOpen(false)
    setDocumentSelection(null)
    const colorLabel = color === 'green' ? '緑' : '黄色'
    setNotice(comment ? `${colorLabel}蛍光とコメントを登録しました。` : `${colorLabel}蛍光を登録しました。`)
    window.getSelection()?.removeAllRanges()
  }

  const switchSelectionTool = (nextTool: 'redPen' | 'highlighter') => {
    if (!canAddAnnotations) return
    const redPenHasInput = dialogOpen && (redPenReviewDraft.trim() !== '' || redPenDraft !== documentSelection?.targetText || !redPenReplacementEnabled || redPenTagDraft !== null)
    const highlightHasInput = highlightDialogOpen && (highlightCommentDraft.trim() !== '' || highlightTagDraft !== null)
    if ((redPenHasInput || highlightHasInput) && !window.confirm('入力済みの内容は引き継がれません。ペンを持ち替えますか？')) return

    setActiveTool(nextTool)
    setDialogOpen(nextTool === 'redPen' && Boolean(documentSelection))
    setHighlightDialogOpen(nextTool === 'highlighter' && Boolean(documentSelection))
    setRedPenReviewDraft('')
    setRedPenDraft(documentSelection?.targetText ?? '')
    setRedPenReplacementEnabled(true)
    setRedPenTagDraft(null)
    setHighlightCommentDraft('')
    setHighlightTagDraft(null)
    if (documentSelection) setNotice(nextTool === 'redPen' ? '選択範囲を保持したまま赤ペンへ切り替えました。' : '選択範囲を保持したまま蛍光ペンへ切り替えました。')
  }

  const changeActiveTool = (tool: ActiveTool) => {
    if (tool === activeTool) return
    if ((tool === 'redPen' || tool === 'highlighter') && documentSelection && (dialogOpen || highlightDialogOpen)) {
      switchSelectionTool(tool)
      return
    }
    setActiveTool(tool)
  }

  const requestAnnotationDelete = (annotationId: string) => {
    if (reviewRound.phase !== 'reviewing') return
    if (annotations.some(annotation => annotation.id === annotationId)) {
      setDeleteTarget({ kind: 'red_pen', id: annotationId })
    } else if (highlightAnnotations.some(annotation => annotation.id === annotationId)) {
      setDeleteTarget({ kind: 'highlight', id: annotationId })
    }
    setDocumentSelection(null)
    setDialogOpen(false)
    setHighlightDialogOpen(false)
    window.getSelection()?.removeAllRanges()
  }

  const confirmAnnotationDelete = () => {
    if (!deleteTarget || reviewRound.phase !== 'reviewing') return
    if (deleteTarget.kind === 'red_pen') {
      setAnnotations(current => current.filter(annotation => annotation.id !== deleteTarget.id))
    } else {
      setHighlightAnnotations(current => current.filter(annotation => annotation.id !== deleteTarget.id))
    }
    if (activeAnnotationId === deleteTarget.id) setActiveAnnotationId(null)
    setNotice('')
    setDeleteTarget(null)
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
    if (editingDraftMarkdown !== draftMarkdown) setAnnotations(current => updateResolvedDraftAnchors(draftMarkdown, editingDraftMarkdown, current))
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
          anchorStatus: 'resolved',
          draftAnchor: { start, end: start + (annotation.replacementText?.length ?? 0), text: annotation.replacementText ?? '', method: 'offset', confidence: 1 },
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
    setAnnotations(current => updateResolvedDraftAnchors(draftMarkdown, editingDraftMarkdown, current))
    setDraftMarkdown(editingDraftMarkdown)
    setDraftEditing(false)
  }

  useEffect(() => {
    if (reviewRound.phase !== 'polishing' || !draftEditing || structureDialogOpen) return
    if (editingDraftMarkdown === draftMarkdown || editingDraftMarkdown === lastWarnedEditingRef.current) return
    if (polishingTimerRef.current !== null) window.clearTimeout(polishingTimerRef.current)
    polishingTimerRef.current = window.setTimeout(() => {
      const changes = detectMarkdownStructureChanges(draftMarkdown, editingDraftMarkdown)
      if (!changes.length) {
        setAnnotations(current => updateResolvedDraftAnchors(draftMarkdown, editingDraftMarkdown, current))
        setDraftMarkdown(editingDraftMarkdown)
      }
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
    const highlight = highlightAnnotations.find(item => item.id === annotationId)
    if (!annotation && !highlight) return
    setActiveAnnotationId(annotationId)
    if (highlight) {
      pulseAnnotation(annotationId, 'original')
      return
    }
    if (!annotation) return
    if (annotation.draftAnchor && !draftEditing) {
      pulseAnnotation(annotationId, 'draft')
    } else {
      pulseAnnotation(annotationId, 'original')
    }
  }

  const completeAnnotation = (annotationId: string, changed: boolean) => {
    if (reviewRound.phase !== 'revising') return
    const target = annotations.find(annotation => annotation.id === annotationId)
    if (!target?.draftAnchor) {
      setNotice('修正文書内の対応位置が未解決のため、この校正指示は完了できません。')
      return
    }
    setAnnotations(current => current.map(annotation => annotation.id === annotationId ? {
      ...annotation,
      status: changed ? 'completed_changed' : 'completed_unchanged',
      resultText: draftMarkdown.slice(annotation.draftAnchor!.start, annotation.draftAnchor!.end),
    } : annotation))
    setNotice(changed ? '校正指示を「修正完了」にしました。' : '校正指示を「変更せず完了」にしました。')
  }

  const applyAnnotationProposal = (annotationId: string) => {
    if (reviewRound.phase !== 'revising') return
    const annotation = annotations.find(item => item.id === annotationId)
    if (!annotation || annotation.status !== 'pending' || annotation.proposalApplied || annotation.replacementText === undefined) return
    if (!annotation.draftAnchor) {
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
    setAnnotations(current => updateResolvedDraftAnchors(draftMarkdown, nextMarkdown, current).map(item => item.id === annotationId ? {
      ...item,
      proposalApplied: true,
      anchorStatus: 'resolved',
      draftAnchor: { start, end: start + (item.replacementText?.length ?? 0), text: item.replacementText ?? '', method: 'offset', confidence: 1 },
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
    if (anchor) {
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
      resultText: undefined,
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
    setPaneLayout('sideBySide')
    setActiveTool('redPen')
    window.setTimeout(() => setReviewRound(current => current.phase === 'locked' ? { ...current, phase: 'revising' } : current), 0)
    setNotice('校正内容をロックし、修正フェーズへ移行しました。')
  }

  const enterPolishing = () => {
    if (reviewRound.phase !== 'revising' || pendingAnnotations.length > 0) return
    setPolishingDialogOpen(false)
    setReviewRound(current => ({ ...current, phase: 'polishing' }))
    setPaneLayout('revisionOnly')
    setSidebarOpen(false)
    setActiveAnnotationId(null)
    setEditingDraftMarkdown(draftMarkdown)
    setDraftEditing(true)
    setNotice('校正指示の処理が完了しました。Markdown本文を自由に全体編集できます。')
  }

  const completedFileName = (() => {
    const baseName = fileName.replace(/\.md$/i, '') || 'metami-proof'
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
      setPaneLayout('revisionOnly')
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
  const eraserActive = activeTool === 'eraser' && reviewRound.phase === 'reviewing'
  const hideDraftAnnotations = isPolishing || reviewRound.phase === 'completed'
  const panes = {
    original: <DocumentPane kind="original" markdown={originalMarkdown} fileName={fileName} annotations={annotations} highlights={highlightAnnotations} documentSelection={documentSelection} activeAnnotationId={activeAnnotationId} onOriginalSelection={canAddAnnotations ? captureDocumentSelection : undefined} onAnnotationClick={selectAnnotation} eraserActive={eraserActive} onAnnotationDeleteRequest={requestAnnotationDelete} />,
    draft: <DocumentPane kind="draft" markdown={draftMarkdown} fileName={fileName} annotations={hideDraftAnnotations ? [] : annotations} highlights={[]} activeAnnotationId={activeAnnotationId} draftEditing={draftEditing} draftCanEdit={reviewRound.phase === 'revising' || reviewRound.phase === 'polishing'} editingMarkdown={editingDraftMarkdown} directEditing={isPolishing} editSelection={editSelection} onAnnotationClick={selectAnnotation} onDraftEditingChange={setDraftEditing} onBeginDraftEditing={beginDraftEditing} onEditingDraftChange={isPolishing ? updatePolishingDraft : setEditingDraftMarkdown} onCancelDraftEditing={cancelDraftEditing} onApplyDraftEditing={requestDraftCommit} onRequestPreview={requestPolishingPreview} />,
  }
  const paneOrder: MobilePane[] = swapped ? ['draft', 'original'] : ['original', 'draft']
  const visiblePanes: MobilePane[] = paneLayout === 'reviewOnly' ? ['original'] : paneLayout === 'revisionOnly' ? ['draft'] : paneOrder
  const showSidebar = sidebarOpen

  return (
    <div className="app-shell">
      <input ref={fileInputRef} className="visually-hidden" type="file" accept=".md,text/markdown,text/plain" onChange={loadMarkdown} />
      <input ref={workDataInputRef} className="visually-hidden" type="file" accept=".json,.html,application/json,text/html" onChange={loadWorkData} />
      <div className="sticky-header-stack">
        <Header onOpenFile={() => fileInputRef.current?.click()} onPasteMarkdown={() => setPasteDialogOpen(true)} onOpenWorkData={() => workDataInputRef.current?.click()} onExportWorkData={exportWorkData} canExportWorkData={Boolean(originalMarkdown)} onExportMarkdown={requestPolishingCompletion} canExportMarkdown={reviewRound.phase === 'polishing' && !structureDialogOpen} onExportReviewHtml={exportReviewHtml} canExportReviewHtml={Boolean(originalMarkdown)} onSwap={() => paneLayout === 'sideBySide' && setSwapped(value => !value)} onToggleSidebar={() => setSidebarOpen(value => !value)} activeTool={activeTool} onToolChange={changeActiveTool} paneLayout={paneLayout} onPaneLayoutChange={setPaneLayout} sidebarOpen={showSidebar} canSelectTools={canAddAnnotations} annotationCount={annotations.length} pendingCount={pendingAnnotations.length} onPreviousPending={() => movePending(-1)} onNextPending={() => movePending(1)} phase={reviewRound.phase} reviewerCompletedCount={reviewers.filter(reviewer => reviewer.status === 'completed').length} reviewerCount={reviewers.length} onCompleteReview={completeCurrentReview} canStartPolishing={reviewRound.phase === 'revising' && pendingAnnotations.length === 0} onStartPolishing={() => setPolishingDialogOpen(true)} onOpenSettings={() => setSettingsDialogOpen(true)} />
        {notice && <div className={`selection-notice ${documentSelection ? 'ready' : ''} ${notice === REVIEW_HTML_FORMAT_ERROR ? 'floating-format-error' : ''}`} role={notice === REVIEW_HTML_FORMAT_ERROR ? 'alert' : 'status'}><span>{notice}</span><button className="notice-close" type="button" onClick={clearDocumentSelection} aria-label="選択または通知を閉じる">×</button></div>}
      </div>
      {paneLayout === 'sideBySide' && <div className="mobile-tabs" role="tablist" aria-label="表示する文書">
        <button type="button" role="tab" aria-selected={mobilePane === 'original'} onClick={() => setMobilePane('original')}>原本</button>
        <button type="button" role="tab" aria-selected={mobilePane === 'draft'} onClick={() => setMobilePane('draft')}>修正文書</button>
      </div>}
      <main className={`workspace ${showSidebar ? '' : 'sidebar-closed'} layout-${paneLayout}`}>
        <div className={`document-grid ${paneLayout !== 'sideBySide' ? 'single-pane-grid' : ''}`}>
          {visiblePanes.map(kind => <div className={`pane-slot mobile-${kind} ${paneLayout !== 'sideBySide' || mobilePane === kind ? 'mobile-active' : ''}`} key={kind}>{panes[kind]}</div>)}
        </div>
        {showSidebar && <Sidebar annotations={annotations} highlights={highlightAnnotations} activeAnnotationId={activeAnnotationId} onClose={() => setSidebarOpen(false)} onSelectAnnotation={selectAnnotation} onComplete={completeAnnotation} onApplyProposal={applyAnnotationProposal} onEdit={editAnnotation} onReopen={reopenAnnotation} onDeleteRequest={requestAnnotationDelete} phase={reviewRound.phase} />}
      </main>
      {dialogOpen && documentSelection && <RedPenDialog selection={documentSelection} reviewText={redPenReviewDraft} replacementText={redPenDraft} replacementEnabled={redPenReplacementEnabled} tag={redPenTagDraft} onReviewTextChange={setRedPenReviewDraft} onReplacementTextChange={setRedPenDraft} onReplacementEnabledChange={setRedPenReplacementEnabled} onTagChange={setRedPenTagDraft} onSwitchTool={() => switchSelectionTool('highlighter')} onCancel={clearDocumentSelection} onSubmit={addAnnotation} />}
      {highlightDialogOpen && documentSelection && <HighlightDialog selection={documentSelection} comment={highlightCommentDraft} color={highlightColor} tag={highlightTagDraft} onCommentChange={setHighlightCommentDraft} onColorChange={setHighlightColor} onTagChange={setHighlightTagDraft} onSwitchTool={() => switchSelectionTool('redPen')} onCancel={clearDocumentSelection} onSubmit={addHighlightAnnotation} />}
      {pasteDialogOpen && <PasteMarkdownDialog onCancel={() => setPasteDialogOpen(false)} onStart={markdown => startReview(markdown, 'pasted_markdown.md')} />}
      {settingsDialogOpen && <SettingsDialog developerMode={developerMode} canExportAiReview={Boolean(originalMarkdown)} onDeveloperModeChange={changeDeveloperMode} onOpenAiReviewExport={() => { setSettingsDialogOpen(false); setAiReviewExportDialogOpen(true) }} onClose={() => setSettingsDialogOpen(false)} />}
      {aiReviewExportDialogOpen && <AiReviewExportDialog onCancel={() => setAiReviewExportDialogOpen(false)} onCreate={exportAiReview} />}
      {lockDialogOpen && <ReviewLockDialog onCancel={() => setLockDialogOpen(false)} onConfirm={confirmReviewLock} />}
      {structureDialogOpen && <MarkdownStructureDialog changes={structureChanges} onBack={returnToStructureEditing} onApply={commitDraftEditing} applyLabel={isPolishing ? 'このまま変更' : 'このまま反映'} />}
      {polishingDialogOpen && <PolishingConfirmDialog onCancel={() => setPolishingDialogOpen(false)} onConfirm={enterPolishing} />}
      {exportDialogOpen && <MarkdownExportDialog fileName={completedFileName} exporting={exporting} error={exportError} onBack={() => { setExportDialogOpen(false); setExportError('') }} onExport={exportCompletedMarkdown} />}
      {deleteTarget && (() => {
        const annotation = deleteTarget.kind === 'red_pen'
          ? annotations.find(item => item.id === deleteTarget.id)
          : highlightAnnotations.find(item => item.id === deleteTarget.id)
        if (!annotation) return null
        const target = deleteTarget.kind === 'red_pen'
          ? { kind: 'red_pen' as const, annotation: annotation as RedPenAnnotation }
          : { kind: 'highlight' as const, annotation: annotation as HighlightAnnotation }
        return <AnnotationDeleteDialog target={target} onCancel={() => setDeleteTarget(null)} onConfirm={confirmAnnotationDelete} />
      })()}
    </div>
  )
}

export default App
