# Investigation Report: useScriptLock Integration Test Failures

**Date:** 2025-11-06
**Branch:** main (current: claude/debug-dual-client-lock-acquisition-011CUoQbxuWyEK5DrN716QYk)
**Test Status:** 37/42 passing (5 failures)
**Authority:** research-analyst + evidence-based investigation

---

## Executive Summary

**Root Cause Identified:** Main branch is missing **7 critical commits** from debug branch `claude/fix-lock-delete-handler-regression-011CUp4X5h6Tv9bXVRSsbNyG` that fix cleanup logic, auto-acquisition race conditions, and DELETE handler behavior.

**Cherry-Picked Commits (Already Applied):**
- ✅ 13b5e50: Database trigger migration (pg_notify)
- ✅ 2c08b2c: Client-side split subscriptions

**Missing Commits (Not Applied):**
- ❌ 0f9f87d: Issue #5 unmount cleanup fix
- ❌ 6bee971: Dual-client auto-acquisition fix (bypassGuard + RPC status check)
- ❌ 089b157: DELETE handler regression fix
- ❌ 65c503d: Client-side DELETE filtering
- ❌ 071a7f7: Initial acquisition race conditions
- ❌ c705cd7: DELETE handler status='locked' guard
- ❌ a23f4b9: DELETE handler else clause

**Impact:** The missing commits address:
1. **Lock cleanup failures (Tests 5-6):** Unmount cleanup order + skipStateUpdate option
2. **Auto-acquisition failures (Tests 7-9):** bypassGuard pattern + RPC abort logic

---

## Test Failure Analysis

### Failing Tests

**Tests 5-6: Lock Cleanup**
- Test 5: "should release lock on unmount"
- Test 6: "should allow manual unlock"
- **Symptom:** Lock persists in database after unmount/release

**Tests 7-9: Auto-Acquisition After DELETE**
- Test 7: "should update lock status when another user acquires lock"
- Test 8: "should update lock status when lock is released"
- Test 9: "should allow admin to force-unlock"
- **Symptom:** Client stays 'locked' instead of acquiring after DELETE event

---

## Root Cause Deep Dive

### Issue #1: Cleanup Order + State Management

**Current Implementation (main branch):**
```typescript
// Cleanup on unmount
return () => {
  if (scriptId) {
    releaseLock()  // ❌ Triggers own DELETE event before unsubscribing
  }

  if (heartbeatIntervalRef.current) {
    clearInterval(heartbeatIntervalRef.current)
  }

  // Unsubscribe AFTER releasing lock
  if (channelRef.current) {
    client.removeChannel(channelRef.current)  // ❌ Too late!
  }
}
```

**Problems:**
1. **Self-DELETE Reception:** Releases lock → DELETE event broadcasts → hook receives own DELETE → tries to acquire again
2. **Missing Status Guard:** Always calls `releaseLock()` even if status is 'checking' or 'locked' (not 'acquired')
3. **State Update During Unmount:** `releaseLock()` sets state during cleanup (React warning potential)

**Missing Fix (commit 0f9f87d):**
```typescript
// CRITICAL: Unsubscribe from realtime channel BEFORE releasing lock
if (channelRef.current) {
  client.removeChannel(channelRef.current)
}

if (heartbeatIntervalRef.current) {
  clearInterval(heartbeatIntervalRef.current)
}

// CRITICAL FIX: Only release lock if we actually acquired it
if (scriptId && lockStatusRef.current === 'acquired') {
  // skipStateUpdate: true prevents state updates during unmount
  releaseLock({ skipStateUpdate: true })
}
```

### Issue #2: releaseLock() Missing skipStateUpdate Option

**Current Implementation (main branch):**
```typescript
const releaseLock = useCallback(async () => {
  if (!scriptId) return

  try {
    await scriptLocksTable(client).delete().eq('script_id', scriptId)
    setLockStatus('unlocked')      // ❌ Always updates state
    lockStatusRef.current = 'unlocked'
    setLockedBy(null)
  } catch (err) {
    console.error('Lock release failed:', err)
  }
}, [scriptId, client])
```

