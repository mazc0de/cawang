import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Wordmark } from '@/components/brand-mark'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-svh flex-col px-4 py-4 sm:px-8">
      <Link to="/" className="self-start rounded-lg">
        <Wordmark />
      </Link>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center">
        <h1 className="text-[28px] leading-9 font-semibold tracking-tight">{t('notFound.title')}</h1>
        <p className="mt-2 text-[15px] text-muted-foreground">{t('notFound.body')}</p>
        <Button className="mt-8 self-start" asChild>
          <Link to="/dashboard">{t('notFound.home')}</Link>
        </Button>
      </main>
    </div>
  )
}
