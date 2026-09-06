import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react'
import { useTranslation } from '../i18n'

type PasteMarkdownDialogProps = { onCancel: () => void; onStart: (markdown: string) => void }

export function PasteMarkdownDialog({ onCancel, onStart }: PasteMarkdownDialogProps) {
  const { t } = useTranslation()
  const [markdown, setMarkdown] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  useEffect(() => { textareaRef.current?.focus() }, [])
  const submit = (event: FormEvent) => { event.preventDefault(); if (markdown.trim()) onStart(markdown) }
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => { if (!event.nativeEvent.isComposing && event.key === 'Escape') { event.preventDefault(); onCancel() } }
  return <div className="dialog-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && onCancel()}>
    <section className="red-pen-dialog paste-markdown-dialog" role="dialog" aria-modal="true" aria-labelledby="paste-markdown-title">
      <div className="dialog-pin" aria-hidden="true" /><p className="dialog-kicker">DOCUMENT</p><h2 id="paste-markdown-title">{t('paste.title')}</h2>
      <form onSubmit={submit}><label className="dialog-field"><span>{t('paste.body')}</span><textarea ref={textareaRef} rows={16} value={markdown} onChange={event => setMarkdown(event.target.value)} onKeyDown={handleKeyDown} placeholder={t('paste.placeholder')} /></label>
        <p className="dialog-help">{t('paste.help')}</p>
        <div className="dialog-actions"><button type="button" className="secondary-button" onClick={onCancel}>{t('common.cancel')}</button><button type="submit" className="red-action" disabled={!markdown.trim()}>{t('paste.start')}</button></div></form>
    </section>
  </div>
}
