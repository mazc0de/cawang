import type { FieldError as HookFieldError } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { FieldError } from '@/components/ui/field'

/** Field errors carry translation keys (e.g. "validation.required") as their message. */
export function FormFieldError({ error, values }: { error?: HookFieldError; values?: Record<string, unknown> }) {
  const { t } = useTranslation()
  if (!error?.message) return null
  return <FieldError>{t(error.message as 'validation.required', values)}</FieldError>
}

export function FormAlert({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p role="alert" className="rounded-lg bg-expense-soft px-3 py-2.5 text-sm text-expense">
      {message}
    </p>
  )
}
