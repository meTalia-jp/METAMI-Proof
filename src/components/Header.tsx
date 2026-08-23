import { useEffect, useRef, useState } from 'react'
import type { ReviewPhase } from '../types/review'
import { APP_NAME, APP_VERSION } from '../config/app'

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

const tools: { id: ActiveTool; tone: string; label: string }[] = [
  { id: 'redPen', tone: 'red', label: '赤ペン' },
  { id: 'highlighter', tone: 'yellow', label: '蛍光ペン' }, { id: 'eraser', tone: 'eraser', label: '消しゴム' },
]
const layouts: { id: PaneLayout; label: string }[] = [
  { id: 'reviewOnly', label: '校正のみ' }, { id: 'sideBySide', label: '左右' }, { id: 'revisionOnly', label: '修正のみ' },
]

export function Header(props: HeaderProps) {
  const { onOpenFile, onPasteMarkdown, onOpenWorkData, onExportWorkData, canExportWorkData, onExportMarkdown, canExportMarkdown, onExportReviewHtml, canExportReviewHtml, onSwap, onToggleSidebar, activeTool, onToolChange, paneLayout, onPaneLayoutChange, sidebarOpen, canSelectTools, annotationCount, pendingCount, onPreviousPending, onNextPending, phase, reviewerCompletedCount, reviewerCount, onCompleteReview, canStartPolishing, onStartPolishing } = props
  const [openMenu, setOpenMenu] = useState<MenuName | null>(null)
  const menusRef = useRef<HTMLDivElement>(null)
  const currentPhaseIndex = phase === 'reviewing' ? 0 : phase === 'locked' || phase === 'revising' ? 1 : phase === 'polishing' ? 2 : 3
  const phaseSteps = ['校正中', '修正中', '全体編集中']

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
        {renderMenu('document', '文書', [{ label: 'Markdownファイルを開く', action: onOpenFile }, { label: 'Markdownを貼り付け', action: onPasteMarkdown }])}
        {renderMenu('workData', '作業データ', [{ label: '開く', action: onOpenWorkData }, { label: '保存', action: onExportWorkData, disabled: !canExportWorkData }])}
        {renderMenu('output', '出力', [{ label: 'Markdownを出力', action: onExportMarkdown, disabled: !canExportMarkdown }, { label: '校正結果HTMLを出力', action: onExportReviewHtml, disabled: !canExportReviewHtml }])}
      </div>
      {phase === 'completed' ? <div className="phase-progress completed-progress" aria-label="現在の工程：完了"><span className="completed-step">完了 ✓</span></div> : <div className="phase-progress" aria-label={`現在の工程：${phaseSteps[currentPhaseIndex]}`}>{phaseSteps.map((label, index) => <span key={label} className={`phase-step ${index === currentPhaseIndex ? 'current' : index < currentPhaseIndex ? 'past' : 'future'}`}><span>{label}</span>{index < phaseSteps.length - 1 && <i aria-hidden="true">→</i>}</span>)}</div>}
    </div>
    <nav className="tools" aria-label="文房具ツール"><span className="tool-shelf-label">文房具</span>{tools.map(tool => <button className={`tool-button ${activeTool === tool.id ? 'selected' : ''}`} type="button" key={tool.id} onClick={() => onToolChange(tool.id)} disabled={!canSelectTools} aria-pressed={activeTool === tool.id} title={canSelectTools ? `${tool.label}を選択` : '校正完了後は校正ツールを使用できません'}><span className={`tool-mark ${tool.tone}`} />{tool.label}</button>)}</nav>
    <div className="header-actions" aria-label="表示操作">
      <div className="layout-switch" role="group" aria-label="文書の表示方法">{layouts.map(layout => <button type="button" key={layout.id} className={paneLayout === layout.id ? 'selected' : ''} onClick={() => onPaneLayoutChange(layout.id)} aria-pressed={paneLayout === layout.id}>{layout.label}</button>)}</div>
      <span className="reviewer-progress">校正者 {reviewerCompletedCount} / {reviewerCount}</span>
      {phase === 'reviewing' && <button className="phase-complete-button" type="button" onClick={onCompleteReview}>校正完了</button>}
      {phase === 'revising' && <button className="phase-complete-button" type="button" onClick={onStartPolishing} disabled={!canStartPolishing} title={canStartPolishing ? '修正フェーズを完了して全体編集へ進みます' : '未完了の校正指示をすべて処理してください'}>修正完了</button>}
      <button className="icon-button" type="button" onClick={onSwap} disabled={paneLayout !== 'sideBySide'} aria-label="原本と修正文書の位置を入れ替え" title={paneLayout === 'sideBySide' ? '左右入れ替え' : '左右表示のときに使用できます'}>⇄</button>
      <button className="icon-button sidebar-toggle" type="button" onClick={onToggleSidebar} aria-label={sidebarOpen ? 'サイドバーを閉じる' : 'サイドバーを開く'} aria-expanded={sidebarOpen}>▤</button>
      <div className="reviewer"><span>校正者</span><span className="avatar">私</span></div>
    </div>
    {(annotationCount > 0 || phase === 'revising' || phase === 'polishing' || phase === 'completed') && <div className={`header-workflow ${pendingCount === 0 ? 'all-complete' : ''}`} role="status">
      {phase === 'completed' ? <strong>✓ このラウンドは完成版として確定されています</strong> : phase === 'polishing' ? <strong>✓ 校正指示はすべて処理済み</strong> : pendingCount === 0 ? <strong>✓ すべて確認済み（全{annotationCount}件）</strong> : <strong>未完了 {pendingCount} / 全{annotationCount}件</strong>}
      {phase === 'revising' && pendingCount > 0 && <div className="pending-navigation" aria-label="未完了指示の移動"><button type="button" onClick={onPreviousPending}>← 前の未完了</button><button type="button" onClick={onNextPending}>次の未完了 →</button></div>}
    </div>}
  </header>
}
