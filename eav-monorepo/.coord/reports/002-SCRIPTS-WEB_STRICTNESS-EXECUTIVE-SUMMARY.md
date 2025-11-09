# Executive Summary: TypeScript Strictness Impact for copy-editor

**Analysis Date:** 2025-11-07  
**Recommendation:** SAFE TO ENABLE  
**Risk Level:** LOW  
**Effort:** 15-35 code changes (mostly parameter prefixes)

---

## Key Findings

### 1. Zero Cross-App Ripple Effects ✅

| Concern | Status | Why |
|---------|--------|-----|
| Other apps import copy-editor? | ✅ NO | copy-editor is application-only, private package |
| Shared package affected? | ✅ NO | Already strict with same flags |
| Build system impact? | ✅ NO | Independent Vercel deployments |
| CI pipeline blocked? | ✅ NO | copy-editor gate only, others unaffected |

**The Facts:**
- copy-editor is a **CONSUMER** (imports from shared), not a **PROVIDER**
- Package.json: `"private": true` (not published)
- No "exports" field (unlike shared's 14 barrel exports)
- Zero interdependencies with scenes-web, vo-web, cam-op-pwa, etc.

---

## 2. Shared Package Already Aligned ✅

| Package | noUnusedLocals | noUnusedParameters | Status |
|---------|---|---|---|
| **@workspace/shared** | `true` | `true` | ✅ STRICT |
| **copy-editor** | `false` | `false` | ⚠️ LENIENT |

**After Enabling copy-editor:**
Both will enforce same quality standard → consistency across workspace

---

## 3. Implementation Path

**Phase 1: Change Config (1 file)**
```diff
// apps/copy-editor/tsconfig.json
- "noUnusedLocals": false,
- "noUnusedParameters": false,
+ "noUnusedLocals": true,
+ "noUnusedParameters": true,
```

**Phase 2: Identify & Fix Violations**
- Run: `npm run typecheck`
- Expected violations: 15-35 (local to copy-editor)
- Patterns: unused test parameters, unused locals
- Fixes: prefix with `_`, remove, or use

**Phase 3: Verify All Gates Pass**
```bash
npm run lint && npm run typecheck && npm run test:unit && npm run build
```

**Phase 4: Single Commit**
```
chore(tsconfig): Enable noUnusedLocals and noUnusedParameters
```

**No other apps require ANY changes.**

---

## 4. Expected Violations (Rough Categories)

| Category | Est. Count | Pattern | Fix |
|---|---|---|---|
| Test parameters | 10-15 | `(event)` unused in test | Prefix: `(_event)` |
| Mock functions | 5-10 | `(param)` in mock definition | Prefix: `(_param)` |
| Destructured imports | 2-5 | Import not used | Remove from destructure |
| Test fixtures | 2-5 | Setup variable not used | Remove or use |

**Total Expected:** 15-35 violations (mostly cosmetic parameter fixes)

---

## 5. What DOESN'T Change

✅ **Shared Package:** No changes needed (already strict)  
✅ **Other Apps:** Completely unaffected (independent configs)  
✅ **Build System:** Turbo task graph unchanged  
✅ **CI Pipeline:** Same gates, copy-editor just stricter  
✅ **Deployment:** Zero impact to production (fixes improve code)  

---

## 6. Why Enable It?

1. **Consistency** - Aligns with shared package standard
2. **Quality** - Removes dead code, improves clarity
3. **Scalability** - Sets precedent for scenes-web (Phase 2+)
4. **Developer Experience** - Single standard across workspace
5. **Low Cost** - Changes are local and mechanical

---

## 7. Risk Assessment

**Cross-App Breakage:** ✅ ZERO RISK  
**Build Failures:** ✅ ZERO RISK (only copy-editor, easily fixable)  
**Type Export Issues:** ✅ ZERO RISK (no exports)  
**Production Impact:** ✅ ZERO RISK (improves code)  

---

## Bottom Line

**Enabling TypeScript strictness in copy-editor is a PURELY LOCAL OPERATION.**

No coordination needed with other apps. No shared package changes. No monorepo architecture changes. Just local code cleanup with high value and zero ripple effects.

---

**Full Analysis:** `.coord/reports/001-COPY-EDITOR_STRICTNESS-RIPPLE-PATH-ANALYSIS.md`
