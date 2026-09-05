import { renderToStaticMarkup } from 'react-dom/server'
import { MarkdownViewer } from '../components/MarkdownViewer'
import type { AppTheme } from '../config/settings'
import type { HighlightAnnotation, RedPenAnnotation } from '../types/annotation'
import type { ExportRedPenAnnotation, ReviewExportDataV2 } from '../types/portableReview'

const tagLabels: Record<string, string> = { question: '疑問', rewrite: '修正', delete: '削除', add: '追記', fact_check: '要確認', note: 'メモ' }

const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

const safeEmbeddedJson = (data: ReviewExportDataV2) => JSON.stringify(data, null, 2)
  .replace(/</g, '\\u003c')
  .replace(/\u2028/g, '\\u2028')
  .replace(/\u2029/g, '\\u2029')

const statusLabel = (status: ExportRedPenAnnotation['status']) => {
  if (status === 'completed_changed') return '修正済み'
  if (status === 'completed_unchanged') return '変更せず完了'
  return '未完了'
}

const highlightColorLabel = (color: string) => color === 'green' ? '緑' : color === 'yellow' ? '黄色' : color

function renderSidebar(data: ReviewExportDataV2) {
  const reviewerNames = new Map(data.reviewers.map(reviewer => [reviewer.id, reviewer.name]))
  const correctionData = data.annotations.filter(annotation => annotation.type === 'red_pen')
  const highlightData = data.annotations.filter(annotation => annotation.type === 'highlight')
  const corrections = correctionData.map(annotation => `
    <button class="review-list-item correction-item" type="button" data-sidebar-review-id="${escapeHtml(annotation.id)}">
      <span class="item-kind">赤ペン・${escapeHtml(statusLabel(annotation.status))}</span>
      <span><b>対象：</b>${escapeHtml(annotation.originalAnchor.targetText)}</span>
      ${annotation.reviewText !== undefined ? `<span><b>コメント：</b>${escapeHtml(annotation.reviewText)}</span>` : ''}
      ${annotation.replacementText !== undefined ? `<span><b>${annotation.replacementText === '' ? '削除案' : '本文案'}：</b>${escapeHtml(annotation.replacementText || '対象文章を削除')}</span>` : ''}
      ${annotation.tag ? `<span><b>タグ：</b>${escapeHtml(tagLabels[annotation.tag] ?? annotation.tag)}</span>` : ''}
      <span><b>校正者：</b>${escapeHtml(reviewerNames.get(annotation.reviewerId) ?? '未設定')}</span>
    </button>`).join('')
  const highlights = highlightData.map(annotation => `
    <button class="review-list-item highlight-item" type="button" data-sidebar-review-id="${escapeHtml(annotation.id)}">
      <span class="item-kind">蛍光・${escapeHtml(highlightColorLabel(annotation.color))}</span>
      <span><b>対象：</b>${escapeHtml(annotation.originalAnchor.targetText)}</span>
      ${annotation.comment ? `<span><b>コメント：</b>${escapeHtml(annotation.comment)}</span>` : '<span><b>コメント：</b>なし</span>'}
      ${annotation.tag ? `<span><b>タグ：</b>${escapeHtml(tagLabels[annotation.tag] ?? annotation.tag)}</span>` : ''}
      <span><b>校正者：</b>${escapeHtml(reviewerNames.get(annotation.reviewerId) ?? '未設定')}</span>
    </button>`).join('')
  return `
    <aside class="review-sidebar" aria-label="校正一覧">
      <section><h2>赤ペン <span>${correctionData.length}件</span></h2>${corrections || '<p class="empty-list">赤ペン校正はありません。</p>'}</section>
      <section><h2>蛍光 <span>${highlightData.length}件</span></h2>${highlights || '<p class="empty-list">蛍光校正はありません。</p>'}</section>
    </aside>`
}

