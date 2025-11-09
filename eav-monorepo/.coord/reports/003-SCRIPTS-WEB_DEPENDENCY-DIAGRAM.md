# Monorepo Dependency Map: copy-editor Strictness Impact

---

## Current Dependency Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          MONOREPO STRUCTURE                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  CONSUMER APPS (7 independent deployments):                              │
│  ├─ copy-editor          ✅ B4 OPERATIONAL (production)                  │
│  ├─ scenes-web           (Phase 1 queued)                                │
│  ├─ vo-web               (Phase 4 queued)                                │
│  ├─ cam-op-pwa           (Phase 4 queued)                                │
│  ├─ edit-web             (Phase 4 queued)                                │
│  ├─ translations-web     (Phase 4 queued)                                │
│  └─ data-entry-web       (Phase 4 queued)                                │
│                                                                           │
│  SHARED PACKAGE (single source of truth):                                │
│  └─ @workspace/shared    ✅ v0.5.0 (all tests passing)                   │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Import Direction Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│ @workspace/shared (STRICT: noUnusedLocals=true, noUnusedParameters=true) │
│                                                                            │
│  Exports (14 barrel paths):                                               │
│  ├─ auth              → AuthProvider, useAuth hooks                       │
│  ├─ comments          → useComments, CommentPositionTracker              │
│  ├─ comments/extensions → CommentHighlight                               │
│  ├─ scripts           → loadScriptForVideo, generateContentHash          │
│  ├─ editor            → useScriptLock, extractComponents                 │
│  ├─ database          → validateProjectId, Database types               │
│  ├─ services          → Logger, utilities                                │
│  ├─ client            → getSupabaseClient (singleton)                    │
│  ├─ lib/mappers       → Script/video/user mappers                        │
│  └─ ... (8 more exports)                                                  │
└──────────────────────────────────────────────────────────────────────────┘
                                ↑
                                │ IMPORTS (CONSUMER)
                                │
                        ┌───────┴─────────┐
                        │                 │
        ┌───────────────┴──────┐  ┌──────┴──────────────┐
        │                      │  │                     │
   ┌────────────────────┐  ┌──────────────────────┐  ┌──────────────────┐
   │  copy-editor       │  │  scenes-web (Phase1) │  │  OTHER APPS (5)  │
   │  (LENIENT)         │  │  (NOT YET)           │  │  (NOT YET)       │
   │                    │  │                      │  │                  │
   │ noUnusedLocals:    │  │ noUnusedLocals: ?    │  │ noUnusedLocals:  │
   │ false ⚠️           │  │ (TBD per phase)      │  │ (TBD per phase)  │
   │                    │  │                      │  │                  │
   │ Imports shared:    │  │ Will import shared   │  │ Will import      │
   │ 53 source files    │  │ when Phase 1 begins  │  │ shared during    │
   │ 39 test files      │  │                      │  │ implementation   │
   │                    │  │                      │  │                  │
   │ ✅ Operational     │  │ ✅ Queued for start  │  │ ✅ Awaiting      │
   │ ✅ Production live │  │                      │  │    migration     │
   └────────────────────┘  └──────────────────────┘  └──────────────────┘
```

---

## Strictness Level Alignment (Current vs. After)

### Current State

```
@workspace/shared:  STRICT ╔════════════════════════╗
                           ║ Consistent quality     ║
                           ║ enforced in one place  ║
                           ║ (shared package only)  ║
                           ╚════════════════════════╝

copy-editor:        LENIENT
     ↑
     └─ MISMATCH: Same codebase, different standards
```

### After Enabling copy-editor Strictness

```
@workspace/shared:  STRICT ╔════════════════════════╗
                     ╪════╫ ALIGNED: Consistent     ║
copy-editor:        STRICT║ quality standards      ║
                           ║ across workspace       ║
                           ║ (foundation for        ║
                           ║ scenes-web Phase 1+)   ║
                           ╚════════════════════════╝
