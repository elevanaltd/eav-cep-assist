import { useState, useEffect, useCallback, useRef } from 'react'
import { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseClient } from '../../lib/client/singleton.js'
import { RealtimeChannel } from '@supabase/supabase-js'

// Get shared Supabase client instance (singleton prevents multiple GoTrueClient instances)
const supabase = getSupabaseClient()

// Inline helpers (previously from supabaseHelpers)
const acquireScriptLock = async (client: SupabaseClient, scriptId: string) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return await (client.rpc as any)('acquire_script_lock', { p_script_id: scriptId })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const scriptLocksTable = (client: SupabaseClient) => (client.from as any)('script_locks')

// Generic Database type to accept both local and shared-lib Database types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDatabase = any

// Export interface for type safety
export interface ScriptLockStatus {
  lockStatus: 'acquired' | 'locked' | 'checking' | 'unlocked'
  lockedBy: { id: string; name: string } | null
  releaseLock: () => Promise<void>
  requestEdit: () => Promise<void>
  forceUnlock: () => Promise<void> // Admin only
}

// Heartbeat interval: 5 minutes
const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000

/**
 * Hook for managing script edit locks
 *
 * @param scriptId - UUID of script to lock
 * @param client - Supabase client (defaults to production, tests can override with testSupabase)
 * @param heartbeatIntervalMs - Heartbeat interval in milliseconds (defaults to 5min, tests can inject faster intervals)
 *
 * **Dependency Injection Pattern:**
 * - Production: Uses default supabase client + 5min heartbeat (no changes required)
 * - Tests: Pass testSupabase client + faster heartbeat interval (e.g., 5s for CI performance)
 * - Architectural coherence: Client and timing are injected, not environment-detected
 *
 * **Configuration Seam (TMG Ruling 2025-11-04):**
 * - heartbeatIntervalMs parameter enables test performance without test-production divergence
 * - Production default (5min) preserved and unit-tested
 * - Integration tests use injected 5s interval for fast CI feedback
 */
