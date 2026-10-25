import { LogOut, Menu, Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, NavLink, Outlet, useNavigate } from 'react-router'
import { Wordmark } from '@/components/brand-mark'
import { HeaderUtilities } from '@/components/header/header-utilities'
import { OfflineBanner } from '@/components/offline-banner'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { useUser } from '@/providers/auth-provider'
import { MORE_ITEMS, NAV, type NavItem, SIDEBAR_GROUPS } from './nav-items'
import { APP_VERSION_LABEL } from '@/lib/version'

function useSignOut() {
  const navigate = useNavigate()
  return async () => {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }
}

function SidebarLink({ item }: { item: NavItem }) {
  const { t } = useTranslation()
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        cn(
          'flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors',
          isActive
            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
            : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground',
        )
      }
    >
      <item.icon className="size-4 shrink-0" strokeWidth={1.75} />
      {t(item.label)}
    </NavLink>
  )
}

function Sidebar() {
  const { t } = useTranslation()
  const user = useUser()
  const signOut = useSignOut()
  return (
    <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col bg-sidebar px-3 py-6 lg:flex">
      <Link to="/dashboard" className="mx-2.5 rounded-lg">
        <Wordmark />
      </Link>
      <nav aria-label={t('nav.mainMenu')} className="mt-6 flex flex-1 flex-col gap-6 overflow-y-auto">
        {SIDEBAR_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-1.5 px-2.5 text-xs text-muted-foreground">{t(group.label)}</p>
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <li key={item.to}>
                  <SidebarLink item={item} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="flex flex-col gap-2">
        <SidebarLink item={NAV.settings} />
        <div className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5">
          <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand-ink uppercase">
            {user.email?.[0] ?? '?'}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{user.email}</span>
          <Button variant="ghost" size="icon-sm" aria-label={t('common.signOut')} onClick={signOut}>
            <LogOut />
          </Button>
        </div>
        <p className="px-2.5 text-xs text-muted-foreground">{t('app.versionShort', { version: APP_VERSION_LABEL })}</p>
      </div>
    </aside>
  )
}

function MobileTopBar() {
  return (
    <div className="sticky top-0 z-30 flex h-14 items-center justify-between bg-background/95 px-4 lg:hidden">
      <Link to="/dashboard" className="rounded-lg">
        <Wordmark />
      </Link>
      <HeaderUtilities />
    </div>
  )
}

function BottomNav() {
  const { t } = useTranslation()
  const signOut = useSignOut()
  const [moreOpen, setMoreOpen] = useState(false)

  const cell = 'flex flex-col items-center justify-center gap-1 text-[11px] leading-none'
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(cell, isActive ? 'text-foreground font-medium' : 'text-muted-foreground')

  return (
    <nav
      aria-label={t('nav.mainMenu')}
      className="fixed inset-x-0 bottom-0 z-30 border-t bg-card pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <div className="grid h-16 grid-cols-5">
        <NavLink to={NAV.dashboard.to} className={linkClass}>
          <NAV.dashboard.icon className="size-5" strokeWidth={1.75} />
          {t(NAV.dashboard.label)}
        </NavLink>
        <NavLink to={NAV.transactions.to} className={linkClass}>
          <NAV.transactions.icon className="size-5" strokeWidth={1.75} />
          {t(NAV.transactions.label)}
        </NavLink>
        <div className="flex items-center justify-center">
          <Link
            to="/transactions?new=1"
            aria-label={t('nav.addTransaction')}
            className="inline-flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform active:scale-95"
          >
            <Plus className="size-6" />
          </Link>
        </div>
        <NavLink to={NAV.calendar.to} className={linkClass}>
          <NAV.calendar.icon className="size-5" strokeWidth={1.75} />
          {t(NAV.calendar.label)}
        </NavLink>
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger className={cn(cell, 'text-muted-foreground')}>
            <Menu className="size-5" strokeWidth={1.75} />
            {t('nav.more')}
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="rounded-t-(--radius-card) pb-[calc(env(safe-area-inset-bottom)+1rem)]"
            onOpenAutoFocus={(event) => event.preventDefault()}
          >
            <SheetHeader>
              <SheetTitle>{t('nav.more')}</SheetTitle>
              <SheetDescription className="sr-only">{t('nav.mainMenu')}</SheetDescription>
            </SheetHeader>
            <ul className="grid grid-cols-2 gap-1 px-4">
              {MORE_ITEMS.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    onClick={() => setMoreOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'flex h-12 items-center gap-3 rounded-lg px-3 text-[15px]',
                        isActive ? 'bg-muted font-medium' : 'hover:bg-muted',
                      )
                    }
                  >
                    <item.icon className="size-5 text-muted-foreground" strokeWidth={1.75} />
                    {t(item.label)}
                  </NavLink>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={signOut}
                  className="flex h-12 w-full items-center gap-3 rounded-lg px-3 text-[15px] hover:bg-muted"
                >
                  <LogOut className="size-5 text-muted-foreground" strokeWidth={1.75} />
                  {t('common.signOut')}
                </button>
              </li>
            </ul>
            <p className="px-7 text-xs text-muted-foreground">{t('app.versionLine', { version: APP_VERSION_LABEL })}</p>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  )
}

export function AppShell() {
  return (
    <div className="flex min-h-svh">
      <Sidebar />
      <div className="min-w-0 flex-1">
        <MobileTopBar />
        <OfflineBanner />
        <main className="px-4 pt-4 pb-28 sm:px-6 lg:px-10 lg:pt-8 lg:pb-12">
          <div className="mx-auto max-w-[1200px]">
            <Outlet />
          </div>
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
