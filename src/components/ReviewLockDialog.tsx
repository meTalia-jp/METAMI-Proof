type ReviewLockDialogProps = {
  onCancel: () => void
  onConfirm: () => void
}

export function ReviewLockDialog({ onCancel, onConfirm }: ReviewLockDialogProps) {
  const { t } = useTranslation()
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && onCancel()}>
      <section className="review-lock-dialog" role="dialog" aria-modal="true" aria-labelledby="review-lock-title">
        <span className="dialog-pin" aria-hidden="true" />
        <p className="dialog-kicker">ROUND 1 / REVIEW LOCK</p>
        <h2 id="review-lock-title">{t('reviewLock.title')}</h2>
        <p>{t('reviewLock.description')}</p>
        <div className="dialog-actions">
          <button className="secondary-button" type="button" onClick={onCancel}>{t('common.cancel')}</button>
          <button className="red-action" type="button" onClick={onConfirm}>{t('reviewLock.continue')}</button>
        </div>
      </section>
    </div>
  )
}
import { useTranslation } from '../i18n'
