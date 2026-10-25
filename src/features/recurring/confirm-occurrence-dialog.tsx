import { useState } from 'react'
import { DatePicker } from '@/components/date-picker'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AmountInput } from '@/components/amount-input'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { useCurrentProfile } from '@/features/profile/queries'
import { currentLanguage } from '@/i18n'
import { todayIn, zonedParts, zonedTimestamp } from '@/lib/dates'
import { errorMessage } from '@/lib/errors'
import { formatDate } from '@/lib/format'
import { type PendingOccurrence, useConfirmOccurrence } from './queries'

/** Confirm records the Occurrence as a Transaction; the amount and date (default: the due date) may change. */
export function ConfirmOccurrenceDialog({
  occurrence,
  title,
  onOpenChange,
}: {
  occurrence: PendingOccurrence | null
  title: string
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  return (
    <Dialog open={occurrence !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg">{t('recurring.confirmTitle', { name: title })}</DialogTitle>
          <DialogDescription>
            {occurrence && t('recurring.confirmDescription', { date: formatDate(occurrence.dueDate, currentLanguage()) })}
          </DialogDescription>
        </DialogHeader>
        {occurrence && (
          <ConfirmForm key={`${occurrence.template.id}-${occurrence.period}`} occurrence={occurrence} onDone={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  )
}

function ConfirmForm({ occurrence, onDone }: { occurrence: PendingOccurrence; onDone: () => void }) {
  const { t } = useTranslation()
  const profile = useCurrentProfile()
  const today = todayIn(profile.timezone)
  const confirm = useConfirmOccurrence()
  const [amount, setAmount] = useState<number | null>(occurrence.template.amount)
  const [date, setDate] = useState(occurrence.dueDate)
  const valid = amount !== null && amount > 0 && Boolean(date) && date <= today

  return (
    <form
      noValidate
      onSubmit={async (event) => {
        event.preventDefault()
        if (!valid) return
        const time = date === today ? zonedParts(new Date().toISOString(), profile.timezone).time : '12:00'
        try {
          await confirm.mutateAsync({
            templateId: occurrence.template.id,
            period: occurrence.period,
            amount: amount!,
            occurredAt: zonedTimestamp(date, time, profile.timezone),
          })
          toast.success(t('recurring.confirmed'))
          onDone()
        } catch (error) {
          toast.error(errorMessage(error, t))
        }
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="occurrence-amount">{t('transactions.amount')}</FieldLabel>
          <AmountInput id="occurrence-amount" className="h-12 text-lg" value={amount} onChange={setAmount} aria-describedby="occurrence-hint" />
          <FieldDescription id="occurrence-hint">{t('recurring.amountHint')}</FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="occurrence-date">{t('transactions.date')}</FieldLabel>
          <DatePicker id="occurrence-date" max={today} value={date} onChange={setDate} />
        </Field>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onDone}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={!valid || confirm.isPending}>
            {t('recurring.confirm')}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}
