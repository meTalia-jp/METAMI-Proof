import { MarkdownViewer } from './MarkdownViewer'

type DocumentPaneProps = {
  kind: 'original' | 'draft'
  markdown: string
  fileName: string
}

export function DocumentPane({ kind, markdown, fileName }: DocumentPaneProps) {
  const isOriginal = kind === 'original'
  return (
    <section className={`document-pane ${kind}`} aria-label={isOriginal ? '原本' : '修正文書'}>
      <div className="pane-heading">
        <div>
          <span className="pane-kicker">{isOriginal ? 'ORIGINAL' : 'WORKING COPY'}</span>
          <h2>{isOriginal ? '原本 ＋ 校正レイヤー' : '修正文書（編集対象）'}</h2>
        </div>
        <span className="status-tag">{isOriginal ? '読み取り専用' : '未編集'}</span>
      </div>
      <div className="file-strip" title={fileName}>{fileName || 'ファイル未選択'}</div>
      <article className="markdown-body">
        <MarkdownViewer markdown={markdown} />
      </article>
    </section>
  )
}
