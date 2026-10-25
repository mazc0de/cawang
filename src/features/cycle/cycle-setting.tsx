import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { Button } from '@/components/ui/button'
import { useUpdateProfile } from '@/features/profile/queries'
import { currentLanguage } from '@/i18n'
import { cycleContaining } from '@/lib/cycle'
import type { Profile } from '@/lib/database'
import { todayIn } from '@/lib/dates'
import { errorMessage } from '@/lib/errors'
import { formatCycleRange } from '@/lib/format'
import { CycleDayPicker } from './cycle-day-picker'
import { CyclePreview } from './cycle-preview'

/**
 * Settings' Cycle Start Day. Picking a day only previews it; the change is retroactive (every past
 * Cycle is recomputed), so it is saved only after the user confirms.
 */
export function CycleSetting({ profile }: { profile: Profile }) {
  const { t } = useTranslation()
  const updateProfile = useUpdateProfile()
  const [picked, setPicked] = useState(profile.cycle_start_day)
  const [confirming, setConfirming] = useState(false)
  const changed = picked !== profile.cycle_start_day
  const today = todayIn(profile.timezone)
  const range = (day: number) => formatCycleRange(cycleContaining(today, day), currentLanguage())

  return (
    <>
      <CycleDayPicker value={picked} onChange={setPicked} />
      <div className="mt-5">
        <CyclePreview startDay={picked} timezone={profile.timezone} />
      </div>
      {changed && (
        <div className="mt-4 flex flex-col gap-3 rounded-xl bg-locked-soft p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-locked">
            {t('settings.cycleChangePending', { from: profile.cycle_start_day, to: picked })}
          </p>
          <div className="flex shrink-0 gap-2">
            <Button variant="ghost" onClick={() => setPicked(profile.cycle_start_day)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => setConfirming(true)}>{t('settings.cycleChangeButton')}</Button>
          </div>
        </div>
      )}
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={t('settings.cycleConfirmTitle', { day: picked })}
        description={t('settings.cycleConfirmBody', { from: range(profile.cycle_start_day), to: range(picked) })}
        confirmLabel={t('settings.cycleChangeButton')}
        onConfirm={async () => {
          try {
            await updateProfile.mutateAsync({ cycle_start_day: picked })
            toast.success(t('settings.cycleChanged', { day: picked }))
          } catch (error) {
            toast.error(errorMessage(error, t))
            throw error
          }
        }}
      />
    </>
  )
}
