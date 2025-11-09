# Parallel Work Quick Reference

**Session:** 2025-11-08 Parallel Orchestration
**Purpose:** Fast lookup for parallel work stream status and dependencies

---

## Work Streams Overview

```
┌─────────────────────────────────────────────────────────────┐
│ ACTIVE WORK STREAMS (As of 2025-11-08)                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Stream A: scenes-web Phase 1                                │
│   Status: ✅ COMPLETE + DEPLOYED                           │
│   URL: https://eav-scenes-git-claude-session-in-6ba3cb-... │
│   Next: Phase 2 (2.5-3.5 hours polish)                     │
│                                                             │
│ Stream B: copy-builder (Quest B)                         │
│   Status: 🔄 READY TO START                                │
│   Branch: TBD (GitHub agent creates)                       │
│   Timeline: 11-14 days (B1→B2→B3→B4)                       │
│   Critical: Creates paragraph_library table (Quest C dep)  │
│                                                             │
│ Stream C: library-manager (Quest C)                        │
│   Status: ⏸️ BLOCKED (waiting for Quest B B1)             │
│   Branch: TBD (after Quest B migration)                    │
│   Timeline: 8-11 days (B1→B2→B3→B4)                        │
│   Unblock: Quest B creates paragraph_library table         │
│                                                             │
│ Stream D: Modularization (Issue #29)                       │
│   Status: 📋 PLANNING (test infrastructure Phase 0)        │
│   Branch: claude/implementation-lead-setup-011CUuiS...     │
│   Trigger: AFTER scenes-web B4 + copy-builder B4 + lib-mgr B4 │
│   Timeline: 1 week (splits @workspace/shared)              │
└─────────────────────────────────────────────────────────────┘
```

---

## Critical Dependency Chain

```
copy-builder B1 (creates paragraph_library table)
    ↓
library-manager B1 (references paragraph_library)
    ↓
Integration Testing (circular workflow validation)
    ↓
Modularization Checkpoint (splits @workspace/shared)
```

**Blocker Rules:**
- ❌ Cannot start library-manager until copy-builder B1 migration merged
- ❌ Cannot start modularization until all 3 apps operational (scenes-web ✅, copy-builder ✅, library-manager ✅)
- ✅ Can work on scenes-web Phase 2 anytime (independent)

---

## Next Actions Checklist

### Immediate (1-2 Days)

- [ ] **Launch Quest B (copy-builder GitHub Agent)**
  - Location: See session handoff PROMPT 1
  - Create new branch from main
  - Provide implementation-lead prompt to GitHub agent
  - Estimated completion: 11-14 days

- [ ] **Monitor Quest B Progress**
  - Check B1 completion (12-16 hours)
  - Verify migration `20251108000000_add_script_builder_tables.sql` created
  - Validate quality gates passing (lint, typecheck, test, build)
  - Confirm TDD evidence in git log (TEST→FEAT commits)

### Short-Term (1-2 Weeks)

- [ ] **Verify Quest B Migration Before Quest C Launch**
  - Check migration file exists in `/supabase/migrations/`
  - Verify `paragraph_library` table created
  - Confirm `script_builder_drafts` table created
  - Review RLS policies operational

- [ ] **Launch Quest C (library-manager GitHub Agent)**
  - Location: See session handoff PROMPT 2
  - **ONLY AFTER** Quest B B1 migration verified
  - Create new branch from main (includes Quest B migration)
  - Provide implementation-lead prompt to GitHub agent
  - Estimated completion: 8-11 days

### Medium-Term (2-4 Weeks)

- [ ] **Integration Testing (Circular Workflow)**
  - Trigger: Both Quest B + Quest C at B4
  - Test library-manager → paragraph_library → copy-builder → copy-editor → back to library-manager
  - Validate RLS policies, shared schema, data consistency

- [ ] **Modularization Checkpoint (Phase 3c)**
  - Trigger: scenes-web B4 + copy-builder B4 + library-manager B4
  - Branch: `claude/implementation-lead-setup-011CUuiSFvZ1CpVJHZg1hiBX`
  - Duration: 1 week
  - Migrate all 4 apps to use sub-packages

### Optional (Anytime)

- [ ] **scenes-web Phase 2 Polish**
  - Add `vercel.json` SPA routing config (5 min)
  - Evaluate component duplication (AutocompleteField, AuthContext, Sidebar)
  - Apply POC migrations (3 incremental changes)
  - Total: 2.5-3.5 hours

---

## Prompt Locations

**Script Builder (Quest B):**
- Document: Session handoff `001-SESSION-HANDOFF.md`
- Section: "Quest B: copy-builder (GitHub Agent)"
- Search for: "PROMPT 1: copy-builder"
- Role: implementation-lead
- Constitutional: TDD RED→GREEN→REFACTOR, I7, I8, I11, I12

