# EAV Operations Hub - Universal North Star

**PROJECT:** EAV Operations Hub (7 Apps: Data Entry, Scripts, VO, Scenes, Cam Op, Edit, Translations)
**APPROVED:** ✅ 2025-10-16 (Binding Authority)
**REFERENCE:** See 001-...-BUILD-REFERENCE.md for detailed architecture, SQL examples, lessons learned

---

## **SYSTEM IMMUTABLES (12 Binding Requirements)**

### **I1: Component-Based Content Spine**
Every piece of content maps to a component with stable identity maintained throughout entire production pipeline (Scripts → Scenes → VO → Edit → Delivery).
**Why Immutable:** Business-critical traceability, downstream apps reference via foreign keys, empirical MVP success
**Status:** ✅ PROVEN (Scripts MVP 120/120 tests, component extraction operational)

### **I2: Multi-Client Data Isolation**
Users access only authorized data - clients see assigned projects, team members see authorized projects, unauthenticated users see nothing (database-layer RLS, fail-closed).
**Why Immutable:** Multi-client business model, contractual isolation requirements, security guarantee
**Status:** ✅ PROVEN (Scripts MVP RLS operational, client filtering tested)

### **I3: LLM-Assisted Content Generation**
System leverages language models to transform structured data into production content (client specs → scripts, subtitles → translations) with mandatory human review/approval gate before downstream use.
**Why Immutable:** Workflow efficiency (automates 180+ fields → scripts conversion), quality control (human review prevents LLM hallucinations), cost-effectiveness (reduces manual authoring time by 60-80%)
**Status:** ⚠️ PARTIALLY PROVEN (Scripts LLM generation validated in testing, Data Entry + Translations planned)
**Flexibility Note:** LLM provider/model selection is NEGOTIABLE (OpenAI, Anthropic, local models), but LLM-assisted workflow pattern is IMMUTABLE
**Cost Monitoring:** If LLM costs exceed $X/script threshold, escalate to requirements-steward for architecture review
**Fallback:** Template-based generation with variable substitution (faster, predictable, cheaper)

### **I4: Parallel Workflows Without Dependencies**
Multiple production streams execute simultaneously without blocking (VO generation + scene planning + asset collection proceed independently from same script components).
**Why Immutable:** Production timeframes require parallel work (cannot wait weeks for sequential steps), component spine enables parallel reads
**Status:** 📋 ARCHITECTURAL DESIGN (validated by technical-architect, implementation pending)

### **I5: Offline-Capable Mobile Operations**
Field operations (Cam Op PWA) function without internet connectivity with reliable sync and conflict resolution when connection restored.
**Why Immutable:** Filming locations often lack reliable internet (construction sites, remote properties), cannot block filming due to connectivity
**Status:** 📋 PLANNED (PWA architecture defined, "server wins" sync strategy validated)

### **I6: Component Spine with App-Specific State**
Apps share same Supabase database and common tables (projects, videos, user_profiles, script_components) while maintaining app-specific state tables (vo_generation_state, scene_planning_state) to prevent deployment coupling and status conflicts.
**Why Immutable:** Independent evolution (VO app changes status without impacting Scripts/Scenes), shared traceability (all apps read same components), deployment flexibility (Scripts deploys TipTap features independently)
**Status:** 📋 ARCHITECTURAL DESIGN (technical-architect validated, prevents single-status-field conflicts)
**Example:** Scripts owns `scripts.status`, VO reads for filtering + writes own `vo_generation_state.vo_status`, Scenes reads for filtering + writes own `scene_planning_state.scene_status`

### **I7: Test-Driven Development with RED State Discipline**
Every feature begins with failing test committed to git BEFORE implementation (RED→GREEN→REFACTOR sequence) across all applications.
**Why Immutable:** Empirical success (Scripts MVP 120/120 tests via TDD), empirical failure (skipping TDD created untestable complexity), constitutional mandate (TRACED protocol)
**Status:** ⚠️ CONSTITUTIONAL MANDATE (proven in Scripts MVP, extends to all apps)

### **I8: Production-Grade Quality from Day One**
Every line of code meets production standards - strict TypeScript, zero warnings, database-layer security policies, performance optimization (no "MVP thinking" shortcuts).
**Why Immutable:** Success pattern ("Production Foundation thinking" enabled Scripts MVP), failure pattern ("MVP thinking" justified permanent debt), LLM behavior (terminology prevents compromises)
**Status:** ✅ MINDSET SHIFT (ADR-001 catalytic effect proven in Scripts MVP)

