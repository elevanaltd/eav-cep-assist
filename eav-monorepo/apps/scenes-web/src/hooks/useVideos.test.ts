import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useVideos } from './useVideos'
import * as supabaseLib from '../lib/supabase'
import * as authHook from './useAuth'

const mockSupabase = {
  from: vi.fn(),
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
vi.spyOn(supabaseLib, 'getSupabaseClient').mockReturnValue(mockSupabase as any)

// Mock useAuth to return a logged-in user
vi.spyOn(authHook, 'useAuth').mockReturnValue({
  user: { id: 'test-user-id', email: 'test@example.com' },
  profile: null,
  isLoading: false,
  isError: false,
  logout: vi.fn(),
})

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useVideos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch videos for selected project', async () => {
    const mockVideos = [
      { id: '1', project_id: 'p1', title: 'Video A', eav_code: 'V001', created_at: '2025-01-01' },
      { id: '2', project_id: 'p1', title: 'Video B', eav_code: 'V002', created_at: '2025-01-02' },
    ]

    const mockOrder = vi.fn().mockResolvedValue({
      data: mockVideos,
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

    const { result } = renderHook(() => useVideos('p1'), { wrapper })

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false)
      },
      { timeout: 3000 }
    )

    expect(result.current.data).toEqual(mockVideos)
    expect(mockSelect).toHaveBeenCalledWith('id, title, eav_code, created_at')
    expect(mockEq).toHaveBeenCalledWith('eav_code', 'p1')
    expect(mockOrder).toHaveBeenCalledWith('title', { ascending: true })
  })

  it('should skip query when project_id is undefined', async () => {
    const { result } = renderHook(() => useVideos(undefined), { wrapper })

    // Query disabled when projectId is falsy, so data is undefined (not empty array)
    expect(result.current.data).toBeUndefined()
    expect(result.current.isLoading).toBe(false)
  })

  it('should handle errors gracefully', async () => {
    const mockError = new Error('Supabase error')

    const mockEq = vi.fn().mockResolvedValue({
      data: null,
      error: mockError,
    })

    const mockSelect = vi.fn().mockReturnValue({
      eq: mockEq,
    })

    mockSupabase.from.mockReturnValue({
      select: mockSelect,
    })

    const { result } = renderHook(() => useVideos('p1'), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBeDefined()
  })
})
