# Dual-Client Test Harness Pattern

**Purpose:** Realistic multi-user realtime testing for Supabase applications

**Created:** 2025-11-04  
**Status:** Production-ready  
**Issue:** TEST-INFRA: Build dual-client test harness for realtime multi-user scenarios

---

## Problem Statement

### Production Architecture
- User A: Browser 1 → Supabase Client A → Independent auth session
- User B: Browser 2 → Supabase Client B → Independent auth session
- Each user has isolated realtime subscriptions and auth state

### Previous Test Architecture (Anti-Pattern)
```typescript
// ❌ BAD: Auth switching on single client
await signInAsTestUser(testSupabase, 'admin')
// ... admin acquires lock ...
await signInAsTestUser(testSupabase, 'client')
// Hook sees 'current user' changed, not 'other user' acquired lock
```

**Why It Failed:**
1. Realtime subscription detects user ID change on same client
2. Hook logic checks "is lock owned by current user?"
3. After auth switch, "current user" is the client user
4. Hook incorrectly reports `lockStatus: 'acquired'` instead of `lockStatus: 'locked'`

---

## Solution: Dual-Client Test Harness

### Architecture
```typescript
// ✅ GOOD: Separate clients per user (matches production)
const harness = await createDualClientTestHarness()

// Admin client (independent auth session)
const adminHook = useScriptLock(scriptId, harness.adminClient)

// Client client (independent auth session)  
const clientHook = useScriptLock(scriptId, harness.clientClient)

// Each client maintains separate:
// - Auth session (admin vs client user)
// - Realtime subscriptions (isolated channels)
// - Hook state (lockStatus independent)
```

### Key Features
1. **Separate Client Instances:** Each user gets own Supabase client
2. **Independent Auth:** No auth switching - each client stays authenticated as one user
3. **Isolated Channels:** Realtime subscriptions don't interfere
4. **Production Matching:** Exactly mirrors separate browser sessions

---

## Usage Guide

### Basic Example: Lock Acquisition Detection
```typescript
it('should detect when another user acquires lock', async () => {
  const harness = await createDualClientTestHarness()

  try {
    // Admin acquires lock
    const { result: adminResult } = renderHook(() => 
      useScriptLock(TEST_SCRIPT_ID, harness.adminClient)
    )
    await waitFor(() => expect(adminResult.current.lockStatus).toBe('acquired'))

    // Client sees lock held by admin (separate client)
    const { result: clientResult } = renderHook(() => 
      useScriptLock(TEST_SCRIPT_ID, harness.clientClient)
    )
    await waitFor(() => {
      expect(clientResult.current.lockStatus).toBe('locked')
      expect(clientResult.current.lockedBy?.name).toContain('Admin')
    })
  } finally {
    await harness.cleanup()
  }
})
```

### Advanced Example: Lock Release Detection
```typescript
it('should detect when lock is released', async () => {
  const harness = await createDualClientTestHarness()

  try {
    // Client acquires lock first
    const { result: clientResult } = renderHook(() => 
      useScriptLock(TEST_SCRIPT_ID, harness.clientClient)
    )
    await waitFor(() => expect(clientResult.current.lockStatus).toBe('acquired'))

    // Admin waits for lock
    const { result: adminResult } = renderHook(() => 
      useScriptLock(TEST_SCRIPT_ID, harness.adminClient)
    )
    await waitFor(() => expect(adminResult.current.lockStatus).toBe('locked'))

    // Client releases - admin auto-acquires via realtime
    await clientResult.current.releaseLock()
    await waitFor(() => expect(adminResult.current.lockStatus).toBe('acquired'))
  } finally {
    await harness.cleanup()
  }
})
```

### Tri-Client Example (3+ Users)
```typescript
it('should support three concurrent users', async () => {
  const harness = await createTriClientTestHarness()

  try {
    // Admin acquires
    const adminHook = useScriptLock(scriptId, harness.adminClient)
    
    // Client waits
    const clientHook = useScriptLock(scriptId, harness.clientClient)
    
    // Unauthorized waits
    const unauthHook = useScriptLock(scriptId, harness.unauthorizedClient)
    
    // All three users see consistent state
  } finally {
    await harness.cleanup()
  }
})
```

---

## Implementation Details

