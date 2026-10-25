import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useCategories } from '@/features/categories/queries'
import { useCycleTransactions } from '@/features/cycle/use-cycle'
import { useSafePays } from '@/features/safe-pay/queries'
import { type BudgetStatus, budgetStatus } from '@/lib/budget'
import type { Cycle } from '@/lib/cycle'
import type { Budget, Category } from '@/lib/database'
import { supabase } from '@/lib/supabase'

export const budgetsKey = ['budgets'] as const

export function useBudgets() {
  return useQuery({
    queryKey: budgetsKey,
    queryFn: async () => {
      const { data, error } = await supabase.from('budgets').select('*')
      if (error) throw error
      return data as Budget[]
    },
  })
}

export function useSaveBudget() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, category_id, amount }: { id?: string; category_id: string; amount: number }) => {
      const { error } = id
        ? await supabase.from('budgets').update({ amount }).eq('id', id)
        : await supabase.from('budgets').insert({ category_id, amount })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: budgetsKey }),
  })
}

export function useDeleteBudget() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('budgets').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: budgetsKey }),
  })
}

export interface BudgetProgress {
  budget: Budget
  category: Category | undefined
  /** Expense Transactions of this Category in the Cycle. */
  spent: number
  /** Pending Safe-Pays of this Category: not spent yet, shown as a separate segment. */
  pending: number
  status: BudgetStatus
}

/** Every Budget measured against one Cycle, most used first. */
export function useBudgetProgress(cycle: Cycle, timezone: string) {
  const budgets = useBudgets()
  const transactions = useCycleTransactions(cycle, timezone)
  const safePays = useSafePays()
  const categories = useCategories()

  const data = useMemo(() => {
    if (!budgets.data || !transactions.data || !safePays.data || !categories.data) return undefined
    const spentBy = new Map<string, number>()
    for (const row of transactions.data) {
      if (row.type === 'expense' && row.category_id) spentBy.set(row.category_id, (spentBy.get(row.category_id) ?? 0) + row.amount)
    }
    const pendingBy = new Map<string, number>()
    for (const item of safePays.data) {
      if (item.status === 'pending') pendingBy.set(item.category_id, (pendingBy.get(item.category_id) ?? 0) + item.amount)
    }
    const byId = new Map(categories.data.map((category) => [category.id, category]))
    const rows: BudgetProgress[] = budgets.data.map((budget) => {
      const spent = spentBy.get(budget.category_id) ?? 0
      return {
        budget,
        category: byId.get(budget.category_id),
        spent,
        pending: pendingBy.get(budget.category_id) ?? 0,
        status: budgetStatus(spent, budget.amount),
      }
    })
    return rows.sort((a, b) => b.spent / b.budget.amount - a.spent / a.budget.amount)
  }, [budgets.data, transactions.data, safePays.data, categories.data])

  return {
    data,
    isPending: budgets.isPending || transactions.isPending || safePays.isPending || categories.isPending,
    isError: budgets.isError || transactions.isError || safePays.isError || categories.isError,
  }
}

export function summarize(rows: BudgetProgress[]) {
  return rows.reduce(
    (sum, row) => ({ limit: sum.limit + row.budget.amount, spent: sum.spent + row.spent, pending: sum.pending + row.pending }),
    { limit: 0, spent: 0, pending: 0 },
  )
}
