import type { HighlightAnnotation, RedPenAnnotation } from '../types/annotation'
import { useTranslation } from '../i18n'

type AnnotationDeleteDialogProps = {
  target: { kind: 'red_pen'; annotation: RedPenAnnotation } | { kind: 'highlight'; annotation: HighlightAnnotation }
  onCancel: () => void
  onConfirm: () => void
}

export function AnnotationDeleteDialog({ target, onCancel, onConfirm }: AnnotationDeleteDialogProps) {
  const { t } = useTranslation()
  const isRedPen = target.kind === 'red_pen'
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && onCancel()}>
      <section className="review-lock-dialog annotation-delete-dialog" role="dialog" aria-modal="true" aria-labelledby="annotation-delete-title">
        <span className="dialog-pin eraser-pin" aria-hidden="true" />
        <p className="dialog-kicker">ERASER</p>
        <h2 id="annotation-delete-title">{t('annotationDelete.title')}</h2>
        <div className="delete-confirm-details">
          <p><span>{t('common.target')}</span><output>{target.annotation.targetText}</output></p>
          {isRedPen
            ? <p><span>{t('annotationDelete.review')}</span><output>{target.annotation.reviewText ?? target.annotation.replacementText ?? t('common.none')}</output></p>
            : target.annotation.comment && <p><span>{t('common.comment')}</span><output>{target.annotation.comment}</output></p>}
        </div>
        <p className="delete-warning">{t('annotationDelete.warning')}</p>
        <div className="dialog-actions">
          <button className="secondary-button" type="button" onClick={onCancel}>{t('common.cancel')}</button>
          <button className="delete-action" type="button" onClick={onConfirm}>{t('common.delete')}</button>
        </div>
      </section>
    </div>
  )
}
