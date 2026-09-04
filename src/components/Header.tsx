import { useEffect, useRef, useState } from 'react'
import type { ReviewPhase } from '../types/review'
import { APP_NAME, APP_VERSION } from '../config/app'
import { useTranslation } from '../i18n'
import type { TranslationKey } from '../i18n/ja'

export type ActiveTool = 'redPen' | 'bluePen' | 'highlighter' | 'eraser'
export type PaneLayout = 'reviewOnly' | 'sideBySide' | 'revisionOnly'
type MenuName = 'document' | 'workData' | 'output'
type MenuItem = { label: string; action: () => void; disabled?: boolean }

type HeaderProps = {
  onOpenFile: () => void; onPasteMarkdown: () => void; onOpenWorkData: () => void
  onExportWorkData: () => void; canExportWorkData: boolean
  onExportMarkdown: () => void; canExportMarkdown: boolean
  onExportReviewHtml: () => void; canExportReviewHtml: boolean
  onSwap: () => void; onToggleSidebar: () => void
  activeTool: ActiveTool; onToolChange: (tool: ActiveTool) => void
  paneLayout: PaneLayout; onPaneLayoutChange: (layout: PaneLayout) => void
  sidebarOpen: boolean; canSelectTools: boolean; annotationCount: number; pendingCount: number
  onPreviousPending: () => void; onNextPending: () => void; phase: ReviewPhase
  reviewerCompletedCount: number; reviewerCount: number; onCompleteReview: () => void
  canStartPolishing: boolean; onStartPolishing: () => void
}

const tools: { id: ActiveTool; tone: string; labelKey: TranslationKey }[] = [
  { id: 'redPen', tone: 'red', labelKey: 'tools.redPen' },
  { id: 'highlighter', tone: 'yellow', labelKey: 'tools.highlight' }, { id: 'eraser', tone: 'eraser', labelKey: 'tools.eraser' },
]
const layouts: { id: PaneLayout; labelKey: TranslationKey }[] = [
  { id: 'reviewOnly', labelKey: 'layout.reviewOnly' }, { id: 'sideBySide', labelKey: 'layout.sideBySide' }, { id: 'revisionOnly', labelKey: 'layout.revisionOnly' },
]

