# AuthContext Bundle Duplication Investigation Report

**Date:** 2025-11-03
**Investigator:** Claude (Error Architect)
**Status:** ✅ **ALREADY FIXED - No Action Required**

## Executive Summary

The AuthContext duplication issue reported in the initial investigation request has been **completely resolved** by commit `84987dc` (2025-11-03 15:11:28 UTC). Current production builds are functioning correctly with no duplication.

## Investigation Findings

### 1. Root Cause (Historical)

**Problem:** AuthContext was duplicated across multiple chunks:
- `index.js` contained AuthProvider instance
- `TipTapEditor.js` lazy chunk contained separate useAuth instance
- Two separate React Context instances caused provider/consumer mismatch

**Symptom:** "useAuth must be used within AuthProvider" error in production builds

**Why It Happened:**
Vite's default code splitting bundled `@workspace/shared` separately in:
1. Entry point bundle (index.js)
2. Lazy-loaded chunk (TipTapEditor.js)

This created **TWO separate React Context instances**. A Provider from Context A cannot satisfy a consumer from Context B.

### 2. Fix Applied (Commit 84987dc)

**Solution:** Vite manual chunk extraction for `@workspace/shared`

```typescript
// vite.config.ts (lines 14-21)
manualChunks: (id) => {
  // CRITICAL FIX: Extract @workspace/shared to prevent context duplication
  // Without this, AuthContext gets bundled separately in index.js AND TipTapEditor chunk
  // causing "useAuth must be used within AuthProvider" errors in production
  // Check for both node_modules path and pnpm workspace path
  if (id.includes('@workspace/shared') || id.includes('/packages/shared/')) {
    return 'vendor-shared';
  }
  // ... other vendor chunks
}
```

### 3. Verification Evidence

**Bundle Analysis:**
```bash
$ grep -c "AuthContext" dist/assets/*.js
vendor-shared-Au35o_Of.js: 2    # ✅ Single location (definition + error message)
index-fXFkreAC.js: 0            # ✅ No duplication
TipTapEditor-BxUr7vjT.js: 0     # ✅ No duplication
NavigationSidebar-*.js: 0       # ✅ No duplication
```

**Import Chain Verification:**
```javascript
// index-fXFkreAC.js (line 2)
import{...,u as useAuth,L as Logger,A as AuthProvider}from"./vendor-shared-Au35o_Of.js"

// TipTapEditor-BxUr7vjT.js (line 1)
import{...,u as useAuth,...}from"./vendor-shared-Au35o_Of.js"
```

Both chunks import from **the same vendor-shared bundle** → Single AuthContext instance ✅

**Build Output:**
```
dist/assets/vendor-shared-Au35o_Of.js  52.08 kB │ gzip: 14.18 kB  ✅
dist/assets/index-fXFkreAC.js          16.25 kB │ gzip:  5.30 kB  ✅
dist/assets/TipTapEditor-BxUr7vjT.js   41.15 kB │ gzip: 12.87 kB  ✅
```

### 4. Architecture Validation

**Correct Behavior:**
1. All `@workspace/shared` code extracted to `vendor-shared-Au35o_Of.js`
2. Both entry point and all lazy chunks import from same vendor bundle
3. Single AuthContext instance shared across entire application
4. No runtime errors in production builds

**Bundle Strategy:**
- ✅ React + ReactDOM → `vendor-react-_NYfYvz9.js` (227KB)
- ✅ TipTap editor → `vendor-editor-4E7XfDmi.js` (291KB)
- ✅ Supabase client → `vendor-supabase-XCh8lNxw.js` (169KB)
- ✅ **Shared utilities + Auth → `vendor-shared-Au35o_Of.js` (52KB)**
- ✅ Utils (Zod, DOMPurify, Yjs) → `vendor-utils-B6UoFXOG.js` (73KB)
- ✅ Router → `vendor-router-*.js`

## Why This Fix Works

### React Context Singleton Requirement

React Context **must be a singleton** across the entire application. When code splitting occurs without proper configuration, Vite might bundle the context definition in multiple chunks, creating separate instances.

