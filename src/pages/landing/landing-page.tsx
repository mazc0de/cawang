import { ArrowUp, Minus, Plus } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { BrandMark } from '@/components/brand-mark'
import { LanguageSwitch } from '@/components/header/language-switch'
import { ThemeToggle } from '@/components/header/theme-toggle'
import { Money } from '@/components/money'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { currentLanguage } from '@/i18n'
import { cycleContaining, daysUntilNextCycle } from '@/lib/cycle'
import { todayIn } from '@/lib/dates'
import { formatCycleRange, formatIDR } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useAuth } from '@/providers/auth-provider'
import {
  BudgetFragment,
  BulkFragment,
  CalculatorFragment,
  CalendarFragment,
  RecurringFragment,
  ReportsFragment,
  SafePayFragment,
} from './fragments'
import { useReveal } from './use-reveal'
import { AlwaysShowAmounts } from '@/providers/amount-visibility'
import { APP_VERSION_LABEL } from '@/lib/version'

// Sample money for the hero's live controls; the Safe-Pay switch moves Available Balance.
const SAMPLE_TOTAL = 4_780_000
const SAMPLE_SAFE_PAY = 650_000

const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
const COPYRIGHT_YEAR = new Date().getFullYear()

function Reveal({
  index = 0,
  heading = false,
  className,
  children,
}: {
  index?: number
  /** Headings rise without fading, so they are readable at every moment. */
  heading?: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <div data-reveal={heading ? 'heading' : ''} className={className} style={{ '--reveal-index': index } as React.CSSProperties}>
      {children}
    </div>
  )
}

/** The hero's three working controls, each a real piece of the product (data-ui). */
function Chip({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      data-ui
      className={cn(
        'rounded-(--radius-card) bg-[color-mix(in_oklch,var(--foreground),var(--background)_12%)] px-4 py-3 text-background',
        className,
      )}
    >
      {children}
    </div>
  )
}

