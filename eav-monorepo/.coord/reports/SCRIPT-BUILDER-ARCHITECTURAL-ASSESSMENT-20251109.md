# Copy-Builder App Architectural Assessment

**Branch Reviewed:** `claude/build-copy-builder-app-011CUucFKPASQdZnLaHigNWA`
**Reviewer:** External Validation (claude/external-validation-prompt-011CUxxpsdeAtGSiic6akmKv)
**Date:** 2025-11-09
**Status:** ARCHITECTURAL DIVERGENCE DETECTED

## Executive Summary

The copy-builder app implementation **diverges from simplified architecture requirements** in multiple critical areas:

1. **CONFIRMED:** Unnecessary provenance tracking (`built_from_library`, `source_draft_id`)
2. **CONFIRMED:** Wrong export destination (`scripts` table instead of Copy table)
3. **CONFIRMED:** Stateful side effects (usage counter increments)
4. **CONFIRMED:** Drag-and-drop NOT implemented (scaffold only)
5. **CONFIRMED:** N+1 query problem in content assembly

**Recommendation:** Refactor to align with stateless transformation pattern.

---

## Detailed Findings

### 1. Provenance Tracking (UNNECESSARY COMPLEXITY)

**File:** `apps/copy-builder/src/services/draftService.ts`
**Lines:** 194-195

**Finding:** ✅ CONFIRMED - Provenance fields ARE inserted

```typescript
// Line 186-198: complete() method
const { data: script, error: scriptError } = await supabase
  .from('scripts')
  .insert({
    video_id: draft.video_id,
    title: draft.title,
    plain_text: content,
    yjs_state_vector: null,
    status: 'draft',
    built_from_library: true,      // ❌ UNNECESSARY
    source_draft_id: id,            // ❌ UNNECESSARY
  })
```

**Architectural Violation:**
- Per simplified architecture: "Copy-Builder outputs plain text indistinguishable from manual input"
- Origin tracking is irrelevant to downstream Copy-Editor pipeline
- These fields add complexity without functional benefit

**Recommendation:** **REMOVE** `built_from_library` and `source_draft_id` fields from insert operation.

---

### 2. Export Destination (WRONG TABLE)

**File:** `apps/copy-builder/src/services/draftService.ts`
**Line:** 186

**Finding:** ✅ CONFIRMED - Exports to `scripts` table

```typescript
// Line 186
const { data: script, error: scriptError } = await supabase
  .from('scripts')  // ❌ WRONG TABLE
  .insert({...})
```

**Architectural Violation:**
- Expected: Write to **Copy table** (reuse existing Copy-Editor pipeline)
- Actual: Writes to `scripts` table
- Missing validation: No check if Copy for `video_id` exists and is draft/blank

**Recommendation:**
1. **CHANGE** target table from `scripts` to Copy table
2. **ADD** validation to check if Copy record exists for `video_id`
3. **ADD** validation to ensure Copy is in draft/blank state (via `copy_locks` mechanism)

**Validation Logic Required:**
```typescript
// Pseudo-code for required validation
const { data: existingCopy } = await supabase
  .from('copy')
  .select('id, status')
  .eq('video_id', draft.video_id)
  .single();

if (!existingCopy) {
  throw new Error('No Copy record exists for this video');
}

// Check via copy_locks if Copy is editable (draft/blank)
const { data: lock } = await supabase
  .from('copy_locks')
  .select('*')
  .eq('copy_id', existingCopy.id)
  .single();

if (lock && lock.status !== 'draft') {
  throw new Error('Copy is not in editable state');
}
```

---

### 3. Stateful Side Effects (UNNECESSARY)

**File:** `apps/copy-builder/src/services/draftService.ts`
**Lines:** 206-216

**Finding:** ✅ CONFIRMED - Usage counters ARE incremented

```typescript
// Line 206-216: Increment library component usage counters
const libraryIds = draft.components
  .filter((c) => c.type === 'library')
  .map((c) => ('library_id' in c ? c.library_id : null))
  .filter((id): id is string => id !== null);

if (libraryIds.length > 0) {
  await supabase.rpc('increment_component_usage', {  // ❌ STATEFUL
    component_ids: libraryIds,
  });
}
```

**Architectural Consideration:**
- Adds stateful complexity to otherwise stateless transformation
- Creates dependency on RPC function `increment_component_usage`
- No clear functional requirement for usage tracking

**Questions for Stakeholder:**
1. Is library usage tracking actually required?
2. If yes, what is the business value?
3. If no, this should be removed to maintain stateless pattern

**Recommendation:**
- **IF** usage tracking not required: **REMOVE** this logic
- **IF** usage tracking required: Document business requirement and accept stateful complexity

---

### 4. Drag-and-Drop Implementation (MISSING)

**File:** `apps/copy-builder/src/pages/DraftEditorPage.tsx`
**Dependencies:** `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` (installed in package.json:23-25)

**Finding:** ✅ CONFIRMED - NOT implemented (scaffold only)

**Evidence:**
```typescript
// Line 1-56: DraftEditorPage.tsx
// NO imports from @dnd-kit
// NO sortable list implementation
// NO drag-and-drop UI components

// Line 40: Explicitly states "B2 phase"
<p className="text-gray-600">
  Draft editor will be implemented in B2 phase.
</p>
```

**Status:**
- Dependencies installed: ✅
- Implementation status: ❌ Scaffold only
- Comment claims: "Features ready: Drag & drop with @dnd-kit" (Line 48)
- Reality: No drag-and-drop code present

