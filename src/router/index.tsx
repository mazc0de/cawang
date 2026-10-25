import type { ComponentType } from 'react'
import { createBrowserRouter, Outlet } from 'react-router'
import { FullScreenLoader } from '@/components/full-screen-loader'
import { AppShell } from '@/layouts/app-shell'
import { AuthLayout } from '@/layouts/auth-layout'
import { NAV } from '@/layouts/nav-items'
import { NotFoundPage } from '@/pages/not-found-page'
import { GuestOnly, RequireAuth, RequireOnboarded } from './guards'

/** Each screen is its own chunk, loaded when its route is first opened. */
function page<Name extends string>(load: () => Promise<Record<Name, ComponentType>>, name: Name) {
  return async () => ({ Component: (await load())[name] })
}

export const router = createBrowserRouter([
  {
    // Shown while the first screen's chunk loads.
    hydrateFallbackElement: <FullScreenLoader />,
    element: <Outlet />,
    children: [
      { path: '/', lazy: page(() => import('@/pages/landing/landing-page'), 'LandingPage') },
      {
        element: <AuthLayout />,
        children: [
          {
            element: <GuestOnly />,
            children: [
              { path: '/login', lazy: page(() => import('@/pages/auth/login-page'), 'LoginPage') },
              { path: '/register', lazy: page(() => import('@/pages/auth/register-page'), 'RegisterPage') },
              { path: '/forgot-password', lazy: page(() => import('@/pages/auth/forgot-password-page'), 'ForgotPasswordPage') },
            ],
          },
          { path: '/reset-password', lazy: page(() => import('@/pages/auth/reset-password-page'), 'ResetPasswordPage') },
        ],
      },
      {
        element: <RequireAuth />,
        children: [
          { path: '/onboarding', lazy: page(() => import('@/pages/onboarding/onboarding-page'), 'OnboardingPage') },
          {
            element: <RequireOnboarded />,
            children: [
              {
                element: <AppShell />,
                children: [
                  { path: NAV.dashboard.to, lazy: page(() => import('@/pages/dashboard/dashboard-page'), 'DashboardPage') },
                  { path: NAV.transactions.to, lazy: page(() => import('@/pages/transactions/transactions-page'), 'TransactionsPage') },
                  { path: NAV.safePay.to, lazy: page(() => import('@/pages/safe-pay/safe-pay-page'), 'SafePayPage') },
                  { path: NAV.recurring.to, lazy: page(() => import('@/pages/recurring/recurring-page'), 'RecurringPage') },
                  { path: NAV.budgets.to, lazy: page(() => import('@/pages/budgets/budgets-page'), 'BudgetsPage') },
                  { path: NAV.calendar.to, lazy: page(() => import('@/pages/calendar/calendar-page'), 'CalendarPage') },
                  { path: NAV.reports.to, lazy: page(() => import('@/pages/reports/reports-page'), 'ReportsPage') },
                  { path: NAV.accounts.to, lazy: page(() => import('@/pages/accounts/accounts-page'), 'AccountsPage') },
                  { path: NAV.categories.to, lazy: page(() => import('@/pages/categories/categories-page'), 'CategoriesPage') },
                  { path: NAV.settings.to, lazy: page(() => import('@/pages/settings/settings-page'), 'SettingsPage') },
                ],
              },
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
