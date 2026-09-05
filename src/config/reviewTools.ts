import type { ActiveTool } from '../components/Header'
import type { ReviewPhase } from '../types/review'

export const INITIAL_REVIEW_TOOL: ActiveTool = 'highlighter'

export const initialToolForPhase = (phase: ReviewPhase): ActiveTool =>
  phase === 'reviewing' ? INITIAL_REVIEW_TOOL : 'redPen'
