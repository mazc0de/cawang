import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router'
import { z } from 'zod'
import { FormAlert, FormFieldError } from '@/components/form-error'
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { errorMessage } from '@/lib/errors'
import { supabase } from '@/lib/supabase'
import { AuthHeading } from './auth-heading'
import { GoogleButton, OrDivider } from './google-button'
import { emailSchema } from './schemas'

const schema = z.object({ email: emailSchema, password: z.string().min(1, 'validation.required') })
type Values = z.infer<typeof schema>

export function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [formError, setFormError] = useState<string | null>(null)
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } })
  const { errors, isSubmitting } = form.formState

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null)
    const { error } = await supabase.auth.signInWithPassword(values)
    if (error) return setFormError(errorMessage(error, t))
    const from = (location.state as { from?: string } | null)?.from
    navigate(from ?? '/dashboard', { replace: true })
  })

  return (
    <>
      <AuthHeading title={t('auth.loginTitle')} subtitle={t('auth.loginSubtitle')} />
      <form onSubmit={onSubmit} noValidate>
        <FieldGroup>
          <FormAlert message={formError} />
          <Field data-invalid={Boolean(errors.email)}>
            <FieldLabel htmlFor="email">{t('auth.email')}</FieldLabel>
            <Input id="email" type="email" autoComplete="email" aria-invalid={Boolean(errors.email)} {...form.register('email')} />
            <FormFieldError error={errors.email} />
          </Field>
          <Field data-invalid={Boolean(errors.password)}>
            <div className="flex items-center justify-between">
              <FieldLabel htmlFor="password">{t('auth.password')}</FieldLabel>
              <Link to="/forgot-password" className="text-sm text-muted-foreground hover:text-foreground">
                {t('auth.forgotLink')}
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              aria-invalid={Boolean(errors.password)}
              {...form.register('password')}
            />
            <FormFieldError error={errors.password} />
          </Field>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {t('auth.loginSubmit')}
          </Button>
          <OrDivider />
          <GoogleButton onError={setFormError} />
        </FieldGroup>
      </form>
      <p className="mt-8 text-sm text-muted-foreground">
        {t('auth.noAccount')}{' '}
        <Link to="/register" className="font-medium text-foreground underline-offset-4 hover:underline">
          {t('auth.registerLink')}
        </Link>
      </p>
    </>
  )
}
