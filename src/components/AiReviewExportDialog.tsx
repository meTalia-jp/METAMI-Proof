import { useEffect, useRef, useState } from 'react'
import type { AiReviewMode } from '../types/aiReview'
import { useTranslation } from '../i18n'
import type { TranslationKey } from '../i18n/ja'

type AiReviewExportDialogProps = {
  onCancel: () => void
  onCreate: (mode: AiReviewMode) => void
}

const tagMeanings = [
  ['tag.question', 'tagMeaning.question'],
  ['tag.rewrite', 'tagMeaning.rewrite'],
  ['tag.delete', 'tagMeaning.delete'],
  ['tag.add', 'tagMeaning.add'],
  ['tag.fact_check', 'tagMeaning.fact_check'],
  ['tag.note', 'tagMeaning.note'],
] as const satisfies ReadonlyArray<readonly [TranslationKey, TranslationKey]>

export function AiReviewExportDialog({ onCancel, onCreate }: AiReviewExportDialogProps) {
  const [mode, setMode] = useState<AiReviewMode>('consult')
  const cancelButtonRef = useRef<HTMLButtonElement>(null)
  const { t } = useTranslation()

  useEffect(() => {
    cancelButtonRef.current?.focus()
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onCancel() }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onCancel])

  return <div className="dialog-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && onCancel()}>
    <section className="ai-review-export-dialog" role="dialog" aria-modal="true" aria-labelledby="ai-review-export-title">
      <div className="dialog-pin" aria-hidden="true" /><p className="dialog-kicker">EXPERIMENTAL</p><h2 id="ai-review-export-title">{t('typeB.title')}</h2>
      <fieldset className="ai-review-mode"><legend>{t('typeB.purpose')}</legend>
        <label><input type="radio" name="ai-review-mode" value="consult" checked={mode === 'consult'} onChange={() => setMode('consult')} />{t('typeB.consult')}</label>
        <label><input type="radio" name="ai-review-mode" value="revise" checked={mode === 'revise'} onChange={() => setMode('revise')} />{t('typeB.revise')}</label>
      </fieldset>
      <div className="tag-meaning-list" aria-label={t('typeB.tagMeanings')}>{tagMeanings.map(([tag, meaning]) => <div key={tag}><strong>{t(tag)}</strong><span aria-hidden="true">→</span><span>{t(meaning)}</span></div>)}</div>
      <p className="ai-review-explanation">{t('typeB.explanation')}<br />{t('typeB.proposalExplanation')}</p>
      <p className="ai-review-confirmation">{t('typeB.confirmation')}</p>
      <div className="dialog-actions"><button ref={cancelButtonRef} type="button" className="secondary-button" onClick={onCancel}>{t('common.cancel')}</button><button type="button" className="red-action" onClick={() => onCreate(mode)}>{t('common.create')}</button></div>
    </section>
  </div>
}