```

---

## TypeScript Configuration Comparison

### Before

```typescript
// @workspace/shared/tsconfig.json
{
  "compilerOptions": {
    "noUnusedLocals": true,      ← STRICT
    "noUnusedParameters": true,  ← STRICT
    "strict": true,
  }
}

// apps/copy-editor/tsconfig.json
{
  "compilerOptions": {
    "noUnusedLocals": false,     ← LENIENT
    "noUnusedParameters": false, ← LENIENT
    "strict": true,
  }
}
```

### After

```typescript
// @workspace/shared/tsconfig.json
{
  "compilerOptions": {
    "noUnusedLocals": true,      ← STRICT
    "noUnusedParameters": true,  ← STRICT
    "strict": true,
  }
}

// apps/copy-editor/tsconfig.json
{
  "compilerOptions": {
    "noUnusedLocals": true,      ← ALIGNED
    "noUnusedParameters": true,  ← ALIGNED
    "strict": true,
  }
}
```

---

## Build Dependency Graph

```
┌─────────────────────────────────────────────────────────────┐
│ turbo.json: Build Task Dependencies                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  build { dependsOn: ["^build"] }                            │
│  └─ "^" = Upstream dependencies only                        │
│                                                             │
│  typecheck { dependsOn: ["^build"] }                        │
│  └─ Typecheck runs AFTER upstream builds complete          │
│                                                             │
│  test:integration { dependsOn: ["^build"] }                │
│  └─ Integration tests run AFTER builds                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘

BUILD ORDER FOR copy-editor:

1. @workspace/shared:build           (FIRST - no dependencies)
   ├─ Outputs: dist/index.js, dist/index.d.ts, etc.
   └─ Time: ~3-4 seconds
                ↓
2. copy-editor:build                 (depends on shared build)
   ├─ Inputs: shared's dist/
   ├─ Outputs: dist/ (Vite SPA bundle)
   └─ Time: ~4-5 seconds
                ↓
3. Parallel: Both typecheck tasks
   ├─ @workspace/shared:typecheck    (STRICT, noUnusedLocals: true)
   ├─ copy-editor:typecheck          (Currently LENIENT, will be STRICT)
   └─ Time: ~2-3 seconds each
                ↓
4. Results:
   ✅ All pass (or copy-editor fails until violations fixed)

CRITICAL INSIGHT:
└─ copy-editor's typecheck config change does NOT affect
   @workspace/shared's build output