export function renderReviewHtml(data: ReviewExportDataV2, theme: AppTheme = 'paper') {
  const reviewerById = new Map(data.reviewers.map(reviewer => [reviewer.id, reviewer]))
  const corrections = data.annotations.filter(annotation => annotation.type === 'red_pen').map(annotation => ({
    ...annotation.originalAnchor, ...annotation, anchorStatus: annotation.draftAnchor ? 'resolved' : 'unresolved', reviewer: reviewerById.get(annotation.reviewerId),
  })) as RedPenAnnotation[]
  const highlights = data.annotations.filter(annotation => annotation.type === 'highlight').map(annotation => ({
    ...annotation.originalAnchor, ...annotation, comment: annotation.comment ?? null, reviewer: reviewerById.get(annotation.reviewerId)!,
  })) as HighlightAnnotation[]
  const documentHtml = renderToStaticMarkup(
    <MarkdownViewer
      markdown={data.document.originalMarkdown}
      annotations={corrections}
      highlights={highlights}
      activeAnnotationId={null}
      mode="original"
    />,
  )
  const reviewerNames = data.reviewers.map(reviewer => reviewer.name).join('、') || '未設定'
  const embeddedJson = safeEmbeddedJson(data)
  const title = `${data.document.sourceFileName || '文書'} - ${data.generator.name} 校正結果`
  const correctionCount = corrections.length
  const highlightCount = highlights.length

  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="metami-proof-format" content="review">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    :root{--paper:#fffdf7;--canvas:#ece7dc;--ink:#2d2c28;--soft:#746e63;--red:#c52f2b;--line:#d8cfbe;--yellow:rgba(255,226,35,.72);--green:rgba(126,214,116,.62)}
    body.review-theme-monochrome{--paper:#fff;--canvas:#f1f2f3;--ink:#111318;--soft:#555a60;--line:#b8bcc0}
    body.review-theme-monochrome .result-header{color:#111318;background:#fff;border-color:#d92e2a;box-shadow:0 2px 10px rgba(20,23,26,.08)}body.review-theme-monochrome .result-meta{color:#4f5459}
    body.review-theme-monochrome .review-document,body.review-theme-monochrome .review-sidebar section{border:1px solid #b8bcc0;box-shadow:0 5px 18px rgba(20,23,26,.1)}body.review-theme-monochrome .review-document h1,body.review-theme-monochrome .review-document h2,body.review-theme-monochrome .review-document h3{font-family:"Yu Gothic",sans-serif;font-weight:800}
    body.review-theme-monochrome .review-list-item{color:#17191c;border-color:#c8cbce}body.review-theme-monochrome .review-list-item:hover,body.review-theme-monochrome .review-list-item.is-linked{background:#e9ebec}
    body.review-theme-monochrome .result-footer{color:#555a60}body.review-theme-monochrome .attention-badge{box-shadow:0 1px 1px rgba(20,23,26,.08)}
    *{box-sizing:border-box}html{color-scheme:light}body{margin:0;color:var(--ink);background:var(--canvas);font-family:"Yu Gothic",Meiryo,sans-serif;line-height:1.8}
    .result-header{padding:22px 28px;color:#fff;background:#3c3933;border-bottom:4px solid var(--red)}
    .result-header h1{margin:0 0 12px;font-family:YuMincho,"Yu Mincho",serif;font-size:25px}.result-meta{display:flex;flex-wrap:wrap;gap:7px 18px;margin:0;color:#eee9dc;font-size:12px}.result-meta span{white-space:nowrap}
    .review-layout{max-width:1600px;margin:0 auto;padding:22px;display:grid;grid-template-columns:minmax(0,1fr) 310px;gap:18px;align-items:start}
    .review-document{min-width:0;padding:32px 38px 64px;background:var(--paper);border:1px solid var(--line);box-shadow:0 5px 20px rgba(50,42,28,.12);overflow-wrap:anywhere}
    .review-document h1,.review-document h2,.review-document h3{font-family:YuMincho,"Yu Mincho",serif;line-height:1.45}.review-document h1{border-bottom:2px solid rgba(197,47,43,.22)}
    .review-document p,.review-document li{white-space:pre-line}.review-document p{margin:0 0 1.1em}.review-document ul,.review-document ol{padding-left:1.8em}.review-document li::marker{color:var(--red)}
    .review-document blockquote{margin:1.3em 0;padding:.7em 1.2em;color:#5d5950;background:#faf3d9;border-left:4px solid #d6b847}
    .review-document code{padding:.12em .35em;border-radius:3px;color:#7e2927;background:#eee9dc;font-family:Consolas,monospace}.review-document pre{overflow:auto;padding:15px 17px;color:#f4f0e6;background:#33332f;border-radius:4px}.review-document pre code{padding:0;color:inherit;background:transparent}
    .review-document table{width:100%;border-collapse:collapse;margin:1.2em 0}.review-document th,.review-document td{padding:7px 9px;border:1px solid #cfc6b7;text-align:left}.review-document th{background:#eee9dc}.review-document a{color:#285a91}
    .red-pen-annotation .del{color:#514e48;background:none;text-decoration:line-through;text-decoration-color:rgba(197,47,43,.75);text-decoration-thickness:1.5px}.red-pen-annotation .ins{display:inline-block;margin-left:.42em;color:var(--red);font-weight:800}.red-pen-annotation .ins::before{content:"挿";margin-right:.25em;color:#ad6c68;font-size:8px;vertical-align:super}.annotation-complete-mark{margin-left:.3em;color:#527148;font-size:.78em;font-weight:700}
    .highlight-annotation{padding:1px 0;color:inherit;background:var(--yellow);box-shadow:inset 0 -2px 0 rgba(201,153,0,.24);border-radius:2px;cursor:pointer}.highlight-annotation.highlight-green{background:var(--green);box-shadow:inset 0 -2px 0 rgba(53,139,69,.24)}.attention-badge{display:inline-block;margin:0 .12em 0 .32em;padding:.12em .48em;border:1px solid #aaa08f;border-radius:999px;color:#574f44;background:#f5f0e5;font-size:10px;font-weight:700;line-height:1.45;vertical-align:.12em;cursor:pointer;white-space:nowrap}.attention-badge-comment{color:#465a68;border-color:#9babb4;background:#edf2f4}.attention-badge-proposal{color:#962e2a;border-color:#d39b96;background:#fff0ed}.attention-badge-deletion{color:#fff;border-color:#a92c28;background:#bd3732}.attention-badge:hover,.attention-badge:focus-visible{outline:2px solid rgba(46,101,158,.35);outline-offset:1px}
    [data-review-id].is-linked{outline:2px solid #2e659e;outline-offset:2px}.review-sidebar{position:sticky;top:16px;display:grid;gap:14px}.review-sidebar section{padding:15px;background:var(--paper);border:1px solid var(--line);box-shadow:0 4px 15px rgba(50,42,28,.1)}.review-sidebar h2{display:flex;justify-content:space-between;margin:0 0 10px;font-size:15px}.review-sidebar h2 span{color:var(--soft);font-size:10px}
    .review-list-item{width:100%;display:grid;gap:4px;padding:9px 8px;border:0;border-top:1px dotted #d9cfbd;color:#4a4740;background:transparent;text-align:left;cursor:pointer;font:inherit;font-size:11px}.review-list-item:first-of-type{border-top:0}.review-list-item:hover,.review-list-item.is-linked{background:#f5efe2}.review-list-item span{overflow-wrap:anywhere}.item-kind{color:var(--red);font-size:9px;font-weight:700}.highlight-item .item-kind{color:#80630b}.empty-list{color:#817a6f;font-size:11px}
    .comment-popover{position:fixed;z-index:20;width:min(290px,calc(100vw - 24px));padding:12px 14px;color:#403a2c;background:#fffdf4;border:1px solid #d6b94f;border-radius:7px;box-shadow:0 8px 24px rgba(49,42,25,.22)}.comment-popover[hidden]{display:none}.comment-popover p{margin:0 0 7px;white-space:pre-wrap;font-size:13px}.comment-popover small{color:#756c59;font-weight:700}
    .result-footer{max-width:1600px;margin:0 auto;padding:0 22px 25px;color:#756e63;font-size:10px}
    @media(max-width:900px){.review-layout{grid-template-columns:1fr}.review-sidebar{position:static}.review-document{padding:25px 22px 50px}}
    @media print{body{background:#fff}.screen-only{display:none!important}.result-header{padding:12mm 10mm;color:#222;background:#fff;border-bottom:2px solid #333}.result-meta{color:#444}.review-layout{display:block;max-width:none;padding:8mm}.review-document{padding:0;border:0;box-shadow:none}.review-sidebar{position:static;margin-top:10mm;page-break-before:always}.review-sidebar section{box-shadow:none;break-inside:avoid}.review-list-item{break-inside:avoid}.result-footer{padding:0 8mm 8mm}}
  </style>
</head>
<body class="review-theme-${theme}">
  <header class="result-header">
    <h1>${escapeHtml(data.generator.name)} 校正結果</h1>
    <p class="result-meta"><span>${escapeHtml(data.generator.name)} ${escapeHtml(data.generator.version)}</span><span>元ファイル：${escapeHtml(data.document.sourceFileName || '未設定')}</span><span>Round ${data.round.number}</span><span>工程：${escapeHtml(data.round.phase)}</span><span>校正者：${escapeHtml(reviewerNames)}</span><span>赤ペン：${correctionCount}件</span><span>蛍光：${highlightCount}件</span></p>
  </header>
  <main class="review-layout">
    <article class="review-document" aria-label="原文と校正結果">${documentHtml}</article>
    ${renderSidebar(data)}
  </main>
  <div id="metami-comment-popover" class="comment-popover screen-only" role="dialog" aria-label="蛍光コメント" hidden><p></p><small></small></div>
  <footer class="result-footer">このファイルには、人間向け校正表示と機械向けReviewExportData 2.0 Nightly revision 1が含まれています。</footer>
  <script type="application/json" id="metami-proof-review-data">${embeddedJson}</script>
  <script>
    (()=>{
      const popover=document.getElementById('metami-comment-popover');let activeMarker=null;
      const clearLinked=()=>document.querySelectorAll('.is-linked').forEach(el=>el.classList.remove('is-linked'));
      const linkReview=id=>{clearLinked();document.querySelectorAll('[data-review-id="'+CSS.escape(id)+'"],[data-sidebar-review-id="'+CSS.escape(id)+'"]').forEach(el=>el.classList.add('is-linked'));};
      const closePopover=()=>{popover.hidden=true;activeMarker=null;};
      const openPopover=marker=>{const rect=marker.getBoundingClientRect();popover.querySelector('p').textContent=marker.dataset.comment||'';popover.querySelector('small').textContent='校正者：'+(marker.dataset.reviewer||'未設定');popover.hidden=false;const gap=8;const width=popover.offsetWidth;const height=popover.offsetHeight;popover.style.left=Math.max(12,Math.min(rect.left,innerWidth-width-12))+'px';popover.style.top=(rect.bottom+gap+height<innerHeight?rect.bottom+gap:Math.max(12,rect.top-height-gap))+'px';activeMarker=marker;};
      document.addEventListener('click',event=>{const marker=event.target.closest('.attention-badge[data-review-type="highlight"][data-comment]:not([data-comment=""])');if(marker){event.stopPropagation();linkReview(marker.dataset.reviewId);if(activeMarker===marker&&!popover.hidden)closePopover();else openPopover(marker);return}const review=event.target.closest('[data-review-id]');if(review){linkReview(review.dataset.reviewId);return}const side=event.target.closest('[data-sidebar-review-id]');if(side){const id=side.dataset.sidebarReviewId;linkReview(id);document.querySelector('[data-review-id="'+CSS.escape(id)+'"]')?.scrollIntoView({behavior:'smooth',block:'center'});closePopover();return}if(!popover.contains(event.target))closePopover();});
      document.addEventListener('keydown',event=>{if(event.key==='Escape'){closePopover();clearLinked();return}if((event.key==='Enter'||event.key===' ')&&event.target.matches('[data-review-id][role="button"]')){event.preventDefault();event.target.click();}});
      addEventListener('scroll',closePopover,true);
    })();
  </script>
</body>
</html>`
}
