import { zodResolver } from '@hookform/resolvers/zod'
import { Plus } from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'
import { AmountInput } from '@/components/amount-input'
import { FormFieldError } from '@/components/form-error'
import { SegmentedControl } from '@/components/segmented-control'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldTitle } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { type Account, ACCOUNT_TYPES, type AccountType } from '@/lib/database'
import { errorMessage } from '@/lib/errors'
import { ACCOUNT_TYPE_ICONS } from './account-types'
import { useCreateAccount, useUpdateAccount } from './queries'

const NAME_MAX = 60

const schema = z.object({
  name: z.string().trim().min(1, 'validation.required').max(NAME_MAX, 'validation.nameTooLong'),
  type: z.enum(ACCOUNT_TYPES),
  initial_balance: z.number('validation.amountInvalid').int(),
})
type Values = z.infer<typeof schema>

const blank: Values = { name: '', type: 'bank', initial_balance: 0 }

interface AccountFormProps {
  /** Edit this Account; without it the form adds a new one and clears itself for the next. */
  account?: Account
  onSaved?: () => void
}

export function AccountForm({ account, onSaved }: AccountFormProps) {
  const { t } = useTranslation()
  const createAccount = useCreateAccount()
  const updateAccount = useUpdateAccount()
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: account ? { name: account.name, type: account.type, initial_balance: account.initial_balance } : blank,
  })
  const { errors, isSubmitting } = form.formState

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      if (account) {
        await updateAccount.mutateAsync({ id: account.id, ...values })
        toast.success(t('common.saved'))
      } else {
        await createAccount.mutateAsync(values)
        form.reset(blank)
        form.setFocus('name')
      }
      onSaved?.()
    } catch (error) {
      toast.error(errorMessage(error, t))
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <Field data-invalid={Boolean(errors.name)}>
          <FieldLabel htmlFor="account-name">{t('onboarding.accountName')}</FieldLabel>
          <Input
            id="account-name"
            placeholder={t('onboarding.accountNamePlaceholder')}
            autoComplete="off"
            aria-invalid={Boolean(errors.name)}
            {...form.register('name')}
          />
          <FormFieldError error={errors.name} values={{ max: NAME_MAX }} />
        </Field>
        <Field>
          <FieldTitle>{t('onboarding.accountType')}</FieldTitle>
          <Controller
            control={form.control}
            name="type"
            render={({ field }) => (
              <SegmentedControl<AccountType>
                label={t('onboarding.accountType')}
                value={field.value}
                onChange={field.onChange}
                className="grid grid-cols-2 sm:flex"
                options={ACCOUNT_TYPES.map((type) => ({
                  value: type,
                  label: t(`accountTypes.${type}`),
                  icon: ACCOUNT_TYPE_ICONS[type],
                }))}
              />
            )}
          />
        </Field>
        <Field data-invalid={Boolean(errors.initial_balance)}>
          <FieldLabel htmlFor="initial-balance">{t('money.initialBalance')}</FieldLabel>
          <Controller
            control={form.control}
            name="initial_balance"
            render={({ field }) => (
              <AmountInput
                id="initial-balance"
                allowNegative
                aria-describedby="initial-balance-hint"
                value={field.value}
                onChange={(amount) => field.onChange(amount ?? 0)}
              />
            )}
          />
          <FieldDescription id="initial-balance-hint">
            {account ? t('accounts.initialBalanceEditHint') : t('onboarding.initialBalanceHint')}
          </FieldDescription>
        </Field>
        {account ? (
          <Button type="submit" disabled={isSubmitting} className="self-end">
            {t('common.save')}
          </Button>
        ) : (
          <Button type="submit" variant="outline" disabled={isSubmitting} className="self-start">
            <Plus />
            {t('onboarding.addAccount')}
          </Button>
        )}
      </FieldGroup>
    </form>
  )
}
