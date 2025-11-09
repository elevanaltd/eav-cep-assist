import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useProjects } from './useProjects'
import * as supabaseLib from '../lib/supabase'

const mockSupabase = {
  from: vi.fn(),
  auth: {
    getSession: vi.fn(),
  },
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
vi.spyOn(supabaseLib, 'getSupabaseClient').mockReturnValue(mockSupabase as any)

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useProjects', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch projects for current user via user_clients RLS', async () => {
    const mockProjects = [
      { id: '1', title: 'Project A', eav_code: 'P001', project_phase: 'Pre-Production', created_at: '2025-01-01' },
      { id: '2', title: 'Project B', eav_code: 'P002', project_phase: 'In Production', created_at: '2025-01-02' },
    ]

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: mockProjects,
        error: null,
      }),
    })

    const { result } = renderHook(() => useProjects(), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toEqual(mockProjects)
    expect(mockSupabase.from).toHaveBeenCalledWith('projects')
  })

  it('should handle loading state correctly', () => {
    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockImplementation(
        () =>
          new Promise(() => {
            /* never resolves */
          })
      ),
    })

    const { result } = renderHook(() => useProjects(), { wrapper })

    expect(result.current.isLoading).toBe(true)
  })

  it('should handle errors gracefully', async () => {
    const mockError = new Error('Supabase error')

    mockSupabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({
        data: null,
        error: mockError,
      }),
    })

    const { result } = renderHook(() => useProjects(), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.error).toBeDefined()
  })
})