function Hero({ payday, onPaydayChange }: { payday: number; onPaydayChange: (day: number) => void }) {
  const { t } = useTranslation()
  const { session } = useAuth()
  const language = currentLanguage()
  const [locked, setLocked] = useState(true)
  const today = todayIn(browserTimezone)
  const cycle = cycleContaining(today, payday)
  const daysLeft = daysUntilNextCycle(today, payday)
  const step = (delta: number) => onPaydayChange(((payday - 1 + delta + 31) % 31) + 1)

  return (
    <section className="relative flex min-h-svh flex-col bg-foreground px-4 py-5 text-background sm:px-7" aria-labelledby="hero-title">
      <div className="flex items-center justify-between gap-3">
        <Link to="/" className="inline-flex items-center gap-2.5 rounded-lg text-[15px] font-semibold">
          <BrandMark className="size-7" />
          Cawang
        </Link>
        <div className="flex items-center gap-1 [&_button]:text-background/80 [&_button:hover]:bg-background/10 [&_button:hover]:text-background [&_button_span]:text-background">
          <LanguageSwitch />
          <ThemeToggle />
          {session ? (
            <Button asChild className="ml-2 bg-background text-foreground hover:bg-background/90">
              <Link to="/dashboard">{t('landing.openDashboard')}</Link>
            </Button>
          ) : (
            <>
              <Link to="/login" className="hidden px-3 text-sm underline-offset-4 hover:underline sm:inline">
                {t('landing.login')}
              </Link>
              <Button asChild className="ml-1 bg-background text-foreground hover:bg-background/90">
                <Link to="/register">
                  <span className="sm:hidden">{t('landing.registerShort')}</span>
                  <span className="hidden sm:inline">{t('landing.register')}</span>
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col items-center justify-center pt-10 pb-14">
        <Chip className="w-full max-w-[300px] self-start sm:-rotate-2 lg:ml-[6%]">
          <p className="text-[15px] opacity-75">{t('landing.hero.paydayChip')}</p>
          <div className="mt-1 flex items-center justify-between gap-3">
            <button
              type="button"
              aria-label={t('landing.hero.paydayEarlier')}
              onClick={() => step(-1)}
              className="inline-flex size-9 items-center justify-center rounded-full bg-background/10 transition-transform hover:bg-background/20 active:scale-95"
            >
              <Minus className="size-4" />
            </button>
            <output className="num text-[28px] leading-none font-semibold" aria-live="polite">
              {payday}
            </output>
            <button
              type="button"
              aria-label={t('landing.hero.paydayLater')}
              onClick={() => step(1)}
              className="inline-flex size-9 items-center justify-center rounded-full bg-background/10 transition-transform hover:bg-background/20 active:scale-95"
            >
              <Plus className="size-4" />
            </button>
          </div>
          <p className="mt-2 text-[15px] opacity-75">{formatCycleRange(cycle, language)}</p>
        </Chip>

        <h1 id="hero-title" className="my-8 text-center text-[11.5vw] leading-[0.98] font-semibold tracking-[-0.045em] sm:my-10 lg:text-[clamp(64px,8vw,132px)]">
          <span className="masked-line">
            <span>{t('landing.hero.line1')}</span>
          </span>
          <span className="masked-line">
            <span>{t('landing.hero.line2')}</span>
          </span>
        </h1>

        <div className="flex w-full flex-col items-center gap-4 sm:flex-row sm:items-start sm:justify-between lg:px-[6%]">
          <Chip className="w-full max-w-[300px] sm:rotate-1">
            <p className="text-[15px] opacity-75">{t('money.availableBalance')}</p>
            <Money amount={SAMPLE_TOTAL - (locked ? SAMPLE_SAFE_PAY : 0)} className="mt-1 block text-[28px] leading-8 font-semibold" />
            <p className="mt-1 text-[15px] opacity-75">{t('landing.hero.daysToPayday', { count: daysLeft })}</p>
          </Chip>
          <Chip className="w-full max-w-[300px] sm:rotate-2">
            <label className="flex items-center justify-between gap-4">
              <span>
                <span className="block text-[15px] opacity-75">Safe-Pay</span>
                <span className="block text-[15px] font-medium">{t('landing.hero.lockRent', { amount: formatIDR(SAMPLE_SAFE_PAY) })}</span>
              </span>
              <Switch checked={locked} onCheckedChange={setLocked} />
            </label>
          </Chip>
        </div>

        <p className="after-headline mt-12 max-w-[40ch] text-center text-[17px] leading-relaxed text-background/80">{t('landing.hero.supporting')}</p>
        <div className="after-headline mt-8 flex w-full max-w-[72%] flex-col items-center gap-3 sm:w-auto sm:max-w-none sm:flex-row">
          {session ? (
            <Button asChild size="lg" className="h-12 w-full bg-background px-7 text-[17px] text-foreground hover:bg-background/90 sm:w-auto">
              <Link to="/dashboard">{t('landing.openDashboard')}</Link>
            </Button>
          ) : (
            <>
              <Button asChild size="lg" className="h-12 w-full bg-background px-7 text-[17px] text-foreground hover:bg-background/90 sm:w-auto">
                <Link to="/register">{t('landing.register')}</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 w-full border-background/40 bg-transparent px-7 text-[17px] text-background hover:bg-background/10 hover:text-background sm:w-auto"
              >
                <Link to="/login">{t('landing.login')}</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </section>
  )
}

function Showcase({ payday }: { payday: number }) {
  const { t } = useTranslation()
  return (
    <section className="overflow-hidden px-4 pt-24 sm:px-7 lg:pt-36" aria-labelledby="showcase-title">
      <div className="mx-auto grid max-w-[1180px] gap-6 lg:grid-cols-12">
        <Reveal heading className="lg:col-span-5">
          <h2 id="showcase-title" className="text-[28px] leading-tight font-semibold tracking-tight sm:text-[36px]">
            {t('landing.showcase.title')}
          </h2>
        </Reveal>
        <Reveal index={1} className="lg:col-span-6 lg:col-start-7">
          <p className="text-[17px] leading-relaxed">{t('landing.showcase.body')}</p>
        </Reveal>
      </div>
      <div className="mx-auto mt-[8vh] grid max-w-[1180px] gap-16 sm:grid-cols-2 sm:gap-6">
        {[
          { caption: t('landing.showcase.calendarMonth'), value: 1, inverse: false },
          { caption: t('landing.showcase.cawangCycle'), value: payday, inverse: true },
        ].map((specimen, index) => (
          <Reveal key={specimen.caption} index={index} className="min-w-0">
            <div
              className={cn(
                'h-[28svh] overflow-hidden rounded-t-(--radius-card) px-4 text-center sm:h-[46vh] sm:px-6',
                specimen.inverse ? 'bg-brand text-white dark:text-[#0b0b0c]' : 'bg-card',
              )}
            >
              <p
                className="num pt-3 text-[60vw] leading-[0.8] font-semibold tracking-[-0.06em] sm:pt-4 sm:text-[clamp(180px,28vw,440px)]"
              >
                {specimen.value}
              </p>
            </div>
            <p className="mt-3 text-[17px]">
              {specimen.caption} <span className="num font-semibold">{specimen.value}</span>
            </p>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

const PHOTOS = [
  { key: 'batagor', src: '/landing/batagor-vendor.jpg', width: 1920, height: 1280, category: 'food', amount: 15_000 },
  { key: 'market', src: '/landing/market-fruit.jpg', width: 1920, height: 1080, category: 'groceries', amount: 48_000 },
  { key: 'krl', src: '/landing/krl-gambir.jpg', width: 1920, height: 1274, category: 'transport', amount: 5_000 },
] as const

/** Real pictures of where small daily spending happens, each captioned with the line it becomes. */
function DailySpending() {
  const { t } = useTranslation()
  return (
    <section className="px-4 pt-24 sm:px-7 lg:pt-36" aria-labelledby="daily-title">
      <div className="mx-auto max-w-[1180px]">
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
          <Reveal heading className="lg:col-span-6">
            <h2 id="daily-title" className="text-[28px] leading-tight font-semibold tracking-tight sm:text-[36px]">
              {t('landing.daily.title')}
            </h2>
          </Reveal>
          <Reveal index={1} className="lg:col-span-5 lg:col-start-8">
            <p className="text-[17px] leading-relaxed">{t('landing.daily.body')}</p>
          </Reveal>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {PHOTOS.map((photo, index) => (
            <Reveal key={photo.key} index={index}>
              <figure>
                <img
                  src={photo.src}
                  width={photo.width}
                  height={photo.height}
                  alt={t(`landing.daily.${photo.key}.alt`)}
                  loading="lazy"
                  className="aspect-[4/5] w-full object-cover"
                />
                <figcaption className="mt-3">
                  <span className="block text-[15px] text-muted-foreground">{t(`landing.daily.${photo.key}.alt`)}</span>
                  <span className="mt-1 flex items-baseline justify-between gap-3 text-[17px]">
                    {t(`landing.sample.${photo.category}`)}
                    <Money amount={photo.amount} tone="expense" signed className="font-semibold" />
                  </span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

const FEATURES = [
  { key: 'safePay', fragment: SafePayFragment },
  { key: 'budget', fragment: BudgetFragment },
  { key: 'recurring', fragment: RecurringFragment },
  { key: 'calendar', fragment: CalendarFragment },
  { key: 'reports', fragment: ReportsFragment },
  { key: 'bulk', fragment: BulkFragment },
  { key: 'calculator', fragment: CalculatorFragment },
] as const

function Features() {
  const { t } = useTranslation()
  const [selected, setSelected] = useState<string>('safePay')
  const active = FEATURES.find((feature) => feature.key === selected) ?? FEATURES[0]
  const ActiveFragment = active.fragment

  return (
    <section id="features" className="bg-muted/60 px-4 py-24 sm:px-7 lg:py-36" aria-labelledby="features-title">
      <div className="mx-auto max-w-[1180px]">
        <div className="grid gap-4 lg:grid-cols-12 lg:items-end">
          <Reveal heading className="lg:col-span-7">
            <h2 id="features-title" className="text-[28px] leading-tight font-semibold tracking-tight sm:text-[36px]">
              {t('landing.features.title')}
            </h2>
          </Reveal>
          <Reveal index={1} className="lg:col-span-5">
            <p className="text-[17px] leading-relaxed text-muted-foreground">{t('landing.features.hint')}</p>
          </Reveal>
        </div>
        <div className="mt-10 grid items-start gap-8 lg:grid-cols-12">
          <ul className="flex flex-col gap-1 lg:col-span-6">
            {FEATURES.map((feature, index) => {
              const isActive = feature.key === active.key
              const Fragment = feature.fragment
              return (
                <li key={feature.key} data-reveal style={{ '--reveal-index': index } as React.CSSProperties}>
                  <button
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setSelected(feature.key)}
                    onMouseEnter={() => setSelected(feature.key)}
                    onFocus={() => setSelected(feature.key)}
                    className={cn(
                      'block w-full rounded-xl px-5 py-3 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                      isActive ? 'bg-brand text-white dark:text-[#0b0b0c]' : 'hover:bg-card',
                    )}
                  >
                    <span className="block text-[26px] leading-tight font-semibold tracking-[-0.02em] sm:text-[clamp(26px,2.5vw,36px)]">
                      {t(`landing.features.${feature.key}.name`)}
                    </span>
                    {isActive && <span className="mt-1 block max-w-[48ch] text-[17px]">{t(`landing.features.${feature.key}.body`)}</span>}
                  </button>
                  {isActive && (
                    <div className="mt-3 mb-4 lg:hidden">
                      <Fragment />
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
          <div className="sticky top-10 hidden lg:col-span-6 lg:block">
            <ActiveFragment />
          </div>
        </div>
      </div>
    </section>
  )
}

const STAGES = [
  { key: 'signup', tone: 'bg-[#d9f2fb] text-[#064a63] dark:bg-[#10282f] dark:text-[#8fd6ee]' },
  { key: 'setup', tone: 'bg-[#dcf5e3] text-[#14532d] dark:bg-[#13281a] dark:text-[#8ddba6]' },
  { key: 'daily', tone: 'bg-brand text-white dark:text-[#0b0b0c]' },
] as const

function HowItWorks() {
  const { t } = useTranslation()
  return (
    <section className="px-4 py-24 sm:px-7 lg:py-36" aria-labelledby="how-title">
      <div className="mx-auto max-w-[1180px]">
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
          <Reveal heading className="lg:col-span-7">
            <h2 id="how-title" className="text-[11.5vw] leading-[0.98] font-semibold tracking-[-0.045em] lg:text-[clamp(64px,8vw,132px)]">
              {t('landing.how.title')}
            </h2>
          </Reveal>
          <Reveal index={1} className="lg:col-span-4 lg:col-start-9">
            <p className="text-[17px] leading-relaxed">{t('landing.how.body')}</p>
          </Reveal>
        </div>
        {/* The daily block is the widest: setting up is quick, recording is the product. */}
        <ol data-ui className="mt-16 grid gap-2 md:grid-cols-[1fr_1fr_2fr]">
          {STAGES.map((stage, index) => (
            <li
              key={stage.key}
              data-reveal
              style={{ '--reveal-index': index } as React.CSSProperties}
              className={cn('grow-x flex min-h-44 flex-col justify-between gap-6 rounded-xl p-6', stage.tone)}
            >
              <span className="text-[26px] leading-tight font-semibold sm:text-[clamp(24px,2.2vw,32px)]">{t(`landing.how.${stage.key}.duration`)}</span>
              <span className="max-w-[34ch] text-[17px]">{t(`landing.how.${stage.key}.clause`)}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

function CallToAction() {
  const { t } = useTranslation()
  const { session } = useAuth()
  return (
    <section className="bg-foreground px-4 py-24 text-background sm:px-7 lg:py-36" aria-labelledby="cta-title">
      <div className="mx-auto flex max-w-[1180px] flex-col items-center text-center">
        <Reveal heading>
          <h2 id="cta-title" className="max-w-[14ch] text-[11.5vw] leading-[0.98] font-semibold tracking-[-0.045em] lg:text-[clamp(64px,8vw,132px)]">
            {t('landing.cta.line1')} {t('landing.cta.line2')}
          </h2>
        </Reveal>
        <Reveal index={1} className="mt-10 flex w-full flex-col items-center gap-4">
          <div className="flex w-full max-w-[72%] flex-col items-center gap-3 sm:w-auto sm:max-w-none sm:flex-row sm:gap-6">
            {session ? (
              <Button asChild size="lg" className="h-14 w-full bg-background px-8 text-[17px] text-foreground hover:bg-background/90 sm:w-[220px]">
                <Link to="/dashboard">{t('landing.openDashboard')}</Link>
              </Button>
            ) : (
              <>
                <Button asChild size="lg" className="h-14 w-full bg-background px-8 text-[17px] text-foreground hover:bg-background/90 sm:w-[220px]">
                  <Link to="/register">{t('landing.register')}</Link>
                </Button>
                <span className="text-[17px] text-background/70">{t('common.or')}</span>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-14 w-full border-background/40 bg-transparent px-8 text-[17px] text-background hover:bg-background/10 hover:text-background sm:w-[220px]"
                >
                  <Link to="/login">{t('landing.login')}</Link>
                </Button>
              </>
            )}
          </div>
          <p className="max-w-[46ch] text-[17px] text-background/75">{t('landing.cta.after')}</p>
        </Reveal>
      </div>
    </section>
  )
}

// Wikimedia Commons, via taste-skill assets.mjs (public/landing/credits.json).
const PHOTO_CREDITS = [
  { title: 'Batagor vendor 2', byline: 'by Gunawan Kartapranata, CC BY-SA 4.0', page: 'https://commons.wikimedia.org/w/index.php?curid=99474283' },
  { title: 'Warna-Warni Buah di Pasar Tradisional', byline: 'by Febaryanto, CC BY-SA 4.0', page: 'https://commons.wikimedia.org/w/index.php?curid=73854487' },
  { title: 'KRL Jabotabek 8500 Gambir 20111126', byline: 'by DAJF, CC BY-SA 3.0', page: 'https://commons.wikimedia.org/w/index.php?curid=17578476' },
]

function Footer() {
  const { t } = useTranslation()
  return (
    <footer className="overflow-hidden bg-brand-soft px-4 pt-16 pb-8 text-brand-ink sm:px-7">
      <div className="mx-auto max-w-[1180px]">
        <p aria-hidden="true" className="flex items-center gap-[0.12em] text-[18vw] leading-[0.9] font-semibold tracking-[-0.05em] lg:text-[clamp(140px,15vw,220px)]">
          <BrandMark className="size-[0.62em] rounded-[0.2em]" />
          Cawang
        </p>
        <div className="mt-16 grid gap-10 lg:grid-cols-12">
          <ul className="flex flex-col gap-2 lg:col-span-5">
            <li>
              <Link to="/register" className="text-[28px] font-semibold underline-offset-4 hover:underline sm:text-[36px]">
                {t('landing.register')}
              </Link>
            </li>
            <li>
              <Link to="/login" className="text-[28px] font-semibold underline-offset-4 hover:underline sm:text-[36px]">
                {t('landing.login')}
              </Link>
            </li>
          </ul>
          <div className="grid grid-cols-2 gap-8 text-[15px] lg:col-span-6 lg:col-start-7 lg:grid-cols-3">
            <div>
              <p className="font-semibold">{t('landing.footer.features')}</p>
              <ul className="mt-2 flex flex-col gap-1.5">
                {FEATURES.slice(0, 5).map((feature) => (
                  <li key={feature.key}>
                    <a href="#features" className="hover:underline">
                      {t(`landing.features.${feature.key}.name`)}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-semibold">{t('landing.footer.about')}</p>
              <p className="mt-2 leading-relaxed">{t('landing.footer.aboutBody')}</p>
            </div>
            <div className="[&_button]:text-brand-ink">
              <p className="font-semibold">{t('landing.footer.display')}</p>
              <div className="mt-1 -ml-2 flex items-center">
                <LanguageSwitch />
                <ThemeToggle />
              </div>
            </div>
          </div>
        </div>
        <p className="mt-16 max-w-[90ch] text-[13px] leading-relaxed opacity-80">
          {t('landing.footer.photos')}{' '}
          {PHOTO_CREDITS.map((credit, index) => (
            <span key={credit.page}>
              {index > 0 && '; '}
              <a href={credit.page} className="underline underline-offset-2" target="_blank" rel="noreferrer">
                {credit.title}
              </a>{' '}
              {credit.byline}
            </span>
          ))}
        </p>
        <div className="mt-6 flex items-center justify-between gap-4 text-[13px]">
          <p>{t('landing.footer.legal', { year: COPYRIGHT_YEAR, version: APP_VERSION_LABEL })}</p>
          <a href="#hero-title" className="inline-flex items-center gap-1 hover:underline">
            <ArrowUp className="size-3.5" />
            {t('landing.footer.backToTop')}
          </a>
        </div>
      </div>
    </footer>
  )
}

export function LandingPage() {
  const [payday, setPayday] = useState(25)
  useReveal()
  return (
    <AlwaysShowAmounts>
    <main>
      <Hero payday={payday} onPaydayChange={setPayday} />
      <Showcase payday={payday} />
      <DailySpending />
      <Features />
      <HowItWorks />
      <CallToAction />
      <Footer />
    </main>
    </AlwaysShowAmounts>
  )
}
