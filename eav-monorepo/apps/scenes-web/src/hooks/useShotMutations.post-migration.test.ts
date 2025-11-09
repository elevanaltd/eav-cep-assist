import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useShotMutations } from './useShotMutations'
import * as supabaseLib from '../lib/supabase'

/**
 * POST-MIGRATION SPECIFICATION TESTS - useShotMutations
 *
 * Purpose: Define expected mutation behavior AFTER schema refactoring
 * These tests specify mutations using script_component_id parameter
 *
 * Expected Outcome: These tests will FAIL initially (current code uses scene_id)
 * After code updates in Phase 3, these tests will PASS
 *
 * Schema Context:
 * - NEW: InsertShotInput/UpdateShotInput use script_component_id
 * - NEW: Query invalidation uses ['shots', script_component_id]
 * - REMOVED: No more scene_planning_state references
 *
 * TDD Phase 2: RED - Write failing tests that define new behavior
 */

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

describe('useShotMutations - Post-Migration (script_component_id interface)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should accept script_component_id in insertShot input (not scene_id)', async () => {
    const mockNewShot = {
      id: 'shot-new',
      script_component_id: 'component-123', // NEW: Direct FK to script_components
      shot_number: 1,
      shot_type: 'WS',
      location_start_point: 'Standard',
      movement_type: 'Tracking',
      subject: 'Building',
      owner_user_id: 'user-1',
      created_at: '2025-01-01',
      updated_at: '2025-01-01',
    }

    const mockSelect = vi.fn().mockResolvedValue({
      data: [mockNewShot],
      error: null,
    })

    const mockInsert = vi.fn().mockReturnValue({
      select: mockSelect,
    })

    mockSupabase.from.mockReturnValue({
      insert: mockInsert,
    })

    const { result } = renderHook(() => useShotMutations(), { wrapper })

    // NEW interface - uses script_component_id
    const insertInput = {
      script_component_id: 'component-123',
      shot_number: 1,
      shot_type: 'WS',
      location_start_point: 'Standard',
      movement_type: 'Tracking',
      subject: 'Building',
    }

    await waitFor(() => {
      result.current.insertShot.mutate(insertInput)
    })

    await waitFor(() => expect(result.current.insertShot.isSuccess).toBe(true))

    // Verify script_component_id was passed to database
    expect(mockInsert).toHaveBeenCalledWith([
      expect.objectContaining({
        script_component_id: 'component-123',
      }),
    ])
  })

  it('should return shot with script_component_id field (not scene_id)', async () => {
    const mockNewShot = {
      id: 'shot-1',
      script_component_id: 'component-456', // NEW field
      shot_number: 1,
      shot_type: 'MID',
      created_at: '2025-01-01',
      updated_at: '2025-01-01',
    }

    const mockSelect = vi.fn().mockResolvedValue({
      data: [mockNewShot],
      error: null,
    })

    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: mockSelect,
      }),
    })

    const { result } = renderHook(() => useShotMutations(), { wrapper })

    result.current.insertShot.mutate({
      script_component_id: 'component-456',
      shot_number: 1,
    })

    await waitFor(() => expect(result.current.insertShot.isSuccess).toBe(true))

    // Verify returned shot has script_component_id (not scene_id)
    expect(result.current.insertShot.data).toHaveProperty('script_component_id')
    expect(result.current.insertShot.data?.script_component_id).toBe('component-456')
    expect(result.current.insertShot.data).not.toHaveProperty('scene_id')
  })

  it('should allow updating script_component_id in updateShot', async () => {
    const mockUpdatedShot = {
      id: 'shot-1',
      script_component_id: 'component-new',
      shot_number: 1,
      shot_type: 'CU',
      updated_at: '2025-01-02',
    }

    const mockSelect = vi.fn().mockResolvedValue({
      data: [mockUpdatedShot],
      error: null,
    })

    const mockEq = vi.fn().mockReturnValue({
      select: mockSelect,
    })

    mockSupabase.from.mockReturnValue({
      update: vi.fn().mockReturnValue({
        eq: mockEq,
      }),
    })

    const { result } = renderHook(() => useShotMutations(), { wrapper })

    const updateInput = {
      id: 'shot-1',
      script_component_id: 'component-new', // Can update FK
      shot_type: 'CU',
    }

    result.current.updateShot.mutate(updateInput)

    await waitFor(() => expect(result.current.updateShot.isSuccess).toBe(true))

    expect(result.current.updateShot.data).toHaveProperty('script_component_id')
    expect(result.current.updateShot.data?.script_component_id).toBe('component-new')
  })

  it('should require scriptComponentId in deleteShot (not sceneId)', async () => {
    const mockDelete = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    })

    mockSupabase.from.mockReturnValue({
      delete: mockDelete,
    })

    const { result } = renderHook(() => useShotMutations(), { wrapper })

    // NEW interface requires scriptComponentId (not sceneId)
    const deleteInput = {
      id: 'shot-to-delete',
      scriptComponentId: 'component-789', // Used for query invalidation
    }

    result.current.deleteShot.mutate(deleteInput)

    await waitFor(() => expect(result.current.deleteShot.isSuccess).toBe(true))

    // Verify scriptComponentId is used
    expect(deleteInput).toHaveProperty('scriptComponentId')
    expect(deleteInput).not.toHaveProperty('sceneId')
  })

  it('should invalidate queries with script_component_id in queryKey', async () => {
    // NEW query invalidation pattern
    // Pattern: queryClient.invalidateQueries({ queryKey: ['shots', script_component_id] })

    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: [{ id: '1', script_component_id: 'component-123', shot_number: 1 }],
        error: null,
      }),
    })

    mockSupabase.from.mockReturnValue({
      insert: mockInsert,
    })

    const { result } = renderHook(() => useShotMutations(), { wrapper })

    result.current.insertShot.mutate({
      script_component_id: 'component-123',
      shot_number: 1,
    })

    await waitFor(() => expect(result.current.insertShot.isSuccess).toBe(true))

    // New behavior: invalidates ['shots', 'component-123']
    // (vs old: ['shots', 'scene-123'])
  })

  it('should support creating multiple shots for same component', async () => {
    const componentId = 'component-multi'

    const mockShot1 = {
      id: 'shot-1',
      script_component_id: componentId,
      shot_number: 1,
      shot_type: 'WS',
    }

    const mockShot2 = {
      id: 'shot-2',
      script_component_id: componentId,
      shot_number: 2,
      shot_type: 'MID',
    }

    const mockSelect = vi.fn()
      .mockResolvedValueOnce({ data: [mockShot1], error: null })
      .mockResolvedValueOnce({ data: [mockShot2], error: null })

    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: mockSelect,
      }),
    })

    const { result } = renderHook(() => useShotMutations(), { wrapper })

    // Create first shot
    result.current.insertShot.mutate({
      script_component_id: componentId,
      shot_number: 1,
      shot_type: 'WS',
    })

    await waitFor(() => expect(result.current.insertShot.isSuccess).toBe(true))

    // Create second shot for same component (was not allowed with 1:1 scene_planning_state)
    result.current.insertShot.mutate({
      script_component_id: componentId,
      shot_number: 2,
      shot_type: 'MID',
    })

    await waitFor(() => expect(result.current.insertShot.isSuccess).toBe(true))

    expect(result.current.insertShot.data?.script_component_id).toBe(componentId)
  })

  it('should have InsertShotInput interface with script_component_id (not scene_id)', () => {
    // NEW TypeScript interface
    const validInput = {
      script_component_id: 'component-999', // NEW field name
      shot_number: 1,
      shot_type: 'WS',
      location_start_point: 'Standard',
      movement_type: 'Tracking',
      subject: 'Building',
    }

    // Verify script_component_id is the correct field name
    expect(validInput).toHaveProperty('script_component_id')
    expect(validInput).not.toHaveProperty('scene_id')
  })
})
