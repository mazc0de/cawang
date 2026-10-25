import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { accountBalancesKey } from '@/features/accounts/queries'
import { transactionsKey } from '@/features/transactions/queries'
import type { RecurringOccurrenceRow, RecurringTemplate, TransactionType } from '@/lib/database'
import type { IsoDate } from '@/lib/dates'
import { type Occurrence, pendingOccurrences } from '@/lib/recurring'
import { supabase } from '@/lib/supabase'

export const recurringKey = ['recurring'] as const

export function useRecurringTemplates() {
  return useQuery({
    queryKey: [...recurringKey, 'templates'],
    queryFn: async () => {
      const { data, error } = await supabase.from('recurring_templates').select('*').order('created_at')
      if (error) throw error
      return data as RecurringTemplate[]
    },
  })
}

/** Confirmed and skipped Occurrences (the only ones stored). */
export function useResolvedOccurrences() {
  return useQuery({
    queryKey: [...recurringKey, 'occurrences'],
    queryFn: async () => {
      const { data, error } = await supabase.from('recurring_occurrences').select('id, template_id, period, due_date, status, transaction_id')
      if (error) throw error
      return data as RecurringOccurrenceRow[]
    },
  })
}

export interface PendingOccurrence extends Occurrence {
  template: RecurringTemplate
}

/** Every Occurrence waiting for Confirm or Skip, oldest due date first. */
export function usePendingOccurrences(today: IsoDate) {
  const templates = useRecurringTemplates()
  const resolved = useResolvedOccurrences()
  const data = useMemo(() => {
    if (!templates.data || !resolved.data) return undefined
    const byTemplate = new Map<string, Set<string>>()
    for (const row of resolved.data) {
      byTemplate.set(row.template_id, (byTemplate.get(row.template_id) ?? new Set()).add(row.period))
    }
    return templates.data
      .flatMap((template) =>
        pendingOccurrences(template, byTemplate.get(template.id) ?? new Set(), today).map((occurrence) => ({
          ...occurrence,
          template,
        })),
      )
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  }, [templates.data, resolved.data, today])
  return { data, isPending: templates.isPending || resolved.isPending, isError: templates.isError || resolved.isError }
}

function useInvalidate() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: recurringKey }),
      queryClient.invalidateQueries({ queryKey: transactionsKey }),
      queryClient.invalidateQueries({ queryKey: accountBalancesKey }),
    ])
}

export interface TemplateInput {
  id?: string
  type: TransactionType
  amount: number
  account_id: string
  to_account_id: string | null
  category_id: string | null
  note: string
  day_of_month: number
  start_date: IsoDate
  end_date: IsoDate | null
  is_active: boolean
}

export function useSaveTemplate() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async ({ id, note, ...input }: TemplateInput) => {
      const row = { ...input, note: note.trim() || null }
      const { error } = id
        ? await supabase.from('recurring_templates').update(row).eq('id', id)
        : await supabase.from('recurring_templates').insert(row)
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}

export function useSetTemplateActive() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from('recurring_templates').update({ is_active: active }).eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}

/** Transactions already confirmed from the template stay. */
export function useDeleteTemplate() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('recurring_templates').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}

export function useConfirmOccurrence() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async (input: { templateId: string; period: IsoDate; amount: number; occurredAt: string }) => {
      const { error } = await supabase.rpc('confirm_recurring_occurrence', {
        p_template_id: input.templateId,
        p_period: input.period,
        p_amount: input.amount,
        p_occurred_at: input.occurredAt,
      })
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}

export function useSkipOccurrence() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async ({ templateId, period }: { templateId: string; period: IsoDate }) => {
      const { error } = await supabase.rpc('skip_recurring_occurrence', { p_template_id: templateId, p_period: period })
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}

export function useCreateTransactionWithRecurring() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async (input: {
      type: TransactionType
      amount: number
      occurredAt: string
      accountId: string
      toAccountId: string | null
      categoryId: string | null
      note: string
      adminFee: number | null
      endDate: IsoDate | null
    }) => {
      const { error } = await supabase.rpc('create_transaction_with_recurring', {
        p_type: input.type,
        p_amount: input.amount,
        p_occurred_at: input.occurredAt,
        p_account: input.accountId,
        p_to_account: input.toAccountId,
        p_category: input.categoryId,
        p_note: input.note,
        p_admin_fee: input.adminFee,
        p_end_date: input.endDate,
      })
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}
