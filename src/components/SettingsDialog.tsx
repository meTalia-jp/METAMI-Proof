import { useEffect, useRef } from 'react'
import { APP_NAME, APP_VERSION } from '../config/app'
import { useTranslation } from '../i18n'
import type { TranslationKey } from '../i18n/ja'

type SettingsDialogProps = {
  onClose: () => void
}

type SettingOption = {
  labelKey: TranslationKey
  valueKey?: TranslationKey
  value?: string
  disabled?: boolean
  statusKey?: TranslationKey
}

const displaySettings: SettingOption[] = [
  { labelKey: 'settings.theme', value: 'Paper' },
  { labelKey: 'settings.highContrast', valueKey: 'settings.comingSoon', disabled: true, statusKey: 'settings.planned' },
]

const languageSettings: SettingOption[] = [
  { labelKey: 'settings.japanese', valueKey: 'settings.inUse' },
  { labelKey: 'settings.english', valueKey: 'settings.comingSoon', disabled: true, statusKey: 'settings.planned' },
]

function SettingRows({ items }: { items: SettingOption[] }) {
  const { t } = useTranslation()
  return <div className="settings-list">{items.map(item => <div className={`settings-row ${item.disabled ? 'disabled' : ''}`} key={item.labelKey} aria-disabled={item.disabled || undefined}>
    <div><strong>{t(item.labelKey)}</strong>{item.statusKey && <small>{t(item.statusKey)}</small>}</div>
    <span className="settings-value">{item.valueKey ? t(item.valueKey) : item.value}</span>
  </div>)}</div>
}


export function SettingsDialog({ onClose }: SettingsDialogProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const { t } = useTranslation()

  useEffect(() => {
    closeButtonRef.current?.focus()
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  return <div className="dialog-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <section className="settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <div className="dialog-pin" aria-hidden="true" />
      <p className="dialog-kicker">SETTINGS</p>
      <div className="settings-heading"><h2 id="settings-title">{t('settings.title')}</h2><button ref={closeButtonRef} className="settings-close" type="button" onClick={onClose} aria-label={t('settings.closeAria')}>×</button></div>

      <section className="settings-section" aria-labelledby="settings-display"><h3 id="settings-display">{t('settings.display')}</h3><SettingRows items={displaySettings} /></section>
      <section className="settings-section" aria-labelledby="settings-language"><h3 id="settings-language">{t('settings.language')}</h3><SettingRows items={languageSettings} /></section>
      <section className="settings-section" aria-labelledby="settings-app"><h3 id="settings-app">{t('settings.appInfo')}</h3><div className="settings-list">
        <div className="settings-row"><strong>{t('settings.appName')}</strong><span className="settings-value">{APP_NAME}</span></div>
        <div className="settings-row"><strong>{t('settings.version')}</strong><span className="settings-value">{APP_VERSION}</span></div>
      </div></section>


      <div className="dialog-actions"><button type="button" className="secondary-button" onClick={onClose}>{t('common.close')}</button></div>
    </section>
  </div>
}
