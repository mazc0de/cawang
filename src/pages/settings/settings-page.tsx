import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import type { z } from 'zod'
import { ConfirmWordDialog } from '@/components/confirm-word-dialog'
import { FormFieldError } from '@/components/form-error'
import { THEME_OPTIONS } from '@/components/header/theme-toggle'
import { PageHeader } from '@/components/page-header'
import { SegmentedControl } from '@/components/segmented-control'
import { Button } from '@/components/ui/button'
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel, FieldTitle } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { CycleSetting } from '@/features/cycle/cycle-setting'
import { type ProfileChanges, useProfile, useUpdateProfile } from '@/features/profile/queries'
import { usePreferences } from '@/features/profile/use-preferences'
import { LANGUAGES } from '@/i18n'
import type { ThemePreference } from '@/lib/database'
import { errorMessage } from '@/lib/errors'
import { supabase } from '@/lib/supabase'
import { INDONESIAN_TIMEZONES, otherTimezones, timezoneLabel } from '@/lib/timezones'
import { useUser } from '@/providers/auth-provider'
import { newPasswordPairSchema } from '../auth/schemas'
import { Switch } from '@/components/ui/switch'
import { useAmountVisibility } from '@/providers/amount-visibility'
import { AmountPresetsSetting } from '@/features/profile/amount-presets-setting'
import { APP_VERSION_LABEL } from '@/lib/version'

const OTHER_TIMEZONES = otherTimezones()

function SettingsSection({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="grid gap-4 border-t py-8 first:border-t-0 first:pt-0 lg:grid-cols-[minmax(0,5fr)_minmax(0,8fr)] lg:gap-10">
      <div className="lg:pt-6">
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="rounded-(--radius-card) bg-card p-4 border sm:p-6">{children}</div>
    </section>
  )
}

function PasswordForm() {
  const { t } = useTranslation()
  const form = useForm<z.infer<typeof newPasswordPairSchema>>({
    resolver: zodResolver(newPasswordPairSchema),
    defaultValues: { password: '', confirm: '' },
  })
  const { errors, isSubmitting } = form.formState

  const onSubmit = form.handleSubmit(async ({ password }) => {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) return void toast.error(errorMessage(error, t))
    form.reset()
    toast.success(t('settings.passwordChanged'))
  })

  return (
    <form onSubmit={onSubmit} noValidate>
      <FieldGroup>
        <Field data-invalid={Boolean(errors.password)}>
          <FieldLabel htmlFor="new-password">{t('auth.newPassword')}</FieldLabel>
          <Input id="new-password" type="password" autoComplete="new-password" aria-invalid={Boolean(errors.password)} {...form.register('password')} />
          <FormFieldError error={errors.password} />
        </Field>
        <Field data-invalid={Boolean(errors.confirm)}>
          <FieldLabel htmlFor="confirm-password">{t('auth.confirmPassword')}</FieldLabel>
          <Input id="confirm-password" type="password" autoComplete="new-password" aria-invalid={Boolean(errors.confirm)} {...form.register('confirm')} />
          <FormFieldError error={errors.confirm} />
        </Field>
        <Button type="submit" className="self-end" disabled={isSubmitting}>
          {t('settings.passwordSubmit')}
        </Button>
      </FieldGroup>
    </form>
  )
}

