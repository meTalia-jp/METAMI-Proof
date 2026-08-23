import type { ReviewTag } from '../types/annotation'

export const reviewTagLabels: Record<ReviewTag, string> = {
  question: '疑問',
  rewrite: '修正',
  delete: '削除',
  add: '追記',
  fact_check: '確認',
  note: 'メモ',
}

type ReviewTagPickerProps = {
  value: ReviewTag | null
  onChange: (tag: ReviewTag | null) => void
}

export function ReviewTagPicker({ value, onChange }: ReviewTagPickerProps) {
  return (
    <fieldset className="review-tag-picker">
      <legend>意図タグ（任意・1つまで）</legend>
      <div className="review-tag-buttons">
        {(Object.entries(reviewTagLabels) as [ReviewTag, string][]).map(([tag, label]) => (
          <button key={tag} type="button" className={value === tag ? 'selected' : ''} aria-pressed={value === tag} onClick={() => onChange(value === tag ? null : tag)}>{label}</button>
        ))}
      </div>
    </fieldset>
  )
}
