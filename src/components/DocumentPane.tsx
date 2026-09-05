import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { MarkdownViewer } from './MarkdownViewer'
import type { DocumentSelection, HighlightAnnotation, RedPenAnnotation } from '../types/annotation'

type DocumentPaneProps = {
  kind: 'original' | 'draft'
  markdown: string
  fileName: string
  annotations: RedPenAnnotation[]
  highlights: HighlightAnnotation[]
  documentSelection?: DocumentSelection | null
  activeAnnotationId?: string | null
  draftEditing?: boolean
  onOriginalSelection?: () => void
  onAnnotationClick?: (annotationId: string) => boolean | void
  eraserActive?: boolean
  onAnnotationDeleteRequest?: (annotationId: string) => void
  onDraftEditingChange?: (editing: boolean) => void
  draftCanEdit?: boolean
  editingMarkdown?: string
  onBeginDraftEditing?: () => void
  onEditingDraftChange?: (markdown: string) => void
  onCancelDraftEditing?: () => void
  onApplyDraftEditing?: () => void
  directEditing?: boolean
  onRequestPreview?: () => void
  editSelection?: { start: number; end: number; requestId: number } | null
}

export function DocumentPane({ kind, markdown, fileName, annotations, highlights, documentSelection, activeAnnotationId, draftEditing, onOriginalSelection, onAnnotationClick, eraserActive = false, onAnnotationDeleteRequest, onDraftEditingChange, draftCanEdit = false, editingMarkdown = markdown, onBeginDraftEditing, onEditingDraftChange, onCancelDraftEditing, onApplyDraftEditing, directEditing = false, onRequestPreview, editSelection }: DocumentPaneProps) {
  const isOriginal = kind === 'original'
  const editorRef = useRef<HTMLTextAreaElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const markerRef = useRef<HTMLElement | null>(null)
  const [commentPopover, setCommentPopover] = useState<{
    annotationId: string
    comment: string
    reviewer: string
    top: number
    left: number
  } | null>(null)

  useEffect(() => {
    if (!draftEditing || !editSelection || !editorRef.current) return
    const editor = editorRef.current
    window.requestAnimationFrame(() => {
      editor.focus()
      editor.setSelectionRange(editSelection.start, editSelection.end)
      const positionRatio = editSelection.start / Math.max(1, editor.value.length)
      editor.scrollTop = Math.max(0, positionRatio * editor.scrollHeight - editor.clientHeight / 3)
    })
  }, [draftEditing, editSelection])

  useEffect(() => {
    if (!commentPopover) return
    const closeOnPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (popoverRef.current?.contains(target) || markerRef.current?.contains(target)) return
      setCommentPopover(null)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setCommentPopover(null)
    }
    const closeOnScroll = () => setCommentPopover(null)
    document.addEventListener('pointerdown', closeOnPointerDown)
    document.addEventListener('keydown', closeOnEscape)
    window.addEventListener('scroll', closeOnScroll, true)
    return () => {
      document.removeEventListener('pointerdown', closeOnPointerDown)
      document.removeEventListener('keydown', closeOnEscape)
      window.removeEventListener('scroll', closeOnScroll, true)
    }
  }, [commentPopover])

  useEffect(() => {
    if (!commentPopover || !popoverRef.current) return
    const rect = popoverRef.current.getBoundingClientRect()
    const edgeGap = 12
    const left = Math.min(Math.max(edgeGap, commentPopover.left), Math.max(edgeGap, window.innerWidth - rect.width - edgeGap))
    const top = Math.min(Math.max(edgeGap, commentPopover.top), Math.max(edgeGap, window.innerHeight - rect.height - edgeGap))
    if (left !== commentPopover.left || top !== commentPopover.top) {
      setCommentPopover(current => current ? { ...current, left, top } : null)
    }
  }, [commentPopover])

  useEffect(() => {
    if (commentPopover && !highlights.some(highlight => highlight.id === commentPopover.annotationId)) {
      markerRef.current = null
      setCommentPopover(null)
    }
  }, [commentPopover, highlights])

  const selectAnnotation = (event: MouseEvent<HTMLElement>) => {
    const annotationElement = (event.target as HTMLElement).closest<HTMLElement>('[data-annotation-id]')
    const annotationId = annotationElement?.dataset.annotationId
    if (!annotationId) return
    if (eraserActive) {
      markerRef.current = null
      setCommentPopover(null)
      onAnnotationDeleteRequest?.(annotationId)
      return
    }
    if (onAnnotationClick?.(annotationId)) {
      markerRef.current = null
      setCommentPopover(null)
      return
    }

    const marker = (event.target as HTMLElement).closest<HTMLElement>('.highlight-comment-marker')
    const highlight = marker ? highlights.find(item => item.id === annotationId && item.comment) : undefined
    if (!marker || !highlight?.comment) return
    if (commentPopover?.annotationId === annotationId) {
      markerRef.current = null
      setCommentPopover(null)
      return
    }

    markerRef.current = marker
    const rect = marker.getBoundingClientRect()
    const popoverWidth = 280
    const estimatedHeight = 130
    const edgeGap = 12
    const gap = 8
    const left = Math.min(Math.max(edgeGap, rect.left), Math.max(edgeGap, window.innerWidth - popoverWidth - edgeGap))
    const top = rect.bottom + gap + estimatedHeight <= window.innerHeight - edgeGap
      ? rect.bottom + gap
      : Math.max(edgeGap, rect.top - estimatedHeight - gap)
    setCommentPopover({ annotationId, comment: highlight.comment, reviewer: highlight.reviewer.name, top, left })
  }

  return (
    <section className={`document-pane ${kind}`} aria-label={isOriginal ? '原本' : '修正文書'}>
      <div className="pane-heading">
        <div>
          <span className="pane-kicker">{isOriginal ? 'ORIGINAL' : 'WORKING COPY'}</span>
          <h2>{isOriginal ? '原本 ＋ 校正レイヤー' : '修正文書（編集対象）'}</h2>
        </div>
        <span className="status-tag">{isOriginal ? '読み取り専用' : draftEditing ? 'Markdown編集中' : 'プレビュー'}</span>
      </div>
      <div className="file-strip" title={fileName}>{fileName || 'ファイル未選択'}</div>
      {!isOriginal && (
        <div className="draft-mode-switch" role="group" aria-label="修正文書の表示モード">
          <button type="button" className={!draftEditing ? 'active' : ''} onClick={directEditing ? onRequestPreview : () => onDraftEditingChange?.(false)} disabled={draftEditing && !directEditing}>プレビュー</button>
          <button type="button" className={draftEditing ? 'active' : ''} onClick={onBeginDraftEditing} disabled={!draftCanEdit || draftEditing} title={draftCanEdit ? '' : '校正を確定して修正フェーズへ進むと編集できます'}>Markdown編集</button>
        </div>
      )}
      {!isOriginal && draftEditing ? (
        <div className="draft-editing-area">
          <textarea ref={editorRef} className="draft-editor" aria-label="修正文書Markdown" value={editingMarkdown} onChange={event => onEditingDraftChange?.(event.target.value)} spellCheck={false} />
          {!directEditing && <div className="draft-edit-actions">
            <button className="secondary-button" type="button" onClick={onCancelDraftEditing}>キャンセル</button>
            <button className="red-action" type="button" onClick={onApplyDraftEditing} title="Markdown編集欄の変更を本文に反映し、見出し・箇条書きなどの表示を更新します。校正箇所の「修正完了」とは別の操作です。">レイアウトに反映</button>
          </div>}
        </div>
      ) : (
        <>
          <article className={`markdown-body ${eraserActive ? 'eraser-mode' : ''}`} onMouseUp={isOriginal && !eraserActive ? onOriginalSelection : undefined} onClick={selectAnnotation}>
            <MarkdownViewer markdown={markdown} annotations={annotations} highlights={highlights} selection={isOriginal ? documentSelection : null} activeAnnotationId={activeAnnotationId} mode={kind} />
          </article>
          {commentPopover && (
            <div ref={popoverRef} className="highlight-comment-popover" role="dialog" aria-label="蛍光コメント" style={{ top: commentPopover.top, left: commentPopover.left }}>
              <p>{commentPopover.comment}</p>
              <span>校正者：{commentPopover.reviewer}</span>
            </div>
          )}
        </>
      )}
    </section>
  )
}
