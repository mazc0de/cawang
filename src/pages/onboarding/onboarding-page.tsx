import { Check, Trash2 } from 'lucide-react'
import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Wordmark } from '@/components/brand-mark'
import { FullScreenLoader } from '@/components/full-screen-loader'
import { ThemeToggle } from '@/components/header/theme-toggle'
import { Money } from '@/components/money'
import { Button } from '@/components/ui/button'
import { AccountForm } from '@/features/accounts/account-form'
import { ACCOUNT_TYPE_ICONS } from '@/features/accounts/account-types'
import { useActiveAccounts, useDeleteAccount } from '@/features/accounts/queries'
import { CycleDayPicker } from '@/features/cycle/cycle-day-picker'
import { CyclePreview } from '@/features/cycle/cycle-preview'
import { useProfile, useUpdateProfile } from '@/features/profile/queries'
import { currentLanguage, type Language, LANGUAGES } from '@/i18n'
import { todayIn } from '@/lib/dates'
import { errorMessage } from '@/lib/errors'
import { formatDate, formatIDR } from '@/lib/format'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { AlwaysShowAmounts } from '@/providers/amount-visibility'

const STEPS = ['onboarding.stepLanguage', 'onboarding.stepCycle', 'onboarding.stepAccounts'] as const

function StepHeading({ title, body }: { title: string; body: string }) {
  return (
    <div className="mb-8">
      <h1 className="text-[26px] leading-8 font-semibold tracking-tight sm:text-[28px] sm:leading-9">{title}</h1>
      <p className="mt-2 text-[15px] text-muted-foreground">{body}</p>
    </div>
  )
}

function Progress({ step }: { step: number }) {
  const { t } = useTranslation()
  return (
    <ol aria-label={t('onboarding.progress')} className="grid grid-cols-3 gap-2">
      {STEPS.map((label, index) => (
        <li key={label} aria-current={index === step ? 'step' : undefined}>
          <span className={cn('block h-1 rounded-full', index <= step ? 'bg-primary' : 'bg-border')} />
          <span className={cn('mt-2 block text-xs', index === step ? 'font-medium text-foreground' : 'text-muted-foreground')}>
            {t(label)}
          </span>
        </li>
      ))}
    </ol>
  )
}

