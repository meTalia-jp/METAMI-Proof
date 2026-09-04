import type { ReviewTag } from '../types/annotation'
import { useTranslation } from '../i18n'
import type { TranslationKey } from '../i18n/ja'

export const reviewTagLabelKeys: Record<ReviewTag, TranslationKey> = {
  question: 'tag.question',
  rewrite: 'tag.rewrite',
  delete: 'tag.delete',
  add: 'tag.add',
  fact_check: 'tag.fact_check',
  note: 'tag.note',
}

type ReviewTagPickerProps = {
  value: ReviewTag | null
  onChange: (tag: ReviewTag | null) => void
}

export function ReviewTagPicker({ value, onChange }: ReviewTagPickerProps) {
  const { t } = useTranslation()
  return (
    <fieldset className="review-tag-picker">
      <legend>{t('tag.legend')}</legend>
      <div className="review-tag-buttons">
        {(Object.entries(reviewTagLabelKeys) as [ReviewTag, TranslationKey][]).map(([tag, labelKey]) => (
          <button key={tag} type="button" className={value === tag ? 'selected' : ''} aria-pressed={value === tag} onClick={() => onChange(value === tag ? null : tag)}>{t(labelKey)}</button>
        ))}
      </div>
    </fieldset>
  )
}
