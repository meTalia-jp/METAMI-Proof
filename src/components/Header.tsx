import type { ReviewPhase } from '../types/review'

type HeaderProps = {
  onOpenFile: () => void
  onSwap: () => void
  onToggleSidebar: () => void
  onRedPen: () => void
  sidebarOpen: boolean
  canUseRedPen: boolean
  annotationCount: number
  pendingCount: number
  onPreviousPending: () => void
  onNextPending: () => void
  phase: ReviewPhase
  reviewerCompletedCount: number
  reviewerCount: number
  onCompleteReview: () => void
  canStartPolishing: boolean
  onStartPolishing: () => void
  canCompletePolishing: boolean
  onCompletePolishing: () => void
}

const tools = [
  ['blue', '青ペン'],
  ['yellow', '蛍光ペン'],
  ['sticky', '付箋'],
  ['balloon', 'バルーン'],
] as const

export function Header({ onOpenFile, onSwap, onToggleSidebar, onRedPen, sidebarOpen, canUseRedPen, annotationCount, pendingCount, onPreviousPending, onNextPending, phase, reviewerCompletedCount, reviewerCount, onCompleteReview, canStartPolishing, onStartPolishing, canCompletePolishing, onCompletePolishing }: HeaderProps) {
  const currentPhaseIndex = phase === 'reviewing' ? 0 : phase === 'locked' || phase === 'revising' ? 1 : phase === 'polishing' ? 2 : 3
  const phaseSteps = ['校正中', '修正中', '全体編集中']
  const redPenUnavailableReason = phase !== 'reviewing' || reviewerCompletedCount === reviewerCount
    ? '校正完了後は赤ペン指示を追加できません'
    : '原本の文字列を選択してください'
  return (
    <header className="app-header">
      <div className="header-primary">
        <div className="brand"><span className="brand-dot" />赤ペンProof</div>
        <button className="file-button" type="button" onClick={onOpenFile}>Markdownを開く</button>
        {phase === 'completed' ? <div className="phase-progress completed-progress" aria-label="現在の工程：完了"><span className="completed-step">完了 ✓</span></div> :
          <div className="phase-progress" aria-label={`現在の工程：${phaseSteps[currentPhaseIndex]}`}>
            {phaseSteps.map((label, index) => <span key={label} className={`phase-step ${index === currentPhaseIndex ? 'current' : index < currentPhaseIndex ? 'past' : 'future'}`}>
              <span>{label}</span>{index < phaseSteps.length - 1 && <i aria-hidden="true">→</i>}
            </span>)}
          </div>}
      </div>
      <nav className="tools" aria-label="校正ツール">
        <button className={`tool-button red-pen-tool ${canUseRedPen ? 'ready' : ''}`} type="button" onClick={onRedPen} disabled={!canUseRedPen} title={canUseRedPen ? '選択箇所に赤ペン修正案を登録' : redPenUnavailableReason}>
          <span className="tool-mark red" />赤ペン
        </button>
        {tools.map(([tone, label]) => (
          <button className="tool-button" type="button" key={label} disabled title="この機能は今後追加予定です">
            <span className={`tool-mark ${tone}`} />{label}
          </button>
        ))}
      </nav>
      <div className="header-actions" aria-label="表示操作">
        <span className="reviewer-progress">校正者 {reviewerCompletedCount} / {reviewerCount}</span>
        {phase === 'reviewing' && <button className="phase-complete-button" type="button" onClick={onCompleteReview}>校正完了</button>}
        {phase === 'revising' && <button className="phase-complete-button" type="button" onClick={onStartPolishing} disabled={!canStartPolishing} title={canStartPolishing ? '修正フェーズを完了して全体編集へ進みます' : '未完了の校正指示をすべて処理してください'}>修正完了</button>}
        {phase === 'polishing' && <button className="phase-complete-button" type="button" onClick={onCompletePolishing} disabled={!canCompletePolishing} title={canCompletePolishing ? '現在の完成版Markdownを出力します' : '確認ダイアログを閉じてから操作してください'}>Markdownを出力</button>}
        <button className="icon-button" type="button" onClick={onSwap} aria-label="原本と修正文書の位置を入れ替え" title="左右入れ替え">⇄</button>
        <button className="icon-button sidebar-toggle" type="button" onClick={onToggleSidebar} aria-label={sidebarOpen ? 'サイドバーを閉じる' : 'サイドバーを開く'} aria-expanded={sidebarOpen}>▤</button>
        <div className="reviewer"><span>校正者</span><span className="avatar">私</span></div>
      </div>
      {(annotationCount > 0 || phase === 'revising' || phase === 'polishing' || phase === 'completed') && (
        <div className={`header-workflow ${pendingCount === 0 ? 'all-complete' : ''}`} role="status">
          {phase === 'completed'
            ? <strong>✓ このラウンドは完成版として確定されています</strong>
            : phase === 'polishing'
            ? <strong>✓ 校正指示はすべて処理済み</strong>
            : pendingCount === 0
              ? <strong>✓ すべて確認済み（全{annotationCount}件）</strong>
            : <strong>未完了 {pendingCount} / 全{annotationCount}件</strong>}
          {phase === 'revising' && pendingCount > 0 && <div className="pending-navigation" aria-label="未完了指示の移動">
            <button type="button" onClick={onPreviousPending}>← 前の未完了</button>
            <button type="button" onClick={onNextPending}>次の未完了 →</button>
          </div>}
        </div>
      )}
    </header>
  )
}
