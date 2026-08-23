import type { HighlightAnnotation, RedPenAnnotation } from '../types/annotation'

type AnnotationDeleteDialogProps = {
  target: { kind: 'red_pen'; annotation: RedPenAnnotation } | { kind: 'highlight'; annotation: HighlightAnnotation }
  onCancel: () => void
  onConfirm: () => void
}

export function AnnotationDeleteDialog({ target, onCancel, onConfirm }: AnnotationDeleteDialogProps) {
  const isRedPen = target.kind === 'red_pen'
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && onCancel()}>
      <section className="review-lock-dialog annotation-delete-dialog" role="dialog" aria-modal="true" aria-labelledby="annotation-delete-title">
        <span className="dialog-pin eraser-pin" aria-hidden="true" />
        <p className="dialog-kicker">ERASER</p>
        <h2 id="annotation-delete-title">この校正を削除しますか？</h2>
        <div className="delete-confirm-details">
          <p><span>対象</span><output>{target.annotation.targetText}</output></p>
          {isRedPen
            ? <p><span>修正案</span><output>{target.annotation.replacementText}</output></p>
            : target.annotation.comment && <p><span>コメント</span><output>{target.annotation.comment}</output></p>}
        </div>
        <p className="delete-warning">本文Markdownは変更されません。校正マークだけを削除します。</p>
        <div className="dialog-actions">
          <button className="secondary-button" type="button" onClick={onCancel}>キャンセル</button>
          <button className="delete-action" type="button" onClick={onConfirm}>削除</button>
        </div>
      </section>
    </div>
  )
}
