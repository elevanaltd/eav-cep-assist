import React from 'react'
import { render, type RenderResult } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '../AuthContext'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false }
  }
})

export function renderWithProviders(ui: React.ReactElement, includeNavigation = false): RenderResult {
  // @workspace/auth doesn't include NavigationProvider (that's in @workspace/ui)
  // For auth-only tests, just wrap with QueryClient and AuthProvider
  if (includeNavigation) {
    throw new Error('NavigationProvider moved to @workspace/ui - test should not reference it from @workspace/auth')
  }
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {ui}
      </AuthProvider>
    </QueryClientProvider>
  )
}

// Re-export testing library utilities
export * from '@testing-library/react'
