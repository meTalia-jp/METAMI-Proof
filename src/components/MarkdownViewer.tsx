import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { DocumentSelection, HighlightAnnotation, RedPenAnnotation } from '../types/annotation'

type MarkdownViewerProps = {
  markdown: string
  annotations: RedPenAnnotation[]
  highlights: HighlightAnnotation[]
  selection?: DocumentSelection | null
  activeAnnotationId?: string | null
  mode: 'original' | 'draft'
}

type SourcePoint = { line?: number; column?: number; offset?: number }
type SourcePosition = { start?: SourcePoint; end?: SourcePoint }
type HastNode = {
  type?: string
  tagName?: string
  value?: string
  properties?: Record<string, unknown>
  children?: HastNode[]
  position?: SourcePosition
}

type TextRecord = {
  node: HastNode
  sourceStart: number
  sourceEnd: number
}

const blockTags = new Set(['p', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'])
const inlineTags = new Set(['strong', 'em', 'a', 'code'])

function sourceOffsets(position: SourcePosition | undefined) {
  const start = position?.start?.offset
  const end = position?.end?.offset
  return typeof start === 'number' && typeof end === 'number' ? { start, end } : null
}

function resolveTextOffsets(node: HastNode, parent: HastNode | undefined, markdown: string) {
  const value = node.value ?? ''
  const own = sourceOffsets(node.position)
  if (own && markdown.slice(own.start, own.end) === value) return own

  const parentOffsets = sourceOffsets(parent?.position)
  if (!parentOffsets || !value) return null
  const parentSource = markdown.slice(parentOffsets.start, parentOffsets.end)
  const localStart = parentSource.indexOf(value)
  if (localStart < 0 || localStart !== parentSource.lastIndexOf(value)) return null
  return { start: parentOffsets.start + localStart, end: parentOffsets.start + localStart + value.length }
}

function textNode(value: string): HastNode {
  return { type: 'text', value }
}

function elementNode(tagName: string, properties: Record<string, unknown>, children: HastNode[]): HastNode {
  return { type: 'element', tagName, properties, children }
}

function sourceSpan(value: string, sourceStart: number, sourceEnd: number, extra: Record<string, unknown> = {}) {
  return elementNode('span', { 'data-source-start': sourceStart, 'data-source-end': sourceEnd, ...extra }, [textNode(value)])
}

function createSourcePositionPlugin(markdown: string, annotations: RedPenAnnotation[], highlights: HighlightAnnotation[], selection: DocumentSelection | null | undefined, activeAnnotationId: string | null | undefined, mode: 'original' | 'draft') {
  return () => (tree: HastNode) => {
    const records: TextRecord[] = []

    const collect = (node: HastNode, parent?: HastNode) => {
      if (node.type === 'element' && node.tagName) {
        const offsets = sourceOffsets(node.position)
        node.properties ??= {}
        if (blockTags.has(node.tagName) && offsets) {
          const kind = node.tagName === 'p' ? 'paragraph' : node.tagName.startsWith('h') ? 'heading' : node.tagName
          node.properties['data-source-block'] = 'true'
          node.properties['data-paragraph-id'] = `${kind}_${String(offsets.start).padStart(6, '0')}`
          node.properties['data-source-start'] = offsets.start
          node.properties['data-source-end'] = offsets.end
          node.properties['data-start-line'] = node.position?.start?.line
          node.properties['data-end-line'] = node.position?.end?.line
        }
        if (inlineTags.has(node.tagName) && offsets) {
          node.properties['data-inline-source-start'] = offsets.start
          node.properties['data-inline-source-end'] = offsets.end
          node.properties['data-inline-kind'] = node.tagName === 'a' ? 'link' : node.tagName === 'code' ? 'inline-code' : node.tagName
        }
      }

      if (node.type === 'text') {
        const offsets = resolveTextOffsets(node, parent, markdown)
        if (offsets) records.push({ node, sourceStart: offsets.start, sourceEnd: offsets.end })
      }
      node.children?.forEach(child => collect(child, node))
    }
    collect(tree)

    const activeRanges = [
      ...annotations
        .filter(annotation => mode === 'original' || (
          annotation.draftAnchor
          && markdown.slice(annotation.draftAnchor.start, annotation.draftAnchor.end) === annotation.draftAnchor.text
        ))
        .map(annotation => ({
          kind: 'annotation' as const,
          id: annotation.id,
          anchor: mode === 'original' ? {
            ...annotation,
            sourceStart: annotation.originalAnchor.sourceStart,
            sourceEnd: annotation.originalAnchor.sourceEnd,
          } : {
            ...annotation,
            sourceStart: annotation.draftAnchor!.start,
            sourceEnd: annotation.draftAnchor!.end,
          },
        })),
      ...(mode === 'original' ? highlights.map(highlight => ({
        kind: 'highlight' as const,
        id: highlight.id,
        anchor: highlight,
      })) : []),
      ...(mode === 'original' && selection ? [{ kind: 'selection' as const, id: 'current-selection', anchor: selection }] : []),
    ]
    const firstRecord = new Map<string, HastNode>()
    const lastRecord = new Map<string, HastNode>()
    const emittedHighlightMarkers = new Set<string>()
    for (const range of activeRanges) {
      const overlapping = records.filter(record => record.sourceStart < range.anchor.sourceEnd && record.sourceEnd > range.anchor.sourceStart)
      if (overlapping.length) {
        firstRecord.set(range.id, overlapping[0].node)
        lastRecord.set(range.id, overlapping[overlapping.length - 1].node)
      }
    }

    const highlightCommentMarker = (range: { id: string; anchor: HighlightAnnotation }) => elementNode('span', {
      className: ['highlight-comment-marker', ...(activeAnnotationId === range.id ? ['is-active'] : [])],
      'data-annotation-id': range.id,
      'data-review-id': range.id,
      'data-review-type': 'highlight',
      'data-comment': range.anchor.comment ?? '',
      'data-reviewer': range.anchor.reviewer.name,
      'aria-label': `蛍光コメント：${range.anchor.comment}`,
      title: range.anchor.comment ?? undefined,
      role: 'button',
      tabIndex: 0,
    }, [textNode('💬')])

    const transform = (node: HastNode) => {
      if (!node.children) return
      node.children = node.children.flatMap(child => {
        if (child.type !== 'text') {
          transform(child)
          return [child]
        }
        const record = records.find(item => item.node === child)
        if (!record || !child.value) return [child]

        const overlaps = activeRanges
          .filter(range => record.sourceStart < range.anchor.sourceEnd && record.sourceEnd > range.anchor.sourceStart)
          .sort((a, b) => a.anchor.sourceStart - b.anchor.sourceStart)
        if (!overlaps.length) return [sourceSpan(child.value, record.sourceStart, record.sourceEnd)]

        const result: HastNode[] = []
        let cursor = record.sourceStart
        for (const range of overlaps) {
          const partStart = Math.max(record.sourceStart, range.anchor.sourceStart)
          const partEnd = Math.min(record.sourceEnd, range.anchor.sourceEnd)
          if (partStart < cursor) continue
          if (partStart > cursor) result.push(sourceSpan(child.value.slice(cursor - record.sourceStart, partStart - record.sourceStart), cursor, partStart))
          const visiblePart = child.value.slice(partStart - record.sourceStart, partEnd - record.sourceStart)

          if (range.kind === 'selection') {
            result.push(elementNode('mark', {
              className: ['document-selection', ...(firstRecord.get(range.id) === child ? ['selection-start'] : [])],
              'data-selection': 'current',
              'data-source-start': partStart,
              'data-source-end': partEnd,
            }, [textNode(visiblePart)]))
          } else if (range.kind === 'highlight') {
            result.push(elementNode('mark', {
              className: ['highlight-annotation', `highlight-${range.anchor.color}`, ...(activeAnnotationId === range.id ? ['is-active'] : [])],
              'data-annotation-id': range.id,
              'data-review-id': range.id,
              'data-review-type': 'highlight',
              'data-source-start': partStart,
              'data-source-end': partEnd,
              'aria-label': range.anchor.comment ? `蛍光コメント：${range.anchor.comment}` : `${range.anchor.color === 'green' ? '緑' : '黄色'}蛍光`,
              title: range.anchor.comment ?? undefined,
            }, [textNode(visiblePart)]))
            if (lastRecord.get(range.id) === child && range.anchor.comment) {
              result.push(highlightCommentMarker(range))
              emittedHighlightMarkers.add(range.id)
            }
          } else if (mode === 'original') {
            const completed = range.anchor.status !== 'pending'
            const reviewProperties = { 'data-review-id': range.id, 'data-review-type': 'correction' }
            const children = [elementNode('span', { className: ['del'], ...reviewProperties }, [textNode(visiblePart)])]
            if (lastRecord.get(range.id) === child) {
              const proposal = range.anchor.replacementText ?? range.anchor.reviewText ?? ''
              children.push(elementNode('span', { className: ['ins'], 'aria-label': `レビュー：${proposal}`, ...reviewProperties }, [textNode(proposal)]))
              if (completed) children.push(elementNode('span', { className: ['annotation-complete-mark'], 'aria-label': '確認完了' }, [textNode('✓')]))
            }
            result.push(elementNode('span', {
              className: ['red-pen-annotation', ...(completed ? ['is-completed'] : []), ...(activeAnnotationId === range.id ? ['is-active'] : [])],
              'data-annotation-id': range.id,
              'data-review-id': range.id,
              'data-review-type': 'correction',
              'data-source-start': partStart,
              'data-source-end': partEnd,
            }, children))
          } else {
            const children = [textNode(visiblePart)]
            const markerText = range.anchor.status === 'completed_changed' ? '✓ 完了' : range.anchor.status === 'completed_unchanged' ? '変更なしで完了' : '未反映'
            if (lastRecord.get(range.id) === child) children.push(elementNode('span', { className: ['pending-marker', range.anchor.status] }, [textNode(markerText)]))
            result.push(elementNode('span', {
              className: ['pending-anchor', ...(range.anchor.status !== 'pending' ? ['is-completed'] : []), ...(activeAnnotationId === range.id ? ['is-active'] : [])],
              'data-annotation-id': range.id,
              'data-source-start': partStart,
              'data-source-end': partEnd,
            }, children))
          }
          cursor = partEnd
        }
        if (cursor < record.sourceEnd) result.push(sourceSpan(child.value.slice(cursor - record.sourceStart), cursor, record.sourceEnd))
        for (const highlight of highlights) {
          if (highlight.comment && lastRecord.get(highlight.id) === child && !emittedHighlightMarkers.has(highlight.id)) {
            result.push(highlightCommentMarker({ id: highlight.id, anchor: highlight }))
            emittedHighlightMarkers.add(highlight.id)
          }
        }
        return result
      })
    }
    transform(tree)
  }
}

export function MarkdownViewer({ markdown, annotations, highlights, selection, activeAnnotationId, mode }: MarkdownViewerProps) {
  if (!markdown) {
    return (
      <div className="empty-document">
        <span className="empty-symbol">文</span>
        <p>Markdown文書を開くと、ここに紙面として表示されます。</p>
      </div>
    )
  }

  return <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[createSourcePositionPlugin(markdown, annotations, highlights, selection, activeAnnotationId, mode)]}>{markdown}</ReactMarkdown>
}
