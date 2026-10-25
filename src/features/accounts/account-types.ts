import { Banknote, Landmark, type LucideIcon, Smartphone, Wallet } from 'lucide-react'
import type { AccountType } from '@/lib/database'

export const ACCOUNT_TYPE_ICONS: Record<AccountType, LucideIcon> = {
  bank: Landmark,
  ewallet: Smartphone,
  cash: Banknote,
  other: Wallet,
}
