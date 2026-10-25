import { useTranslation } from 'react-i18next'
import { Wordmark } from '@/components/brand-mark'

export function SetupMissingPage() {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-svh flex-col px-4 py-4 sm:px-8">
      <Wordmark />
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center">
        <h1 className="text-[28px] leading-9 font-semibold tracking-tight">{t('setupMissing.title')}</h1>
        <p className="mt-3 text-[15px]">{t('setupMissing.body')}</p>
      </main>
    </div>
  )
}
