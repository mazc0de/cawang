import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { accountBalancesKey } from '@/features/accounts/queries'
import { transactionsKey } from '@/features/transactions/queries'
import type { SafePay, Transaction } from '@/lib/database'
import { supabase } from '@/lib/supabase'

export const safePaysKey = ['safe-pays'] as const

export function useSafePays() {
  return useQuery({
    queryKey: safePaysKey,
    queryFn: async () => {
      const { data, error } = await supabase.from('safe_pays').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return data as SafePay[]
    },
  })
}

/** The Expense Transactions created by Settle, keyed by id, for the Settled tab. */
export function useSettlementTransactions(ids: string[]) {
  return useQuery({
    queryKey: [...safePaysKey, 'settlements', ids],
    enabled: ids.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from('transactions').select('*').in('id', ids)
      if (error) throw error
      return new Map((data as Transaction[]).map((row) => [row.id, row]))
    },
  })
}

function useInvalidate() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: safePaysKey }),
      queryClient.invalidateQueries({ queryKey: accountBalancesKey }),
      queryClient.invalidateQueries({ queryKey: transactionsKey }),
    ])
}

export interface SafePayInput {
  id?: string
  account_id: string
  category_id: string
  amount: number
  note: string
  due_date: string | null
}

/** The database refuses an amount above the account's Available Balance (SAFE_PAY_EXCEEDS_AVAILABLE). */
export function useSaveSafePay() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async ({ id, note, ...input }: SafePayInput) => {
      const row = { ...input, note: note.trim() || null }
      const { error } = id
        ? await supabase.from('safe_pays').update(row).eq('id', id)
        : await supabase.from('safe_pays').insert(row)
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}

export function useSettleSafePay() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async ({ id, amount, occurredAt }: { id: string; amount: number; occurredAt: string }) => {
      const { error } = await supabase.rpc('settle_safe_pay', { p_id: id, p_amount: amount, p_occurred_at: occurredAt })
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}

export function useCancelSafePay() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('safe_pays')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
        .eq('id', id)
        .eq('status', 'pending')
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}
