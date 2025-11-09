import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import { useShots } from './useShots'
import * as supabaseLib from '../lib/supabase'

/**
 * POST-MIGRATION SPECIFICATION TESTS
 *
 * Purpose: Define expected behavior AFTER schema refactoring
 * These tests specify shots using script_component_id (direct FK)
 *
 * Expected Outcome: These tests will FAIL initially (current code uses scene_id)
 * After code updates in Phase 3, these tests will PASS
 *
 * Schema Context:
 * - REMOVED: scene_planning_state middleman table
 * - NEW: shots.script_component_id → script_components.id (direct FK)
 * - BENEFIT: Simpler schema, clearer relationships, better performance
 *
 * TDD Phase 2: RED - Write failing tests that define new behavior
 */

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

describe('useShots - Post-Migration (script_component_id direct FK)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should query shots using script_component_id (direct FK)', async () => {
    const mockShots = [
      {
        id: 'shot-1',
        script_component_id: 'component-uuid', // NEW: Direct FK to script_components
        shot_number: 1,
        shot_type: 'WS',
        location_start_point: 'Standard',
        location_other: null,
        movement_type: 'Tracking',
        subject: 'Building',
        subject_other: null,
        variant: 'front entrance',
        action: 'establishing',
        owner_user_id: 'user-1',
        created_at: '2025-01-01',
        updated_at: '2025-01-01',
      },
      {
        id: 'shot-2',
        script_component_id: 'component-uuid', // Same component, multiple shots
        shot_number: 2,
        shot_type: 'MID',
        location_start_point: 'Other',
        location_other: 'parking lot',
        movement_type: 'Standard',
        subject: 'Other',
        subject_other: 'security camera',
        variant: 'close detail',
        action: 'pan left to right',
        owner_user_id: 'user-1',
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

    // NEW: Hook accepts script_component_id (not scene_id)
    const { result } = renderHook(() => useShots('component-uuid'), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Verify new behavior
    expect(mockSupabase.from).toHaveBeenCalledWith('shots')
    expect(mockSelect).toHaveBeenCalledWith(
      'id, script_component_id, shot_number, shot_type, location_start_point, location_other, movement_type, subject, subject_other, variant, action, owner_user_id, created_at, updated_at'
    )
    expect(mockEq).toHaveBeenCalledWith('script_component_id', 'component-uuid')
    expect(mockOrder).toHaveBeenCalledWith('shot_number', { ascending: true })
    expect(result.current.data).toEqual(mockShots)
  })

  it('should use script_component_id in queryKey (not scene_id)', async () => {
    const componentId = 'component-123'
    const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null })
    const mockEq = vi.fn().mockReturnValue({ order: mockOrder })
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
    mockSupabase.from.mockReturnValue({ select: mockSelect })

    const { result } = renderHook(() => useShots(componentId), { wrapper })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    // QueryKey should be ['shots', 'component-123'] not ['shots', 'scene-123']
    expect(result.current.data).toBeDefined()
  })

  it('should return empty array when script_component_id has no shots', async () => {
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

    const { result } = renderHook(() => useShots('empty-component'), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.data).toEqual([])
    expect(mockEq).toHaveBeenCalledWith('script_component_id', 'empty-component')
  })

  it('should support multiple shots per script_component (removed 1:1 constraint)', async () => {
    const mockShots = [
      {
        id: 'shot-1',
        script_component_id: 'component-456',
        shot_number: 1,
        shot_type: 'WS',
        location_start_point: 'Standard',
        movement_type: 'Establishing',
        subject: 'Building',
        variant: null,
        action: null,
        owner_user_id: 'user-1',
        created_at: '2025-01-01',
        updated_at: '2025-01-01',
      },
      {
        id: 'shot-2',
        script_component_id: 'component-456', // Same component
        shot_number: 2,
        shot_type: 'MID',
        location_start_point: 'Standard',
        movement_type: 'Standard',
        subject: 'Building',
        variant: 'side view',
        action: 'zoom in',
        owner_user_id: 'user-1',
        created_at: '2025-01-01',
        updated_at: '2025-01-01',
      },
      {
        id: 'shot-3',
        script_component_id: 'component-456', // Same component again
        shot_number: 3,
        shot_type: 'CU',
        location_start_point: 'Standard',
        movement_type: 'Photos',
        subject: 'Building',
        variant: 'detail shot',
        action: null,
        owner_user_id: 'user-1',
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

    const { result } = renderHook(() => useShots('component-456'), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Verify multiple shots returned for single component
    expect(result.current.data).toHaveLength(3)
    expect(result.current.data?.every((shot) => shot.script_component_id === 'component-456')).toBe(
      true
    )
  })

  it('should return shots with script_component_id field (not scene_id)', async () => {
    const mockShots = [
      {
        id: 'shot-1',
        script_component_id: 'component-789', // NEW field
        shot_number: 1,
        shot_type: 'FP',
        location_start_point: 'Standard',
        location_other: null,
        movement_type: 'Tracking',
        subject: 'Standard',
        subject_other: null,
        variant: null,
        action: 'follow movement',
        owner_user_id: 'user-1',
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

    const { result } = renderHook(() => useShots('component-789'), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Verify script_component_id exists (not scene_id)
    expect(result.current.data?.[0]).toHaveProperty('script_component_id')
    expect(result.current.data?.[0].script_component_id).toBe('component-789')
    expect(result.current.data?.[0]).not.toHaveProperty('scene_id')
  })

  it('should skip query when script_component_id is undefined', () => {
    const { result } = renderHook(() => useShots(undefined), { wrapper })

    expect(result.current.data).toBeUndefined()
  })
})