└─ Other apps' builds complete independently
└─ No cascade failures possible
```

---

## Package.json Dependency Declarations

### @workspace/shared (Published Library)

```json
{
  "exports": {
    ".": { ... },
    "./auth": { ... },
    "./comments": { ... },
    "./scripts": { ... },
    // ... 11 more barrel exports
  }
  // ↑ PUBLISHED - Other workspaces import via these paths
}
```

### copy-editor (Private Application)

```json
{
  "private": true,
  "dependencies": {
    "@workspace/shared": "workspace:*"
  }
  // ↑ NO EXPORTS - Nothing published, just imports shared
  // ↑ CONSUMER - Receives updates from shared, never provides to others
}
```

### scenes-web (Future - Phase 1)

```json
{
  "private": true,
  "dependencies": {
    "@workspace/shared": "workspace:*"
  }
  // ↑ Will follow same pattern
  // ↑ Will choose own tsconfig strictness per phase requirements
}
```

---

## Ripple-Path Matrix: Impact of Enabling copy-editor Strictness

```
         │ Source: copy-editor Config Change (noUnusedLocals: true)
         │
         ├─────────────────────────────────────────────────────────┐
         │                                                         │
    Impact→
         │
    TO:  @workspace/shared BUILD
         │ Result: ✅ NONE
         │ Reason: Config change doesn't affect shared's code
         │ Build Output: UNCHANGED (dist/ files identical)
         │ Exports: UNCHANGED (14 barrel paths work identically)
         │
    TO:  @workspace/shared TYPECHECK
         │ Result: ✅ NONE
         │ Reason: Shared already strict, independent execution
         │ Status: STILL PASSING
         │
    TO:  scenes-web (not yet built)
         │ Result: ✅ NONE
         │ Reason: Zero dependencies from scenes-web to copy-editor
         │ Independence: scenes-web makes own config choices
         │
    TO:  vo-web (not yet built)
         │ Result: ✅ NONE
         │ Reason: Zero dependencies from vo-web to copy-editor
         │ Independence: vo-web makes own config choices
         │
    TO:  cam-op-pwa (not yet built)
         │ Result: ✅ NONE
         │ Reason: Zero dependencies from cam-op-pwa to copy-editor
         │ Independence: cam-op-pwa makes own config choices
         │
    TO:  edit-web (not yet built)
         │ Result: ✅ NONE
         │ Reason: Zero dependencies from edit-web to copy-editor
         │ Independence: edit-web makes own config choices
         │
    TO:  translations-web (not yet built)
         │ Result: ✅ NONE
         │ Reason: Zero dependencies from translations-web to copy-editor
         │ Independence: translations-web makes own config choices
         │
    TO:  data-entry-web (not yet built)
         │ Result: ✅ NONE
         │ Reason: Zero dependencies from data-entry-web to copy-editor
         │ Independence: data-entry-web makes own config choices
         │
    TO:  CI/CD Pipeline
         │ Result: ⚠️ MINOR (copy-editor gate may fail temporarily)
         │ Details: Until violations fixed, typecheck fails
         │ Mitigation: Violations are LOCAL and mechanical to fix
         │ Others: Completely unaffected (independent jobs)
         │
         └─────────────────────────────────────────────────────────┘

CONCLUSION: ZERO RIPPLE EFFECTS ✅
```

---

## Test File Impact Details

### Current Test Infrastructure (69 test files)

```
copy-editor/src/
├─ *.test.ts  (unit tests)              → 39 files
├─ *.test.tsx (component tests)         → 30 files
└─ *.integration.test.ts (integration)  → 0 files*

*Integration tests in .coord/test-context/ (shared library tests)

MOCKING PATTERNS (likely violations when strict):

Pattern 1: Unused mock parameters
  vi.mock('@workspace/shared/comments', () => ({
    useComments: vi.fn((_userId, _options) => {  // ← Parameters unused
      return { /* mock data */ };
    })
  }));

Pattern 2: Test fixture parameters
  beforeEach((done) => {  // ← 'done' unused if async/await used
    // test setup
  });

Pattern 3: Error handler parameters
  catch((error) => {  // ← 'error' unused in simple re-throw
    throw error;
  });

FIXES (mechanical, low effort):
├─ Add underscore prefix: (_userId, _options)
├─ Remove unused parameters
├─ Or actually use the parameter (rarely needed)
└─ Time per fix: 30 seconds - 2 minutes
```

---

## Summary: Why This Change Is Safe

```
copy-editor Strictness Change:

ISOLATED:
└─ No exports → No other code depends on it
└─ Private package → Not published
└─ Consumer only → Changes don't affect what it imports from

SAFE:
└─ Shared unaffected → Already strict
└─ Build order unchanged → Independent workspace
└─ Other apps independent → Each chooses own config

LOW EFFORT:
└─ ~15-35 violations expected
└─ Mostly parameter prefixes (_param)
└─ No architectural changes needed
└─ ~30 minutes total effort

HIGH VALUE:
└─ Consistency with shared package
└─ Dead code removal (improves codebase)
└─ Sets precedent for future apps
└─ Single unified quality standard
```

---

**Analysis Date:** 2025-11-07  
**Full Analysis:** `.coord/reports/001-COPY-EDITOR_STRICTNESS-RIPPLE-PATH-ANALYSIS.md`
