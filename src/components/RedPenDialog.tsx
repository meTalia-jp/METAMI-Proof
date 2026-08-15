import { FormEvent, useEffect, useRef, useState } from 'react'
import type { DocumentSelection } from '../types/annotation'

type RedPenDialogProps = {
  selection: DocumentSelection
  onCancel: () => void
  onSubmit: (replacementText: string) => void
}

export function RedPenDialog({ selection, onCancel, onSubmit }: RedPenDialogProps) {
  const [replacementText, setReplacementText] = useState(selection.targetText)
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
    onSubmit(replacementText)
  }

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && onCancel()}>
      <section className="red-pen-dialog" role="dialog" aria-modal="true" aria-labelledby="red-pen-title">
        <div className="dialog-pin" aria-hidden="true" />
        <p className="dialog-kicker">RED PEN</p>
        <h2 id="red-pen-title">赤ペン修正案</h2>
        <form onSubmit={submit}>
          <label className="dialog-field source-field">
            <span>選択した文章</span>
            <output tabIndex={0}>{selection.targetText}</output>
          </label>
          <label className="dialog-field replacement-field">
            <span>修正後</span>
            <textarea ref={textareaRef} rows={5} value={replacementText} onChange={event => setReplacementText(event.target.value)} onInput={resizeTextarea} aria-describedby="replacement-help" />
          </label>
          <p id="replacement-help" className="dialog-help">原本と修正文書のMarkdown自体は変更されません。</p>
          <div className="dialog-actions">
            <button type="button" className="secondary-button" onClick={onCancel}>キャンセル</button>
            <button type="submit" className="red-action" disabled={!replacementText.trim()}>登録</button>
          </div>
        </form>
      </section>
    </div>
  )
}
