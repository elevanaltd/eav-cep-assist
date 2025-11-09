import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useShots } from './useShots'
import * as supabaseLib from '../lib/supabase'

const mockSupabase = {
  from: vi.fn(),
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
vi.spyOn(supabaseLib, 'getSupabaseClient').mockReturnValue(mockSupabase as any)

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useShots', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch shots for selected script component', async () => {
    const mockShots = [
      {
        id: '1',
        script_component_id: 'comp1',
        shot_number: 1,
        status: 'Not Started',
        location: 'EXT-BUILDING',
        subject: 'Building',
        action: 'Establishing',
        shot_type: 'Wide',
        int_ext: 'exterior' as const,
        requires_actor: false,
        props: null,
        variant: null,
        plot_notes: null,
        created_at: '2025-01-01',
        updated_at: '2025-01-01',
      },
    ]

    const mockOrder = vi.fn().mockResolvedValue({
      data: mockShots,
      error: null,
    })

    const mockEq = vi.fn().mockReturnValue({
      order: mockOrder,
    })

    const mockSelect = vi.fn().mockReturnValue({
      eq: mockEq,
    })

    mockSupabase.from.mockReturnValue({
      select: mockSelect,
    })

    const { result } = renderHook(() => useShots('comp1'), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toEqual(mockShots)
  })

  it('should skip query when script_component_id is undefined', () => {
    const { result } = renderHook(() => useShots(undefined), { wrapper })

    expect(result.current.data).toBeUndefined()
  })
})
