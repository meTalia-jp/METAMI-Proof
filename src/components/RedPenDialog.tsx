import { type FormEvent, type KeyboardEvent, useEffect, useRef } from 'react'
import type { DocumentSelection, ReviewTag } from '../types/annotation'
import { ReviewTagPicker } from './ReviewTagPicker'

type RedPenDialogProps = {
  selection: DocumentSelection
  replacementText: string
  tag: ReviewTag | null
  onReplacementTextChange: (value: string) => void
  onTagChange: (value: ReviewTag | null) => void
  onSwitchTool: () => void
  onCancel: () => void
  onSubmit: (replacementText: string, tag: ReviewTag | null) => void
}

export function RedPenDialog({ selection, replacementText, tag, onReplacementTextChange, onTagChange, onSwitchTool, onCancel, onSubmit }: RedPenDialogProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const resizeTextarea = () => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.max(textarea.scrollHeight, 132)}px`
  }

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.focus()
    textarea.select()
    resizeTextarea()
  }, [])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!replacementText.trim()) return
    onSubmit(replacementText, tag)
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
      <section className="red-pen-dialog" role="dialog" aria-modal="true" aria-labelledby="red-pen-title">
        <div className="dialog-pin" aria-hidden="true" />
        <p className="dialog-kicker">RED PEN</p>
        <h2 id="red-pen-title">赤ペン修正案</h2>
        <div className="dialog-tool-switch" role="group" aria-label="校正ツールの切替">
          <button type="button" className="active red" aria-pressed="true">赤ペン</button>
          <button type="button" aria-pressed="false" onClick={onSwitchTool}>蛍光</button>
        </div>
        <form onSubmit={submit}>
          <label className="dialog-field source-field">
            <span>選択した文章</span>
            <output tabIndex={0}>{selection.targetText}</output>
          </label>
          <label className="dialog-field replacement-field">
            <span>修正後</span>
            <textarea ref={textareaRef} rows={5} value={replacementText} onChange={event => onReplacementTextChange(event.target.value)} onInput={resizeTextarea} onKeyDown={handleKeyDown} aria-describedby="replacement-help replacement-shortcuts" />
          </label>
          <ReviewTagPicker value={tag} onChange={onTagChange} />
          <p id="replacement-help" className="dialog-help">原本と修正文書のMarkdown自体は変更されません。</p>
          <p id="replacement-shortcuts" className="dialog-help shortcut-help">Ctrl+Enter：登録　Enter：改行　Esc：キャンセル</p>
          <div className="dialog-actions">
            <button type="button" className="secondary-button" onClick={onCancel}>キャンセル</button>
            <button type="submit" className="red-action" disabled={!replacementText.trim()}>登録</button>
          </div>
        </form>
      </section>
    </div>
  )
}
