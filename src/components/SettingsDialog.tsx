import { useEffect, useRef, useState } from 'react'
import { APP_NAME, APP_VERSION } from '../config/app'
import { useTranslation } from '../i18n'
import type { TranslationKey } from '../i18n/ja'
import type { AppLocale, AppTheme } from '../config/settings'

type SettingsDialogProps = {
  developerMode: boolean
  theme: AppTheme
  locale: AppLocale
  canExportAiReview: boolean
  onDeveloperModeChange: (enabled: boolean) => void
  onThemeChange: (theme: AppTheme) => void
  onLocaleChange: (locale: AppLocale) => void
  onOpenAiReviewExport: () => void
  onClose: () => void
}

type SettingOption = {
  labelKey: TranslationKey
  valueKey?: TranslationKey
  value?: string
  disabled?: boolean
  statusKey?: TranslationKey
}

function SettingRows({ items }: { items: SettingOption[] }) {
  const { t } = useTranslation()
  return <div className="settings-list">{items.map(item => <div className={`settings-row ${item.disabled ? 'disabled' : ''}`} key={item.labelKey} aria-disabled={item.disabled || undefined}>
    <div><strong>{t(item.labelKey)}</strong>{item.statusKey && <small>{t(item.statusKey)}</small>}</div>
    <span className="settings-value">{item.valueKey ? t(item.valueKey) : item.value}</span>
  </div>)}</div>
}

const DEVELOPER_MODE_CLICK_COUNT = 15

export function SettingsDialog({ developerMode, theme, locale, canExportAiReview, onDeveloperModeChange, onThemeChange, onLocaleChange, onOpenAiReviewExport, onClose }: SettingsDialogProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const versionClickCountRef = useRef(0)
  const [notification, setNotification] = useState('')
  const { t } = useTranslation()

  useEffect(() => {
    closeButtonRef.current?.focus()
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  const handleVersionClick = () => {
    if (developerMode) return
    versionClickCountRef.current += 1
    if (versionClickCountRef.current < DEVELOPER_MODE_CLICK_COUNT) return
    versionClickCountRef.current = 0
    onDeveloperModeChange(true)
    setNotification(t('settings.developerEnabledNotice'))
  }

  const disableDeveloperMode = () => {
    onDeveloperModeChange(false)
    setNotification('')
  }

  return <div className="dialog-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <section className="settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <div className="dialog-pin" aria-hidden="true" />
      <p className="dialog-kicker">SETTINGS</p>
      <div className="settings-heading"><h2 id="settings-title">{t('settings.title')}</h2><button ref={closeButtonRef} className="settings-close" type="button" onClick={onClose} aria-label={t('settings.closeAria')}>×</button></div>
      {notification && <p className="settings-notification" role="status">{notification}</p>}

      <section className="settings-section" aria-labelledby="settings-display"><h3 id="settings-display">{t('settings.display')}</h3><div className="settings-list">
        <div className="settings-row theme-setting-row"><strong>{t('settings.theme')}</strong><div className="theme-options" role="radiogroup" aria-label={t('settings.theme')}>
          <button type="button" role="radio" aria-checked={theme === 'paper'} className={theme === 'paper' ? 'selected' : ''} onClick={() => onThemeChange('paper')}>{t('settings.paper')}</button>
          <button type="button" role="radio" aria-checked={theme === 'monochrome'} className={theme === 'monochrome' ? 'selected' : ''} onClick={() => onThemeChange('monochrome')}>{t('settings.monochrome')}</button>
        </div></div>
      </div></section>
      <section className="settings-section" aria-labelledby="settings-language"><h3 id="settings-language">{t('settings.language')}</h3><div className="settings-list">
        <div className="settings-row theme-setting-row"><strong>{t('settings.language')}</strong><div className="theme-options" role="radiogroup" aria-label={t('settings.language')}>
          <button type="button" role="radio" aria-checked={locale === 'ja'} className={locale === 'ja' ? 'selected' : ''} onClick={() => onLocaleChange('ja')}>{t('settings.japanese')}</button>
          <button type="button" role="radio" aria-checked={locale === 'en'} className={locale === 'en' ? 'selected' : ''} onClick={() => onLocaleChange('en')}>{t('settings.english')}</button>
        </div></div>
      </div></section>
      <section className="settings-section" aria-labelledby="settings-app"><h3 id="settings-app">{t('settings.appInfo')}</h3><div className="settings-list">
        <div className="settings-row"><strong>{t('settings.appName')}</strong><span className="settings-value">{APP_NAME}</span></div>
        <div className="settings-row"><strong>{t('settings.version')}</strong><button className="settings-value settings-version" type="button" onClick={handleVersionClick}>{APP_VERSION}</button></div>
      </div></section>

      {developerMode && <section className="settings-section developer-settings-section" aria-labelledby="settings-developer"><h3 id="settings-developer">{t('settings.developer')}</h3><div className="settings-list">
        <div className="settings-row"><strong>{t('settings.developerMode')}</strong><span className="settings-value enabled">{t('settings.enabled')}</span></div>
        <div className="settings-row settings-experiment-row"><div><strong>{t('settings.experimental')}</strong><small>{t('settings.notWorkspace')}</small></div><button className="settings-experiment-button" type="button" disabled={!canExportAiReview} onClick={onOpenAiReviewExport} title={canExportAiReview ? t('settings.typeBOpen') : t('settings.typeBNeedsDocument')}>{t('settings.typeB')}</button></div>
      </div><button className="disable-developer-button" type="button" onClick={disableDeveloperMode}>{t('settings.disableDeveloper')}</button></section>}

      <div className="dialog-actions"><button type="button" className="secondary-button" onClick={onClose}>{t('common.close')}</button></div>
    </section>
  </div>
}
