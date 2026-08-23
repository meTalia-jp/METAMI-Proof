import type { HighlightAnnotation, RedPenAnnotation } from '../types/annotation'
import type { ReviewPhase } from '../types/review'

type SidebarProps = {
  annotations: RedPenAnnotation[]
  highlights: HighlightAnnotation[]
  activeAnnotationId: string | null
  onClose: () => void
  onSelectAnnotation: (annotationId: string) => void
  onComplete: (annotationId: string, changed: boolean) => void
  onApplyProposal: (annotationId: string) => void
  onEdit: (annotationId: string) => void
  onReopen: (annotationId: string) => void
  onDeleteRequest: (annotationId: string) => void
  phase: ReviewPhase
}

const statusLabel = (annotation: RedPenAnnotation) => {
  if (annotation.status === 'completed_changed') return '修正済 ✓'
  if (annotation.status === 'completed_unchanged') return '変更せず完了 ✓'
  return annotation.anchorStatus === 'unresolved' ? '⚠ 位置未特定' : annotation.proposalApplied ? '修正案を適用済み' : '未完了'
}

const highlightColorLabel = (color: HighlightAnnotation['color']) => color === 'green' ? '緑' : color === 'yellow' ? '黄色' : color

export function Sidebar({ annotations, highlights, activeAnnotationId, onClose, onSelectAnnotation, onComplete, onApplyProposal, onEdit, onReopen, onDeleteRequest, phase }: SidebarProps) {
  const activeAnnotation = annotations.find(annotation => annotation.id === activeAnnotationId)
  const activeHighlight = highlights.find(annotation => annotation.id === activeAnnotationId)
  const pending = annotations.filter(annotation => annotation.status === 'pending')
  const completed = annotations.filter(annotation => annotation.status !== 'pending')

  return (
    <aside className="sidebar" aria-label="校正サイドバー">
      <div className="sidebar-heading"><span>校正メモ</span><button type="button" onClick={onClose} aria-label="サイドバーを閉じる">×</button></div>

      <section className="side-card workflow-card">
        <h2>修正者ワークフロー</h2>
        {activeHighlight ? (
          <div className={`active-instruction highlight-detail ${activeHighlight.color}`}>
            <span className={`workflow-status highlight-status ${activeHighlight.color}`}>蛍光・{highlightColorLabel(activeHighlight.color)}</span>
            <div className="instruction-details">
              <p><span>対象文字列</span><mark>{activeHighlight.targetText}</mark></p>
              <p><span>コメント</span><output>{activeHighlight.comment || 'コメントなし'}</output></p>
              <p><span>校正者</span><output>{activeHighlight.reviewer.name}</output></p>
            </div>
          </div>
        ) : activeAnnotation ? (
          <div className="active-instruction">
            <span className={`workflow-status ${activeAnnotation.status}`}>{statusLabel(activeAnnotation)}</span>
            <div className="instruction-details">
              <p><span>元の校正対象</span><del>{activeAnnotation.targetText}</del></p>
              <p><span>修正案</span><strong>{activeAnnotation.replacementText}</strong></p>
              {activeAnnotation.completedText !== undefined && <p><span>前回の修正結果</span><output>{activeAnnotation.completedText || '（該当テキストなし）'}</output></p>}
            </div>
            {activeAnnotation.anchorStatus === 'unresolved' && <p className="anchor-warning">⚠ 対応位置を自動特定できません。原本側の指示を確認してください。</p>}
            {activeAnnotation.status === 'pending' && phase === 'revising' && (
              <div className="annotation-actions">
                <div className="editing-actions">
                  <button type="button" onClick={() => onApplyProposal(activeAnnotation.id)} disabled={activeAnnotation.anchorStatus !== 'resolved' || activeAnnotation.proposalApplied} title={activeAnnotation.anchorStatus === 'unresolved' ? '修正文書内の対応位置を特定できないため、自動適用できません' : ''}>{activeAnnotation.proposalApplied ? '適用済み' : '修正案を適用'}</button>
                  <button type="button" onClick={() => onEdit(activeAnnotation.id)}>修正・加筆</button>
                </div>
                <div className="completion-actions">
                  <button type="button" className="complete-changed" onClick={() => onComplete(activeAnnotation.id, true)}>修正完了</button>
                  <button type="button" className="complete-unchanged" onClick={() => onComplete(activeAnnotation.id, false)}>変更せず完了</button>
                </div>
              </div>
            )}
            {activeAnnotation.status !== 'pending' && phase === 'revising' && (
              <div className="completion-actions">
                <button type="button" className="reopen-action" onClick={() => onReopen(activeAnnotation.id)}>再修正</button>
              </div>
            )}
            {activeAnnotation.status === 'pending' && phase === 'reviewing' && <p className="phase-guidance">校正確定後、修正フェーズで処理できます。</p>}
          </div>
        ) : <p>未反映マーカーまたは一覧から指示を選択してください。</p>}
      </section>

      {highlights.length > 0 && <section className="side-card highlight-list-card">
        <h2>蛍光 <span>{highlights.length}件</span></h2>
        <ol className="pending-list">
          {highlights.map(highlight => (
            <li key={highlight.id}>
              <button type="button" className={`annotation-select-button ${highlight.id === activeAnnotationId ? 'active' : ''}`} onClick={() => onSelectAnnotation(highlight.id)}>
                <span>{highlight.targetText}</span><small>{highlight.comment || 'コメントなし'}・{highlightColorLabel(highlight.color)}</small>
              </button>
              {phase === 'reviewing' && <button type="button" className="annotation-delete-button" onClick={() => onDeleteRequest(highlight.id)} aria-label={`蛍光「${highlight.targetText}」を削除`}>削除</button>}
            </li>
          ))}
        </ol>
      </section>}

      {completed.length > 0 && <section className="side-card completed-list-card">
        <h2>完了済み <span>{completed.length}件</span></h2>
        <ol className="pending-list">
          {completed.map(annotation => (
            <li key={annotation.id}>
              <button type="button" className={`annotation-select-button ${annotation.id === activeAnnotationId ? 'active' : ''}`} onClick={() => onSelectAnnotation(annotation.id)}>
                <span>{annotation.targetText}</span><small>{annotation.status === 'completed_changed' ? '修正済 ✓' : '変更せず完了 ✓'}</small>
              </button>
              {phase === 'reviewing' && <button type="button" className="annotation-delete-button" onClick={() => onDeleteRequest(annotation.id)} aria-label={`赤ペン「${annotation.targetText}」を削除`}>削除</button>}
            </li>
          ))}
        </ol>
      </section>}

      <section className="side-card pending-list-card">
        <h2>未完了指示 <span>{pending.length}件</span></h2>
        {pending.length ? (
          <ol className="pending-list">
            {pending.map(annotation => (
              <li key={annotation.id}>
                <button type="button" className={`annotation-select-button ${annotation.id === activeAnnotationId ? 'active' : ''}`} onClick={() => onSelectAnnotation(annotation.id)}>
                  <span>{annotation.targetText}</span><small>{annotation.anchorStatus === 'unresolved' ? '⚠ 原本を確認' : `→ ${annotation.replacementText}`}</small>
                </button>
                {phase === 'reviewing' && <button type="button" className="annotation-delete-button" onClick={() => onDeleteRequest(annotation.id)} aria-label={`赤ペン「${annotation.targetText}」を削除`}>削除</button>}
              </li>
            ))}
          </ol>
        ) : <p className="all-done-small">✓ すべて確認済みです</p>}
      </section>

      <section className="side-card card-2"><h2>個人情報・セキュリティアラート</h2><p>検出機能はまだ有効になっていません。</p></section>
      <section className="side-card card-3"><h2>校正者フィルタ</h2><p>現在の校正者：私</p></section>
    </aside>
  )
}
