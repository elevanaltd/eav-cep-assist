import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '../auth/AuthContext'
import { NavigationProvider } from '../lib/navigation/NavigationProvider'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false }
  }
})

export function renderWithProviders(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NavigationProvider>
          {ui}
        </NavigationProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

// Re-export testing library utilities
export * from '@testing-library/react'
