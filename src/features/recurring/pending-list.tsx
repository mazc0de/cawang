import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Money } from '@/components/money'
import { Button } from '@/components/ui/button'
import { useCurrentProfile } from '@/features/profile/queries'
import { type Lookups, recordTitle, useLookups } from '@/features/transactions/lookups'
import { RecordTile } from '@/features/transactions/record-tile'
import { currentLanguage } from '@/i18n'
import type { RecurringTemplate } from '@/lib/database'
import { diffInDays, todayIn } from '@/lib/dates'
import { errorMessage } from '@/lib/errors'
import { formatDate } from '@/lib/format'
import { ConfirmOccurrenceDialog } from './confirm-occurrence-dialog'
import { type PendingOccurrence, useSkipOccurrence } from './queries'

export function templateTitle(template: RecurringTemplate, lookups: Lookups): string {
  return template.note || recordTitle(template, lookups)
}

/** Occurrences waiting for Confirm or Skip, each with both actions on its row. */
export function PendingOccurrenceList({ occurrences }: { occurrences: PendingOccurrence[] }) {
  const { t } = useTranslation()
  const profile = useCurrentProfile()
  const today = todayIn(profile.timezone)
  const lookups = useLookups()
  const skip = useSkipOccurrence()
  const [confirming, setConfirming] = useState<PendingOccurrence | null>(null)

  return (
    <>
      <ul>
        {occurrences.map((occurrence) => {
          const { template } = occurrence
          const late = diffInDays(today, occurrence.dueDate)
          return (
            <li key={`${template.id}-${occurrence.period}`} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap sm:px-5">
              <RecordTile type={template.type} categoryId={template.category_id} lookups={lookups} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium">{templateTitle(template, lookups)}</p>
                <p className="truncate text-[13px] text-muted-foreground">
                  {t('recurring.dueOn', { date: formatDate(occurrence.dueDate, currentLanguage()) })}
                  {late > 0 && <span className="text-expense"> · {t('recurring.daysLate', { count: late })}</span>}
                </p>
              </div>
              <Money amount={template.amount} tone={template.type} signed className="text-[15px] font-medium" />
              <div className="flex w-full justify-end gap-1 sm:w-auto">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground"
                  disabled={skip.isPending}
                  onClick={() =>
                    skip.mutate(
                      { templateId: template.id, period: occurrence.period },
                      {
                        onSuccess: () => toast.success(t('recurring.skipped')),
                        onError: (error) => toast.error(errorMessage(error, t)),
                      },
                    )
                  }
                >
                  {t('recurring.skip')}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setConfirming(occurrence)}>
                  {t('recurring.confirm')}
                </Button>
              </div>
            </li>
          )
        })}
      </ul>
      <ConfirmOccurrenceDialog
        occurrence={confirming}
        title={confirming ? templateTitle(confirming.template, lookups) : ''}
        onOpenChange={(open) => !open && setConfirming(null)}
      />
    </>
  )
}
