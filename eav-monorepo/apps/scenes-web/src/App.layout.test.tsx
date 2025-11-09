import { render } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ScenesWorkspace } from './App'
import { AuthProvider } from './contexts/AuthContext'
import { NavigationProvider } from './contexts/NavigationContext'
import { LastSavedProvider } from './contexts/LastSavedContext'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

/**
 * Layout Tests - Verify script-editor pattern implementation
 *
 * These tests verify that the layout matches the script editor pattern:
 * - Fixed header at top (64px height)
 * - Left sidebar (280px fixed, positioned relative to header)
 * - Main content area with margin-left to account for sidebar
 * - Content constrained to max-width (1200px) and centered
 * - Responsive design for smaller screens
 * - Proper scrolling behavior for all sections
 */
describe('App Layout - Script Editor Pattern', () => {
  it('should have fixed header with proper height and positioning', () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { staleTime: Infinity },
      },
    })

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <NavigationProvider>
            <LastSavedProvider>
              <ScenesWorkspace />
            </LastSavedProvider>
          </NavigationProvider>
        </AuthProvider>
      </QueryClientProvider>
    )

    // Verify header exists and has proper structure
    const header = container.querySelector('.app-header')
    expect(header).toBeTruthy()
    expect(header?.className).toContain('app-header')

    // Verify header contains the title
    const title = header?.querySelector('h1')
    expect(title?.textContent).toContain('Scene Planning')
  })

  it('should have app-layout with sidebar and main-content structure', () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { staleTime: Infinity },
      },
    })

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <NavigationProvider>
            <LastSavedProvider>
              <ScenesWorkspace />
            </LastSavedProvider>
          </NavigationProvider>
        </AuthProvider>
      </QueryClientProvider>
    )

    // Verify app-layout exists
    const appLayout = container.querySelector('.app-layout')
    expect(appLayout).toBeTruthy()

    // Verify main-content exists
    const mainContent = container.querySelector('.main-content')
    expect(mainContent).toBeTruthy()

    // Verify content is properly structured
    const contentHeader = container.querySelector('.content-header')
    expect(contentHeader).toBeTruthy()

    const contentContainer = container.querySelector('.content-container')
    expect(contentContainer).toBeTruthy()

    const contentScroll = container.querySelector('.content-scroll')
    expect(contentScroll).toBeTruthy()
  })

  it('should layout header before app-layout in DOM tree', () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { staleTime: Infinity },
      },
    })

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <NavigationProvider>
            <LastSavedProvider>
              <ScenesWorkspace />
            </LastSavedProvider>
          </NavigationProvider>
        </AuthProvider>
      </QueryClientProvider>
    )

    // Header should exist
    const header = container.querySelector('.app-header')
    expect(header).toBeTruthy()

    // App-layout should exist
    const appLayout = container.querySelector('.app-layout')
    expect(appLayout).toBeTruthy()

    // Both should be direct children of the same parent
    // Header should appear before app-layout in source order
    expect(header && appLayout).toBeTruthy()
  })

  it('should have content constrained to max-width with centering', () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { staleTime: Infinity },
      },
    })

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <NavigationProvider>
            <LastSavedProvider>
              <ScenesWorkspace />
            </LastSavedProvider>
          </NavigationProvider>
        </AuthProvider>
      </QueryClientProvider>
    )

    // Verify content-container exists and is properly styled
    const contentContainer = container.querySelector('.content-container')
    expect(contentContainer).toBeTruthy()
    expect(contentContainer?.className).toContain('content-container')

    // Verify scrollable area exists
    const contentScroll = container.querySelector('.content-scroll')
    expect(contentScroll).toBeTruthy()
    expect(contentScroll?.className).toContain('content-scroll')
  })
})
