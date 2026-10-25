import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/providers/theme-provider'
import { useProfile } from './queries'

/** Applies the saved profile language and theme once they load (and whenever they change). */
export function PreferencesSync() {
  const { data: profile } = useProfile()
  const { i18n } = useTranslation()
  const { setTheme } = useTheme()

  useEffect(() => {
    if (profile && profile.language !== i18n.resolvedLanguage) void i18n.changeLanguage(profile.language)
  }, [profile, i18n])

  useEffect(() => {
    if (profile) setTheme(profile.theme)
  }, [profile, setTheme])

  return null
}
