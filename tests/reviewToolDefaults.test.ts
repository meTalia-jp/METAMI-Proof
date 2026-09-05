import { INITIAL_REVIEW_TOOL, initialToolForPhase } from '../src/config/reviewTools'

const assert = (condition: unknown, message: string) => { if (!condition) throw new Error(message) }

assert(INITIAL_REVIEW_TOOL === 'highlighter', '起動時の初期ツールが蛍光ペンではありません')
assert(initialToolForPhase('reviewing') === 'highlighter', '校正開始時の初期ツールが蛍光ペンではありません')
assert(initialToolForPhase('revising') === 'redPen', '修正フェーズで利用できない蛍光ペンが初期選択されています')

console.log('Review tool defaults tests: PASS')