**Missing Fix:**
```typescript
const releaseLock = useCallback(async (options?: { skipStateUpdate?: boolean }) => {
  if (!scriptId) return

  try {
    await scriptLocksTable(client).delete().eq('script_id', scriptId)

    // Only update state if not called during cleanup
    if (!options?.skipStateUpdate) {
      setLockStatus('unlocked')
      lockStatusRef.current = 'unlocked'
      setLockedBy(null)
    }
  } catch (err) {
    console.error('Lock release failed:', err)
  }
}, [scriptId, client])
```

### Issue #3: Auto-Acquisition Race Conditions

**Current Implementation (main branch):**
```typescript
const acquireLock = useCallback(async () => {
  if (!scriptId || isAcquiringRef.current) return  // ❌ Blocks DELETE-triggered acquisition

  isAcquiringRef.current = true
  setLockStatus('checking')

  try {
    const { data } = await client.rpc('acquire_script_lock', { p_script_id: scriptId })
    const lockResult = data?.[0]

    // ❌ No check if status changed to 'unlocked' during RPC

    if (lockResult?.success) {
      setLockStatus('acquired')  // ❌ Overwrites force-unlock
      lockStatusRef.current = 'acquired'
    } else {
      setLockStatus('locked')
      lockStatusRef.current = 'locked'
      setLockedBy(lockResult?.locked_by || null)
    }
  } finally {
    isAcquiringRef.current = false
  }
}, [scriptId, client])
```

**Missing Fixes (commits 6bee971, 071a7f7):**

**1. bypassGuard Option:**
```typescript
const acquireLock = useCallback(async (options?: { bypassGuard?: boolean }) => {
  if (!scriptId) return

  // Allow DELETE-triggered acquisitions to bypass the isAcquiring guard
  if (!options?.bypassGuard && isAcquiringRef.current) return

  // ... rest of implementation
```

**2. RPC Abort Check:**
```typescript
  const lockResult = data?.[0]

  // Check if status has changed to 'unlocked' while we were acquiring
  const currentStatus = lockStatusRef.current as 'acquired' | 'locked' | 'checking' | 'unlocked'
  if (currentStatus === 'unlocked') {
    isAcquiringRef.current = false
    return  // ✅ Abort - don't overwrite force-unlock
  }

  if (lockResult?.success) {
    setLockStatus('acquired')
    lockStatusRef.current = 'acquired'
  }
```

### Issue #4: DELETE Handler Missing bypassGuard

**Current Implementation (main branch):**
```typescript
.on('broadcast', { event: 'DELETE' }, async (payload) => {
  // ... client-side filtering ...

  if (lockStatusRef.current === 'locked') {
    // We were blocked - try to acquire now
    await acquireLock()  // ❌ Will be silently skipped if isAcquiringRef.current === true
  } else {
    setLockStatus('unlocked')
    lockStatusRef.current = 'unlocked'
    setLockedBy(null)
  }
})
```

**Missing Fix (commit 6bee971):**
```typescript
if (lockStatusRef.current === 'locked') {
  // Use bypassGuard to allow acquisition even if one is in progress
  await acquireLock({ bypassGuard: true })
}
```

---

## Evidence: Git Commit Analysis

### Commits Already Applied (Cherry-Picked)
```
13b5e50 feat(db): Add pg_notify trigger for script_locks DELETE events
2c08b2c feat(useScriptLock): Subscribe to pg_notify DELETE via broadcast
```

### Commits Missing from Main Branch

**Critical Fix Sequence (chronological):**

1. **0f9f87d** (Nov 4) - Issue #5 unmount cleanup fix
   - **Files:** useScriptLock.ts, useScriptLock.integration.test.ts
   - **Changes:** Call `releaseLock()` instead of direct delete, add 2s delay in test
   - **Impact:** Fixes Tests 5-6 (cleanup failures)

