import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import type { z } from 'zod'
import { FullScreenLoader } from '@/components/full-screen-loader'
import { FormAlert, FormFieldError } from '@/components/form-error'
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { errorMessage } from '@/lib/errors'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/providers/auth-provider'
import { AuthHeading } from './auth-heading'
import { newPasswordPairSchema } from './schemas'

type Values = z.infer<typeof newPasswordPairSchema>

/** Opened from the reset email: the link signs the user in, then they choose a new password. */
export function ResetPasswordPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { session, loading } = useAuth()
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<Values>({ resolver: zodResolver(newPasswordPairSchema), defaultValues: { password: '', confirm: '' } })
  const { errors, isSubmitting } = form.formState

  if (loading) return <FullScreenLoader />

  if (!session) {
    return (
      <>
        <AuthHeading title={t('auth.resetTitle')} />
        <p className="-mt-4 text-[15px]">{t('auth.resetInvalidLink')}</p>
        <Button variant="outline" className="mt-8" asChild>
          <Link to="/forgot-password">{t('auth.requestNewLink')}</Link>
        </Button>
      </>
    )
  }

  const onSubmit = form.handleSubmit(async ({ password }) => {
    setFormError(null)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) return setFormError(errorMessage(error, t))
    toast.success(t('auth.resetDone'))
    navigate('/dashboard', { replace: true })
  })

  return (
    <>
      <AuthHeading title={t('auth.resetTitle')} />
      <form onSubmit={onSubmit} noValidate>
        <FieldGroup>
          <FormAlert message={formError} />
          <Field data-invalid={Boolean(errors.password)}>
            <FieldLabel htmlFor="password">{t('auth.newPassword')}</FieldLabel>
            <Input id="password" type="password" autoComplete="new-password" aria-invalid={Boolean(errors.password)} {...form.register('password')} />
            <FormFieldError error={errors.password} />
          </Field>
          <Field data-invalid={Boolean(errors.confirm)}>
            <FieldLabel htmlFor="confirm">{t('auth.confirmPassword')}</FieldLabel>
            <Input id="confirm" type="password" autoComplete="new-password" aria-invalid={Boolean(errors.confirm)} {...form.register('confirm')} />
            <FormFieldError error={errors.confirm} />
          </Field>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {t('auth.resetSubmit')}
          </Button>
        </FieldGroup>
      </form>
    </>
  )
}
