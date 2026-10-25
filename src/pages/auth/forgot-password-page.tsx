import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { z } from 'zod'
import { FormAlert, FormFieldError } from '@/components/form-error'
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { errorMessage } from '@/lib/errors'
import { supabase } from '@/lib/supabase'
import { AuthHeading } from './auth-heading'
import { emailSchema } from './schemas'

const schema = z.object({ email: emailSchema })
type Values = z.infer<typeof schema>

export function ForgotPasswordPage() {
  const { t } = useTranslation()
  const [formError, setFormError] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: '' } })
  const { errors, isSubmitting } = form.formState

  const onSubmit = form.handleSubmit(async ({ email }) => {
    setFormError(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) return setFormError(errorMessage(error, t))
    setSentTo(email)
  })

  return (
    <>
      <AuthHeading title={t('auth.forgotTitle')} subtitle={sentTo ? undefined : t('auth.forgotSubtitle')} />
      {sentTo ? (
        <p className="-mt-4 text-[15px]">{t('auth.forgotSent', { email: sentTo })}</p>
      ) : (
        <form onSubmit={onSubmit} noValidate>
          <FieldGroup>
            <FormAlert message={formError} />
            <Field data-invalid={Boolean(errors.email)}>
              <FieldLabel htmlFor="email">{t('auth.email')}</FieldLabel>
              <Input id="email" type="email" autoComplete="email" aria-invalid={Boolean(errors.email)} {...form.register('email')} />
              <FormFieldError error={errors.email} />
            </Field>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {t('auth.forgotSubmit')}
            </Button>
          </FieldGroup>
        </form>
      )}
      <p className="mt-8 text-sm">
        <Link to="/login" className="font-medium underline-offset-4 hover:underline">
          {t('auth.backToLogin')}
        </Link>
      </p>
    </>
  )
}
