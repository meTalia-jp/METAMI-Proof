import { type FormEvent, type KeyboardEvent, useEffect, useRef } from 'react'
import type { DocumentSelection, ReviewTag } from '../types/annotation'
import { ReviewTagPicker } from './ReviewTagPicker'

type RedPenDialogProps = {
  selection: DocumentSelection
  reviewText: string
  replacementText: string
  replacementEnabled: boolean
  tag: ReviewTag | null
  onReviewTextChange: (value: string) => void
  onReplacementTextChange: (value: string) => void
  onReplacementEnabledChange: (value: boolean) => void
  onTagChange: (value: ReviewTag | null) => void
  onSwitchTool: () => void
  onCancel: () => void
  onSubmit: (reviewText: string | undefined, replacementText: string | undefined, tag: ReviewTag | null) => void
}

export function RedPenDialog({ selection, reviewText, replacementText, replacementEnabled, tag, onReviewTextChange, onReplacementTextChange, onReplacementEnabledChange, onTagChange, onSwitchTool, onCancel, onSubmit }: RedPenDialogProps) {
  const reviewRef = useRef<HTMLTextAreaElement>(null)
  const hasContent = reviewText.trim().length > 0 || replacementEnabled

  useEffect(() => { reviewRef.current?.focus() }, [])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!hasContent) return
    onSubmit(reviewText.trim() || undefined, replacementEnabled ? replacementText : undefined, tag)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.nativeEvent.isComposing) return
    if (event.key === 'Escape') { event.preventDefault(); onCancel(); return }
    if (event.ctrlKey && event.key === 'Enter') { event.preventDefault(); event.currentTarget.form?.requestSubmit() }
  }

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && onCancel()}>
      <section className="red-pen-dialog" role="dialog" aria-modal="true" aria-labelledby="red-pen-title">
        <div className="dialog-pin" aria-hidden="true" />
        <p className="dialog-kicker">RED PEN</p>
        <h2 id="red-pen-title">赤ペンレビュー</h2>
        <div className="dialog-tool-switch" role="group" aria-label="校正ツールの切替">
          <button type="button" className="active red" aria-pressed="true">赤ペン</button>
          <button type="button" aria-pressed="false" onClick={onSwitchTool}>蛍光</button>
        </div>
        <form onSubmit={submit}>
          <label className="dialog-field source-field"><span>選択した文章</span><output tabIndex={0}>{selection.targetText}</output></label>
          <label className="dialog-field replacement-field">
            <span>レビュー内容・質問・指示（任意）</span>
            <textarea ref={reviewRef} rows={3} value={reviewText} onChange={event => onReviewTextChange(event.target.value)} onKeyDown={handleKeyDown} />
          </label>
          <label className="replacement-toggle">
            <input type="checkbox" checked={replacementEnabled} onChange={event => onReplacementEnabledChange(event.target.checked)} />
            本文へ適用できる置換案を設定する
          </label>
          {replacementEnabled && <label className="dialog-field replacement-field">
            <span>置換文章（空欄は削除提案）</span>
            <textarea rows={4} value={replacementText} onChange={event => onReplacementTextChange(event.target.value)} onKeyDown={handleKeyDown} aria-describedby="replacement-help replacement-shortcuts" />
          </label>}
          <ReviewTagPicker value={tag} onChange={onTagChange} />
          <p id="replacement-help" className="dialog-help">登録時点では原本と修正文書のMarkdown自体は変更されません。</p>
          <p id="replacement-shortcuts" className="dialog-help shortcut-help">Ctrl+Enter：登録　Enter：改行　Esc：キャンセル</p>
          <div className="dialog-actions">
            <button type="button" className="secondary-button" onClick={onCancel}>キャンセル</button>
            <button type="submit" className="red-action" disabled={!hasContent}>登録</button>
          </div>
        </form>
      </section>
    </div>
  )
}