**Library Manager (Quest C):**
- Document: Session handoff `001-SESSION-HANDOFF.md`
- Section: "Quest C: library-manager (GitHub Agent)"
- Search for: "PROMPT 2: library-manager"
- Role: implementation-lead
- **Critical:** Migration depends on paragraph_library (Quest B creates this)

---

## Quality Gates (All Streams)

**Mandatory Before Each Phase PR:**
```bash
npm run lint        # → 0 errors
npm run typecheck   # → 0 errors
npm run test        # → All passing
npm run build       # → Success
```

**TDD Evidence Required:**
```
Git log must show:
  TEST: Add [feature] test
  FEAT: Implement [feature]

Pattern: RED (failing test) → GREEN (implementation) → REFACTOR (improve)
```

**Constitutional Compliance:**
- I7: TDD discipline (git evidence)
- I8: Production-grade (0 warnings, strict TypeScript, RLS)
- I11: Independent deployment (Vercel per app)
- I12: Single migration source (/supabase/migrations/)

---

## Migration Governance

**Sequential Order (CRITICAL):**
1. `20251108000000_add_script_builder_tables.sql` (Quest B)
   - Creates `paragraph_library` ← Quest C depends on this
   - Creates `script_builder_drafts`
   - Alters `scripts` (add library tracking)

2. `20251109000000_add_library_manager_columns.sql` (Quest C)
   - Alters `scripts` (add library_status columns)
   - References `paragraph_library` (Quest B created)
   - **BLOCKED** until Quest B migration merged

**Immutable Rule:** Migration files NEVER modified after creation (HO-MIGRATION-GOVERNANCE-20251107)

**If Changes Needed:** Create NEW migration with ALTER/DROP statements

---

## Risk Monitoring

**Watch For:**

**Quest B (copy-builder):**
- ⚠️ B1 takes >16 hours (upper estimate exceeded)
- ⚠️ Quality gates failing (lint, typecheck, test, build)
- ⚠️ Missing TDD evidence (no TEST commits before FEAT)
- ⚠️ Migration not created or malformed

**Quest C (library-manager):**
- ⚠️ Launched before Quest B migration verified
- ⚠️ paragraph_library table reference fails
- ⚠️ RLS policy conflicts with Quest B

**Integration:**
- ⚠️ Circular workflow breaks (library-manager → copy-builder data flow)
- ⚠️ Schema conflicts between apps
- ⚠️ RLS policy gaps (security vulnerability)

**Mitigation:** Weekly check-ins on GitHub agent progress, early blocker detection

---

## Documentation Cross-Reference

**Project Level:**
- `/Volumes/HestAI-Projects/eav-monorepo/.coord/PROJECT-CONTEXT.md` - System state dashboard
- `/Volumes/HestAI-Projects/eav-monorepo/.coord/PROJECT-ROADMAP.md` - Strategic timeline

**App Level:**
- `/Volumes/HestAI-Projects/eav-monorepo/.coord/apps/scenes-web/APP-CONTEXT.md` - scenes-web status
- `/Volumes/HestAI-Projects/eav-monorepo/.coord/apps/copy-builder/` - Quest B blueprints (ARCHITECTURE, BUILD-PLAN, DATABASE)
- `/Volumes/HestAI-Projects/eav-monorepo/.coord/apps/library-manager/` - Quest C blueprints (ARCHITECTURE, BUILD-PLAN, DATABASE)

**Session:**
- `/Volumes/HestAI-Projects/eav-monorepo/.coord/sessions/2025-11-08-parallel-orchestration/001-SESSION-HANDOFF.md` - Complete handoff
- `/Volumes/HestAI-Projects/eav-monorepo/.coord/sessions/2025-11-08-parallel-orchestration/002-PARALLEL-WORK-QUICK-REFERENCE.md` - This document

**Decisions:**
- `/Volumes/HestAI-Projects/eav-monorepo/.coord/DECISIONS.md` - Architectural rationale

---

## Emergency Contacts (Agent Roles)

**Quest B/C Execution:** implementation-lead (GitHub agents)
**System Coherence:** holistic-orchestrator (gap detection, parallel coordination)
**Migration Coordination:** holistic-orchestrator (I12 single source enforcement)
**Quality Validation:** critical-engineer (tactical), principal-engineer (strategic)
**Test Discipline:** test-methodology-guardian (integration test architecture)

---

**Quick Ref Version:** 1.0
**Last Updated:** 2025-11-08
**Maintained By:** holistic-orchestrator
**Next Update:** After Quest B launch or Quest C unblock
