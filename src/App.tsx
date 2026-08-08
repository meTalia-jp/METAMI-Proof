import { ChangeEvent, useRef, useState } from 'react'
import { DocumentPane } from './components/DocumentPane'
import { Header } from './components/Header'
import { Sidebar } from './components/Sidebar'

type MobilePane = 'original' | 'draft'

function App() {
  const [originalMarkdown, setOriginalMarkdown] = useState('')
  const [draftMarkdown, setDraftMarkdown] = useState('')
  const [fileName, setFileName] = useState('')
  const [swapped, setSwapped] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobilePane, setMobilePane] = useState<MobilePane>('original')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadMarkdown = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const markdown = await file.text()
    setOriginalMarkdown(markdown)
    setDraftMarkdown(markdown)
    setFileName(file.name)
    event.target.value = ''
  }

  const panes = {
    original: <DocumentPane kind="original" markdown={originalMarkdown} fileName={fileName} />,
    draft: <DocumentPane kind="draft" markdown={draftMarkdown} fileName={fileName} />,
  }
  const paneOrder: MobilePane[] = swapped ? ['draft', 'original'] : ['original', 'draft']

  return (
    <div className="app-shell">
      <input ref={fileInputRef} className="visually-hidden" type="file" accept=".md,text/markdown,text/plain" onChange={loadMarkdown} />
      <Header onOpenFile={() => fileInputRef.current?.click()} onSwap={() => setSwapped(value => !value)} onToggleSidebar={() => setSidebarOpen(value => !value)} sidebarOpen={sidebarOpen} />
      <div className="mobile-tabs" role="tablist" aria-label="表示する文書">
        <button type="button" role="tab" aria-selected={mobilePane === 'original'} onClick={() => setMobilePane('original')}>原本</button>
        <button type="button" role="tab" aria-selected={mobilePane === 'draft'} onClick={() => setMobilePane('draft')}>修正文書</button>
      </div>
      <main className={`workspace ${sidebarOpen ? '' : 'sidebar-closed'}`}>
        <div className="document-grid">
          {paneOrder.map(kind => <div className={`pane-slot mobile-${kind} ${mobilePane === kind ? 'mobile-active' : ''}`} key={kind}>{panes[kind]}</div>)}
        </div>
        {sidebarOpen && <Sidebar onClose={() => setSidebarOpen(false)} />}
      </main>
    </div>
  )
}

export default App
