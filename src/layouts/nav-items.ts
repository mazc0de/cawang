import {
  ArrowLeftRight,
  CalendarDays,
  ChartPie,
  LayoutDashboard,
  type LucideIcon,
  PiggyBank,
  Repeat,
  Settings,
  Shapes,
  ShieldCheck,
  WalletCards,
} from 'lucide-react'

export interface NavItem {
  to: string
  label:
    | 'nav.dashboard'
    | 'nav.transactions'
    | 'nav.safePay'
    | 'nav.recurring'
    | 'nav.budgets'
    | 'nav.calendar'
    | 'nav.reports'
    | 'nav.accounts'
    | 'nav.categories'
    | 'nav.settings'
  icon: LucideIcon
}

export const NAV = {
  dashboard: { to: '/dashboard', label: 'nav.dashboard', icon: LayoutDashboard },
  transactions: { to: '/transactions', label: 'nav.transactions', icon: ArrowLeftRight },
  safePay: { to: '/safe-pay', label: 'nav.safePay', icon: ShieldCheck },
  recurring: { to: '/recurring', label: 'nav.recurring', icon: Repeat },
  budgets: { to: '/budgets', label: 'nav.budgets', icon: PiggyBank },
  calendar: { to: '/calendar', label: 'nav.calendar', icon: CalendarDays },
  reports: { to: '/reports', label: 'nav.reports', icon: ChartPie },
  accounts: { to: '/accounts', label: 'nav.accounts', icon: WalletCards },
  categories: { to: '/categories', label: 'nav.categories', icon: Shapes },
  settings: { to: '/settings', label: 'nav.settings', icon: Settings },
} satisfies Record<string, NavItem>

export const SIDEBAR_GROUPS: Array<{ label: 'nav.groupMoney' | 'nav.groupPlanning' | 'nav.groupSetup'; items: NavItem[] }> = [
  { label: 'nav.groupMoney', items: [NAV.dashboard, NAV.transactions, NAV.safePay, NAV.recurring] },
  { label: 'nav.groupPlanning', items: [NAV.budgets, NAV.calendar, NAV.reports] },
  { label: 'nav.groupSetup', items: [NAV.accounts, NAV.categories] },
]

/** Everything the mobile bottom bar does not show directly. */
export const MORE_ITEMS: NavItem[] = [
  NAV.safePay,
  NAV.recurring,
  NAV.budgets,
  NAV.reports,
  NAV.accounts,
  NAV.categories,
  NAV.settings,
]
