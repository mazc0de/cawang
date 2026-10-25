import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import { en } from './locales/en'
import { id } from './locales/id'

export const LANGUAGES = ['id', 'en'] as const
export type Language = (typeof LANGUAGES)[number]

export const LANGUAGE_STORAGE_KEY = 'cawang-language'

export function isLanguage(value: unknown): value is Language {
  return LANGUAGES.includes(value as Language)
}

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en }, id: { translation: id } },
    supportedLngs: LANGUAGES,
    nonExplicitSupportedLngs: true,
    load: 'languageOnly',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      caches: ['localStorage'],
    },
  })

i18n.on('languageChanged', (language) => {
  document.documentElement.lang = language
})
document.documentElement.lang = i18n.resolvedLanguage ?? 'en'

/** The active app language, always one of LANGUAGES. */
export function currentLanguage(): Language {
  const language = i18n.resolvedLanguage
  return isLanguage(language) ? language : 'en'
}

export default i18n