**Recommendation:**
- **Phase Status:** B1 (Scaffold) - UI implementation deferred to B2
- **Action:** Update B2 implementation plan to include:
  1. Library component search interface
  2. Drag-and-drop component assembly
  3. Reorderable component list (order matters per requirements)
  4. Auto-save integration with React Query

---

### 5. Performance: N+1 Query Problem

**File:** `apps/copy-builder/src/services/draftService.ts`
**Lines:** 261-268 (assembleContent helper)

**Finding:** ✅ CONFIRMED - N+1 query pattern present

```typescript
// Line 261-289: assembleContent method
for (const component of sortedComponents) {
  if (component.type === 'library') {
    // ❌ QUERY INSIDE LOOP
    const { data } = await supabase
      .from('paragraph_library')
      .select('content')
      .eq('id', component.library_id)
      .single();

    let text = data?.content || '[Missing component]';
    // ... append to paragraphs
  }
}
```

**Performance Impact:**
- **Current:** N queries (1 per library component)
- **Example:** 20 components = 20 database round trips
- **Latency:** Unnecessary sequential delays

**Recommendation:** **REFACTOR** to batch fetch

**Suggested Implementation:**
```typescript
async assembleContent(components: Draft['components']): Promise<string> {
  const supabase = getSupabaseClient();
  const sortedComponents = [...components].sort((a, b) => a.order - b.order);

  // ✅ BATCH FETCH: Single query for all library components
  const libraryIds = sortedComponents
    .filter((c) => c.type === 'library')
    .map((c) => c.library_id);

  const { data: libraryComponents } = await supabase
    .from('paragraph_library')
    .select('id, content')
    .in('id', libraryIds);

  // Create lookup map
  const contentMap = new Map(
    libraryComponents?.map(lc => [lc.id, lc.content]) || []
  );

  // Assemble content using map
  const paragraphs = sortedComponents.map(component => {
    if (component.type === 'library') {
      let text = contentMap.get(component.library_id) || '[Missing component]';
      if (component.note) {
        text += `\n\n(NOTE: ${component.note})`;
      }
      return text;
    } else if (component.type === 'placeholder') {
      let text = component.name || '[Placeholder]';
      if (component.note) {
        text += `\n\n(NOTE: ${component.note})`;
      }
      return text;
    }
    return '';
  });

  return paragraphs.join('\n\n');
}
```

**Impact:**
- Reduces N queries to 1 query
- Eliminates sequential wait time
- Scales linearly with component count

---

## Summary of Architectural Violations

| # | Issue | Status | Severity | Recommendation |
|---|-------|--------|----------|----------------|
| 1 | Provenance tracking | CONFIRMED | Medium | REMOVE fields |
| 2 | Wrong export table | CONFIRMED | HIGH | CHANGE to Copy table + ADD validation |
| 3 | Stateful side effects | CONFIRMED | Low | ASSESS requirement, REMOVE if unnecessary |
| 4 | Drag-and-drop missing | CONFIRMED | Medium | B2 implementation (deferred) |
| 5 | N+1 query problem | CONFIRMED | Medium | REFACTOR to batch fetch |

---

## Recommended Refactoring Priorities

### Priority 1: Export Destination (HIGH)
**Action:** Change export from `scripts` table to Copy table
**Rationale:** Core architectural requirement - reuse existing Copy-Editor pipeline
**Files:** `apps/copy-builder/src/services/draftService.ts:186`

### Priority 2: Remove Provenance Tracking (MEDIUM)
**Action:** Remove `built_from_library` and `source_draft_id` fields
**Rationale:** Unnecessary complexity, violates stateless transformation pattern
**Files:** `apps/copy-builder/src/services/draftService.ts:194-195`

### Priority 3: Batch Query Optimization (MEDIUM)
**Action:** Refactor `assembleContent` to batch fetch library components
**Rationale:** Performance improvement, scalability
**Files:** `apps/copy-builder/src/services/draftService.ts:261-289`

### Priority 4: Assess Usage Tracking (LOW)
**Action:** Confirm business requirement for usage counters
**Rationale:** If not required, remove to maintain stateless pattern
**Files:** `apps/copy-builder/src/services/draftService.ts:206-216`

### Deferred: Drag-and-Drop Implementation (B2 Phase)
**Action:** Implement in B2 phase as planned
**Rationale:** Scaffold phase (B1) complete, UI deferred
**Files:** `apps/copy-builder/src/pages/DraftEditorPage.tsx`

---

## Architectural Alignment Questions

1. **Copy Table vs Scripts Table:** Confirm Copy table is correct destination
2. **Copy-Editor Pipeline:** Verify Copy-Editor can process copy-builder output identically to manual input
3. **Usage Tracking:** Clarify business requirement for library component usage counters
4. **Draft/Blank Validation:** Confirm validation logic for Copy editability via `copy_locks`

---

## Next Steps

1. **Stakeholder Review:** Confirm architectural simplification requirements
2. **Refactoring:** Implement Priority 1-3 changes
3. **Testing:** Add integration tests for Copy table export
4. **Documentation:** Update architecture docs to reflect stateless transformation pattern

---

**Constitutional Authority:** External Validation
**Related Branch:** `claude/build-copy-builder-app-011CUucFKPASQdZnLaHigNWA`
**Alignment Check:** North Star I8 (production-grade), I11 (independent deployment)
