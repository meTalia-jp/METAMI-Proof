const sections = [
  ['付箋・コメント', '付箋やコメントは、次のステップでここに表示されます。'],
  ['個人情報・セキュリティアラート', '検出機能はまだ有効になっていません。'],
  ['校正者フィルタ', '現在の校正者：私'],
]

export function Sidebar({ onClose }: { onClose: () => void }) {
  return (
    <aside className="sidebar" aria-label="校正サイドバー">
      <div className="sidebar-heading"><span>校正メモ</span><button type="button" onClick={onClose} aria-label="サイドバーを閉じる">×</button></div>
      {sections.map(([title, text], index) => (
        <section className={`side-card card-${index + 1}`} key={title}>
          <h2>{title}</h2>
          <p>{text}</p>
        </section>
      ))}
    </aside>
  )
}
