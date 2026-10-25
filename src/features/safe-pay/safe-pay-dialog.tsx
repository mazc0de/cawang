import { zodResolver } from '@hookform/resolvers/zod'
import { DatePicker } from '@/components/date-picker'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'
import { AmountInput } from '@/components/amount-input'
import { FormFieldError } from '@/components/form-error'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { useAccountBalances, useActiveAccounts } from '@/features/accounts/queries'
import { AccountSelect, CategorySelect } from '@/features/transactions/pickers'
import type { SafePay } from '@/lib/database'
import { errorMessage } from '@/lib/errors'
import { useSaveSafePay } from './queries'
import { useMaskedFormat } from '@/providers/amount-visibility'
import { sentenceCase } from '@/components/sentence-case'
import { AmountPresets } from '@/components/amount-presets'
import { presetsOf } from '@/lib/amount-presets'
import { useCurrentProfile } from '@/features/profile/queries'

const schema = z.object({
  amount: z.number('validation.amountInvalid').int().positive('validation.amountInvalid'),
  account_id: z.string().min(1, 'validation.required'),
  category_id: z.string().min(1, 'validation.required'),
  note: z.string().max(500, 'validation.nameTooLong'),
  due_date: z.string(),
})
type Values = z.infer<typeof schema>

interface SafePayDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Edit this pending Safe-Pay; null creates one. */
  safePay: SafePay | null
}

export function SafePayDialog({ open, onOpenChange, safePay }: SafePayDialogProps) {
  const { t } = useTranslation()
  // Defaults pick the first Account, so wait for the list.
  const accounts = useActiveAccounts()
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[94svh] overflow-y-auto sm:max-w-lg sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg">{safePay ? t('safePay.editTitle') : t('safePay.addTitle')}</DialogTitle>
          <DialogDescription>{t('safePay.formDescription')}</DialogDescription>
        </DialogHeader>
        {open && !accounts.isPending && <SafePayForm key={safePay?.id ?? 'new'} safePay={safePay} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function SafePayForm({ safePay, onDone }: { safePay: SafePay | null; onDone: () => void }) {
  const { t } = useTranslation()
  const { data: accounts = [] } = useActiveAccounts()
  const { data: balances } = useAccountBalances()
  const save = useSaveSafePay()
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: safePay
      ? {
          amount: safePay.amount,
          account_id: safePay.account_id,
          category_id: safePay.category_id,
          note: safePay.note ?? '',
          due_date: safePay.due_date ?? '',
        }
      : { amount: null as unknown as number, account_id: accounts[0]?.id ?? '', category_id: '', note: '', due_date: '' },
  })
  const { errors, isSubmitting } = form.formState
  const [accountId, amountValue] = useWatch({ control: form.control, name: ['account_id', 'amount'] })
  const profile = useCurrentProfile()
  const masked = useMaskedFormat(`account:${accountId}`)
  const noteField = form.register('note')

  // This Safe-Pay's own lock is part of the account's Locked Funds while editing it.
  const reported = balances?.get(accountId)?.available_balance
  const available =
    reported === undefined ? undefined : reported + (safePay && safePay.account_id === accountId ? safePay.amount : 0)

  const onSubmit = form.handleSubmit(async (values) => {
    if (available !== undefined && values.amount > available) {
      form.setError('amount', { message: 'validation.overAvailable' })
      return
    }
    try {
      await save.mutateAsync({ id: safePay?.id, ...values, due_date: values.due_date || null })
      toast.success(safePay ? t('common.saved') : t('safePay.created'))
      onDone()
    } catch (error) {
      toast.error(errorMessage(error, t))
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <Field data-invalid={Boolean(errors.amount)}>
          <FieldLabel htmlFor="safe-pay-amount">{t('transactions.amount')}</FieldLabel>
          <Controller
            control={form.control}
            name="amount"
            render={({ field }) => (
              <AmountInput
                id="safe-pay-amount"
                autoFocus={!safePay}
                className="h-12 text-lg"
                aria-invalid={Boolean(errors.amount)}
                aria-describedby="safe-pay-available"
                value={field.value ?? null}
                onChange={field.onChange}
              />
            )}
          />
          <AmountPresets
            presets={presetsOf(profile)}
            amount={amountValue ?? null}
            onChange={(next) => form.setValue('amount', next as number, { shouldValidate: next !== null })}
          />
          {errors.amount ? (
            <FormFieldError error={errors.amount} values={{ amount: masked.formatIDR(available ?? 0) }} />
          ) : (
            available !== undefined && (
              <FieldDescription id="safe-pay-available">{t('safePay.availableHint', { amount: masked.formatIDR(available) })}</FieldDescription>
            )
          )}
        </Field>
        <Field data-invalid={Boolean(errors.account_id)}>
          <FieldLabel htmlFor="safe-pay-account">{t('transactions.account')}</FieldLabel>
          <Controller
            control={form.control}
            name="account_id"
            render={({ field }) => (
              <AccountSelect
                id="safe-pay-account"
                value={field.value}
                onChange={field.onChange}
                invalid={Boolean(errors.account_id)}
                keepIds={[safePay?.account_id]}
              />
            )}
          />
          <FormFieldError error={errors.account_id} />
        </Field>
        <Field data-invalid={Boolean(errors.category_id)}>
          <FieldLabel htmlFor="safe-pay-category">{t('transactions.category')}</FieldLabel>
          <Controller
            control={form.control}
            name="category_id"
            render={({ field }) => (
              <CategorySelect
                id="safe-pay-category"
                type="expense"
                value={field.value}
                onChange={field.onChange}
                invalid={Boolean(errors.category_id)}
                keepIds={[safePay?.category_id]}
              />
            )}
          />
          <FormFieldError error={errors.category_id} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="safe-pay-due">
              {t('safePay.dueDate')} <span className="font-normal text-muted-foreground">({t('common.optional')})</span>
            </FieldLabel>
            <Controller
              control={form.control}
              name="due_date"
              render={({ field }) => <DatePicker id="safe-pay-due" clearable value={field.value} onChange={field.onChange} />}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="safe-pay-note">
              {t('transactions.note')} <span className="font-normal text-muted-foreground">({t('common.optional')})</span>
            </FieldLabel>
            <Input
              id="safe-pay-note"
              autoComplete="off"
              autoCapitalize="sentences"
              placeholder={t('safePay.notePlaceholder')}
              {...noteField}
              onChange={(event) => {
                sentenceCase(event)
                void noteField.onChange(event)
              }}
            />
          </Field>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onDone}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {safePay ? t('common.save') : t('safePay.lockFunds')}
          </Button>
        </div>
      </FieldGroup>
    </form>
  )
}
