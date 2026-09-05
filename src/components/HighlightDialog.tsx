import { type FormEvent, type KeyboardEvent, useEffect, useRef } from 'react'
import type { DocumentSelection, HighlightColor, ReviewTag } from '../types/annotation'
import { ReviewTagPicker } from './ReviewTagPicker'
import { useTranslation } from '../i18n'

type HighlightDialogProps = {
  selection: Pick<DocumentSelection, 'targetText'>
  mode?: 'create' | 'edit'
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

export function HighlightDialog({ selection, mode = 'create', comment, color, tag, onCommentChange, onColorChange, onTagChange, onSwitchTool, onCancel, onSubmit }: HighlightDialogProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { t } = useTranslation()

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
      <section className="red-pen-dialog attention-dialog highlight-dialog" role="dialog" aria-modal="true" aria-labelledby="highlight-dialog-title">
        <div className="dialog-pin highlight-pin" aria-hidden="true" />
        <p className="dialog-kicker highlight-kicker">HIGHLIGHT</p>
        <h2 id="highlight-dialog-title">{t(mode === 'edit' ? 'highlight.editTitle' : 'highlight.title')}</h2>
        {mode === 'create' && <div className="dialog-tool-switch" role="group" aria-label={t('review.toolSwitch')}>
          <button type="button" aria-pressed="false" onClick={onSwitchTool}>{t('tools.redPen')}</button>
          <button type="button" className="active highlight" aria-pressed="true">{t('redPen.highlightShort')}</button>
        </div>}
        <form onSubmit={submit}>
          <label className="dialog-field source-field">
            <span>{t('highlight.selection')}</span>
            <output tabIndex={0}>{selection.targetText}</output>
          </label>
          <label className="dialog-field replacement-field">
            <span>{t('highlight.comment')}</span>
            <textarea ref={textareaRef} rows={4} value={comment} onChange={event => onCommentChange(event.target.value)} onKeyDown={handleKeyDown} aria-describedby="highlight-shortcuts" />
          </label>
          <fieldset className="highlight-color-picker">
            <legend>{t('highlight.color')}</legend>
            <button type="button" className={`color-choice yellow ${color === 'yellow' ? 'selected' : ''}`} aria-pressed={color === 'yellow'} onClick={() => onColorChange('yellow')}><span />{t('highlight.yellow')}</button>
            <button type="button" className={`color-choice green ${color === 'green' ? 'selected' : ''}`} aria-pressed={color === 'green'} onClick={() => onColorChange('green')}><span />{t('highlight.green')}</button>
          </fieldset>
          <ReviewTagPicker value={tag} onChange={onTagChange} />
          <p id="highlight-shortcuts" className="dialog-help">{t(mode === 'edit' ? 'review.editShortcuts' : 'review.shortcuts')}</p>
          <div className="dialog-actions">
            <button type="button" className="secondary-button" onClick={onCancel}>{t('common.cancel')}</button>
            <button type="submit" className="highlight-action">{t(mode === 'edit' ? 'common.update' : 'common.register')}</button>
          </div>
        </form>
      </section>
    </div>
  )
}
