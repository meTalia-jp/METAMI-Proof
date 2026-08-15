import { useEffect, useRef, type MouseEvent } from 'react'
import { MarkdownViewer } from './MarkdownViewer'
import type { DocumentSelection, RedPenAnnotation } from '../types/annotation'

type DocumentPaneProps = {
  kind: 'original' | 'draft'
  markdown: string
  fileName: string
  annotations: RedPenAnnotation[]
  documentSelection?: DocumentSelection | null
  activeAnnotationId?: string | null
  draftEditing?: boolean
  onOriginalSelection?: () => void
  onAnnotationClick?: (annotationId: string) => void
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

export function DocumentPane({ kind, markdown, fileName, annotations, documentSelection, activeAnnotationId, draftEditing, onOriginalSelection, onAnnotationClick, onDraftEditingChange, draftCanEdit = false, editingMarkdown = markdown, onBeginDraftEditing, onEditingDraftChange, onCancelDraftEditing, onApplyDraftEditing, directEditing = false, onRequestPreview, editSelection }: DocumentPaneProps) {
  const isOriginal = kind === 'original'
  const editorRef = useRef<HTMLTextAreaElement>(null)

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

  const selectAnnotation = (event: MouseEvent<HTMLElement>) => {
    const annotationElement = (event.target as HTMLElement).closest<HTMLElement>('[data-annotation-id]')
    const annotationId = annotationElement?.dataset.annotationId
    if (annotationId) onAnnotationClick?.(annotationId)
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
        <article className="markdown-body" onMouseUp={isOriginal ? onOriginalSelection : undefined} onClick={selectAnnotation}>
          <MarkdownViewer markdown={markdown} annotations={annotations} selection={isOriginal ? documentSelection : null} activeAnnotationId={activeAnnotationId} mode={kind} />
        </article>
      )}
    </section>
  )
}
