import { useTranslation } from 'react-i18next'
import { Navigate, Outlet, useLocation } from 'react-router'
import { FullScreenLoader } from '@/components/full-screen-loader'
import { Button } from '@/components/ui/button'
import { PreferencesSync } from '@/features/profile/preferences-sync'
import { useProfile } from '@/features/profile/queries'
import { useAuth } from '@/providers/auth-provider'

export function RequireAuth() {
  const { session, loading } = useAuth()
  const location = useLocation()
  if (loading) return <FullScreenLoader />
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  return <Outlet />
}

/** App screens need a finished onboarding; until then everything leads to the wizard. */
export function RequireOnboarded() {
  const { t } = useTranslation()
  const { data: profile, isPending, isError, refetch } = useProfile()
  if (isPending) return <FullScreenLoader />
  if (isError || !profile) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-[15px]">{t('errors.loadFailed')} {t('errors.network')}</p>
        <Button variant="outline" onClick={() => refetch()}>
          {t('common.retry')}
        </Button>
      </div>
    )
  }
  if (!profile.onboarding_completed_at) return <Navigate to="/onboarding" replace />
  return (
    <>
      <PreferencesSync />
      <Outlet />
    </>
  )
}

export function GuestOnly() {
  const { session, loading } = useAuth()
  if (loading) return <FullScreenLoader />
  if (session) return <Navigate to="/dashboard" replace />
  return <Outlet />
}
