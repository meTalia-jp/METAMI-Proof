type PolishingConfirmDialogProps = {
  onCancel: () => void
  onConfirm: () => void
}

export function PolishingConfirmDialog({ onCancel, onConfirm }: PolishingConfirmDialogProps) {
  const { t } = useTranslation()
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && onCancel()}>
      <section className="polishing-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="polishing-confirm-title">
        <span className="dialog-pin" aria-hidden="true" />
        <p className="dialog-kicker">ROUND 1 / FULL DOCUMENT EDITING</p>
        <h2 id="polishing-confirm-title">{t('polishing.title')}</h2>
        <p>{t('polishing.description')}</p>
        <div className="dialog-actions">
          <button className="secondary-button" type="button" onClick={onCancel}>{t('common.cancel')}</button>
          <button className="red-action" type="button" onClick={onConfirm}>{t('polishing.continue')}</button>
        </div>
      </section>
    </div>
  )
}
import { useTranslation } from '../i18n'