### **I9: Component Extraction Performance**
Every paragraph-to-component transformation completes <100ms at production scale (50 paragraphs/script) to maintain natural typing flow during content creation.
**Why Immutable:** User experience requirement (Scripts MVP baseline: near-instant saves), empirical ceiling (Edge Function overhead measured at 30-50ms), business requirement (scriptwriters cannot tolerate laggy editors)
**Status:** ✅ PROVEN (Scripts MVP Edge Function <50ms, paragraph extraction operational)
**Validation:** Benchmark with 50 paragraphs, measure end-to-end save latency, reject if >100ms
**Reference:** BUILD REFERENCE Edge Function implementation (lines 193-286)

### **I10: Cross-App Data Consistency via Database Layer**
All inter-app data synchronization occurs through Supabase (never client-to-client messaging, never local storage sync) ensuring single source of truth and preventing split-brain scenarios.
**Why Immutable:** Multi-app architecture requirement (7 apps must see consistent component spine), failure mode prevention (client-side sync creates race conditions), operational reality (apps deployed independently, cannot coordinate client updates)
**Status:** 📋 ARCHITECTURAL DESIGN (technical-architect validated, database-as-broker pattern)
**Validation:** Test Scripts save → VO/Scenes immediately see updated component (no manual refresh), simulate network partition → verify no stale data served
**Anti-Pattern:** Client-side event buses, localStorage sync, WebSocket broadcasting between apps

### **I11: Independent Deployment Architecture**
Each application deploys independently with zero blast radius between apps - Scripts can deploy TipTap editor features without coordinating with VO/Scenes/Edit deployments, preventing deployment coupling and enabling parallel evolution.
**Why Immutable:** Business agility requirement (cannot block urgent Scripts fixes while VO develops AI features), enables I4 parallel workflows, enables I6 app-specific state evolution, empirical failure (multi-repo coordination blocked productivity)
**Status:** ✅ ARCHITECTURAL DESIGN (monorepo with independent Vercel projects per app, validated in DECISIONS.md)
**Implementation:** Each app at `apps/{app-name}/` connects to separate Vercel project, shared `@workspace/shared` package enables code reuse without deployment coupling
**Anti-Pattern:** Centralized API layer (creates deployment bottleneck), shared deployment pipeline (couples unrelated changes), monolithic build (forces coordinated releases)

### **I12: Single Supabase Migration Source of Truth**
All database migrations exist at `/supabase/` in monorepo root - no app-specific migration directories, no parallel migration sources, ensuring all 7 apps see identical schema and preventing split-brain database states.
**Why Immutable:** Enables I10 cross-app data consistency, solves coordination failure (multi-repo with shared database was empirically unworkable), schema governance requirement (all apps must see same component spine structure)
**Status:** ✅ PROVEN (monorepo migration eliminated 2-repo coordination problem, single Supabase source operational)
**Implementation:** Migrations at `/eav-monorepo/supabase/migrations/`, all apps connect to same Supabase project, CI validates migration sequence integrity
**Anti-Pattern:** App-specific migration folders (creates schema drift), parallel migration sources (split-brain scenarios), "quick fix" migrations bypassing central location
**Validation:** CI checks all migrations are at `/supabase/migrations/`, no app subdirectories contain `.sql` files, Supabase CLI validates migration sequence

---

## **CRITICAL ASSUMPTIONS (Must Validate Before B0)**

✅ **A1: Deployment Platform Compatibility** (95% confidence) **[RESOLVED]**
**Risk:** RESOLVED - Vercel monorepo deployment empirically validated
**Validation:** ✅ COMPLETE - POC Phase 0 production deployment successful (2025-11-01)
**Decision Status:** ✅ RESOLVED - Vercel supports independent app deployment from monorepo
**Evidence:** Live production deployment at https://eav-monorepo-experimental-scenes-we.vercel.app/
**Architecture:** One GitHub repo → Multiple Vercel projects (one per app), each with independent deployment lifecycle
**Implementation:** See `/docs/guides/DEPLOYMENT.md` for Vercel configuration details
**POC Validation:** See `/Volumes/HestAI-Projects/eav-ops/coordination/poc-phase-0/COMPLETION-SUMMARY.md` (lines 52-203)
**Note:** Shared packages bundle at build time (no runtime coupling), troubleshooting documented for module resolution + env vars + build warnings