**The Problem:**
```
App.tsx imports { AuthProvider } → bundled in index.js → creates Context Instance A
TipTapEditor.tsx imports { useAuth } → bundled in TipTapEditor.js → creates Context Instance B
Result: Provider A cannot satisfy consumer B → Runtime error ❌
```

**The Solution:**
```
vite.config.ts forces all @workspace/shared → vendor-shared.js
App.tsx imports { AuthProvider } → from vendor-shared.js → Context Instance A
TipTapEditor.tsx imports { useAuth } → from vendor-shared.js → Context Instance A
Result: Provider A satisfies consumer A → No errors ✅
```

By forcing all `@workspace/shared` imports into a single `vendor-shared` chunk:
1. AuthContext is defined **once** in vendor-shared
2. All consumers (App.tsx, TipTapEditor.tsx, etc.) import from the **same chunk**
3. Provider and consumers share the **same Context instance**
4. No runtime errors

## Recommendations

### ✅ Current Configuration is Correct

**DO NOT MODIFY** the current `vite.config.ts` manual chunk configuration. The fix is working as intended.

### If Errors Recur in Production

**Diagnosis Steps:**
```bash
# 1. Build locally
pnpm run build

# 2. Check bundle contents (should appear in ONLY vendor-shared)
grep -c "AuthContext" dist/assets/*.js

# 3. Verify imports (should all point to vendor-shared)
head -2 dist/assets/index-*.js | grep "from"
head -1 dist/assets/TipTapEditor-*.js | grep "from"

# 4. Test with preview server
pnpm preview --port 3002
# Open browser → http://localhost:3002
# Check browser console for "useAuth must be used within AuthProvider"
```

**Expected Results:**
- AuthContext should appear in **ONLY** `vendor-shared-*.js`
- Both index and TipTapEditor should import from `vendor-shared`
- No console errors in preview mode

### If Bundle Names Change

Bundle hashes (e.g., `Au35o_Of`) change with every build. This is **normal**. Use glob patterns for verification:

```bash
grep -c "AuthContext" dist/assets/vendor-shared-*.js  # Should be 2
grep -c "AuthContext" dist/assets/index-*.js          # Should be 0
grep -c "AuthContext" dist/assets/TipTapEditor-*.js   # Should be 0
```

## Git Evidence

**Related Commits:**
```
7adfdda (2025-11-03) - chore: force Vercel rebuild - clear AuthProvider build cache
84987dc (2025-11-03) - fix(copy-editor): resolve AuthProvider context duplication in production builds
f14258e (2025-11-03) - fix(copy-editor): migrate to ESLint v9 + add Vite entry point
```

**Fix Commit:** `84987dc`
**Fix Date:** 2025-11-03 15:11:28 UTC
**Author:** Shaun Buswell

## Conclusion

**Status:** ✅ **RESOLVED - NO ACTION REQUIRED**

The AuthContext duplication issue has been systematically resolved through proper Vite bundling configuration. All verification tests confirm:

1. ✅ AuthContext exists in single location (vendor-shared-Au35o_Of.js)
2. ✅ No duplication in index or any lazy chunks
3. ✅ Correct import chains (all imports from vendor-shared)
4. ✅ Production-ready bundle structure
5. ✅ Local build + preview verification passed
6. ✅ No console errors

**The reported issue was already fixed before this investigation began.**

The current `vite.config.ts` configuration is correct and should not be modified. The manual chunk extraction for `@workspace/shared` is the proper solution for preventing React Context duplication across code-split bundles.

---

**Investigation Method:**
1. Read current vite.config.ts configuration
2. Build production bundle locally (`pnpm run build`)
3. Analyze bundle contents with grep
4. Verify import chains in minified code
5. Test with preview server
6. Review git history for related fixes

**Verification Tools Used:**
- `pnpm run build` - Production build
- `grep -c "AuthContext"` - Bundle content analysis
- `head` + import chain inspection - Import verification
- `pnpm preview` - Local production testing
- `git log` - Historical context

**Generated:** 2025-11-03
**Investigator:** Claude (Error Architect)
**Verification:** Build analysis + grep + import chain validation + git history
