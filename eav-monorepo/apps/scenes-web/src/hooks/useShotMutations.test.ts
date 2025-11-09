import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useShotMutations } from './useShotMutations'
import * as supabaseLib from '../lib/supabase'

const mockSupabase = {
  from: vi.fn(),
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
vi.spyOn(supabaseLib, 'getSupabaseClient').mockReturnValue(mockSupabase as any)

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
})

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(QueryClientProvider, { client: queryClient }, children)

describe('useShotMutations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should provide insert mutation', () => {
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [{ id: '1', script_component_id: 'comp1', shot_number: 1 }],
          error: null,
        }),
      }),
    })

    const { result } = renderHook(() => useShotMutations(), { wrapper })

    expect(result.current.insertShot).toBeDefined()
  })

  it('should provide update mutation', () => {
    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [{ id: '1' }],
          error: null,
        }),
      }),
    })

    const { result } = renderHook(() => useShotMutations(), { wrapper })

    expect(result.current.updateShot).toBeDefined()
  })

  it('should provide delete mutation', () => {
    mockSupabase.from.mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      }),
    })

    const { result } = renderHook(() => useShotMutations(), { wrapper })

    expect(result.current.deleteShot).toBeDefined()
  })
})
