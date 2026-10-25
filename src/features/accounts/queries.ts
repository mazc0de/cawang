import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Account, AccountBalance, AccountType } from '@/lib/database'
import { supabase } from '@/lib/supabase'

export const accountsKey = ['accounts'] as const
export const accountBalancesKey = ['account-balances'] as const

/** Every Account, archived ones included, so old Transactions can still show their names. */
export function useAccounts() {
  return useQuery({
    queryKey: accountsKey,
    queryFn: async () => {
      const { data, error } = await supabase.from('accounts').select('*').order('created_at')
      if (error) throw error
      return data as Account[]
    },
  })
}

export function useActiveAccounts() {
  const query = useAccounts()
  return { ...query, data: query.data?.filter((account) => !account.archived_at) }
}

/** Derived balances per Account (ADR 0001), keyed by account id. */
export function useAccountBalances() {
  return useQuery({
    queryKey: accountBalancesKey,
    queryFn: async () => {
      const { data, error } = await supabase.from('account_balances').select('*')
      if (error) throw error
      return new Map((data as AccountBalance[]).map((row) => [row.account_id, row]))
    },
  })
}

export interface AccountInput {
  name: string
  type: AccountType
  initial_balance: number
}

function useInvalidateAccounts() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: accountsKey }),
      queryClient.invalidateQueries({ queryKey: accountBalancesKey }),
    ])
}

export function useCreateAccount() {
  const invalidate = useInvalidateAccounts()
  return useMutation({
    mutationFn: async (account: AccountInput) => {
      const { data, error } = await supabase.from('accounts').insert(account).select('*').single()
      if (error) throw error
      return data as Account
    },
    onSuccess: invalidate,
  })
}

export function useUpdateAccount() {
  const invalidate = useInvalidateAccounts()
  return useMutation({
    mutationFn: async ({ id, ...changes }: Partial<AccountInput> & { id: string }) => {
      const { error } = await supabase.from('accounts').update(changes).eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}

/** Archiving is refused by the database unless the balance is 0 and no Safe-Pay is pending. */
export function useSetAccountArchived() {
  const invalidate = useInvalidateAccounts()
  return useMutation({
    mutationFn: async ({ id, archived }: { id: string; archived: boolean }) => {
      const { error } = await supabase
        .from('accounts')
        .update({ archived_at: archived ? new Date().toISOString() : null })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}

/** Only works for an Account without Transactions; otherwise the database answers 23503. */
export function useDeleteAccount() {
  const invalidate = useInvalidateAccounts()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('accounts').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}
