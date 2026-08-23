import { type FormEvent, type KeyboardEvent, useEffect, useRef } from 'react'
import type { DocumentSelection, HighlightColor, ReviewTag } from '../types/annotation'
import { ReviewTagPicker } from './ReviewTagPicker'

type HighlightDialogProps = {
  selection: DocumentSelection
  comment: string
  color: HighlightColor
  tag: ReviewTag | null
  onCommentChange: (value: string) => void
  onColorChange: (value: HighlightColor) => void
  onTagChange: (value: ReviewTag | null) => void
  onSwitchTool: () => void
  onCancel: () => void
  onSubmit: (comment: string, tag: ReviewTag | null, color: HighlightColor) => void
}

export function HighlightDialog({ selection, comment, color, tag, onCommentChange, onColorChange, onTagChange, onSwitchTool, onCancel, onSubmit }: HighlightDialogProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { textareaRef.current?.focus() }, [])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    onSubmit(comment.trim(), tag, color)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.nativeEvent.isComposing) return
    if (event.key === 'Escape') {
      event.preventDefault()
      onCancel()
      return
    }
    if (event.ctrlKey && event.key === 'Enter') {
      event.preventDefault()
      event.currentTarget.form?.requestSubmit()
    }
  }

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && onCancel()}>
      <section className="red-pen-dialog highlight-dialog" role="dialog" aria-modal="true" aria-labelledby="highlight-dialog-title">
        <div className="dialog-pin highlight-pin" aria-hidden="true" />
        <p className="dialog-kicker highlight-kicker">HIGHLIGHT</p>
        <h2 id="highlight-dialog-title">蛍光コメント</h2>
        <div className="dialog-tool-switch" role="group" aria-label="校正ツールの切替">
          <button type="button" aria-pressed="false" onClick={onSwitchTool}>赤ペン</button>
          <button type="button" className="active highlight" aria-pressed="true">蛍光</button>
        </div>
        <form onSubmit={submit}>
          <label className="dialog-field source-field">
            <span>選択箇所</span>
            <output tabIndex={0}>{selection.targetText}</output>
          </label>
          <label className="dialog-field replacement-field">
            <span>コメント（任意）</span>
            <textarea ref={textareaRef} rows={4} value={comment} onChange={event => onCommentChange(event.target.value)} onKeyDown={handleKeyDown} aria-describedby="highlight-shortcuts" />
          </label>
          <fieldset className="highlight-color-picker">
            <legend>蛍光色</legend>
            <button type="button" className={`color-choice yellow ${color === 'yellow' ? 'selected' : ''}`} aria-pressed={color === 'yellow'} onClick={() => onColorChange('yellow')}><span />黄色</button>
            <button type="button" className={`color-choice green ${color === 'green' ? 'selected' : ''}`} aria-pressed={color === 'green'} onClick={() => onColorChange('green')}><span />緑</button>
          </fieldset>
          <ReviewTagPicker value={tag} onChange={onTagChange} />
          <p id="highlight-shortcuts" className="dialog-help">Ctrl+Enter：登録　Enter：改行　Esc：キャンセル</p>
          <div className="dialog-actions">
            <button type="button" className="secondary-button" onClick={onCancel}>キャンセル</button>
            <button type="submit" className="highlight-action">登録</button>
          </div>
        </form>
      </section>
    </div>
  )
}