export function useScriptLock(
  scriptId: string | undefined,
  client: SupabaseClient<AnyDatabase> = supabase,
  heartbeatIntervalMs: number = HEARTBEAT_INTERVAL_MS
): ScriptLockStatus {
  const [lockStatus, setLockStatus] = useState<'acquired' | 'locked' | 'checking' | 'unlocked'>(
    'checking'
  )
  const [lockedBy, setLockedBy] = useState<{ id: string; name: string } | null>(null)

  // Track acquisition state to prevent race conditions
  const isAcquiringRef = useRef(false)
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const currentUserIdRef = useRef<string | undefined>(undefined)
  const lockStatusRef = useRef<'acquired' | 'locked' | 'checking' | 'unlocked'>('checking')

  // Auto-lock on mount
  const acquireLock = useCallback(async (options?: { bypassGuard?: boolean }) => {
    console.log(`[acquireLock] Called. scriptId: ${scriptId}, bypassGuard: ${options?.bypassGuard}, isAcquiring: ${isAcquiringRef.current}`)
    if (!scriptId) return

    // Allow DELETE-triggered acquisitions to bypass the isAcquiring guard
    // This prevents auto-acquisition from being silently skipped when a lock is released
    if (!options?.bypassGuard && isAcquiringRef.current) {
      console.log(`[acquireLock] Skipped - already acquiring`)
      return
    }

    isAcquiringRef.current = true
    setLockStatus('checking')
    lockStatusRef.current = 'checking'
    console.log(`[acquireLock] Status set to 'checking'`)

    try {
      // Cache current user ID for realtime subscription comparison
      if (!currentUserIdRef.current) {
        const { data: { user } } = await client.auth.getUser()
        currentUserIdRef.current = user?.id
      }

      const { data, error } = await acquireScriptLock(client, scriptId)

      if (error) {
        console.error('Lock acquisition error:', error)
        setLockStatus('locked')
        lockStatusRef.current = 'locked'
        isAcquiringRef.current = false
        return
      }

      const lockResult = data?.[0]
      if (lockResult?.success) {
        setLockStatus('acquired')
        lockStatusRef.current = 'acquired'
        setLockedBy({ id: lockResult.locked_by_user_id, name: lockResult.locked_by_name })
      } else if (lockResult) {
        setLockStatus('locked')
        lockStatusRef.current = 'locked'
        setLockedBy({ id: lockResult.locked_by_user_id || '', name: lockResult.locked_by_name || 'Unknown' })
      }
    } catch (err) {
      console.error('Lock acquisition failed:', err)
      setLockStatus('locked')
      lockStatusRef.current = 'locked'
    } finally {
      isAcquiringRef.current = false
    }
  }, [scriptId, client])

  // Heartbeat: Keep-alive every 5 minutes
  const sendHeartbeat = useCallback(async () => {
    if (!scriptId || lockStatus !== 'acquired') return

    try {
      const { error} = await scriptLocksTable(client)
        .update({ last_heartbeat: new Date().toISOString() })
        .eq('script_id', scriptId)

      if (error) {
        console.error('Heartbeat failed:', error)
        setLockStatus('checking')
        lockStatusRef.current = 'checking'
        // Attempt re-acquisition after heartbeat failure
        await acquireLock()
      }
    } catch (err) {
      console.error('Heartbeat error:', err)
      setLockStatus('checking')
      lockStatusRef.current = 'checking'
      await acquireLock()
    }
  }, [scriptId, lockStatus, acquireLock, client])

  // Lock release (manual unlock)
  const releaseLock = useCallback(async (options?: { skipStateUpdate?: boolean }) => {
    console.log('[🔵 RELEASE LOCK] Called for scriptId:', scriptId, 'skipStateUpdate:', options?.skipStateUpdate)
    if (!scriptId) return

    try {
      console.log('[🔵 RELEASE LOCK] Executing DELETE for scriptId:', scriptId)
      await scriptLocksTable(client).delete().eq('script_id', scriptId)
      console.log('[🔵 RELEASE LOCK] DELETE successful')

      // Only update state if not called during cleanup
      // During cleanup, component is unmounting so state updates are unnecessary
      // and can cause bugs if React reuses the component for a different script
      if (!options?.skipStateUpdate) {
        console.log('[🔵 RELEASE LOCK] Setting status to unlocked')
        setLockStatus('unlocked')
        lockStatusRef.current = 'unlocked'
        setLockedBy(null)
      } else {
        console.log('[🔵 RELEASE LOCK] Skipping state update (called from cleanup)')
      }
    } catch (err) {
      console.error('[🔵 RELEASE LOCK] DELETE failed:', err)
    }
  }, [scriptId, client])

  // Request edit access (sends notification to lock holder)
  const requestEdit = useCallback(async () => {
    if (!scriptId || !lockedBy) return

    // TODO: Implement notification system (Phase 3/4 enhancement)
    console.log(`Requesting edit access from ${lockedBy.name}`)
  }, [scriptId, lockedBy])

  // Force unlock (admin only)
  const forceUnlock = useCallback(async () => {
    if (!scriptId) return

    try {
      // CRITICAL: Set status to 'unlocked' BEFORE deleting
      // Prevents auto-acquisition when receiving own DELETE event
      setLockStatus('unlocked')
      lockStatusRef.current = 'unlocked'
      setLockedBy(null)

      await scriptLocksTable(client).delete().eq('script_id', scriptId)
    } catch (err) {
      console.error('Force unlock failed:', err)
    }
  }, [scriptId, client])

  // Initialize: Acquire lock on mount
  useEffect(() => {
    if (!scriptId) return

    acquireLock()

    // Cleanup on unmount (Issue #5: Call releaseLock for proper async handling)
    return () => {
      console.log('[🟡 CLEANUP] Starting unmount cleanup for scriptId:', scriptId, 'currentStatus:', lockStatusRef.current)

      // CRITICAL: Unsubscribe from realtime channel BEFORE releasing lock
      // Otherwise we receive our own DELETE event during cleanup
      if (channelRef.current) {
        console.log('[🟡 CLEANUP] Removing channel:', channelRef.current.topic)
        client.removeChannel(channelRef.current)
      }

      // Clear heartbeat interval
      if (heartbeatIntervalRef.current) {
        console.log('[🟡 CLEANUP] Clearing heartbeat interval')
        clearInterval(heartbeatIntervalRef.current)
      }

      // CRITICAL FIX: Only release lock if we actually acquired it
      // React Strict Mode causes double-render → mount → unmount → mount
      // During intermediate unmount, status is 'checking' or 'locked' (not 'acquired')
      // Only release if status is 'acquired' (we actually have the lock)
      if (scriptId && lockStatusRef.current === 'acquired') {
        console.log('[🟡 CLEANUP] Calling releaseLock() - we had the lock (status: acquired)')
        // Fire-and-forget: React cleanup can't await, but releaseLock handles errors gracefully
        // skipStateUpdate: true prevents state updates that could affect new component instance
        releaseLock({ skipStateUpdate: true })
      } else {
        console.log('[🟡 CLEANUP] Skipping releaseLock() - we did not have the lock (status:', lockStatusRef.current + ')')
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptId]) // Only depend on scriptId to prevent re-acquisition loops (acquireLock, releaseLock, and client intentionally excluded)

  // Heartbeat interval: Start after lock acquired
  useEffect(() => {
    if (lockStatus !== 'acquired' || !scriptId) {
      // Clear heartbeat if lock lost
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current)
        heartbeatIntervalRef.current = null
      }
      return
    }

    // Start heartbeat interval (use injected interval for test performance)
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, heartbeatIntervalMs)

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current)
      }
    }
  }, [lockStatus, scriptId, sendHeartbeat, heartbeatIntervalMs])

  // Realtime subscriptions: Listen for lock changes
  useEffect(() => {
    if (!scriptId) return

    console.log('[🟢 SUBSCRIPTION] Creating channel for scriptId:', scriptId)

    const channel = client
      .channel(`script_locks:${scriptId}`)
      // Handler 1: INSERT events with script_id filter
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'script_locks',
          filter: `script_id=eq.${scriptId}`,
        },
        async (payload) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const newLock = payload.new as any

          // Determine current user - use cached ID unless tests switched auth
          // In production, auth never switches mid-session
          // In tests with auth switching, we need fresh auth to avoid false 'acquired' status
          const { data: { user } } = await client.auth.getUser()
          const currentUserId = user?.id

          // If the lock belongs to current user, status is 'acquired', otherwise 'locked'
          if (currentUserId && newLock.locked_by === currentUserId) {
            setLockStatus('acquired')
            lockStatusRef.current = 'acquired'
          } else {
            setLockStatus('locked')
            lockStatusRef.current = 'locked'
          }

          // Fetch user profile for locked_by_name (realtime doesn't join tables)
          let userName = 'Unknown'
          if (newLock.locked_by) {
            const { data: profile } = await client
              .from('user_profiles')
              .select('display_name')
              .eq('id', newLock.locked_by)
              .single()
            userName = profile?.display_name || 'Unknown'
          }

          setLockedBy({ id: newLock.locked_by, name: userName })
        }
      )
      // Handler 2: UPDATE events with script_id filter
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'script_locks',
          filter: `script_id=eq.${scriptId}`,
        },
        async (payload) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const newLock = payload.new as any

          // Determine current user - use cached ID unless tests switched auth
          // In production, auth never switches mid-session
          // In tests with auth switching, we need fresh auth to avoid false 'acquired' status
          const { data: { user } } = await client.auth.getUser()
          const currentUserId = user?.id

          // If the lock belongs to current user, status is 'acquired', otherwise 'locked'
          if (currentUserId && newLock.locked_by === currentUserId) {
            setLockStatus('acquired')
            lockStatusRef.current = 'acquired'
          } else {
            setLockStatus('locked')
            lockStatusRef.current = 'locked'
          }

          // Fetch user profile for locked_by_name (realtime doesn't join tables)
          let userName = 'Unknown'
          if (newLock.locked_by) {
            const { data: profile } = await client
              .from('user_profiles')
              .select('display_name')
              .eq('id', newLock.locked_by)
              .single()
            userName = profile?.display_name || 'Unknown'
          }

          setLockedBy({ id: newLock.locked_by, name: userName })
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      console.log('[🔴 SUBSCRIPTION CLEANUP] Removing channel for scriptId:', scriptId, 'channel:', channel.topic)
      client.removeChannel(channel)
    }
  }, [scriptId, client])

  return {
    lockStatus,
    lockedBy,
    releaseLock,
    requestEdit,
    forceUnlock,
  }
}
