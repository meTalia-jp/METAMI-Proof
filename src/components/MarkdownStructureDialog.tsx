import type { MarkdownStructureChange } from '../utils/markdownStructure'
import { useTranslation } from '../i18n'

type MarkdownStructureDialogProps = {
  changes: MarkdownStructureChange[]
  onBack: () => void
  onApply: () => void
  applyLabel?: string
}

export function MarkdownStructureDialog({ changes, onBack, onApply, applyLabel }: MarkdownStructureDialogProps) {
  const { t } = useTranslation()
  const visibleChanges = changes.slice(0, 5)
  return (
    <div className="dialog-backdrop" role="presentation">
      <section className="structure-dialog" role="dialog" aria-modal="true" aria-labelledby="structure-dialog-title">
        <span className="dialog-pin" aria-hidden="true" />
        <p className="dialog-kicker">MARKDOWN STRUCTURE</p>
        <h2 id="structure-dialog-title">{t('structure.title')}</h2>
        <p>{t('structure.description')}</p>
        <ul className="structure-change-list">
          {visibleChanges.map(change => <li key={change.id}>{change.description}</li>)}
        </ul>
        {changes.length > visibleChanges.length && <p className="more-changes">{t('structure.more', { count: changes.length - visibleChanges.length })}</p>}
        <div className="dialog-actions">
          <button className="secondary-button" type="button" onClick={onBack}>{t('structure.back')}</button>
          <button className="red-action" type="button" onClick={onApply}>{applyLabel ?? t('structure.apply')}</button>
        </div>
      </section>
    </div>
  )
}
