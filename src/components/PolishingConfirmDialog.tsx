type PolishingConfirmDialogProps = {
  onCancel: () => void
  onConfirm: () => void
}

export function PolishingConfirmDialog({ onCancel, onConfirm }: PolishingConfirmDialogProps) {
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && onCancel()}>
      <section className="polishing-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="polishing-confirm-title">
        <span className="dialog-pin" aria-hidden="true" />
        <p className="dialog-kicker">ROUND 1 / FULL DOCUMENT EDITING</p>
        <h2 id="polishing-confirm-title">文章全体の編集へ進みます</h2>
        <p>すべての校正指示が処理済みです。全体編集中は、校正指示とは切り離してMarkdown本文を自由に編集できます。</p>
        <div className="dialog-actions">
          <button className="secondary-button" type="button" onClick={onCancel}>キャンセル</button>
          <button className="red-action" type="button" onClick={onConfirm}>全体編集へ進む</button>
        </div>
      </section>
    </div>
  )
}
