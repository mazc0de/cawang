import { WifiOff } from 'lucide-react'
import { useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'

function subscribe(onChange: () => void) {
  window.addEventListener('online', onChange)
  window.addEventListener('offline', onChange)
  return () => {
    window.removeEventListener('online', onChange)
    window.removeEventListener('offline', onChange)
  }
}

/** Offline is read-only: say so while the connection is gone. */
export function OfflineBanner() {
  const { t } = useTranslation()
  const online = useSyncExternalStore(subscribe, () => navigator.onLine)
  if (online) return null
  return (
    <p role="status" className="flex items-center gap-2 bg-locked-soft px-4 py-2 text-sm text-locked sm:px-6 lg:px-10">
      <WifiOff className="size-4 shrink-0" />
      {t('offline.banner')}
    </p>
  )
}
