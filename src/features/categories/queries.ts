import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Category, CategoryType } from '@/lib/database'
import { supabase } from '@/lib/supabase'

export const categoriesKey = ['categories'] as const

/** Every Category, archived ones included, so old Transactions can still show theirs. */
export function useCategories() {
  return useQuery({
    queryKey: categoriesKey,
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*').order('sort_order').order('created_at')
      if (error) throw error
      return data as Category[]
    },
  })
}

export interface CategoryInput {
  name: string
  type: CategoryType
  icon: string
  color: string
}

function useInvalidateCategories() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: categoriesKey })
}

export function useSaveCategory() {
  const invalidate = useInvalidateCategories()
  return useMutation({
    mutationFn: async ({ id, ...input }: CategoryInput & { id?: string }) => {
      const { error } = id
        ? await supabase.from('categories').update(input).eq('id', id)
        : // New categories go to the end of their list.
          await supabase.from('categories').insert({ ...input, sort_order: 1000 })
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}

export function useSetCategoryArchived() {
  const invalidate = useInvalidateCategories()
  return useMutation({
    mutationFn: async ({ id, archived }: { id: string; archived: boolean }) => {
      const { error } = await supabase
        .from('categories')
        .update({ archived_at: archived ? new Date().toISOString() : null })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}

export interface CategoryUsage {
  transactions: number
  safePays: number
  recurring: number
  budgets: number
}

/** How many records still point at the Category; any but Budgets block its deletion. */
export function useCategoryUsage(id: string | undefined) {
  return useQuery({
    queryKey: [...categoriesKey, 'usage', id],
    enabled: Boolean(id),
    // Always recount: a Transaction may have been added since the last look.
    staleTime: 0,
    gcTime: 0,
    queryFn: async (): Promise<CategoryUsage> => {
      const count = async (table: 'transactions' | 'safe_pays' | 'recurring_templates' | 'budgets') => {
        const { count, error } = await supabase.from(table).select('id', { count: 'exact', head: true }).eq('category_id', id!)
        if (error) throw error
        return count ?? 0
      }
      const [transactions, safePays, recurring, budgets] = await Promise.all([
        count('transactions'),
        count('safe_pays'),
        count('recurring_templates'),
        count('budgets'),
      ])
      return { transactions, safePays, recurring, budgets }
    },
  })
}

export function isCategoryInUse(usage: CategoryUsage) {
  return usage.transactions + usage.safePays + usage.recurring > 0
}

/** Only works for an unused Category; otherwise the database answers 23503. */
export function useDeleteCategory() {
  const invalidate = useInvalidateCategories()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('categories').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}
