import type { DraftAnchor, RedPenAnnotation } from '../types/annotation'

type Candidate = DraftAnchor & { contextScore: number; blockScore: number; distance: number }

const occurrences = (text: string, needle: string) => {
  const result: number[] = []
  if (!needle) return result
  let offset = 0
  while (offset <= text.length - needle.length) {
    const found = text.indexOf(needle, offset)
    if (found < 0) break
    result.push(found)
    offset = found + Math.max(1, needle.length)
  }
  return result
}

const suffixSimilarity = (actual: string, expected: string) => {
  const length = Math.min(actual.length, expected.length)
  if (!length) return 0
  let matches = 0
  while (matches < length && actual[actual.length - 1 - matches] === expected[expected.length - 1 - matches]) matches += 1
  return matches / Math.max(1, expected.length)
}

const prefixSimilarity = (actual: string, expected: string) => {
  const length = Math.min(actual.length, expected.length)
  if (!length) return 0
  let matches = 0
  while (matches < length && actual[matches] === expected[matches]) matches += 1
  return matches / Math.max(1, expected.length)
}

const normalize = (value: string) => value.replace(/\s+/g, ' ').trim()
const bigrams = (value: string) => {
  const normalized = normalize(value)
  const result = new Set<string>()
  for (let index = 0; index < normalized.length - 1; index += 1) result.add(normalized.slice(index, index + 2))
  return result
}

const blockSimilarity = (left: string, right: string) => {
  if (normalize(left) === normalize(right)) return 1
  const a = bigrams(left)
  const b = bigrams(right)
  if (!a.size || !b.size) return 0
  let shared = 0
  a.forEach(value => { if (b.has(value)) shared += 1 })
  return (2 * shared) / (a.size + b.size)
}

const blockAt = (markdown: string, position: number) => {
  const beforeBreak = markdown.lastIndexOf('\n\n', Math.max(0, position - 1))
  const afterBreak = markdown.indexOf('\n\n', position)
  const start = beforeBreak < 0 ? 0 : beforeBreak + 2
  const end = afterBreak < 0 ? markdown.length : afterBreak
  return markdown.slice(start, end)
}

export function resolveDraftAnchor(markdown: string, annotation: RedPenAnnotation): { anchorStatus: 'resolved' | 'unresolved'; draftAnchor: DraftAnchor | null } {
  const expected = annotation.draftAnchor?.text ?? annotation.originalAnchor.sourceText
  const previous = annotation.draftAnchor ?? { start: annotation.sourceStart, end: annotation.sourceEnd, method: 'offset' as const }

  if (annotation.draftAnchor && markdown.slice(previous.start, previous.end) === expected) {
    return { anchorStatus: 'resolved', draftAnchor: { start: previous.start, end: previous.end, text: expected, method: 'offset', confidence: 1 } }
  }

  const positions = occurrences(markdown, expected)
  if (positions.length === 0) return { anchorStatus: 'unresolved', draftAnchor: null }
  if (positions.length === 1) {
    return { anchorStatus: 'resolved', draftAnchor: { start: positions[0], end: positions[0] + expected.length, text: expected, method: 'context', confidence: 1 } }
  }

  const original = annotation.originalAnchor ?? annotation
  const candidates: Candidate[] = positions.map(start => {
    const before = markdown.slice(Math.max(0, start - original.contextBefore.length), start)
    const after = markdown.slice(start + expected.length, start + expected.length + original.contextAfter.length)
    const contextScore = (suffixSimilarity(before, original.contextBefore) + prefixSimilarity(after, original.contextAfter)) / 2
    return {
      start,
      end: start + expected.length,
      text: expected,
      method: 'context',
      contextScore,
      blockScore: original.blockText ? blockSimilarity(blockAt(markdown, start), original.blockText) : 0,
      distance: Math.abs(start - previous.start),
    }
  })

  const byContext = [...candidates].sort((a, b) => b.contextScore - a.contextScore || a.distance - b.distance)
  if (byContext[0].contextScore >= 0.6 && byContext[0].contextScore - byContext[1].contextScore >= 0.15) {
    const winner = byContext[0]
    return { anchorStatus: 'resolved', draftAnchor: { start: winner.start, end: winner.end, text: expected, method: 'context', confidence: winner.contextScore } }
  }

  const byBlock = [...candidates].sort((a, b) => b.blockScore - a.blockScore || b.contextScore - a.contextScore || a.distance - b.distance)
  if (byBlock[0].blockScore >= 0.75 && byBlock[0].blockScore - byBlock[1].blockScore >= 0.15) {
    const winner = byBlock[0]
    return { anchorStatus: 'resolved', draftAnchor: { start: winner.start, end: winner.end, text: expected, method: 'block', confidence: winner.blockScore } }
  }

  return { anchorStatus: 'unresolved', draftAnchor: null }
}

export const reanchorPendingAnnotations = (markdown: string, annotations: RedPenAnnotation[]) =>
  annotations.map(annotation => annotation.status === 'pending' ? { ...annotation, ...resolveDraftAnchor(markdown, annotation) } : annotation)
