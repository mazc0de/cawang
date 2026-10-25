import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function FullScreenLoader() {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-svh items-center justify-center text-muted-foreground" role="status">
      <Loader2 className="size-5 animate-spin" />
      <span className="sr-only">{t('common.loading')}</span>
    </div>
  )
}
