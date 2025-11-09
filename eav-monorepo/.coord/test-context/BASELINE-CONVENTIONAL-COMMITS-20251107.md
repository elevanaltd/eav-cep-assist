# Conventional Commits Baseline (2025-11-07)

**Document Purpose:** Establish baseline metrics for conventional commits adoption monitoring
**Issue:** #27 - Adopt Conventional Commits Standard
**Implementation Date:** 2025-11-07 (PR #32 merged)
**Solo Developer Context:** Claude Code + AI agents

---

## Baseline Metrics

**Analysis Period:** Last 30 commits (includes pre-implementation work)
**Compliance Rate:** 7/30 = 23%
**Starting Point:** Before full adoption expected

---

## Compliant Commits (Conventional Format)

7 commits following `type(scope): description` format:

✅ `97528c8` docs(ci): adopt conventional commits standard with template and linter
✅ `fcac66e` fix(ci): Add missing conditional to seed baseline data step
✅ `110cb10` fix(ci): Unblock documentation-only PRs with job-level path detection
✅ `59eeb81` fix(db): Restore migration 20251105020000 and add cleanup migration
✅ `5a8d121` chore: Add .mcp.json for testing MCP server availability in GitHub sessions
✅ `53e1119` fix(editor): Remove realtime lock notification tests, clarify UX messaging
✅ `449860c` fix(db): Fix broadcast trigger parameter type - use record not jsonb

---

## Non-Compliant Patterns

### Uppercase Type Prefix (TEST:/FEAT: - Old Pattern)
Pre-implementation commits using legacy format:

❌ `aafdee7` FEAT: Enable noUnusedLocals and noUnusedParameters in copy-editor
❌ `db45a6c` TEST: Add TypeScript strictness validation test

**Note:** These precede Issue #27 implementation. Expected to disappear after.

### Documentation Without Type Prefix
Various docs commits missing type prefix:

❌ `a8f3e55` Add project roadmap and strictness analysis docs
❌ `aefc67d` docs(coord): Add comprehensive TDD and test infrastructure review report
❌ `fe7abff` docs: Update PROJECT-CONTEXT and DECISIONS for migration governance fix
❌ `0a3ac09` Add investigation report for useScriptLock test failures

---

## TDD Pattern Visibility

**RED→GREEN Evidence Found:**

✅ `db45a6c` TEST: Add TypeScript strictness validation test (RED phase)
✅ `aafdee7` FEAT: Enable noUnusedLocals and noUnusedParameters (GREEN phase)

**Status:** TDD discipline is happening. Format migration (TEST:/FEAT: → test()/feat()) needed for consistency.

---

## Audit Script (For Future Sessions)

```bash
#!/bin/bash
# Run this to check current compliance

echo "=== Conventional Commits Compliance Check ==="
echo ""

TOTAL=$(git log --oneline -20 | wc -l)
COMPLIANT=$(git log --oneline -20 | grep -E "^[a-f0-9]+ (feat|fix|test|docs|refactor|chore|ci|style|perf)\(" | wc -l)
MERGES=$(git log --oneline -20 | grep "^[a-f0-9]+ Merge" | wc -l)

echo "Total commits (last 20): $TOTAL"
echo "Compliant (type(scope):): $COMPLIANT"
echo "Merges (expected): $MERGES"
echo ""
echo "Compliance rate: $((COMPLIANT * 100 / TOTAL))%"
echo ""
echo "Detailed breakdown:"
git log --oneline -20 | while read hash msg; do
  if [[ $msg =~ ^(feat|fix|test|docs|refactor|chore|ci|style|perf)\( ]]; then
    echo "✅ $hash $msg"
  elif [[ $msg =~ ^Merge ]]; then
    echo "⊘  $hash $msg"
  else
    echo "❌ $hash $msg"
  fi
done
```

---

## Expected Progression

| Timeline | Target | Status |
|----------|--------|--------|
| Week 0 (Today) | 23% baseline | ✅ Established |
| Week 1 | 50-70% adoption | Pending |
| Week 2 | 80%+ adoption | Pending |
| Week 3+ | 95%+ adoption | Pending |

---

## Success Criteria (For Solo Dev Context)

### ✅ Implementation Working If:
- Next 10 commits show upward trend toward 80%+
- test(scope): prefix appears when TDD work happens
- feat(scope): and fix(scope): consistency visible
- `git log | grep feat:` returns results (searchability works)

### ⚠️ Early Warning Signs:
- Stuck at 20-30% after Week 1
- Zero test(scope): commits visible (TDD not labeled)
- AI reverting to random format (instructions ineffective)

### 🔴 Failure Indicators:
- Below 20% compliance after Week 2
- No upward trend visible
- AI commits completely ignoring template

---

## When to Re-Audit

**Check:** Every time you have 5-10 new commits
**Command:** Run audit script above, compare against baseline
**Decision Point:** After 20 new commits, assess trend

---

## Notes

- **Solo dev advantage:** You control 100% of commits (via AI instruction)
- **No team adoption friction:** This is purely about AI instruction clarity
- **Value proposition:** Git history searchability + TDD proof + future-you navigation
- **Reversible:** Can disable if not providing value (no sunk cost)

---

*Baseline established: 2025-11-07 21:45 UTC*
*Implementation: PR #32 merged*
*Next audit: After ~20 new commits*
