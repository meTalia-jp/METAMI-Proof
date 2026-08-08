type HeaderProps = {
  onOpenFile: () => void
  onSwap: () => void
  onToggleSidebar: () => void
  sidebarOpen: boolean
}

const tools = [
  ['red', '赤ペン'],
  ['blue', '青ペン'],
  ['yellow', '蛍光ペン'],
  ['sticky', '付箋'],
  ['balloon', 'バルーン'],
] as const

export function Header({ onOpenFile, onSwap, onToggleSidebar, sidebarOpen }: HeaderProps) {
  return (
    <header className="app-header">
      <div className="brand"><span className="brand-dot" />赤ペンProof</div>
      <nav className="tools" aria-label="校正ツール（準備中）">
        {tools.map(([tone, label]) => (
          <button className="tool-button" type="button" key={label} disabled title="この機能は今後追加予定です">
            <span className={`tool-mark ${tone}`} />{label}
          </button>
        ))}
      </nav>
      <div className="header-actions">
        <button className="file-button" type="button" onClick={onOpenFile}>Markdownを開く</button>
        <button className="icon-button" type="button" onClick={onSwap} aria-label="原本と修正文書の位置を入れ替え" title="左右入れ替え">⇄</button>
        <button className="icon-button sidebar-toggle" type="button" onClick={onToggleSidebar} aria-label={sidebarOpen ? 'サイドバーを閉じる' : 'サイドバーを開く'} aria-expanded={sidebarOpen}>▤</button>
        <div className="reviewer"><span>校正者</span><span className="avatar">私</span></div>
      </div>
    </header>
  )
}
