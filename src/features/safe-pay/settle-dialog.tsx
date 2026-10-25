import { useState } from 'react'
import { DatePicker } from '@/components/date-picker'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AmountInput } from '@/components/amount-input'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { useCurrentProfile } from '@/features/profile/queries'
import type { SafePay } from '@/lib/database'
import { todayIn, zonedParts, zonedTimestamp } from '@/lib/dates'
import { errorMessage } from '@/lib/errors'
import { formatIDR } from '@/lib/format'
import { useSettleSafePay } from './queries'

/** Settle: the Safe-Pay becomes an Expense; the amount and date may differ from what was locked. */
export function SettleDialog({ safePay, onOpenChange }: { safePay: SafePay | null; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation()
  return (
    <Dialog open={safePay !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg">{t('safePay.settleTitle')}</DialogTitle>
          <DialogDescription>{t('safePay.settleDescription')}</DialogDescription>
        </DialogHeader>
        {safePay && <SettleForm key={safePay.id} safePay={safePay} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function SettleForm({ safePay, onDone }: { safePay: SafePay; onDone: () => void }) {
  const { t } = useTranslation()
  const profile = useCurrentProfile()
  const today = todayIn(profile.timezone)
  const settle = useSettleSafePay()
  const [amount, setAmount] = useState<number | null>(safePay.amount)
  const [date, setDate] = useState(today)
  const difference = amount === null ? 0 : safePay.amount - amount
  const valid = amount !== null && amount > 0 && Boolean(date) && date <= today

  return (
    <form
      noValidate
      onSubmit={async (event) => {
        event.preventDefault()
        if (!valid) return
        const time = date === today ? zonedParts(new Date().toISOString(), profile.timezone).time : '12:00'
        try {
          await settle.mutateAsync({ id: safePay.id, amount: amount!, occurredAt: zonedTimestamp(date, time, profile.timezone) })
          toast.success(t('safePay.settled'))
          onDone()
        } catch (error) {
          toast.error(errorMessage(error, t))
        }
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="settle-amount">{t('safePay.paidAmount')}</FieldLabel>
          <AmountInput id="settle-amount" className="h-12 text-lg" aria-describedby="settle-difference" value={amount} onChange={setAmount} />
          <FieldDescription id="settle-difference">
            {difference > 0
              ? t('safePay.differenceReturns', { amount: formatIDR(difference) })
              : difference < 0
                ? t('safePay.differenceExtra', { amount: formatIDR(-difference) })
                : t('safePay.lockedWas', { amount: formatIDR(safePay.amount) })}
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="settle-date">{t('safePay.paidOn')}</FieldLabel>
          <DatePicker id="settle-date" max={today} value={date} onChange={setDate} />
        </Field>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onDone}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={!valid || settle.isPending}>
            {t('safePay.settle')}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}
