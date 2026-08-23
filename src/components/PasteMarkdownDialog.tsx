import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react'

type PasteMarkdownDialogProps = { onCancel: () => void; onStart: (markdown: string) => void }

export function PasteMarkdownDialog({ onCancel, onStart }: PasteMarkdownDialogProps) {
  const [markdown, setMarkdown] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  useEffect(() => { textareaRef.current?.focus() }, [])
  const submit = (event: FormEvent) => { event.preventDefault(); if (markdown.trim()) onStart(markdown) }
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => { if (!event.nativeEvent.isComposing && event.key === 'Escape') { event.preventDefault(); onCancel() } }
  return <div className="dialog-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && onCancel()}>
    <section className="red-pen-dialog paste-markdown-dialog" role="dialog" aria-modal="true" aria-labelledby="paste-markdown-title">
      <div className="dialog-pin" aria-hidden="true" /><p className="dialog-kicker">DOCUMENT</p><h2 id="paste-markdown-title">Markdownを貼り付け</h2>
      <form onSubmit={submit}><label className="dialog-field"><span>Markdown本文</span><textarea ref={textareaRef} rows={16} value={markdown} onChange={event => setMarkdown(event.target.value)} onKeyDown={handleKeyDown} placeholder="GPT / Claude等が出力したMarkdownを貼り付けてください。" /></label>
        <p className="dialog-help">空の内容では校正を開始できません。Escでキャンセルできます。</p>
        <div className="dialog-actions"><button type="button" className="secondary-button" onClick={onCancel}>キャンセル</button><button type="submit" className="red-action" disabled={!markdown.trim()}>この内容で校正開始</button></div></form>
    </section>
  </div>
}