2. **6bee971** (Nov 4) - Dual-client auto-acquisition fix
   - **Files:** useScriptLock.ts
   - **Changes:** Add `bypassGuard` option, RPC abort check, 100ms delay before auto-acquire
   - **Impact:** Fixes Tests 7-9 (auto-acquisition failures)

3. **089b157** (Nov 5) - DELETE handler regression fix
   - **Files:** useScriptLock.ts, TipTapEditor.tsx, useToast.tsx
   - **Changes:** Revert DELETE handler to aggressive logic, toast deduplication
   - **Impact:** Supporting fix for auto-acquisition

4. **65c503d** (Nov 5) - Client-side DELETE filtering
   - **Files:** useScriptLock.ts
   - **Changes:** Extract `oldLock.script_id` and early return if different
   - **Impact:** Prevents spurious auto-acquisition for other scripts

5. **071a7f7** (Nov 5) - Initial acquisition race fix
   - **Files:** useScriptLock.ts, migration (REPLICA IDENTITY)
   - **Changes:** bypassGuard in DELETE handler, status check after RPC
   - **Impact:** Eliminates intermittent red lock on initial open

6. **c705cd7** (Nov 5) - DELETE handler status guard
   - **Files:** useScriptLock.ts, useScriptLock.test.ts
   - **Changes:** Only acquire if status='locked' (not 'checking' or 'acquired')
   - **Impact:** Prevents double acquisition on mount

7. **a23f4b9** (Nov 5) - DELETE handler else clause
   - **Files:** useScriptLock.ts
   - **Changes:** Add else clause for status='acquired' case
   - **Impact:** Proper status handling for all DELETE scenarios

### Debug Branch Commit Timeline
```
089b157 (Nov 5 05:03) - DELETE handler regression fix
65c503d (Nov 5 05:23) - Client-side filtering
071a7f7 (Nov 5 06:03) - Initial acquisition race fix
c705cd7 (Nov 5 06:16) - DELETE handler status guard
a23f4b9 (Nov 5 06:28) - DELETE handler else clause
718f5fa (Nov 5 06:54) - Broadcast channel implementation (large commit combining many fixes)
```

---

## Code Differences: Main vs Debug Branch

### Critical Differences in useScriptLock.ts

**1. acquireLock() Function:**
```diff
- const acquireLock = useCallback(async () => {
-   if (!scriptId || isAcquiringRef.current) return
+ const acquireLock = useCallback(async (options?: { bypassGuard?: boolean }) => {
+   if (!scriptId) return
+
+   // Allow DELETE-triggered acquisitions to bypass guard
+   if (!options?.bypassGuard && isAcquiringRef.current) return

    // ... RPC call ...

+   // Check if status changed to 'unlocked' during RPC
+   const currentStatus = lockStatusRef.current
+   if (currentStatus === 'unlocked') {
+     isAcquiringRef.current = false
+     return
+   }
```

**2. releaseLock() Function:**
```diff
- const releaseLock = useCallback(async () => {
+ const releaseLock = useCallback(async (options?: { skipStateUpdate?: boolean }) => {
    if (!scriptId) return

    try {
      await scriptLocksTable(client).delete().eq('script_id', scriptId)
-     setLockStatus('unlocked')
-     lockStatusRef.current = 'unlocked'
-     setLockedBy(null)
+
+     if (!options?.skipStateUpdate) {
+       setLockStatus('unlocked')
+       lockStatusRef.current = 'unlocked'
+       setLockedBy(null)
+     }
```

