type ReviewLockDialogProps = {
  onCancel: () => void
  onConfirm: () => void
}

export function ReviewLockDialog({ onCancel, onConfirm }: ReviewLockDialogProps) {
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && onCancel()}>
      <section className="review-lock-dialog" role="dialog" aria-modal="true" aria-labelledby="review-lock-title">
        <span className="dialog-pin" aria-hidden="true" />
        <p className="dialog-kicker">ROUND 1 / REVIEW LOCK</p>
        <h2 id="review-lock-title">全校正者の校正が完了しました</h2>
        <p>校正内容を確定して修正フェーズへ進みます。確定後、このRoundの赤ペン指示は追加・変更できません。</p>
        <div className="dialog-actions">
          <button className="secondary-button" type="button" onClick={onCancel}>キャンセル</button>
          <button className="red-action" type="button" onClick={onConfirm}>校正を確定して修正へ</button>
        </div>
      </section>
    </div>
  )
}
