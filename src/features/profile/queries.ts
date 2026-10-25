import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Profile } from '@/lib/database'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/providers/auth-provider'

export const profileKey = (userId: string | undefined) => ['profile', userId] as const

export function useProfile() {
  const { user } = useAuth()
  return useQuery({
    queryKey: profileKey(user?.id),
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user!.id).single()
      if (error) throw error
      return data as Profile
    },
  })
}

/** The loaded profile, for screens behind RequireOnboarded (which waits for it). */
export function useCurrentProfile(): Profile {
  const { data } = useProfile()
  if (!data) throw new Error('useCurrentProfile needs a loaded profile')
  return data
}

export type ProfileChanges = Partial<
  Pick<Profile, 'language' | 'timezone' | 'cycle_start_day' | 'theme' | 'onboarding_completed_at' | 'amount_presets'>
>

export function useUpdateProfile() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (changes: ProfileChanges) => {
      const { data, error } = await supabase
        .from('profiles')
        .update(changes)
        .eq('id', user!.id)
        .select('*')
        .single()
      if (error) throw error
      return data as Profile
    },
    onSuccess: (profile) => queryClient.setQueryData(profileKey(user?.id), profile),
  })
}