**3. Cleanup Logic:**
```diff
  return () => {
+   // CRITICAL: Unsubscribe BEFORE releasing lock
+   if (channelRef.current) {
+     client.removeChannel(channelRef.current)
+   }
+
+   if (heartbeatIntervalRef.current) {
+     clearInterval(heartbeatIntervalRef.current)
+   }
+
+   // Only release if we actually acquired the lock
-   if (scriptId) {
-     releaseLock()
+   if (scriptId && lockStatusRef.current === 'acquired') {
+     releaseLock({ skipStateUpdate: true })
    }
-
-   if (heartbeatIntervalRef.current) {
-     clearInterval(heartbeatIntervalRef.current)
-   }
-
-   if (channelRef.current) {
-     client.removeChannel(channelRef.current)
-   }
```

**4. DELETE Handler:**
```diff
  .on('broadcast', { event: 'DELETE' }, async (payload) => {
    // ... client-side filtering ...

    if (lockStatusRef.current === 'locked') {
-     await acquireLock()
+     await acquireLock({ bypassGuard: true })
    } else {
      setLockStatus('unlocked')
      lockStatusRef.current = 'unlocked'
      setLockedBy(null)
    }
  })
```

---

## Recommended Actions

### Option A: Cherry-Pick Individual Commits (Recommended)

**Rationale:** Preserves git history, maintains traceability, allows selective application

**Commands:**
```bash
# Critical fixes in order
git cherry-pick 0f9f87d  # Issue #5 cleanup fix
git cherry-pick 6bee971  # Dual-client auto-acquisition
git cherry-pick 089b157  # DELETE handler regression
git cherry-pick 65c503d  # Client-side filtering
git cherry-pick 071a7f7  # Initial acquisition race
git cherry-pick c705cd7  # DELETE handler status guard
git cherry-pick a23f4b9  # DELETE handler else clause
```

**Expected Result:** 42/42 tests passing

### Option B: Manual Code Application

**If cherry-pick conflicts occur:**

1. **Apply cleanup fix** (0f9f87d):
   - Modify `releaseLock()` to accept `skipStateUpdate` option
   - Reorder cleanup: unsubscribe → heartbeat → conditional release
   - Add status guard: `lockStatusRef.current === 'acquired'`

2. **Apply auto-acquisition fix** (6bee971):
   - Add `bypassGuard` parameter to `acquireLock()`
   - Add RPC abort check for 'unlocked' status
   - Update DELETE handler to use `bypassGuard: true`

3. **Run tests:**
   ```bash
   npm run test:integration
   ```

### Option C: Compare and Merge Debug Branch

**If extensive conflicts:**
```bash
git diff main claude/fix-lock-delete-handler-regression-011CUp4X5h6Tv9bXVRSsbNyG -- packages/shared/src/editor/locking/useScriptLock.ts > /tmp/usescriptlock.patch
# Review patch and apply manually
```

---

## Verification Plan

### Step 1: Apply Fixes
```bash
git cherry-pick 0f9f87d 6bee971 089b157 65c503d 071a7f7 c705cd7 a23f4b9
```

### Step 2: Run Quality Gates
```bash
npm run lint
npm run typecheck
npm run build
```

### Step 3: Run Integration Tests
```bash
npm run test:integration
```

**Expected Output:**
```
Test Suites: 1 passed, 1 total
Tests:       42 passed, 42 total
```

### Step 4: Verify Specific Test Cases

**Tests 5-6 (Cleanup):**
- Lock properly deleted on unmount
- Manual unlock removes lock from database

**Tests 7-9 (Auto-Acquisition):**
- Client auto-acquires when admin releases
- Admin auto-acquires when client releases
- Force-unlock prevents auto-acquisition

---

## Git History Forensics

### Why Were These Commits Missing?

**Timeline Analysis:**

1. **Nov 4-5:** Debug branch `claude/fix-lock-delete-handler-regression-011CUp4X5h6Tv9bXVRSsbNyG` accumulated 7 commits fixing lock behavior
2. **Nov 5:** Someone cherry-picked ONLY 2 commits (13b5e50, 2c08b2c) to main
3. **Result:** Partial fix - database trigger and subscription split applied, but cleanup/auto-acquisition logic missing

