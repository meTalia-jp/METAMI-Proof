type MarkdownExportDialogProps = {
  fileName: string
  roundNumber: number
  exporting: boolean
  error: string
  onBack: () => void
  onExport: () => void
}

export function MarkdownExportDialog({ fileName, roundNumber, exporting, error, onBack, onExport }: MarkdownExportDialogProps) {
  const { t } = useTranslation()
  return (
    <div className="dialog-backdrop" role="presentation">
      <section className="markdown-export-dialog" role="dialog" aria-modal="true" aria-labelledby="markdown-export-title">
        <span className="dialog-pin" aria-hidden="true" />
        <p className="dialog-kicker">ROUND {roundNumber} / MARKDOWN EXPORT</p>
        <h2 id="markdown-export-title">{t('export.title')}</h2>
        <p>{t('export.lockWarning')}</p>
        <p>{t('export.nextRound')}</p>
        <div className="export-file-name"><span>{t('export.file')}</span><strong>{fileName}</strong></div>
        {error && <p className="export-error" role="alert">{error}</p>}
        <div className="dialog-actions">
          <button className="secondary-button" type="button" onClick={onBack} disabled={exporting}>{t('common.cancel')}</button>
          <button className="red-action" type="button" onClick={onExport} disabled={exporting}>{exporting ? t('export.exporting') : t('menu.output.markdown')}</button>
        </div>
      </section>
    </div>
  )
}
import { useTranslation } from '../i18n'