⚠️ **A2: Component Spine Write Protection** (60% confidence)
**Risk:** HIGH - Single client bug could corrupt spine for all 7 apps
**Validation:** technical-architect @ B1 - Benchmark Edge Function overhead, load test 10 req/sec
**Contingency:** If >100ms latency, investigate database triggers OR stored procedures

⚠️ **A3: Component Summary View Performance** (70% confidence)
**Risk:** MEDIUM - Dashboard queries slow, poor UX for project managers
**Validation:** technical-architect @ B1 - EXPLAIN ANALYZE with 500 components, profile JOINs
**Contingency:** Materialized view with refresh triggers OR caching layer (Redis)

⚠️ **A4: SmartSuite Webhook Reliability** (70% confidence)
**Risk:** HIGH - Project data becomes stale, users see outdated information
**Validation:** implementation-lead @ B1 - Monitor webhook delivery over 1 week, measure latency
**Contingency:** Manual "Sync Now" button (user control), polling fallback (5-min intervals)

⚠️ **A5: Offline PWA Sync Reliability** (50% confidence)
**Risk:** CRITICAL - Shot completion data lost OR inconsistent state across apps
**Validation:** implementation-lead + testguard @ B2 - Simulate 50 offline edits, verify sync without data loss
**Contingency:** Manual conflict resolution UI (Phase 2), admin dashboard showing sync failures

⚠️ **A6: LLM Content Generation Quality** (60% confidence)
**Risk:** MEDIUM - Generated content requires excessive manual editing, negating efficiency gains
**Validation:** implementation-lead + user @ B2 - Generate 10 scripts from real data, measure edit time vs manual
**Contingency:** Template-based generation with variable substitution (faster, predictable) OR manual authoring fallback

---

## **DECISION GATES (Must Pass to Proceed)**

### **D0: Pre-Flight Checks**
- ✓ Platform compatibility validated (docs + working example)
- ✓ Test infrastructure ready (Vitest + RTL + dual Supabase + CI)
- ✓ Quality gates enforced (lint + typecheck + test + hooks)

### **B0: Architecture Validation**
- ⚠️ critical-engineer reality check: "What breaks in production?"
- ⚠️ Review 6 assumptions + validation plans
- ⚠️ Deployment strategy decided (Monolithic API | Package Architecture)

### **B1: Foundation Implementation**
- ⚠️ Component spine operational (components table + RLS + Edge Function write protection)
- ⚠️ Component summary view (<50ms with 500 components)
- ⚠️ SmartSuite sync (webhook handler + manual fallback button)

### **B2: App-Specific Implementation**
- ⚠️ Each app operational with app-specific state tables
- ⚠️ Apps read shared spine, write independent state (no conflicts)
- ⚠️ User validation sessions per app

### **B3: Integration & Deployment**
- ⚠️ Production deploy (serverless platform + auth + cross-app data access)
- ⚠️ Cross-app workflow tested (Scripts → VO + Scenes parallel workflows)

### **B4: Completion & Polish**
- ⚠️ Quality gates: TS 0E | ESLint 0E/0W | Tests passing | DB lint 0E/0W | Perf <50ms/<500ms
- ⚠️ Code review: code-review-specialist + testguard + critical-engineer + requirements-steward

---

## **CONSTRAINED VARIABLES (Immutable/Flexible/Negotiable)**

**Edit Conflict Prevention (Scripts, Edit Guidance):**
- IMMUTABLE: Prevent data loss from concurrent edits via automatic detection + resolution
- FLEXIBLE: Smart Edit Locking pattern (approved implementation in BUILD REFERENCE lines 486-569)
  - Auto-acquire lock on script open (first user gets write access)
  - 5-minute heartbeat to maintain lock (prevents zombie locks)
  - 30-minute timeout with automatic expiration (releases abandoned locks)
  - Manual release button (voluntary unlock for collaboration)
  - Admin override (force-unlock for emergencies)
  - Lock transfer capability (reassign ownership without release)
