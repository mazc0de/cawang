import { useQuery } from '@tanstack/react-query'
import { useCurrentProfile } from '@/features/profile/queries'
import { transactionsKey } from '@/features/transactions/queries'
import { type Cycle, cycleContaining } from '@/lib/cycle'
import type { Transaction } from '@/lib/database'
import { addDays, type IsoDate, todayIn, zonedTimestamp } from '@/lib/dates'
import { supabase } from '@/lib/supabase'

/** Today and the Cycle it falls in, from the profile's timezone and Cycle Start Day. */
export function useCurrentCycle() {
  const profile = useCurrentProfile()
  const today = todayIn(profile.timezone)
  return {
    today,
    timezone: profile.timezone,
    startDay: profile.cycle_start_day,
    cycle: cycleContaining(today, profile.cycle_start_day),
  }
}

/** Every Transaction whose local date lies in [start, end], oldest first. */
export function useRangeTransactions(start: IsoDate, end: IsoDate, timezone: string) {
  return useQuery({
    queryKey: [...transactionsKey, 'range', start, end, timezone],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .gte('occurred_at', zonedTimestamp(start, '00:00', timezone))
        .lt('occurred_at', zonedTimestamp(addDays(end, 1), '00:00', timezone))
        .order('occurred_at')
      if (error) throw error
      return data as Transaction[]
    },
  })
}

export function useCycleTransactions(cycle: Cycle, timezone: string) {
  return useRangeTransactions(cycle.start, cycle.end, timezone)
}