export function Header(props: HeaderProps) {
  const { onOpenFile, onPasteMarkdown, onOpenWorkData, onExportWorkData, canExportWorkData, onExportMarkdown, canExportMarkdown, onExportReviewHtml, canExportReviewHtml, onSwap, onToggleSidebar, activeTool, onToolChange, paneLayout, onPaneLayoutChange, sidebarOpen, canSelectTools, annotationCount, pendingCount, onPreviousPending, onNextPending, phase, reviewerCompletedCount, reviewerCount, onCompleteReview, canStartPolishing, onStartPolishing } = props
  const [openMenu, setOpenMenu] = useState<MenuName | null>(null)
  const { t } = useTranslation()
  const menusRef = useRef<HTMLDivElement>(null)
  const currentPhaseIndex = phase === 'reviewing' ? 0 : phase === 'locked' || phase === 'revising' ? 1 : phase === 'polishing' ? 2 : 3
  const phaseSteps = [t('phase.reviewing'), t('phase.revising'), t('phase.polishing')]

  useEffect(() => {
    if (!openMenu) return
    const closeOutside = (event: PointerEvent) => { if (!menusRef.current?.contains(event.target as Node)) setOpenMenu(null) }
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpenMenu(null) }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => { document.removeEventListener('pointerdown', closeOutside); document.removeEventListener('keydown', closeOnEscape) }
  }, [openMenu])

  const runMenuAction = (action: () => void) => { setOpenMenu(null); action() }
  const renderMenu = (name: MenuName, label: string, items: MenuItem[]) => <div className="header-menu">
    <button className="header-menu-trigger" type="button" aria-haspopup="menu" aria-expanded={openMenu === name} onClick={() => setOpenMenu(current => current === name ? null : name)}>{label}<span aria-hidden="true">▼</span></button>
    {openMenu === name && <div className="header-menu-panel" role="menu">{items.map(item => <button key={item.label} type="button" role="menuitem" disabled={item.disabled} onClick={() => runMenuAction(item.action)}>{item.label}</button>)}</div>}
  </div>

  return <header className="app-header">
    <div className="header-primary">
      <div className="brand"><span className="brand-dot" />{APP_NAME}<small className="brand-version">v{APP_VERSION}</small></div>
      <div className="header-menus" ref={menusRef}>
        {renderMenu('document', t('menu.document'), [{ label: t('menu.document.open'), action: onOpenFile }, { label: t('menu.document.paste'), action: onPasteMarkdown }])}
        {renderMenu('workData', t('menu.workData'), [{ label: t('menu.workData.open'), action: onOpenWorkData }, { label: t('menu.workData.save'), action: onExportWorkData, disabled: !canExportWorkData }])}
        {renderMenu('output', t('menu.output'), [{ label: t('menu.output.markdown'), action: onExportMarkdown, disabled: !canExportMarkdown }, { label: t('menu.output.reviewHtml'), action: onExportReviewHtml, disabled: !canExportReviewHtml }])}
      </div>
      {phase === 'completed' ? <div className="phase-progress completed-progress" aria-label={t('header.currentPhaseCompleted')}><span className="completed-step">{t('phase.completed')}</span></div> : <div className="phase-progress" aria-label={t('header.currentPhase', { phase: phaseSteps[currentPhaseIndex] })}>{phaseSteps.map((label, index) => <span key={label} className={`phase-step ${index === currentPhaseIndex ? 'current' : index < currentPhaseIndex ? 'past' : 'future'}`}><span>{label}</span>{index < phaseSteps.length - 1 && <i aria-hidden="true">→</i>}</span>)}</div>}
    </div>
    <nav className="tools" aria-label={t('tools.aria')}><span className="tool-shelf-label">{t('tools.shelf')}</span>{tools.map(tool => { const label = t(tool.labelKey); return <button className={`tool-button ${activeTool === tool.id ? 'selected' : ''}`} type="button" key={tool.id} onClick={() => onToolChange(tool.id)} disabled={!canSelectTools} aria-pressed={activeTool === tool.id} title={canSelectTools ? t('tools.select', { tool: label }) : t('tools.locked')}><span className={`tool-mark ${tool.tone}`} />{label}</button> })}</nav>
    <div className="header-actions" aria-label={t('header.displayActions')}>
      <div className="layout-switch" role="group" aria-label={t('layout.aria')}>{layouts.map(layout => <button type="button" key={layout.id} className={paneLayout === layout.id ? 'selected' : ''} onClick={() => onPaneLayoutChange(layout.id)} aria-pressed={paneLayout === layout.id}>{t(layout.labelKey)}</button>)}</div>
      <span className="reviewer-progress">{t('header.reviewerProgress', { completed: reviewerCompletedCount, total: reviewerCount })}</span>
      {phase === 'reviewing' && <button className="phase-complete-button" type="button" onClick={onCompleteReview}>{t('header.completeReview')}</button>}
      {phase === 'revising' && <button className="phase-complete-button" type="button" onClick={onStartPolishing} disabled={!canStartPolishing} title={canStartPolishing ? t('header.finishRevisionHelp') : t('header.finishRevisionBlocked')}>{t('header.completeRevision')}</button>}
      <button className="icon-button" type="button" onClick={onSwap} disabled={paneLayout !== 'sideBySide'} aria-label={t('header.swapAria')} title={paneLayout === 'sideBySide' ? t('header.swap') : t('header.swapUnavailable')}>⇄</button>
      <button className="icon-button sidebar-toggle" type="button" onClick={onToggleSidebar} aria-label={sidebarOpen ? t('header.closeSidebar') : t('header.openSidebar')} aria-expanded={sidebarOpen}>▤</button>
      <div className="reviewer"><span>{t('header.reviewer')}</span><span className="avatar">{t('header.me')}</span></div>
    </div>
    {(annotationCount > 0 || phase === 'revising' || phase === 'polishing' || phase === 'completed') && <div className={`header-workflow ${pendingCount === 0 ? 'all-complete' : ''}`} role="status">
      {phase === 'completed' ? <strong>{t('header.roundCompleted')}</strong> : phase === 'polishing' ? <strong>{t('header.instructionsProcessed')}</strong> : pendingCount === 0 ? <strong>{t('header.allChecked', { total: annotationCount })}</strong> : <strong>{t('header.pending', { pending: pendingCount, total: annotationCount })}</strong>}
      {phase === 'revising' && pendingCount > 0 && <div className="pending-navigation" aria-label={t('header.pendingNavigation')}><button type="button" onClick={onPreviousPending}>{t('header.previousPending')}</button><button type="button" onClick={onNextPending}>{t('header.nextPending')}</button></div>}
    </div>}
  </header>
}
