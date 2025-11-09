# RLS Validation Testing - TODO

## Current Status

**Test Infrastructure:** Uses service role client for test fixtures
- **Bypasses RLS:** Intentional (avoids circular dependency blocker)
- **Validates:** Business logic correctness (capability-config pattern)
- **Does NOT validate:** RLS policies (separate concern)

## RLS Circular Dependency Issue

**Blocker:** Comment INSERT → Scripts FK validation → Scripts RLS → user_accessible_scripts view → Scripts query → RLS (LOOP)

**Error:** `infinite recursion detected in rules for relation "user_accessible_scripts"`

**Fix:** Migration `20251102_fix_rls_circular_dependency.sql` (SECURITY DEFINER pattern)
**Status:** Parallel track (production CRITICAL, not Phase 2 blocking)

## Workaround: Service Role for Test Fixtures

**Pattern:** Standard testing practice to use service role for infrastructure setup

**What Service Role Enables:**
- ✅ Test fixture creation (scripts, projects, users) without RLS circular dependency
- ✅ Capability-config validation (requireAnchors, enablePositionRecovery, enableTipTapIntegration)
- ✅ Business logic correctness testing (createComment, attemptPositionRecovery)

**What Service Role Does NOT Validate:**
- ❌ RLS policy enforcement (user_accessible_scripts filtering)
- ❌ Multi-tenant access control (client isolation)
- ❌ Role-based permissions (admin vs employee vs client)

## Future Work: Dedicated RLS Test Suite

**Requires:** RLS fix migration applied first (circular dependency resolved)

**Test Coverage Needed:**

### 1. User Access Filtering Tests
```typescript
describe('RLS: user_accessible_scripts View', () => {
  it('admin user sees all scripts')
  it('employee user sees all scripts')
  it('client user sees only assigned project scripts')
  it('unauthorized client sees zero scripts')
})
```

### 2. Comment Creation with RLS
```typescript
describe('RLS: Comment Creation', () => {
  it('user can create comment on accessible script')
  it('user cannot create comment on inaccessible script')
  it('comment creation respects client_filter boundaries')
})
```

### 3. Script Lock Acquisition with RLS
```typescript
describe('RLS: Script Locking', () => {
  it('user can lock accessible script')
  it('user cannot lock inaccessible script')
  it('lock respects RLS boundaries')
})
```

### 4. Cross-Tenant Isolation
```typescript
describe('RLS: Multi-Tenant Isolation', () => {
  it('CLIENT_ALPHA user cannot access CLIENT_BETA scripts')
  it('CLIENT_BETA user cannot access CLIENT_ALPHA scripts')
  it('RLS prevents cross-tenant data leakage')
})
```

## Implementation Notes

**Test Pattern:**
1. Use authenticated client (getTestClient()) not service role
2. Sign in as specific test user (admin, client, unauthorized)
3. Attempt operation (createComment, getComments, updateScriptStatus)
4. Assert RLS enforcement (success for authorized, failure for unauthorized)

**Database State:**
- Test users: Created via Auth Admin API (scripts/create-test-users-via-api.mjs)
- Test scripts: Mix of accessible and inaccessible scripts per user role
- Test projects: Assigned to specific client_filter values for isolation testing

**Reference:**
- supabase-expert assessment (2025-11-02)
- Migration: 20251102_fix_rls_circular_dependency.sql
- ADR-003: RLS policy architecture

## Constitutional Compliance

**Phase 2 Scope:** Extract comments + scripts (not redesign RLS architecture)
**Test-Infrastructure-Steward:** Approved service role workaround for Phase 2
**Holistic-Orchestrator:** Approved separation of concerns (RLS = parallel track)

**North Star I7:** TDD discipline satisfied with service role (business logic tests PASS)
**TRACED Protocol:** Evidence = capability-config correctness (not RLS enforcement)

**Approved:** supabase-expert + holistic-orchestrator (2025-11-02)
