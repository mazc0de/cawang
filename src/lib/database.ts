import type { Language } from '@/i18n'

/** Row shapes of supabase/schema.sql. Amounts are integer Rupiah. */

export type ThemePreference = 'system' | 'light' | 'dark'

export interface Profile {
  id: string
  language: Language
  timezone: string
  cycle_start_day: number
  theme: ThemePreference
  onboarding_completed_at: string | null
  /** Missing until schema.sql is re-run with the amount-templates column. */
  amount_presets?: number[] | null
  created_at: string
  updated_at: string
}

export const ACCOUNT_TYPES = ['bank', 'ewallet', 'cash', 'other'] as const
export type AccountType = (typeof ACCOUNT_TYPES)[number]

export interface Account {
  id: string
  user_id: string
  name: string
  type: AccountType
  initial_balance: number
  archived_at: string | null
  created_at: string
  updated_at: string
}

export interface AccountBalance {
  account_id: string
  user_id: string
  initial_balance: number
  balance: number
  locked_funds: number
  available_balance: number
}

export type CategoryType = 'income' | 'expense'

export interface Category {
  id: string
  user_id: string
  name: string
  type: CategoryType
  icon: string
  color: string
  system_key: string | null
  sort_order: number
  archived_at: string | null
}

export const TRANSACTION_TYPES = ['expense', 'income', 'transfer'] as const
export type TransactionType = (typeof TRANSACTION_TYPES)[number]

export interface Transaction {
  id: string
  user_id: string
  type: TransactionType
  amount: number
  occurred_at: string
  account_id: string
  to_account_id: string | null
  category_id: string | null
  note: string | null
  parent_transaction_id: string | null
  created_at: string
  updated_at: string
}

export type SafePayStatus = 'pending' | 'settled' | 'cancelled'

export interface SafePay {
  id: string
  user_id: string
  account_id: string
  category_id: string
  amount: number
  note: string | null
  due_date: string | null
  status: SafePayStatus
  transaction_id: string | null
  settled_at: string | null
  cancelled_at: string | null
  created_at: string
}

export interface RecurringTemplate {
  id: string
  user_id: string
  type: TransactionType
  amount: number
  account_id: string
  to_account_id: string | null
  category_id: string | null
  note: string | null
  day_of_month: number
  start_date: string
  end_date: string | null
  is_active: boolean
  created_at: string
}

export interface RecurringOccurrenceRow {
  id: string
  template_id: string
  period: string
  due_date: string
  status: 'confirmed' | 'skipped'
  transaction_id: string | null
}

export interface Budget {
  id: string
  user_id: string
  category_id: string
  amount: number
}

export interface NotificationDismissal {
  key: string
  dismissed_at: string
}
