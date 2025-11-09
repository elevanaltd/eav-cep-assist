import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useScripts } from './useScripts'
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

describe('useScripts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch scripts for selected video', async () => {
    const mockScripts = [
      {
        id: '1',
        video_id: 'v1',
        status: 'approved' as const,
        plain_text: 'Script text',
        component_count: 5,
        created_at: '2025-01-01',
      },
    ]

    const mockEq = vi.fn().mockResolvedValue({
      data: mockScripts,
      error: null,
    })

    const mockSelect = vi.fn().mockReturnValue({
      eq: mockEq,
    })

    mockSupabase.from.mockReturnValue({
      select: mockSelect,
    })

    const { result } = renderHook(() => useScripts('v1'), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toEqual(mockScripts)
  })

  it('should skip query when video_id is undefined', async () => {
    const { result } = renderHook(() => useScripts(undefined), { wrapper })

    // Query disabled when videoId is falsy, so data is undefined (not empty array)
    expect(result.current.data).toBeUndefined()
  })
})
