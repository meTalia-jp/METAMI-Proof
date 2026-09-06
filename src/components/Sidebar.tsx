import type { HighlightAnnotation, RedPenAnnotation } from '../types/annotation'
import type { ReviewPhase } from '../types/review'
import { useTranslation } from '../i18n'

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

export function Sidebar({ annotations, highlights, activeAnnotationId, onClose, onSelectAnnotation, onComplete, onApplyProposal, onEdit, onReopen, onDeleteRequest, phase }: SidebarProps) {
  const { t } = useTranslation()
  const statusLabel = (annotation: RedPenAnnotation) => annotation.status === 'completed_changed' ? t('status.changed') : annotation.status === 'completed_unchanged' ? t('status.unchanged') : annotation.anchorStatus === 'unresolved' ? t('status.unresolved') : annotation.proposalApplied ? t('status.proposalApplied') : t('status.pending')
  const highlightColorLabel = (color: HighlightAnnotation['color']) => color === 'green' ? t('highlight.green') : color === 'yellow' ? t('highlight.yellow') : color
  const activeAnnotation = annotations.find(annotation => annotation.id === activeAnnotationId)
  const activeHighlight = highlights.find(annotation => annotation.id === activeAnnotationId)
  const pending = annotations.filter(annotation => annotation.status === 'pending')
  const completed = annotations.filter(annotation => annotation.status !== 'pending')

  return (
    <aside className="sidebar" aria-label={t('sidebar.aria')}>
      <div className="sidebar-heading"><span>{t('sidebar.title')}</span><button type="button" onClick={onClose} aria-label={t('header.closeSidebar')}>×</button></div>

      <section className="side-card workflow-card">
        <h2>{t('sidebar.workflow')}</h2>
        {activeHighlight ? (
          <div className={`active-instruction highlight-detail ${activeHighlight.color}`}>
            <span className={`workflow-status highlight-status ${activeHighlight.color}`}>{t('sidebar.highlightStatus', { color: highlightColorLabel(activeHighlight.color) })}</span>
            <div className="instruction-details">
              <p><span>{t('sidebar.targetText')}</span><mark>{activeHighlight.targetText}</mark></p>
              <p><span>{t('common.comment')}</span><output>{activeHighlight.comment || t('sidebar.noComment')}</output></p>
              <p><span>{t('common.reviewer')}</span><output>{activeHighlight.reviewer.name}</output></p>
            </div>
          </div>
        ) : activeAnnotation ? (
          <div className="active-instruction">
            <span className={`workflow-status ${activeAnnotation.status}`}>{statusLabel(activeAnnotation)}</span>
            <div className="instruction-details">
              <p><span>{t('sidebar.originalTarget')}</span><del>{activeAnnotation.targetText}</del></p>
              {activeAnnotation.reviewText !== undefined && <p><span>{t('redPen.comment')}</span><output>{activeAnnotation.reviewText}</output></p>}
              {activeAnnotation.replacementText !== undefined && <p><span>{t(activeAnnotation.replacementText === '' ? 'redPen.deleteProposal' : 'redPen.proposal')}</span><strong>{activeAnnotation.replacementText || t('redPen.deleteProposalHelp')}</strong></p>}
              {activeAnnotation.resultText !== undefined && <p><span>{t('sidebar.result')}</span><output>{activeAnnotation.resultText || t('sidebar.noResultText')}</output></p>}
            </div>
            {activeAnnotation.anchorStatus === 'unresolved' && <p className="anchor-warning">{t('sidebar.unresolvedWarning')}</p>}
            {activeAnnotation.status === 'pending' && phase === 'revising' && (
              <div className="annotation-actions">
                <div className="editing-actions">
                  <button type="button" onClick={() => onApplyProposal(activeAnnotation.id)} disabled={!activeAnnotation.draftAnchor || activeAnnotation.proposalApplied || activeAnnotation.replacementText === undefined} title={!activeAnnotation.draftAnchor ? t('sidebar.unresolvedApply') : activeAnnotation.replacementText === undefined ? t('sidebar.noProposal') : ''}>{activeAnnotation.proposalApplied ? t('sidebar.applied') : t('sidebar.applyProposal')}</button>
                  <button type="button" onClick={() => onEdit(activeAnnotation.id)}>{t('sidebar.edit')}</button>
                </div>
                <div className="completion-actions">
                  <button type="button" className="complete-changed" onClick={() => onComplete(activeAnnotation.id, true)}>{t('sidebar.completeChanged')}</button>
                  <button type="button" className="complete-unchanged" onClick={() => onComplete(activeAnnotation.id, false)}>{t('sidebar.completeUnchanged')}</button>
                </div>
              </div>
            )}
            {activeAnnotation.status !== 'pending' && phase === 'revising' && (
              <div className="completion-actions">
                <button type="button" className="reopen-action" onClick={() => onReopen(activeAnnotation.id)}>{t('sidebar.reopen')}</button>
              </div>
            )}
            {activeAnnotation.status === 'pending' && phase === 'reviewing' && <p className="phase-guidance">{t('sidebar.phaseGuidance')}</p>}
          </div>
        ) : <p>{t('sidebar.selectGuidance')}</p>}
      </section>

      {highlights.length > 0 && <section className="side-card highlight-list-card">
        <h2>{t('sidebar.highlight')} <span>{t('sidebar.count', { count: highlights.length })}</span></h2>
        <ol className="pending-list">
          {highlights.map(highlight => (
            <li key={highlight.id}>
              <button type="button" className={`annotation-select-button ${highlight.id === activeAnnotationId ? 'active' : ''}`} onClick={() => onSelectAnnotation(highlight.id)}>
                <span>{highlight.targetText}</span><small>{highlight.comment || t('sidebar.noComment')}・{highlightColorLabel(highlight.color)}</small>
              </button>
              {phase === 'reviewing' && <button type="button" className="annotation-delete-button" onClick={() => onDeleteRequest(highlight.id)} aria-label={t('sidebar.deleteHighlightAria', { text: highlight.targetText })}>{t('common.delete')}</button>}
            </li>
          ))}
        </ol>
      </section>}

      {completed.length > 0 && <section className="side-card completed-list-card">
        <h2>{t('sidebar.completed')} <span>{t('sidebar.count', { count: completed.length })}</span></h2>
        <ol className="pending-list">
          {completed.map(annotation => (
            <li key={annotation.id}>
              <button type="button" className={`annotation-select-button ${annotation.id === activeAnnotationId ? 'active' : ''}`} onClick={() => onSelectAnnotation(annotation.id)}>
                <span>{annotation.targetText}</span><small>{annotation.status === 'completed_changed' ? t('status.changed') : t('status.unchanged')}</small>
              </button>
              {phase === 'reviewing' && <button type="button" className="annotation-delete-button" onClick={() => onDeleteRequest(annotation.id)} aria-label={t('sidebar.deleteRedPenAria', { text: annotation.targetText })}>{t('common.delete')}</button>}
            </li>
          ))}
        </ol>
      </section>}

      <section className="side-card pending-list-card">
        <h2>{t('sidebar.pending')} <span>{t('sidebar.count', { count: pending.length })}</span></h2>
        {pending.length ? (
          <ol className="pending-list">
            {pending.map(annotation => (
              <li key={annotation.id}>
                <button type="button" className={`annotation-select-button ${annotation.id === activeAnnotationId ? 'active' : ''}`} onClick={() => onSelectAnnotation(annotation.id)}>
                  <span>{annotation.targetText}</span><small>{!annotation.draftAnchor ? t('sidebar.checkOriginal') : annotation.replacementText !== undefined ? `→ ${annotation.replacementText || t('sidebar.deletion')}` : annotation.reviewText}</small>
                </button>
                {phase === 'reviewing' && <button type="button" className="annotation-delete-button" onClick={() => onDeleteRequest(annotation.id)} aria-label={t('sidebar.deleteRedPenAria', { text: annotation.targetText })}>{t('common.delete')}</button>}
              </li>
            ))}
          </ol>
        ) : <p className="all-done-small">{t('sidebar.allDone')}</p>}
      </section>

      <section className="side-card card-2"><h2>{t('sidebar.securityTitle')}</h2><p>{t('sidebar.securityPending')}</p></section>
      <section className="side-card card-3"><h2>{t('sidebar.filterTitle')}</h2><p>{t('sidebar.currentReviewer')}</p></section>
    </aside>
  )
}