### Client Configuration
```typescript
const client = createClient(url, key, {
  auth: {
    storage: undefined,           // Memory only (no localStorage)
    persistSession: false,         // No session persistence
    autoRefreshToken: false,       // Manual token management
    detectSessionInUrl: false,     // No URL-based auth
  },
})
```

**Why These Settings:**
- `storage: undefined`: Prevents localStorage conflicts between clients
- `persistSession: false`: Each client session is ephemeral
- `autoRefreshToken: false`: Reduces complexity in tests
- `detectSessionInUrl: false`: No URL parsing needed

### Cleanup Pattern
```typescript
const cleanup = async () => {
  // 1. Clean test data
  await cleanupTestData(adminClient)
  await cleanupTestData(clientClient)

  // 2. Remove realtime channels
  await adminClient.removeAllChannels()
  await clientClient.removeAllChannels()

  // 3. Sign out (with rate limiting)
  await authDelay()
  await adminClient.auth.signOut()
  await authDelay()
  await clientClient.auth.signOut()
}
```

**Always call cleanup in `finally` block** to ensure cleanup even if test fails.

---

## Test Coverage Improved

### Before Dual-Client Harness
- ❌ Test 7: Realtime lock acquisition detection (QUARANTINED)
- ❌ Test 8: Realtime lock release detection (QUARANTINED)
- ❌ Test 9: Admin force unlock (QUARANTINED)

### After Dual-Client Harness
- ✅ Test 7: Realtime lock acquisition detection (PASSING)
- ✅ Test 8: Realtime lock release detection (PASSING)
- ✅ Test 9: Admin force unlock (PASSING)

**Impact:** +3 passing integration tests, -3 quarantined tests

---

## When to Use This Pattern

### ✅ Use Dual-Client Harness When:
- Testing realtime subscriptions with multiple users
- Validating lock/mutex behavior across users
- Testing collaborative features (presence, typing indicators)
- Simulating concurrent user actions
- Testing RLS policies with different user contexts

### ❌ Don't Use Dual-Client Harness When:
- Testing single-user workflows
- Testing auth flows (use single client with auth switching)
- Testing non-realtime features
- Testing UI components (use single client with mock data)

---

## Migration Checklist

If you have existing tests using auth switching pattern:

- [ ] Identify tests that switch auth on single client
- [ ] Check if tests involve realtime subscriptions
- [ ] Check if tests validate "other user" scenarios
- [ ] Replace single client with `createDualClientTestHarness()`
- [ ] Update test to render hooks with separate clients
- [ ] Add `harness.cleanup()` in `finally` block
- [ ] Verify tests pass with realistic multi-client topology

---

## Performance Considerations

### Overhead
- Creates 2 Supabase client instances per test
- Each client maintains separate WebSocket connection
- Slightly slower than single-client tests (~100-200ms overhead)

### Optimization Tips
1. **Reuse harness:** Create once per describe block if possible
2. **Cleanup promptly:** Don't let channels accumulate
3. **Limit scope:** Use only for tests that need multi-user behavior
4. **Share connections:** Consider connection pooling for large test suites

---

## Future Enhancements

### Potential Improvements
- [ ] Harness factory with configurable user types
- [ ] Connection pooling for faster test setup
- [ ] Mock mode for unit tests (no real Supabase)
- [ ] Performance benchmarking utilities
- [ ] Debug mode with realtime message logging

### Related Patterns
- Presence testing (who's online)
- Collaborative editing (OT/CRDT)
- Chat/messaging systems
- Notification delivery
- Real-time analytics

---

## References

- **Implementation:** `packages/shared/src/test/dual-client-harness.ts`
- **Example Tests:** `packages/shared/src/editor/locking/useScriptLock.integration.test.ts`
- **Documentation:** This file

---

## Questions & Support

**Q: Can I use this for unit tests?**  
A: No, this is for integration tests only. Unit tests should mock Supabase client.

**Q: How do I add a third user?**  
A: Use `createTriClientTestHarness()` for 3-user scenarios.

**Q: What if tests hang?**  
A: Check that cleanup is called in `finally` block. Orphaned channels cause hangs.

**Q: Can I use this in local development?**  
A: Yes, works with local Supabase (`supabase start`) or preview branches.

**Q: Does this work with RLS policies?**  
A: Yes! Each client authenticates as different user, perfect for RLS testing.

---

**Last Updated:** 2025-11-04  
**Maintainer:** Test Infrastructure Team  
**Status:** Production-ready ✅