**What Was Cherry-Picked:**
- ✅ Database infrastructure (trigger, subscription)

**What Was Left Behind:**
- ❌ React cleanup logic
- ❌ Auto-acquisition race condition fixes
- ❌ DELETE handler status guards

**Hypothesis:** The cherry-picker focused on "infrastructure" commits (database/subscription) and missed the "behavior" commits (cleanup/acquisition logic).

---

## Architectural Insights

### Pattern: Broadcast Channel for DELETE Events

**Why This Pattern Exists:**

Supabase Realtime + RLS blocks DELETE events on `postgres_changes` channel:
- INSERT events: ✅ Work with RLS (NEW record visible)
- UPDATE events: ✅ Work with RLS (NEW record visible)
- DELETE events: ❌ Blocked by RLS (OLD record not visible)

**Solution (3-part):**
1. Database trigger with `SECURITY DEFINER` calls `realtime.broadcast_changes()`
2. Client subscribes to `broadcast` channel for DELETE events
3. Client-side filtering on `script_id` (server filter doesn't apply to broadcast)

### Pattern: bypassGuard for Auto-Acquisition

**Problem:** DELETE events arrive while initial acquisition is in-flight

**Without bypassGuard:**
```typescript
acquireLock()  // Sets isAcquiringRef.current = true
// ... RPC in flight ...
// DELETE event arrives
acquireLock()  // ❌ Silently skipped (isAcquiring check)
// Client stuck in 'locked' state forever
```

**With bypassGuard:**
```typescript
acquireLock()  // Sets isAcquiringRef.current = true
// ... RPC in flight ...
// DELETE event arrives
acquireLock({ bypassGuard: true })  // ✅ Proceeds despite isAcquiring=true
// Second acquisition succeeds, client gets lock
```

### Pattern: skipStateUpdate for Cleanup

**Problem:** React cleanup can't await async operations

**Without skipStateUpdate:**
```typescript
unmount()
  → releaseLock()  // Async delete
  → setLockStatus('unlocked')  // ❌ State update during unmount
  → React warning or component remount bug
```

**With skipStateUpdate:**
```typescript
unmount()
  → releaseLock({ skipStateUpdate: true })  // Async delete only
  → No state updates
  → Clean unmount
```

---

## Summary

**Root Cause:** 7 commits from debug branch were not applied to main, leaving critical cleanup and auto-acquisition logic missing.

**Impact:**
- Tests 5-6: Cleanup logic broken (wrong order, no status guard, no skipStateUpdate)
- Tests 7-9: Auto-acquisition broken (no bypassGuard, no RPC abort check)

**Solution:** Cherry-pick missing commits in order (0f9f87d → a23f4b9)

**Evidence:**
- Git diff shows exact code differences
- Commit messages document each fix
- Test failures align with missing logic

**Confidence:** Very High (100% - code differences identified, commit history traced, failure patterns match missing logic)

---

## References

**Git Commits:**
- 0f9f87d: Issue #5 unmount cleanup fix
- 6bee971: Dual-client auto-acquisition fix
- 089b157: DELETE handler regression fix
- 65c503d: Client-side DELETE filtering
- 071a7f7: Initial acquisition race fix
- c705cd7: DELETE handler status guard
- a23f4b9: DELETE handler else clause

**Test File:**
- `/Volumes/HestAI-Projects/eav-monorepo/packages/shared/src/editor/locking/useScriptLock.integration.test.ts`

**Implementation File:**
- `/Volumes/HestAI-Projects/eav-monorepo/packages/shared/src/editor/locking/useScriptLock.ts`

**Debug Branch:**
- `claude/fix-lock-delete-handler-regression-011CUp4X5h6Tv9bXVRSsbNyG`

---

**Authority:** research-analyst (ETHOS cognition)
**Validation:** Evidence-based git forensics + code diff analysis
**Next Step:** Apply Option A (cherry-pick commits) or Option B (manual code application)
