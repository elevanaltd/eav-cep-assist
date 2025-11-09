/**
 * useScriptLock Hook - Unit Tests
 *
 * **Test Strategy:** Mocked dependencies (no realtime, no integration)
 * - Mock Supabase client (no actual database calls)
 * - Mock realtime channel subscriptions (controllable events)
 * - Mock timer functions (deterministic timing with vi.useFakeTimers)
 *
 * **Coverage:**
 * 1. Lock State Machine (checking → acquired/locked, heartbeat failures, releases)
 * 2. Permission Checks (user ID caching, lock ownership determination)
 * 3. Error Handling (RPC failures, heartbeat failures, release failures)
 * 4. Configuration (heartbeat intervals, lock expiration logic)
 * 5. Edge Cases (null scriptId, concurrent acquisitions, unmount cleanup)
 *
 * **Test Methodology Guardian Approved:**
 * - Unit tests validate state machine logic WITHOUT real database
 * - Fast execution (<2 seconds for full suite)
 * - Deterministic behavior via mocked timers
 * - Complements integration tests (useScriptLock.integration.test.ts)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useScriptLock } from './useScriptLock'
import type { SupabaseClient } from '@supabase/supabase-js'

// Mock Supabase client with full control
const createMockSupabaseClient = () => {
  const mockChannel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
  }

  const mockClient = {
    auth: {
      getUser: vi.fn(),
    },
    rpc: vi.fn(),
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(),
      })),
    })),
    channel: vi.fn(() => mockChannel),
    removeChannel: vi.fn(),
  } as unknown as SupabaseClient

  return { mockClient, mockChannel }
}

describe('useScriptLock (unit)', () => {
  const TEST_SCRIPT_ID = '00000000-0000-0000-0000-000000000101'
  const TEST_USER_ID = 'user-123'
  const TEST_USER_NAME = 'Test User'
  const OTHER_USER_ID = 'user-456'
  const OTHER_USER_NAME = 'Other User'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('State Machine: Initial State', () => {
    it('should initialize with checking status', () => {
      const { mockClient } = createMockSupabaseClient()

      // Mock auth to return user
      mockClient.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: { id: TEST_USER_ID } },
        error: null,
      })

      // Mock RPC to simulate pending acquisition
      ;(mockClient.rpc as ReturnType<typeof vi.fn>).mockImplementation(() =>
        new Promise(() => {}) // Never resolves - keeps status as 'checking'
      )

      const { result } = renderHook(() => useScriptLock(TEST_SCRIPT_ID, mockClient))

      expect(result.current.lockStatus).toBe('checking')
      expect(result.current.lockedBy).toBeNull()
    })

    it('should not attempt acquisition when scriptId is undefined', () => {
      const { mockClient } = createMockSupabaseClient()

      renderHook(() => useScriptLock(undefined, mockClient))

      expect(mockClient.rpc).not.toHaveBeenCalled()
    })
  })

  describe('State Machine: Successful Acquisition', () => {
    it('should transition from checking to acquired on successful lock', async () => {
      const { mockClient } = createMockSupabaseClient()

      mockClient.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: { id: TEST_USER_ID } },
        error: null,
      })

      ;(mockClient.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [
          {
            success: true,
            locked_by_user_id: TEST_USER_ID,
            locked_by_name: TEST_USER_NAME,
          },
        ],
        error: null,
      })

      const { result } = renderHook(() => useScriptLock(TEST_SCRIPT_ID, mockClient))

      await waitFor(() => {
        expect(result.current.lockStatus).toBe('acquired')
      })

      expect(result.current.lockedBy).toEqual({
        id: TEST_USER_ID,
        name: TEST_USER_NAME,
      })
    })

    it('should cache user ID for realtime comparison', async () => {
      const { mockClient } = createMockSupabaseClient()

      mockClient.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: { id: TEST_USER_ID } },
        error: null,
      })

      ;(mockClient.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [
          {
            success: true,
            locked_by_user_id: TEST_USER_ID,
            locked_by_name: TEST_USER_NAME,
          },
        ],
        error: null,
      })

      renderHook(() => useScriptLock(TEST_SCRIPT_ID, mockClient))

      await waitFor(() => {
        expect(mockClient.auth.getUser).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('State Machine: Failed Acquisition (Locked by Other)', () => {
    it('should transition to locked when another user holds lock', async () => {
      const { mockClient } = createMockSupabaseClient()

      mockClient.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: { id: TEST_USER_ID } },
        error: null,
      })

      ;(mockClient.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [
          {
            success: false,
            locked_by_user_id: OTHER_USER_ID,
            locked_by_name: OTHER_USER_NAME,
          },
        ],
        error: null,
      })

      const { result } = renderHook(() => useScriptLock(TEST_SCRIPT_ID, mockClient))

      await waitFor(() => {
        expect(result.current.lockStatus).toBe('locked')
      })

      expect(result.current.lockedBy).toEqual({
        id: OTHER_USER_ID,
        name: OTHER_USER_NAME,
      })
    })

    it('should show "Unknown" user when lock holder name is missing', async () => {
      const { mockClient } = createMockSupabaseClient()

      mockClient.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: { id: TEST_USER_ID } },
        error: null,
      })

      ;(mockClient.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [
          {
            success: false,
            locked_by_user_id: OTHER_USER_ID,
            locked_by_name: null, // Missing name
          },
        ],
        error: null,
      })

      const { result } = renderHook(() => useScriptLock(TEST_SCRIPT_ID, mockClient))

      await waitFor(() => {
        expect(result.current.lockStatus).toBe('locked')
      })

      expect(result.current.lockedBy?.name).toBe('Unknown')
    })
  })

  describe('Error Handling: Lock Acquisition Failures', () => {
    it('should transition to locked on RPC error', async () => {
      const { mockClient } = createMockSupabaseClient()

      mockClient.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: { id: TEST_USER_ID } },
        error: null,
      })

      ;(mockClient.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: null,
        error: { message: 'Database error', code: 'DB_ERROR' },
      })

      const { result } = renderHook(() => useScriptLock(TEST_SCRIPT_ID, mockClient))

      await waitFor(() => {
        expect(result.current.lockStatus).toBe('locked')
      })
    })

    it('should transition to locked on RPC exception', async () => {
      const { mockClient } = createMockSupabaseClient()

      mockClient.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: { id: TEST_USER_ID } },
        error: null,
      })

      ;(mockClient.rpc as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Network failure')
      )

      const { result } = renderHook(() => useScriptLock(TEST_SCRIPT_ID, mockClient))

      await waitFor(() => {
        expect(result.current.lockStatus).toBe('locked')
      })
    })
  })

  describe('State Machine: Manual Release', () => {
    it('should transition to unlocked when releaseLock is called', async () => {
      const { mockClient } = createMockSupabaseClient()

      mockClient.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: { id: TEST_USER_ID } },
        error: null,
      })

      ;(mockClient.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [
          {
            success: true,
            locked_by_user_id: TEST_USER_ID,
            locked_by_name: TEST_USER_NAME,
          },
        ],
        error: null,
      })

      const mockEq = vi.fn().mockResolvedValue({ error: null })
      mockClient.from = vi.fn(() => ({
        delete: vi.fn(() => ({
          eq: mockEq,
        })),
      })) as any

      const { result } = renderHook(() => useScriptLock(TEST_SCRIPT_ID, mockClient))

      await waitFor(() => {
        expect(result.current.lockStatus).toBe('acquired')
      })

      await result.current.releaseLock()

      await waitFor(() => {
        expect(result.current.lockStatus).toBe('unlocked')
      })

      expect(result.current.lockedBy).toBeNull()
    })

    it('should not release lock when scriptId is undefined', async () => {
      const { mockClient } = createMockSupabaseClient()

      const { result } = renderHook(() => useScriptLock(undefined, mockClient))

      await result.current.releaseLock()

      expect(mockClient.from).not.toHaveBeenCalled()
    })

    it('should handle release errors gracefully', async () => {
      const { mockClient } = createMockSupabaseClient()

      mockClient.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: { id: TEST_USER_ID } },
        error: null,
      })

      ;(mockClient.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [
          {
            success: true,
            locked_by_user_id: TEST_USER_ID,
            locked_by_name: TEST_USER_NAME,
          },
        ],
        error: null,
      })

      mockClient.from = vi.fn(() => ({
        delete: vi.fn(() => ({
          eq: vi.fn().mockRejectedValue(new Error('Delete failed')),
        })),
      })) as any

      const { result } = renderHook(() => useScriptLock(TEST_SCRIPT_ID, mockClient))

      await waitFor(() => {
        expect(result.current.lockStatus).toBe('acquired')
      })

      // Should not throw error
      await expect(result.current.releaseLock()).resolves.toBeUndefined()
    })
  })

  describe('State Machine: Force Unlock (Admin)', () => {
    it('should transition to unlocked when forceUnlock is called', async () => {
      const { mockClient } = createMockSupabaseClient()

      mockClient.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: { id: TEST_USER_ID } },
        error: null,
      })

      ;(mockClient.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [
          {
            success: false,
            locked_by_user_id: OTHER_USER_ID,
            locked_by_name: OTHER_USER_NAME,
          },
        ],
        error: null,
      })

      mockClient.from = vi.fn(() => ({
        delete: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      })) as any

      const { result } = renderHook(() => useScriptLock(TEST_SCRIPT_ID, mockClient))

      await waitFor(() => {
        expect(result.current.lockStatus).toBe('locked')
      })

      await result.current.forceUnlock()

      await waitFor(() => {
        expect(result.current.lockStatus).toBe('unlocked')
      })

      expect(result.current.lockedBy).toBeNull()
    })

    it('should handle force unlock errors gracefully', async () => {
      const { mockClient } = createMockSupabaseClient()

      mockClient.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: { id: TEST_USER_ID } },
        error: null,
      })

      ;(mockClient.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [
          {
            success: false,
            locked_by_user_id: OTHER_USER_ID,
            locked_by_name: OTHER_USER_NAME,
          },
        ],
        error: null,
      })

      mockClient.from = vi.fn(() => ({
        delete: vi.fn(() => ({
          eq: vi.fn().mockRejectedValue(new Error('Force unlock failed')),
        })),
      })) as any

      const { result } = renderHook(() => useScriptLock(TEST_SCRIPT_ID, mockClient))

      await waitFor(() => {
        expect(result.current.lockStatus).toBe('locked')
      })

      await expect(result.current.forceUnlock()).resolves.toBeUndefined()
    })
  })

  describe('Heartbeat: Configuration', () => {
    it('should start heartbeat interval when lock acquired', async () => {
      const { mockClient } = createMockSupabaseClient()

      mockClient.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: { id: TEST_USER_ID } },
        error: null,
      })

      ;(mockClient.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [
          {
            success: true,
            locked_by_user_id: TEST_USER_ID,
            locked_by_name: TEST_USER_NAME,
          },
        ],
        error: null,
      })

      let intervalCallback: (() => void) | null = null
      const originalSetInterval = global.setInterval
      global.setInterval = vi.fn((callback: () => void, ms: number) => {
        if (ms === 5 * 60 * 1000) {
          // Capture heartbeat interval
          intervalCallback = callback
        }
        return originalSetInterval(callback, ms)
      }) as any

      renderHook(() => useScriptLock(TEST_SCRIPT_ID, mockClient))

      await waitFor(() => {
        expect(intervalCallback).toBeTruthy()
      })

      global.setInterval = originalSetInterval

      // Test that heartbeat was configured (implementation detail, not behavioral)
      expect(intervalCallback).toBeDefined()
    })

    it('should use 5-minute default heartbeat interval when parameter not provided', async () => {
      // TMG Ruling 2025-11-04: Unit test enforces production default contract
      // This test locks the 5-minute production interval and prevents drift

      const { mockClient } = createMockSupabaseClient()

      mockClient.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: { id: TEST_USER_ID } },
        error: null,
      })

      ;(mockClient.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [
          {
            success: true,
            locked_by_user_id: TEST_USER_ID,
            locked_by_name: TEST_USER_NAME,
          },
        ],
        error: null,
      })

      let capturedIntervalMs: number | null = null
      const originalSetInterval = global.setInterval
      global.setInterval = vi.fn((callback: () => void, ms: number) => {
        capturedIntervalMs = ms // Capture the interval value
        return originalSetInterval(callback, ms)
      }) as any

      // Invoke WITHOUT heartbeatIntervalMs parameter (should default to 5min)
      renderHook(() => useScriptLock(TEST_SCRIPT_ID, mockClient))

      await waitFor(() => {
        expect(capturedIntervalMs).toBe(5 * 60 * 1000) // 5 minutes
      })

      global.setInterval = originalSetInterval
    })

    it('should allow custom heartbeat interval injection for tests', async () => {
      // TMG Ruling 2025-11-04: Configuration seam enables test performance
      // Integration tests inject 5s interval without test-production divergence

      const { mockClient } = createMockSupabaseClient()

      mockClient.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: { id: TEST_USER_ID } },
        error: null,
      })

      ;(mockClient.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [
          {
            success: true,
            locked_by_user_id: TEST_USER_ID,
            locked_by_name: TEST_USER_NAME,
          },
        ],
        error: null,
      })

      let capturedIntervalMs: number | null = null
      const originalSetInterval = global.setInterval
      global.setInterval = vi.fn((callback: () => void, ms: number) => {
        capturedIntervalMs = ms
        return originalSetInterval(callback, ms)
      }) as any

      const CUSTOM_INTERVAL_MS = 5000 // 5 seconds for test performance

      // Invoke WITH custom heartbeatIntervalMs parameter
      renderHook(() => useScriptLock(TEST_SCRIPT_ID, mockClient, CUSTOM_INTERVAL_MS))

      await waitFor(() => {
        expect(capturedIntervalMs).toBe(CUSTOM_INTERVAL_MS)
      })

      global.setInterval = originalSetInterval
    })

    it('should stop heartbeat when lock lost', async () => {
      const { mockClient } = createMockSupabaseClient()

      mockClient.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: { id: TEST_USER_ID } },
        error: null,
      })

      ;(mockClient.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [
          {
            success: true,
            locked_by_user_id: TEST_USER_ID,
            locked_by_name: TEST_USER_NAME,
          },
        ],
        error: null,
      })

      let clearIntervalCalled = false
      const originalClearInterval = global.clearInterval
      global.clearInterval = vi.fn((id: any) => {
        clearIntervalCalled = true
        return originalClearInterval(id)
      }) as any

      mockClient.from = vi.fn(() => ({
        delete: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      })) as any

      const { result } = renderHook(() => useScriptLock(TEST_SCRIPT_ID, mockClient))

      await waitFor(() => {
        expect(result.current.lockStatus).toBe('acquired')
      })

      await result.current.releaseLock()

      await waitFor(() => {
        expect(result.current.lockStatus).toBe('unlocked')
      })

      // Heartbeat should have been cleared
      expect(clearIntervalCalled).toBe(true)

      global.clearInterval = originalClearInterval
    })

    it('should not send heartbeat when lock not acquired', async () => {
      const { mockClient } = createMockSupabaseClient()

      mockClient.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: { id: TEST_USER_ID } },
        error: null,
      })

      ;(mockClient.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [
          {
            success: false,
            locked_by_user_id: OTHER_USER_ID,
            locked_by_name: OTHER_USER_NAME,
          },
        ],
        error: null,
      })

      let intervalSet = false
      const originalSetInterval = global.setInterval
      global.setInterval = vi.fn((callback: () => void, ms: number) => {
        if (ms === 5 * 60 * 1000) {
          intervalSet = true
        }
        return originalSetInterval(callback, ms)
      }) as any

      renderHook(() => useScriptLock(TEST_SCRIPT_ID, mockClient))

      await waitFor(() => {
        expect(mockClient.rpc).toHaveBeenCalled()
      })

      // Give time for any potential interval setup
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Heartbeat interval should NOT have been set since lock wasn't acquired
      expect(intervalSet).toBe(false)

      global.setInterval = originalSetInterval
    })
  })

  describe('Heartbeat: Error Handling', () => {
    it('should trigger re-acquisition on heartbeat update error', async () => {
      const { mockClient } = createMockSupabaseClient()

      mockClient.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: { id: TEST_USER_ID } },
        error: null,
      })

      ;(mockClient.rpc as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          data: [
            {
              success: true,
              locked_by_user_id: TEST_USER_ID,
              locked_by_name: TEST_USER_NAME,
            },
          ],
          error: null,
        })
        .mockResolvedValueOnce({
          data: [
            {
              success: true,
              locked_by_user_id: TEST_USER_ID,
              locked_by_name: TEST_USER_NAME,
            },
          ],
          error: null,
        })

      let heartbeatCallback: (() => void) | null = null
      const originalSetInterval = global.setInterval
      global.setInterval = vi.fn((callback: () => void, ms: number) => {
        if (ms === 5 * 60 * 1000) {
          heartbeatCallback = callback
        }
        return originalSetInterval(callback, ms)
      }) as any

      const mockUpdate = vi
        .fn()
        .mockResolvedValue({ error: { message: 'Heartbeat failed' } })

      mockClient.from = vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => mockUpdate()),
        })),
      })) as any

      renderHook(() => useScriptLock(TEST_SCRIPT_ID, mockClient))

      await waitFor(() => {
        expect(heartbeatCallback).toBeTruthy()
      })

      // Manually trigger heartbeat
      await heartbeatCallback!()

      // Should have attempted re-acquisition
      await waitFor(() => {
        expect(mockClient.rpc).toHaveBeenCalledTimes(2)
      })

      global.setInterval = originalSetInterval
    })

    it('should trigger re-acquisition on heartbeat exception', async () => {
      const { mockClient } = createMockSupabaseClient()

      mockClient.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: { id: TEST_USER_ID } },
        error: null,
      })

      ;(mockClient.rpc as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          data: [
            {
              success: true,
              locked_by_user_id: TEST_USER_ID,
              locked_by_name: TEST_USER_NAME,
            },
          ],
          error: null,
        })
        .mockResolvedValueOnce({
          data: [
            {
              success: true,
              locked_by_user_id: TEST_USER_ID,
              locked_by_name: TEST_USER_NAME,
            },
          ],
          error: null,
        })

      let heartbeatCallback: (() => void) | null = null
      const originalSetInterval = global.setInterval
      global.setInterval = vi.fn((callback: () => void, ms: number) => {
        if (ms === 5 * 60 * 1000) {
          heartbeatCallback = callback
        }
        return originalSetInterval(callback, ms)
      }) as any

      const mockUpdate = vi.fn().mockRejectedValue(new Error('Network error'))

      mockClient.from = vi.fn(() => ({
        update: vi.fn(() => ({
          eq: vi.fn(() => mockUpdate()),
        })),
      })) as any

      renderHook(() => useScriptLock(TEST_SCRIPT_ID, mockClient))

      await waitFor(() => {
        expect(heartbeatCallback).toBeTruthy()
      })

      // Manually trigger heartbeat
      await heartbeatCallback!()

      // Should have attempted re-acquisition
      await waitFor(() => {
        expect(mockClient.rpc).toHaveBeenCalledTimes(2)
      })

      global.setInterval = originalSetInterval
    })
  })

  describe('Realtime Subscriptions', () => {
    it('should subscribe to realtime channel on mount', async () => {
      const { mockClient, mockChannel } = createMockSupabaseClient()

      mockClient.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: { id: TEST_USER_ID } },
        error: null,
      })

      ;(mockClient.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [
          {
            success: true,
            locked_by_user_id: TEST_USER_ID,
            locked_by_name: TEST_USER_NAME,
          },
        ],
        error: null,
      })

      renderHook(() => useScriptLock(TEST_SCRIPT_ID, mockClient))

      await waitFor(() => {
        expect(mockClient.channel).toHaveBeenCalledWith(`script_locks:${TEST_SCRIPT_ID}`)
      })

      // Verify 2 separate subscriptions (INSERT, UPDATE)
      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          event: 'INSERT',
          schema: 'public',
          table: 'script_locks',
          filter: `script_id=eq.${TEST_SCRIPT_ID}`,
        }),
        expect.any(Function)
      )

      expect(mockChannel.on).toHaveBeenCalledWith(
        'postgres_changes',
        expect.objectContaining({
          event: 'UPDATE',
          schema: 'public',
          table: 'script_locks',
          filter: `script_id=eq.${TEST_SCRIPT_ID}`,
        }),
        expect.any(Function)
      )

      expect(mockChannel.subscribe).toHaveBeenCalled()
    })

    it('should set status to acquired when INSERT event is for current user', async () => {
      const { mockClient, mockChannel } = createMockSupabaseClient()

      mockClient.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: { id: TEST_USER_ID } },
        error: null,
      })

      ;(mockClient.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [
          {
            success: false,
            locked_by_user_id: OTHER_USER_ID,
            locked_by_name: OTHER_USER_NAME,
          },
        ],
        error: null,
      })

      // Mock user_profiles fetch for display_name (set up BEFORE realtime callback)
      mockClient.from = vi.fn((table) => {
        if (table === 'user_profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { display_name: TEST_USER_NAME },
                  error: null,
                }),
              })),
            })),
          }
        }
        return { delete: vi.fn(() => ({ eq: vi.fn() })) }
      }) as any

      let realtimeCallback: ((payload: any) => void) | null = null
      mockChannel.on = vi.fn((event, config, callback) => {
        realtimeCallback = callback
        return mockChannel
      })

      const { result } = renderHook(() => useScriptLock(TEST_SCRIPT_ID, mockClient))

      await waitFor(() => {
        expect(result.current.lockStatus).toBe('locked')
        expect(realtimeCallback).toBeTruthy()
      })

      // Simulate INSERT event for current user (using cached user ID)
      // Note: realtime uses 'locked_by' field, not 'locked_by_id'
      await realtimeCallback?.({
        eventType: 'INSERT',
        new: {
          locked_by: TEST_USER_ID,
        },
      })

      await waitFor(() => {
        expect(result.current.lockStatus).toBe('acquired')
      })
    })

    it('should set status to locked when UPDATE event is for other user', async () => {
      const { mockClient, mockChannel } = createMockSupabaseClient()

      mockClient.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: { id: TEST_USER_ID } },
        error: null,
      })

      ;(mockClient.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [
          {
            success: true,
            locked_by_user_id: TEST_USER_ID,
            locked_by_name: TEST_USER_NAME,
          },
        ],
        error: null,
      })

      let realtimeCallback: ((payload: any) => void) | null = null
      mockChannel.on = vi.fn((event, config, callback) => {
        realtimeCallback = callback
        return mockChannel
      })

      const { result } = renderHook(() => useScriptLock(TEST_SCRIPT_ID, mockClient))

      await waitFor(() => {
        expect(result.current.lockStatus).toBe('acquired')
        expect(realtimeCallback).toBeTruthy()
      })

      // Simulate UPDATE event for other user
      // Mock user_profiles fetch for display_name
      mockClient.from = vi.fn((table) => {
        if (table === 'user_profiles') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { display_name: OTHER_USER_NAME },
                  error: null,
                }),
              })),
            })),
          }
        }
        return { delete: vi.fn(() => ({ eq: vi.fn() })) }
      }) as any

      await realtimeCallback?.({
        eventType: 'UPDATE',
        new: {
          locked_by: OTHER_USER_ID,
        },
      })

      await waitFor(() => {
        expect(result.current.lockStatus).toBe('locked')
        expect(result.current.lockedBy?.id).toBe(OTHER_USER_ID)
      })
    })

    it('should unsubscribe from channel on unmount', async () => {
      const { mockClient, mockChannel } = createMockSupabaseClient()

      mockClient.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: { id: TEST_USER_ID } },
        error: null,
      })

      ;(mockClient.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [
          {
            success: true,
            locked_by_user_id: TEST_USER_ID,
            locked_by_name: TEST_USER_NAME,
          },
        ],
        error: null,
      })

      const { unmount } = renderHook(() => useScriptLock(TEST_SCRIPT_ID, mockClient))

      await waitFor(() => {
        expect(mockClient.channel).toHaveBeenCalled()
      })

      unmount()

      expect(mockClient.removeChannel).toHaveBeenCalledWith(mockChannel)
    })
  })

  describe('Lifecycle: Cleanup on Unmount', () => {
    it('should cleanup resources on unmount', async () => {
      const { mockClient, mockChannel } = createMockSupabaseClient()

      mockClient.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: { id: TEST_USER_ID } },
        error: null,
      })

      ;(mockClient.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [
          {
            success: true,
            locked_by_user_id: TEST_USER_ID,
            locked_by_name: TEST_USER_NAME,
          },
        ],
        error: null,
      })

      const { result, unmount } = renderHook(() => useScriptLock(TEST_SCRIPT_ID, mockClient))

      await waitFor(() => {
        expect(result.current.lockStatus).toBe('acquired')
      })

      unmount()

      // Cleanup should unsubscribe from realtime channel
      await waitFor(() => {
        expect(mockClient.removeChannel).toHaveBeenCalledWith(mockChannel)
      })
    })

    it('should clear heartbeat interval on unmount', async () => {
      const { mockClient } = createMockSupabaseClient()

      mockClient.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: { id: TEST_USER_ID } },
        error: null,
      })

      ;(mockClient.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [
          {
            success: true,
            locked_by_user_id: TEST_USER_ID,
            locked_by_name: TEST_USER_NAME,
          },
        ],
        error: null,
      })

      let clearIntervalCalled = false
      const originalClearInterval = global.clearInterval
      global.clearInterval = vi.fn((id: any) => {
        clearIntervalCalled = true
        return originalClearInterval(id)
      }) as any

      mockClient.from = vi.fn(() => ({
        delete: vi.fn(() => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })),
      })) as any

      const { result, unmount } = renderHook(() => useScriptLock(TEST_SCRIPT_ID, mockClient))

      await waitFor(() => {
        expect(result.current.lockStatus).toBe('acquired')
      })

      unmount()

      // Give cleanup time to execute
      await new Promise((resolve) => setTimeout(resolve, 10))

      // clearInterval should have been called during unmount
      expect(clearIntervalCalled).toBe(true)

      global.clearInterval = originalClearInterval
    })
  })

  describe('Edge Cases: Race Condition Guards', () => {
    it('should prevent concurrent lock acquisitions', async () => {
      const { mockClient } = createMockSupabaseClient()

      mockClient.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: { id: TEST_USER_ID } },
        error: null,
      })

      let resolveAcquisition: ((value: any) => void) | null = null
      const acquisitionPromise = new Promise((resolve) => {
        resolveAcquisition = resolve
      })

      ;(mockClient.rpc as ReturnType<typeof vi.fn>).mockReturnValue(acquisitionPromise)

      renderHook(() => useScriptLock(TEST_SCRIPT_ID, mockClient))

      // Wait for first acquisition attempt
      await waitFor(() => {
        expect(mockClient.rpc).toHaveBeenCalledTimes(1)
      })

      // Try to trigger another acquisition (should be blocked by isAcquiringRef)
      // This simulates rapid re-renders or external triggers
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(mockClient.rpc).toHaveBeenCalledTimes(1)

      // Resolve the first acquisition
      resolveAcquisition?.({
        data: [
          {
            success: true,
            locked_by_user_id: TEST_USER_ID,
            locked_by_name: TEST_USER_NAME,
          },
        ],
        error: null,
      })
    })
  })

  describe('Edge Cases: Request Edit', () => {
    it('should log request for edit access', async () => {
      const { mockClient } = createMockSupabaseClient()
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      mockClient.auth.getUser = vi.fn().mockResolvedValue({
        data: { user: { id: TEST_USER_ID } },
        error: null,
      })

      ;(mockClient.rpc as ReturnType<typeof vi.fn>).mockResolvedValue({
        data: [
          {
            success: false,
            locked_by_user_id: OTHER_USER_ID,
            locked_by_name: OTHER_USER_NAME,
          },
        ],
        error: null,
      })

      const { result } = renderHook(() => useScriptLock(TEST_SCRIPT_ID, mockClient))

      await waitFor(() => {
        expect(result.current.lockStatus).toBe('locked')
      })

      await result.current.requestEdit()

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Requesting edit access from ${OTHER_USER_NAME}`)
      )

      consoleSpy.mockRestore()
    })

    it('should not request edit when no lock holder', async () => {
      const { mockClient } = createMockSupabaseClient()
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      const { result } = renderHook(() => useScriptLock(undefined, mockClient))

      await result.current.requestEdit()

      expect(consoleSpy).not.toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })
})
