import type { MarkdownStructureChange } from '../utils/markdownStructure'

type MarkdownStructureDialogProps = {
  changes: MarkdownStructureChange[]
  onBack: () => void
  onApply: () => void
  applyLabel?: string
}

export function MarkdownStructureDialog({ changes, onBack, onApply, applyLabel = 'このまま反映' }: MarkdownStructureDialogProps) {
  const visibleChanges = changes.slice(0, 5)
  return (
    <div className="dialog-backdrop" role="presentation">
      <section className="structure-dialog" role="dialog" aria-modal="true" aria-labelledby="structure-dialog-title">
        <span className="dialog-pin" aria-hidden="true" />
        <p className="dialog-kicker">MARKDOWN STRUCTURE</p>
        <h2 id="structure-dialog-title">Markdown構造が変更されています</h2>
        <p>表示サイズや文書構造が変わる可能性があります。意図した変更か確認してください。</p>
        <ul className="structure-change-list">
          {visibleChanges.map(change => <li key={change.id}>{change.description}</li>)}
        </ul>
        {changes.length > visibleChanges.length && <p className="more-changes">ほか{changes.length - visibleChanges.length}件の構造変更があります。</p>}
        <div className="dialog-actions">
          <button className="secondary-button" type="button" onClick={onBack}>編集に戻る</button>
          <button className="red-action" type="button" onClick={onApply}>{applyLabel}</button>
        </div>
      </section>
    </div>
  )
}