- NEGOTIABLE: Timeout duration (30-min baseline, could adjust 15-60min) | Heartbeat frequency (5-min baseline) | Lock transfer UI/UX | Edit history granularity
- ANTI-PATTERN: Operational Transform (complex, Scripts doesn't need it), Optimistic Locking (conflicts still occur, just detected later)

**Deployment Infrastructure:**
- IMMUTABLE: Serverless HTTP API <200ms response @ production scale (10-20 concurrent, 3x growth)
- FLEXIBLE: Vercel (current) | Railway | Any serverless meeting latency + package compatibility

**Database Performance:**
- IMMUTABLE: Query latency <50ms @ production scale (100s projects, 10-20 concurrent)
- FLEXIBLE: Supabase Pro (current) | Self-hosted Postgres | Pooling strategies

**Editor Technology (Scripts, Edit Guidance):**
- IMMUTABLE: Rich-text collaborative editing + smart locking + paragraph-level component mapping
- FLEXIBLE: TipTap (proven MVP) | ProseMirror | Any supporting (para node ID, structured output, extension API)

**Testing Framework:**
- IMMUTABLE: TDD with integration tests validating real database connections (not full mocks)
- FLEXIBLE: Vitest (current) | Jest | Any supporting (ESM, async/await, database boundary mocking)

---

## **BOUNDARY CLARITY**

### **EAV Operations Hub System IS:**
✅ Data collection & structuring (client specs → LLM extraction → 180+ fields → client completion)
✅ Content creation pipeline (LLM scripts → component extraction → multi-user editing)
✅ Production workflow orchestration (VO generation, scene planning, filming checklists, edit guidance)
✅ Multi-language delivery (subtitle translation, foreign VO generation)
✅ Multi-client operations (client isolation via RLS, role-based access, shareable links)
✅ Cross-app integration (component spine, app-specific state, SmartSuite sync)

### **EAV Operations Hub System is NOT:**
❌ **Project Management System** (SmartSuite owns PROJECT-level status, audit, communications - EAV reads via webhook)
❌ **Media File Storage** (LucidLink primary for raw footage, proxies, project files - EAV references paths)
❌ **Video Hosting Platform** (Vimeo for client delivery - EAV uploads final exports)
❌ **Financial Management** (External accounting - EAV tracks project costs in SmartSuite only)
❌ **Client Communication Hub** (SmartSuite + Email for correspondence - EAV provides review links)
❌ **Asset Library / Stock Media** (External providers + LucidLink - EAV tracks arrival and usage)
❌ **Team Scheduling** (SmartSuite for filming schedules, editor allocation - EAV displays assigned tasks)
❌ **Video Editing Software** (Adobe/Final Cut/DaVinci - Edit Guidance provides script reference + directions)

---

## **PROTECTION CLAUSE**

**IF ANY AGENT DETECTS MISALIGNMENT:**
1. **STOP** current work immediately
2. **CITE** specific North Star requirement being violated (I1-I12)
3. **ESCALATE** to requirements-steward for resolution

**RESOLUTION OPTIONS:**
- **CONFORM** (typical): Work aligns with immutables
- **USER AMENDS** (rare): Immutable needs formal change via requirements-steward
- **ABANDON** (blocked): Cannot violate approved immutables

**ESCALATION FORMAT:**
`NORTH_STAR_VIOLATION: Current work [description] violates [I#] because [evidence] → requirements-steward`

---

## **DEFINITION OF DONE**

✅ **DEMOABLE:** User completes full workflow with no placeholders + video of actual usage + user feedback documented
✅ **INTEGRATION:** Real database connections (not mocked) + production deploy successful + cross-app workflows tested
✅ **QUALITY:** TS + ESLint + Tests: 0 errors | DB lint: 0E/0W | Perf targets met (<50ms/<500ms)
✅ **CONSTITUTIONAL:** TRACED compliance (T✅R✅A✅C✅E✅D✅) + TDD RED (git log shows TEST→FEAT) + North Star citations
✅ **EVIDENCE:** User workflow end-to-end + video demo + user testing session

---

## **QUICK REFERENCE - CITE IMMUTABLES**

When making decisions, cite North Star immutables:
- `// North Star I1: Component-based spine requires stable IDs for traceability`
- `// North Star I6: App-specific state tables prevent deployment coupling`
- `// North Star I7: TDD RED discipline requires test-first (git: TEST before FEAT)`
- `// North Star I8: Production-grade quality - strict TS, zero warnings, RLS security`

**For detailed methodology, SQL examples, lessons learned:** See 001-UNIVERSAL-EAV_SYSTEM-D1-BUILD-REFERENCE.md
**For gates and next actions checklist:** See 002-UNIVERSAL-EAV_SYSTEM-CHECKLIST.md

---

**AUTHORITY:** ✅ BINDING (Approved 2025-01-16)
**CHANGE CONTROL:** Amendments require formal process via requirements-steward
**NEXT:** Invoke critical-engineer for reality validation, invoke requirements-steward for D1_04 completeness check, proceed B0 with architectural planning
