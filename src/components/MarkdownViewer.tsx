import ReactMarkdown from 'react-markdown'

export function MarkdownViewer({ markdown }: { markdown: string }) {
  if (!markdown) {
    return (
      <div className="empty-document">
        <span className="empty-symbol">文</span>
        <p>Markdown文書を開くと、ここに紙面として表示されます。</p>
      </div>
    )
  }

  return <ReactMarkdown>{markdown}</ReactMarkdown>
}
