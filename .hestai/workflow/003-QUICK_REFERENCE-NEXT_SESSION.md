# Quick Reference - Next Session Start

**Last Updated:** 2025-11-26
**Session Status:** ✅ PRODUCTION STABLE - All core features complete

---

## Quick Start Commands

```bash
cd /Volumes/HestAI-Projects/eav-cep-assist

# Deploy both panels
./deploy-navigation.sh && ./deploy-metadata.sh

# Restart Premiere Pro (Cmd+Q)
```

---

## Current Status: PRODUCTION COMPLETE ✅

**Quality Gates:** All passing (147 tests)
**Architecture:** JSON-first (XMP removed)
**Open Issues:** 3 (all Low priority enhancements)

**Recent PRs (merged):**
- PR #64: PP edits priority fix
- PR #63: Per-clip fallback when PP file missing clip ID
- PR #61: LucidLink compatibility fix

---

## Key Files

| Purpose | File |
|---------|------|
| Project Context | `.coord/PROJECT-CONTEXT.md` |
| Roadmap | `.coord/PROJECT-ROADMAP.md` |
| Shared Checklist | `.coord/SHARED-CHECKLIST.md` |
| North Star | `.coord/workflow-docs/000-CEP_PANEL_METADATA_ARCHITECTURE-D1-NORTH-STAR.md` |
| Deployment | `.coord/workflow-docs/004-PRODUCTION-DEPLOYMENT-CHECKLIST.md` |

---

## Next Priorities (All Optional)

1. **Issue #23:** Operational runbooks (Low)
2. **Issue #35:** Batch flush delays (Low)
3. **Issue #13:** Auto-apply on import (Low)

---

## Debugging

**CEP Panel Consoles (PRIMARY):**
- Right-click Metadata Panel → Debug → Console tab
- Right-click Navigation Panel → Debug → Console tab

**ExtendScript Console:** Usually empty (use CEP consoles instead)

---

**Git Branch:** `main`
**Tests:** 147 passing
**Quality Gates:** All green
