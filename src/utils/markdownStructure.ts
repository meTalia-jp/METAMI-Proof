import { unified } from 'unified'
import remarkParse from 'remark-parse'

export type MarkdownStructureChangeKind =
  | 'heading-level' | 'heading-removed' | 'heading-added'
  | 'list-type' | 'list-removed' | 'list-added'
  | 'blockquote-changed' | 'code-block-changed'
  | 'link-changed' | 'strong-changed' | 'emphasis-changed'
  | 'parse-error'

export type MarkdownStructureChange = {
  id: string
  kind: MarkdownStructureChangeKind
  beforeType?: string
  afterType?: string
  beforeText?: string
  afterText?: string
  description: string
}

type MdNode = { type: string; depth?: number; ordered?: boolean; url?: string; value?: string; children?: MdNode[] }
type BlockRecord = { type: string; family: string; text: string; node: MdNode }
type InlineRecord = { type: 'link' | 'strong' | 'emphasis'; text: string; url?: string }

const parser = unified().use(remarkParse)
const normalize = (value: string) => value.replace(/\s+/g, ' ').trim()
const nodeText = (node: MdNode): string => node.value ?? node.children?.map(nodeText).join('') ?? ''
const typeLabel = (type?: string) => {
  if (!type) return 'なし'
  if (type === 'paragraph') return '通常文章'
  if (type.startsWith('heading-')) return `見出し${type.split('-')[1]}`
  if (type === 'list-unordered') return '箇条書き'
  if (type === 'list-ordered') return '番号付きリスト'
  if (type === 'blockquote') return '引用'
  if (type === 'code') return 'コードブロック'
  if (type === 'link') return 'リンク'
  if (type === 'strong') return '太字'
  if (type === 'emphasis') return '強調'
  return type
}

const blockType = (node: MdNode) => {
  if (node.type === 'heading') return `heading-${node.depth ?? 1}`
  if (node.type === 'list') return node.ordered ? 'list-ordered' : 'list-unordered'
  if (node.type === 'blockquote') return 'blockquote'
  if (node.type === 'code') return 'code'
  return 'paragraph'
}

const familyOf = (type: string) => type.startsWith('heading-') ? 'heading' : type.startsWith('list-') ? 'list' : type

const collect = (tree: MdNode) => {
  const blocks: BlockRecord[] = []
  const inline: InlineRecord[] = []
  for (const child of tree.children ?? []) {
    const type = blockType(child)
    blocks.push({ type, family: familyOf(type), text: normalize(nodeText(child)), node: child })
  }
  const walk = (node: MdNode) => {
    if (node.type === 'link') inline.push({ type: 'link', text: normalize(nodeText(node)), url: node.url })
    if (node.type === 'strong') inline.push({ type: 'strong', text: normalize(nodeText(node)) })
    if (node.type === 'emphasis') inline.push({ type: 'emphasis', text: normalize(nodeText(node)) })
    node.children?.forEach(walk)
  }
  walk(tree)
  return { blocks, inline }
}

const changeKind = (before: string, after: string): MarkdownStructureChangeKind => {
  if (before.startsWith('heading-') && after.startsWith('heading-')) return 'heading-level'
  if (before.startsWith('heading-')) return 'heading-removed'
  if (after.startsWith('heading-')) return 'heading-added'
  if (before.startsWith('list-') && after.startsWith('list-')) return 'list-type'
  if (before.startsWith('list-')) return 'list-removed'
  if (after.startsWith('list-')) return 'list-added'
  if (before === 'blockquote' || after === 'blockquote') return 'blockquote-changed'
  return 'code-block-changed'
}

