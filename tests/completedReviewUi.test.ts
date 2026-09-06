import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Header } from '../src/components/Header'
import { setLocale } from '../src/i18n'

const assert = (condition: unknown, message: string) => { if (!condition) throw new Error(message) }
const noOp = () => undefined
const baseProps = {
  onOpenFile: noOp, onPasteMarkdown: noOp, onOpenWorkData: noOp,
  onExportWorkData: noOp, canExportWorkData: true,
  onExportMarkdown: noOp, canExportMarkdown: false,
  onExportReviewHtml: noOp, canExportReviewHtml: true,
  onSwap: noOp, onToggleSidebar: noOp,
  activeTool: 'highlighter' as const, onToolChange: noOp,
  paneLayout: 'revisionOnly' as const, onPaneLayoutChange: noOp,
  sidebarOpen: false, canSelectTools: false, annotationCount: 0, pendingCount: 0,
  onPreviousPending: noOp, onNextPending: noOp, phase: 'completed' as const,
  reviewerCompletedCount: 1, reviewerCount: 1, onCompleteReview: noOp,
  canStartPolishing: false, onStartPolishing: noOp, onCompleteRound: noOp,
  currentRoundNumber: 3, onReviewAgain: noOp, onOpenSettings: noOp,
}

setLocale('ja')
const finishedSession = renderToStaticMarkup(createElement(Header, { ...baseProps, canReviewAgain: false }))
assert(!finishedSession.includes('>再校正<'), '校了直後のcompleted画面に再校正ボタンが表示されています')
const reopenedHtml = renderToStaticMarkup(createElement(Header, { ...baseProps, canReviewAgain: true }))
assert(reopenedHtml.includes('>再校正<'), 'completed HTML読込後に再校正ボタンが表示されません')
assert(!reopenedHtml.includes('Round 4を開始'), '旧Round開始表現が表示されています')

setLocale('en')
const reopenedEnglish = renderToStaticMarkup(createElement(Header, { ...baseProps, canReviewAgain: true }))
assert(reopenedEnglish.includes('>Review Again<'), 'English completed HTML読込後にReview Againが表示されません')
assert(!reopenedEnglish.includes('Start Round 4'), '旧English Round開始表現が表示されています')
setLocale('ja')

console.log('Completed review UI tests: PASS')
