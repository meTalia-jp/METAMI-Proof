type MarkdownExportDialogProps = {
  fileName: string
  exporting: boolean
  error: string
  onBack: () => void
  onExport: () => void
}

export function MarkdownExportDialog({ fileName, exporting, error, onBack, onExport }: MarkdownExportDialogProps) {
  return (
    <div className="dialog-backdrop" role="presentation">
      <section className="markdown-export-dialog" role="dialog" aria-modal="true" aria-labelledby="markdown-export-title">
        <span className="dialog-pin" aria-hidden="true" />
        <p className="dialog-kicker">ROUND 1 / MARKDOWN EXPORT</p>
        <h2 id="markdown-export-title">この内容をMarkdownとして出力しますか？</h2>
        <p>出力すると、このラウンドの内容が確定し、校正・修正・全体編集には戻れません。</p>
        <p>後から文章を変更する場合は、出力した完成版から新しいラウンドを開始してください。</p>
        <div className="export-file-name"><span>出力ファイル</span><strong>{fileName}</strong></div>
        {error && <p className="export-error" role="alert">{error}</p>}
        <div className="dialog-actions">
          <button className="secondary-button" type="button" onClick={onBack} disabled={exporting}>キャンセル</button>
          <button className="red-action" type="button" onClick={onExport} disabled={exporting}>{exporting ? '出力中…' : 'Markdownを出力'}</button>
        </div>
      </section>
    </div>
  )
}
