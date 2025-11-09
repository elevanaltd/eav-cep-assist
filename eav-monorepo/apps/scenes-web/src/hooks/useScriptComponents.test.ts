import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useScriptComponents } from './useScriptComponents'
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

describe('useScriptComponents', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch script components for selected script', async () => {
    const mockComponents = [
      {
        id: '1',
        script_id: 's1',
        component_number: 1,
        content: 'Component content',
        word_count: 100,
        created_at: '2025-01-01',
      },
      {
        id: '2',
        script_id: 's1',
        component_number: 2,
        content: 'Another component',
        word_count: 150,
        created_at: '2025-01-01',
      },
    ]

    const mockOrder = vi.fn().mockResolvedValue({
      data: mockComponents,
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

    const { result } = renderHook(() => useScriptComponents('s1'), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toEqual(mockComponents)
  })

  it('should skip query when script_id is undefined', async () => {
    const { result } = renderHook(() => useScriptComponents(undefined), { wrapper })

    // Query disabled when scriptId is falsy, so data is undefined (not empty array)
    expect(result.current.data).toBeUndefined()
  })

  it('should order components by component_number ascending', async () => {
    const mockOrder = vi.fn().mockResolvedValue({
      data: [],
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

    renderHook(() => useScriptComponents('s1'), { wrapper })

    await waitFor(() => {
      expect(mockOrder).toHaveBeenCalledWith('component_number', { ascending: true })
    })
  })
})
