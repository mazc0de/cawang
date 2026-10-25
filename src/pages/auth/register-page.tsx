import { zodResolver } from '@hookform/resolvers/zod'
import { MailCheck } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { z } from 'zod'
import { FormAlert, FormFieldError } from '@/components/form-error'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { currentLanguage } from '@/i18n'
import { errorMessage } from '@/lib/errors'
import { supabase } from '@/lib/supabase'
import { AuthHeading } from './auth-heading'
import { GoogleButton, OrDivider } from './google-button'
import { emailSchema, newPasswordSchema } from './schemas'

const schema = z.object({ email: emailSchema, password: newPasswordSchema })
type Values = z.infer<typeof schema>

export function RegisterPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } })
  const { errors, isSubmitting } = form.formState

  const onSubmit = form.handleSubmit(async ({ email, password }) => {
    setFormError(null)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        // Seeds the default categories in this language (see handle_new_user in schema.sql).
        data: { language: currentLanguage() },
      },
    })
    if (error) return setFormError(errorMessage(error, t))
    // With email confirmation on, an existing address comes back as a user without identities.
    if (data.user && data.user.identities?.length === 0) return setFormError(t('errors.userExists'))
    if (data.session) return navigate('/onboarding', { replace: true })
    setSentTo(email)
  })

  if (sentTo) {
    return (
      <div>
        <MailCheck className="size-8 text-brand" strokeWidth={1.5} />
        <AuthHeading title={t('auth.checkEmailTitle')} />
        <p className="-mt-4 text-[15px]">{t('auth.checkEmailBody', { email: sentTo })}</p>
        <Button variant="outline" className="mt-8" asChild>
          <Link to="/login">{t('auth.backToLogin')}</Link>
        </Button>
      </div>
    )
  }

  return (
    <>
      <AuthHeading title={t('auth.registerTitle')} subtitle={t('auth.registerSubtitle')} />
      <form onSubmit={onSubmit} noValidate>
        <FieldGroup>
          <FormAlert message={formError} />
          <Field data-invalid={Boolean(errors.email)}>
            <FieldLabel htmlFor="email">{t('auth.email')}</FieldLabel>
            <Input id="email" type="email" autoComplete="email" aria-invalid={Boolean(errors.email)} {...form.register('email')} />
            <FormFieldError error={errors.email} />
          </Field>
          <Field data-invalid={Boolean(errors.password)}>
            <FieldLabel htmlFor="password">{t('auth.password')}</FieldLabel>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              aria-invalid={Boolean(errors.password)}
              aria-describedby="password-hint"
              {...form.register('password')}
            />
            {errors.password ? (
              <FormFieldError error={errors.password} />
            ) : (
              <FieldDescription id="password-hint">{t('auth.passwordHint')}</FieldDescription>
            )}
          </Field>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {t('auth.registerSubmit')}
          </Button>
          <OrDivider />
          <GoogleButton onError={setFormError} />
        </FieldGroup>
      </form>
      <p className="mt-8 text-sm text-muted-foreground">
        {t('auth.haveAccount')}{' '}
        <Link to="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
          {t('auth.loginLink')}
        </Link>
      </p>
    </>
  )
}
