import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { currentLanguage, type Language } from '@/i18n'
import type { ThemePreference } from '@/lib/database'
import { errorMessage } from '@/lib/errors'
import { useAuth } from '@/providers/auth-provider'
import { useTheme } from '@/providers/theme-provider'
import { useUpdateProfile } from './queries'

/** Language and theme: applied at once, and saved to the profile when signed in. */
export function usePreferences() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const { theme, setTheme: applyTheme } = useTheme()
  const updateProfile = useUpdateProfile()

  const save = (changes: { language?: Language; theme?: ThemePreference }) => {
    if (!user) return
    updateProfile.mutate(changes, { onError: (error) => toast.error(errorMessage(error, t)) })
  }

  return {
    language: currentLanguage(),
    theme,
    setLanguage: (language: Language) => {
      void i18n.changeLanguage(language)
      save({ language })
    },
    setTheme: (next: ThemePreference) => {
      applyTheme(next)
      save({ theme: next })
    },
  }
}
