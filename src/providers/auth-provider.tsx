import type { Session, User } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface AuthContextValue {
  session: Session | null
  user: User | null
  /** True until the stored session has been read. */
  loading: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

/** The service worker's cache of Supabase reads (vite.config.ts); emptied on sign-out. */
const SUPABASE_READ_CACHE = 'supabase-reads'

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next)
      setLoading(false)
      if (event === 'SIGNED_OUT') {
        queryClient.clear()
        // The next person on this device must not see this user's cached data offline.
        if ('caches' in window) void caches.delete(SUPABASE_READ_CACHE)
      }
    })
    return () => data.subscription.unsubscribe()
  }, [queryClient])

  const value = useMemo(() => ({ session, user: session?.user ?? null, loading }), [session, loading])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}

/** The signed-in user; only for components rendered behind RequireAuth. */
export function useUser(): User {
  const { user } = useAuth()
  if (!user) throw new Error('useUser needs a signed-in user')
  return user
}
