import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import '@/i18n'
import { isSupabaseConfigured } from '@/lib/supabase'
import { SetupMissingPage } from '@/pages/setup-missing-page'
import { AuthProvider } from '@/providers/auth-provider'
import { ThemeProvider } from '@/providers/theme-provider'
import { router } from '@/router'
import './index.css'
import { AmountVisibilityProvider } from '@/providers/amount-visibility'

const queryClient = new QueryClient({
  defaultOptions: {
    // Queries still run offline so the service worker can answer from its cache;
    // mutations fail at once instead of queueing, since offline writes are not supported.
    queries: { staleTime: 30_000, retry: 1, networkMode: 'offlineFirst' },
    mutations: { networkMode: 'always' },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <AmountVisibilityProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            {isSupabaseConfigured ? (
              <AuthProvider>
                <RouterProvider router={router} />
              </AuthProvider>
            ) : (
              <SetupMissingPage />
            )}
            <Toaster position="top-center" />
          </TooltipProvider>
        </QueryClientProvider>
      </AmountVisibilityProvider>
    </ThemeProvider>
  </StrictMode>,
)