export function SettingsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useUser()
  const { data: profile } = useProfile()
  const updateProfile = useUpdateProfile()
  const { language, setLanguage, theme, setTheme } = usePreferences()
  const { globalHidden, setGlobalHidden } = useAmountVisibility()
  const hasPassword = user.identities?.some((identity) => identity.provider === 'email') ?? false

  // Every control saves itself; a quiet toast confirms it.
  const save = (changes: ProfileChanges) =>
    updateProfile.mutate(changes, {
      onSuccess: () => toast.success(t('common.saved'), { id: 'settings-saved' }),
      onError: (error) => toast.error(errorMessage(error, t)),
    })

  const resetData = async () => {
    const { error } = await supabase.rpc('reset_data')
    if (error) {
      toast.error(errorMessage(error, t))
      throw error
    }
    await queryClient.invalidateQueries()
    toast.success(t('settings.resetDone'))
    navigate('/onboarding', { replace: true })
  }

  const deleteLogin = async () => {
    const { error } = await supabase.rpc('delete_account')
    if (error) {
      toast.error(errorMessage(error, t))
      throw error
    }
    await supabase.auth.signOut({ scope: 'local' })
    toast.success(t('settings.deleteDone'))
    navigate('/', { replace: true })
  }

  return (
    <>
      <PageHeader title={t('settings.title')} />
      <div className="mt-8">
        <SettingsSection title={t('settings.cycleTitle')} description={t('settings.cycleBody')}>
          {profile ? (
            <CycleSetting key={profile.cycle_start_day} profile={profile} />
          ) : (
            <Skeleton className="h-[260px] rounded-xl" />
          )}
        </SettingsSection>

        <SettingsSection title={t('amountPresets.settingsTitle')} description={t('amountPresets.settingsBody')}>
          {profile ? <AmountPresetsSetting profile={profile} /> : <Skeleton className="h-28 rounded-xl" />}
        </SettingsSection>

        <SettingsSection title={t('settings.regionTitle')} description={t('settings.regionBody')}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="timezone">{t('settings.timezone')}</FieldLabel>
              {profile ? (
                <Select value={profile.timezone} onValueChange={(timezone) => save({ timezone })}>
                  <SelectTrigger id="timezone" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper" className="max-h-80">
                    <SelectGroup>
                      <SelectLabel>{t('settings.timezonesIndonesia')}</SelectLabel>
                      {INDONESIAN_TIMEZONES.map((zone) => (
                        <SelectItem key={zone.value} value={zone.value}>
                          {timezoneLabel(zone.value)}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel>{t('settings.timezonesAll')}</SelectLabel>
                      {OTHER_TIMEZONES.map((zone) => (
                        <SelectItem key={zone} value={zone}>
                          {timezoneLabel(zone)}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              ) : (
                <Skeleton className="h-10 rounded-lg" />
              )}
            </Field>
            <Field>
              <FieldTitle>{t('settings.language')}</FieldTitle>
              <SegmentedControl
                label={t('settings.language')}
                value={language}
                onChange={setLanguage}
                className="w-full sm:w-auto"
                options={LANGUAGES.map((option) => ({ value: option, label: t(`languages.${option}`) }))}
              />
            </Field>
          </FieldGroup>
        </SettingsSection>

        <SettingsSection title={t('settings.appearanceTitle')} description={t('settings.appearanceBody')}>
          <Field orientation="horizontal" className="mb-5">
            <FieldContent>
              <FieldLabel htmlFor="hide-amounts">{t('privacy.settingTitle')}</FieldLabel>
              <FieldDescription>{t('privacy.settingBody')}</FieldDescription>
            </FieldContent>
            <Switch id="hide-amounts" checked={globalHidden} onCheckedChange={setGlobalHidden} />
          </Field>
          <SegmentedControl<ThemePreference>
            label={t('header.theme')}
            value={theme}
            onChange={setTheme}
            className="w-full sm:w-auto"
            options={THEME_OPTIONS.map((option) => ({ value: option.value, label: t(option.label), icon: option.icon }))}
          />
        </SettingsSection>

        <SettingsSection title={t('settings.passwordTitle')} description={t('settings.passwordBody')}>
          {hasPassword ? <PasswordForm /> : <p className="text-sm text-muted-foreground">{t('settings.passwordGoogleOnly')}</p>}
        </SettingsSection>

        <SettingsSection title={t('settings.dataTitle')} description={t('settings.dataBody')}>
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
              <div>
                <p className="text-sm font-medium">{t('settings.resetTitle')}</p>
                <p className="mt-1 text-sm text-muted-foreground">{t('settings.resetBody')}</p>
              </div>
              <ConfirmWordDialog
                trigger={
                  <Button variant="outline" className="shrink-0 text-expense">
                    {t('settings.resetTitle')}
                  </Button>
                }
                title={t('settings.resetTitle')}
                description={t('settings.resetBody')}
                word={t('settings.resetWord')}
                confirmLabel={t('settings.resetTitle')}
                onConfirm={resetData}
              />
            </div>
            <div className="h-px bg-border" />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
              <div>
                <p className="text-sm font-medium">{t('settings.deleteTitle')}</p>
                <p className="mt-1 text-sm text-muted-foreground">{t('settings.deleteBody')}</p>
              </div>
              <ConfirmWordDialog
                trigger={
                  <Button variant="outline" className="shrink-0 text-expense">
                    {t('settings.deleteTitle')}
                  </Button>
                }
                title={t('settings.deleteTitle')}
                description={t('settings.deleteBody')}
                word={t('settings.deleteWord')}
                confirmLabel={t('settings.deleteTitle')}
                onConfirm={deleteLogin}
              />
            </div>
          </div>
        </SettingsSection>
      </div>
      <p className="mt-2 pb-4 text-[13px] text-muted-foreground">{t('app.versionLine', { version: APP_VERSION_LABEL })}</p>
    </>
  )
}
