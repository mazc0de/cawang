import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { accountBalancesKey } from '@/features/accounts/queries'
import type { Transaction, TransactionType } from '@/lib/database'
import { dayBoundsUtc, type IsoDate } from '@/lib/dates'
import { supabase } from '@/lib/supabase'

export const transactionsKey = ['transactions'] as const

const SEARCH_LIMIT = 200

/** Transactions whose local date (in the profile timezone) is `date`, newest first. */
export function useDayTransactions(date: IsoDate, timezone: string) {
  return useQuery({
    queryKey: [...transactionsKey, 'day', date, timezone],
    queryFn: async () => {
      const { start, end } = dayBoundsUtc(date, timezone)
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .gte('occurred_at', start)
        .lt('occurred_at', end)
        .order('occurred_at', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Transaction[]
    },
  })
}

export interface TransactionSearch {
  text: string
  /** Accounts and Categories whose names match the text. */
  accountIds: string[]
  categoryIds: string[]
  /** Limit to one local day, or search every date. */
  day: { date: IsoDate; timezone: string } | null
}

/** Characters that would break a PostgREST `or=(...)` filter. */
function sanitize(text: string): string {
  return text.replace(/[,()*%\\:"]/g, ' ').trim()
}

export function useTransactionSearch(search: TransactionSearch | null) {
  return useQuery({
    queryKey: [...transactionsKey, 'search', search],
    enabled: Boolean(search && sanitize(search.text)),
    queryFn: async () => {
      const { text, accountIds, categoryIds, day } = search!
      const filters = [`note.ilike.*${sanitize(text)}*`]
      if (accountIds.length) {
        filters.push(`account_id.in.(${accountIds.join(',')})`, `to_account_id.in.(${accountIds.join(',')})`)
      }
      if (categoryIds.length) filters.push(`category_id.in.(${categoryIds.join(',')})`)

      let query = supabase.from('transactions').select('*').or(filters.join(','))
      if (day) {
        const { start, end } = dayBoundsUtc(day.date, day.timezone)
        query = query.gte('occurred_at', start).lt('occurred_at', end)
      }
      const { data, error } = await query.order('occurred_at', { ascending: false }).limit(SEARCH_LIMIT)
      if (error) throw error
      return data as Transaction[]
    },
  })
}

export async function fetchTransaction(id: string): Promise<Transaction> {
  const { data, error } = await supabase.from('transactions').select('*').eq('id', id).single()
  if (error) throw error
  return data as Transaction
}

/** The Admin Fee Expense linked to a Transfer, if any. */
export function useAdminFee(transferId: string | null) {
  return useQuery({
    queryKey: [...transactionsKey, 'admin-fee', transferId],
    enabled: Boolean(transferId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('amount')
        .eq('parent_transaction_id', transferId!)
        .maybeSingle()
      if (error) throw error
      return (data?.amount as number | undefined) ?? null
    },
  })
}

/** What else a delete touches: a settled Safe-Pay or a confirmed Recurring Occurrence reverts. */
export function useTransactionLinks(id: string | null) {
  return useQuery({
    queryKey: [...transactionsKey, 'links', id],
    enabled: Boolean(id),
    queryFn: async () => {
      const [safePay, occurrence] = await Promise.all([
        supabase.from('safe_pays').select('id', { count: 'exact', head: true }).eq('transaction_id', id!),
        supabase.from('recurring_occurrences').select('id', { count: 'exact', head: true }).eq('transaction_id', id!),
      ])
      if (safePay.error) throw safePay.error
      if (occurrence.error) throw occurrence.error
      return { settledSafePay: (safePay.count ?? 0) > 0, confirmedOccurrence: (occurrence.count ?? 0) > 0 }
    },
  })
}

function useInvalidateMoney() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: transactionsKey }),
      queryClient.invalidateQueries({ queryKey: accountBalancesKey }),
    ])
}

export interface TransactionInput {
  id: string | null
  type: TransactionType
  amount: number
  occurred_at: string
  account_id: string
  to_account_id: string | null
  category_id: string | null
  note: string
  admin_fee: number | null
}

export function useSaveTransaction() {
  const invalidate = useInvalidateMoney()
  return useMutation({
    mutationFn: async (input: TransactionInput) => {
      const { data, error } = await supabase.rpc('save_transaction', {
        p_id: input.id,
        p_type: input.type,
        p_amount: input.amount,
        p_occurred_at: input.occurred_at,
        p_account: input.account_id,
        p_to_account: input.to_account_id,
        p_category: input.category_id,
        p_note: input.note,
        p_admin_fee: input.admin_fee,
      })
      if (error) throw error
      return data as string
    },
    onSuccess: invalidate,
  })
}

export function useDeleteTransaction() {
  const invalidate = useInvalidateMoney()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('transactions').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}

export interface BulkRow {
  type: TransactionType
  amount: number
  occurred_at: string
  account_id: string
  to_account_id: string | null
  category_id: string | null
  note: string
}

/** All rows or none (one RPC call). */
export function useBulkInsertTransactions() {
  const invalidate = useInvalidateMoney()
  return useMutation({
    mutationFn: async (rows: BulkRow[]) => {
      const { data, error } = await supabase.rpc('bulk_insert_transactions', { p_rows: rows })
      if (error) throw error
      return data as number
    },
    onSuccess: invalidate,
  })
}
