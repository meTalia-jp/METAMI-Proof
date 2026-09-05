import { type FormEvent, type KeyboardEvent, useEffect, useRef } from 'react'
import type { DocumentSelection, ReviewTag } from '../types/annotation'
import { ReviewTagPicker } from './ReviewTagPicker'
import { useTranslation } from '../i18n'

type RedPenDialogProps = {
  selection: Pick<DocumentSelection, 'targetText'>
  mode?: 'create' | 'edit'
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

export function RedPenDialog({ selection, mode = 'create', reviewText, replacementText, replacementEnabled, tag, onReviewTextChange, onReplacementTextChange, onReplacementEnabledChange, onTagChange, onSwitchTool, onCancel, onSubmit }: RedPenDialogProps) {
  const reviewRef = useRef<HTMLTextAreaElement>(null)
  const hasContent = reviewText.trim().length > 0 || replacementEnabled
  const { t } = useTranslation()

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
        <h2 id="red-pen-title">{t(mode === 'edit' ? 'redPen.editTitle' : 'redPen.title')}</h2>
        {mode === 'create' && <div className="dialog-tool-switch" role="group" aria-label={t('review.toolSwitch')}>
          <button type="button" className="active red" aria-pressed="true">{t('tools.redPen')}</button>
          <button type="button" aria-pressed="false" onClick={onSwitchTool}>{t('redPen.highlightShort')}</button>
        </div>}
        <form onSubmit={submit}>
          <label className="dialog-field source-field"><span>{t('review.selectedText')}</span><output tabIndex={0}>{selection.targetText}</output></label>
          <label className="dialog-field replacement-field">
            <span>{t('redPen.reviewText')}</span>
            <textarea ref={reviewRef} rows={3} value={reviewText} onChange={event => onReviewTextChange(event.target.value)} onKeyDown={handleKeyDown} />
          </label>
          <label className="replacement-toggle">
            <input type="checkbox" checked={replacementEnabled} onChange={event => onReplacementEnabledChange(event.target.checked)} />
            {t('redPen.enableReplacement')}
          </label>
          {replacementEnabled && <label className="dialog-field replacement-field">
            <span>{t('redPen.replacementText')}</span>
            <textarea rows={4} value={replacementText} onChange={event => onReplacementTextChange(event.target.value)} onKeyDown={handleKeyDown} aria-describedby="replacement-help replacement-shortcuts" />
          </label>}
          <ReviewTagPicker value={tag} onChange={onTagChange} />
          <p id="replacement-help" className="dialog-help">{t('redPen.help')}</p>
          <p id="replacement-shortcuts" className="dialog-help shortcut-help">{t(mode === 'edit' ? 'review.editShortcuts' : 'review.shortcuts')}</p>
          <div className="dialog-actions">
            <button type="button" className="secondary-button" onClick={onCancel}>{t('common.cancel')}</button>
            <button type="submit" className="red-action" disabled={!hasContent}>{t(mode === 'edit' ? 'common.update' : 'common.register')}</button>
          </div>
        </form>
      </section>
    </div>
  )
}