export function detectMarkdownStructureChanges(oldMarkdown: string, newMarkdown: string): MarkdownStructureChange[] {
  let oldTree: MdNode
  let newTree: MdNode
  try {
    oldTree = parser.parse(oldMarkdown) as MdNode
    newTree = parser.parse(newMarkdown) as MdNode
  } catch {
    return [{ id: 'structure_parse_error', kind: 'parse-error', description: 'Markdown構造を確認できませんでした。変更内容を確認してください。' }]
  }

  const oldData = collect(oldTree)
  const newData = collect(newTree)
  const changes: MarkdownStructureChange[] = []
  const oldUsed = new Set<number>()
  const newUsed = new Set<number>()
  const addBlockChange = (before: BlockRecord, after: BlockRecord) => {
    if (before.type === after.type) return
    changes.push({
      id: `structure_${changes.length + 1}`,
      kind: changeKind(before.type, after.type),
      beforeType: before.type,
      afterType: after.type,
      beforeText: before.text,
      afterText: after.text,
      description: `「${(after.text || before.text).slice(0, 40)}」 ${typeLabel(before.type)} → ${typeLabel(after.type)}`,
    })
  }

  oldData.blocks.forEach((before, oldIndex) => {
    if (!before.text) return
    const newIndex = newData.blocks.findIndex((after, index) => !newUsed.has(index) && after.text === before.text)
    if (newIndex < 0) return
    oldUsed.add(oldIndex)
    newUsed.add(newIndex)
    addBlockChange(before, newData.blocks[newIndex])
  })

  for (const family of ['heading', 'list', 'blockquote', 'code']) {
    const oldIndexes = oldData.blocks.map((record, index) => ({ record, index })).filter(item => item.record.family === family && !oldUsed.has(item.index))
    const newIndexes = newData.blocks.map((record, index) => ({ record, index })).filter(item => item.record.family === family && !newUsed.has(item.index))
    const count = Math.min(oldIndexes.length, newIndexes.length)
    for (let index = 0; index < count; index += 1) {
      oldUsed.add(oldIndexes[index].index)
      newUsed.add(newIndexes[index].index)
      addBlockChange(oldIndexes[index].record, newIndexes[index].record)
    }
  }

  oldData.blocks.forEach((before, index) => {
    if (oldUsed.has(index) || before.family === 'paragraph') return
    const afterType = 'paragraph'
    changes.push({ id: `structure_${changes.length + 1}`, kind: changeKind(before.type, afterType), beforeType: before.type, afterType, beforeText: before.text, description: `「${before.text.slice(0, 40)}」 ${typeLabel(before.type)}が解除または削除されます` })
  })
  newData.blocks.forEach((after, index) => {
    if (newUsed.has(index) || after.family === 'paragraph') return
    const beforeType = 'paragraph'
    changes.push({ id: `structure_${changes.length + 1}`, kind: changeKind(beforeType, after.type), beforeType, afterType: after.type, afterText: after.text, description: `「${after.text.slice(0, 40)}」 ${typeLabel(after.type)}が追加されます` })
  })

  const compareInline = (type: InlineRecord['type']) => {
    const oldItems = oldData.inline.filter(item => item.type === type)
    const newItems = newData.inline.filter(item => item.type === type)
    if (type === 'link') {
      oldItems.forEach(oldItem => {
        const sameUrl = newItems.some(newItem => newItem.url === oldItem.url)
        if (sameUrl) return
        const sameText = newItems.find(newItem => newItem.text === oldItem.text)
        if (sameText) changes.push({ id: `structure_${changes.length + 1}`, kind: 'link-changed', beforeType: 'link', afterType: 'link', beforeText: oldItem.url, afterText: sameText.url, description: `「${oldItem.text.slice(0, 40)}」 リンク先が変更されます` })
        else if (normalize(newMarkdown).includes(oldItem.text)) changes.push({ id: `structure_${changes.length + 1}`, kind: 'link-changed', beforeType: 'link', afterType: 'paragraph', beforeText: oldItem.text, description: `「${oldItem.text.slice(0, 40)}」 リンクが解除されます` })
      })
      newItems.forEach(newItem => {
        if (!oldItems.some(oldItem => oldItem.url === newItem.url) && !oldItems.some(oldItem => oldItem.text === newItem.text) && normalize(oldMarkdown).includes(newItem.text)) changes.push({ id: `structure_${changes.length + 1}`, kind: 'link-changed', beforeType: 'paragraph', afterType: 'link', afterText: newItem.text, description: `「${newItem.text.slice(0, 40)}」 リンクが追加されます` })
      })
      return
    }
    if (oldItems.length === newItems.length) return
    if (oldItems.length > newItems.length) oldItems.filter(item => normalize(newMarkdown).includes(item.text)).slice(0, oldItems.length - newItems.length).forEach(item => changes.push({ id: `structure_${changes.length + 1}`, kind: type === 'strong' ? 'strong-changed' : 'emphasis-changed', beforeType: type, afterType: 'paragraph', beforeText: item.text, description: `「${item.text.slice(0, 40)}」 ${typeLabel(type)}が解除されます` }))
    if (newItems.length > oldItems.length) newItems.filter(item => normalize(oldMarkdown).includes(item.text)).slice(0, newItems.length - oldItems.length).forEach(item => changes.push({ id: `structure_${changes.length + 1}`, kind: type === 'strong' ? 'strong-changed' : 'emphasis-changed', beforeType: 'paragraph', afterType: type, afterText: item.text, description: `「${item.text.slice(0, 40)}」 ${typeLabel(type)}が追加されます` }))
  }
  compareInline('link')
  compareInline('strong')
  compareInline('emphasis')
  return changes
}
