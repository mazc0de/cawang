import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { type BudgetProgress, useBudgetProgress } from '@/features/budgets/queries'
import { useCurrentCycle } from '@/features/cycle/use-cycle'
import { type PendingOccurrence, usePendingOccurrences } from '@/features/recurring/queries'
import { useSafePays } from '@/features/safe-pay/queries'
import type { SafePay } from '@/lib/database'
import { supabase } from '@/lib/supabase'

const dismissalsKey = ['notification-dismissals'] as const

function useDismissals() {
  return useQuery({
    queryKey: dismissalsKey,
    queryFn: async () => {
      const { data, error } = await supabase.from('notification_dismissals').select('key')
      if (error) throw error
      return new Set((data as Array<{ key: string }>).map((row) => row.key))
    },
  })
}

export function useDismissNotification() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (key: string) => {
      const { error } = await supabase.from('notification_dismissals').upsert({ key }, { onConflict: 'user_id,key', ignoreDuplicates: true })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: dismissalsKey }),
  })
}

export interface BudgetAlert extends BudgetProgress {
  /** Once per Category per status per Cycle (spec §10). */
  key: string
}

/** Everything the bell shows: due Recurring Occurrences, Safe-Pays at their Due Date, Budget alerts. */
export function useNotifications() {
  const { today, cycle, timezone } = useCurrentCycle()
  const occurrences = usePendingOccurrences(today)
  const safePays = useSafePays()
  const budgets = useBudgetProgress(cycle, timezone)
  const dismissals = useDismissals()

  return useMemo(() => {
    const recurring: PendingOccurrence[] = occurrences.data ?? []
    const safePaysDue: SafePay[] = (safePays.data ?? []).filter(
      (item) => item.status === 'pending' && item.due_date !== null && item.due_date <= today,
    )
    const budgetAlerts: BudgetAlert[] = (budgets.data ?? [])
      .filter((row) => row.status !== 'safe')
      .map((row) => ({ ...row, key: `budget:${row.budget.category_id}:${row.status}:${cycle.start}` }))
      .filter((row) => !dismissals.data?.has(row.key))
    return {
      recurring,
      safePaysDue,
      budgetAlerts,
      count: recurring.length + safePaysDue.length + budgetAlerts.length,
      today,
    }
  }, [occurrences.data, safePays.data, budgets.data, dismissals.data, today, cycle.start])
}