export function OnboardingPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { data: profile, isPending } = useProfile()
  const updateProfile = useUpdateProfile()
  const accounts = useActiveAccounts()
  const deleteAccount = useDeleteAccount()
  const [step, setStep] = useState(0)
  const [cycleDay, setCycleDay] = useState<number | null>(null)
  const languageSynced = useRef(false)

  const fail = (error: unknown) => toast.error(errorMessage(error, t))

  // The profile was created with the signup language (or Indonesian after Google sign-in);
  // the language this browser is showing wins, and the untouched default categories follow it.
  const chooseLanguage = async (language: Language) => {
    void i18n.changeLanguage(language)
    try {
      await updateProfile.mutateAsync({ language })
      const { error } = await supabase.rpc('reseed_default_categories', { p_lang: language })
      if (error) throw error
    } catch (error) {
      fail(error)
    }
  }

  const syncLanguageOnce = useEffectEvent(() => {
    if (!profile || languageSynced.current) return
    languageSynced.current = true
    if (profile.language !== currentLanguage()) void chooseLanguage(currentLanguage())
  })
  useEffect(() => syncLanguageOnce(), [profile])

  if (isPending || !profile) return <FullScreenLoader />
  if (profile.onboarding_completed_at) return <Navigate to="/dashboard" replace />

  const language = currentLanguage()
  const today = todayIn(profile.timezone)
  const day = cycleDay ?? profile.cycle_start_day
  const accountList = accounts.data ?? []
  const total = accountList.reduce((sum, account) => sum + account.initial_balance, 0)

  const saveCycleDay = async () => {
    try {
      if (day !== profile.cycle_start_day) await updateProfile.mutateAsync({ cycle_start_day: day })
      setStep(2)
    } catch (error) {
      fail(error)
    }
  }

  const finish = async () => {
    try {
      await updateProfile.mutateAsync({ onboarding_completed_at: new Date().toISOString() })
      navigate('/dashboard', { replace: true })
    } catch (error) {
      fail(error)
    }
  }

  return (
    // Setup shows the balances being entered, whatever the hide-amounts setting.
    <AlwaysShowAmounts>
    <div className="min-h-svh">
      <div className="flex h-14 items-center justify-between px-4 sm:px-8">
        <Wordmark />
        <ThemeToggle />
      </div>
      <main className="mx-auto w-full max-w-[640px] px-4 pt-6 pb-16 sm:pt-10">
        <Progress step={step} />

        <section className="mt-10">
          {step === 0 && (
            <>
              <StepHeading title={t('onboarding.languageHeading')} body={t('onboarding.languageBody')} />
              <div role="radiogroup" aria-label={t('settings.language')} className="grid gap-3 sm:grid-cols-2">
                {LANGUAGES.map((option) => {
                  const selected = option === language
                  return (
                    <button
                      key={option}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => chooseLanguage(option)}
                      className={cn(
                        'flex items-start justify-between rounded-(--radius-card) border-2 bg-card p-5 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                        selected ? 'border-primary' : 'border-border hover:border-foreground/25',
                      )}
                    >
                      <span>
                        <span className="block text-[17px] font-semibold">{t(`languages.${option}`)}</span>
                        <span className="num mt-1 block text-sm text-muted-foreground">
                          {formatDate(today, option)} · {formatIDR(1_250_000)}
                        </span>
                      </span>
                      {selected && <Check className="size-5 shrink-0" />}
                    </button>
                  )
                })}
              </div>
              <div className="mt-10 flex justify-end gap-2">
                <Button onClick={() => setStep(1)}>{t('common.continue')}</Button>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <StepHeading title={t('onboarding.cycleHeading')} body={t('onboarding.cycleBody')} />
              <div className="rounded-(--radius-card) bg-card p-4 border sm:p-6">
                <CycleDayPicker value={day} onChange={setCycleDay} />
                <div className="mt-5">
                  <CyclePreview startDay={day} timezone={profile.timezone} />
                </div>
              </div>
              <div className="mt-10 flex items-center justify-between gap-2">
                <Button variant="ghost" onClick={() => setStep(0)}>
                  {t('common.back')}
                </Button>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setStep(2)}>
                    {t('common.skip')}
                  </Button>
                  <Button onClick={saveCycleDay} disabled={updateProfile.isPending}>
                    {t('common.continue')}
                  </Button>
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <StepHeading title={t('onboarding.accountsHeading')} body={t('onboarding.accountsBody')} />
              <div className="rounded-(--radius-card) bg-card p-4 border sm:p-6">
                <AccountForm />
              </div>

              <div className="mt-8">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-base font-semibold">{t('onboarding.yourAccounts')}</h2>
                  {accountList.length > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {t('money.totalBalance')} <Money amount={total} className="font-semibold text-foreground" />
                    </span>
                  )}
                </div>
                {accountList.length === 0 ? (
                  <p className="mt-3 rounded-xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
                    {t('onboarding.needOneAccount')}
                  </p>
                ) : (
                  <ul className="mt-2">
                    {accountList.map((account) => {
                      const Icon = ACCOUNT_TYPE_ICONS[account.type]
                      return (
                        <li key={account.id} className="flex h-16 items-center gap-3">
                          <span className="inline-flex size-6 shrink-0 items-center justify-center text-muted-foreground">
                            <Icon className="size-[18px]" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[15px] font-medium">{account.name}</span>
                            <span className="block text-xs text-muted-foreground">{t(`accountTypes.${account.type}`)}</span>
                          </span>
                          <Money amount={account.initial_balance} className="text-[15px]" />
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={t('common.removeItem', { name: account.name })}
                            className="text-muted-foreground"
                            onClick={() => deleteAccount.mutate(account.id, { onError: fail })}
                          >
                            <Trash2 />
                          </Button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>

              <div className="mt-10 flex items-center justify-between gap-2">
                <Button variant="ghost" onClick={() => setStep(1)}>
                  {t('common.back')}
                </Button>
                <Button onClick={finish} disabled={accountList.length === 0 || updateProfile.isPending}>
                  {t('onboarding.finish')}
                </Button>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
    </AlwaysShowAmounts>
  )
}
