import { useTranslation } from '../i18n'

type Props = {
  currentRound: number
  nextRound: number
  fileName: string
  saving: boolean
  error: string
  saveCanBeConfirmed: boolean
  onCancel: () => void
  onFinish: () => void
  onStartNext: () => void
}

export function RoundCompletionDialog({ currentRound, nextRound, fileName, saving, error, saveCanBeConfirmed, onCancel, onFinish, onStartNext }: Props) {
  const { t } = useTranslation()
  return <div className="dialog-backdrop" role="presentation">
    <section className="red-pen-dialog round-completion-dialog" role="dialog" aria-modal="true" aria-labelledby="round-completion-title">
      <div className="dialog-pin" aria-hidden="true" />
      <p className="dialog-kicker">{t('roundComplete.roundLabel', { current: currentRound })}</p>
      <h2 id="round-completion-title">{t('roundComplete.title')}</h2>
      <p>{t('roundComplete.description')}</p>
      <div className="round-completion-options">
        <section>
          <h3>{t('roundComplete.finishTitle')}</h3>
          <p>{t('roundComplete.finishDescription')}</p>
          <small>{t('roundComplete.finishSupplement')}</small>
          <button type="button" className="finish-round-button" onClick={onFinish} disabled={saving}>{saving ? t('roundStart.saving') : t('roundComplete.finish')}</button>
        </section>
        <section>
          <h3>{t('roundComplete.nextTitle')}</h3>
          <p>{t('roundComplete.nextDescription')}</p>
          <small>{t('roundComplete.nextSupplement', { next: nextRound })}</small>
          <button type="button" className="review-again-button" onClick={onStartNext} disabled={saving}>{saving ? t('roundStart.saving') : t('roundComplete.startNext')}</button>
        </section>
      </div>
      <dl className="round-save-summary"><dt>{t('roundComplete.file')}</dt><dd>{fileName}</dd></dl>
      {!saveCanBeConfirmed && <p className="round-save-notice">{t('roundSave.unconfirmedWarning')}</p>}
      {error && <p className="dialog-error" role="alert">{error}</p>}
      <div className="dialog-actions round-completion-actions">
        <button type="button" className="secondary-button" onClick={onCancel} disabled={saving}>{t('common.cancel')}</button>
      </div>
    </section>
  </div>
}
