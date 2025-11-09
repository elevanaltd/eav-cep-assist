# Documentation Update - Extraction Testing Policy

**Date:** 2025-11-02
**Trigger:** Constitutional ruling on hybrid testing requirement
**Authority:** test-infrastructure-steward (BLOCKING domain authority)

---

## Documents Created/Updated

### 1. New Policy Document ✨

**File:** `.coord/test-context/EXTRACTION-TESTING-POLICY.md`

**Purpose:** Constitutional policy for all extraction work (POC → shared library)

**Contents:**
- Constitutional question and ruling
- Three-tier test coverage requirement (extraction fidelity, public API integration, negative path)
- What is validation theater (examples of violations vs valid patterns)
- CI evidence requirements
- When hybrid testing applies (and when it doesn't)
- Historical context (copy-editor Week 2 incident)
- Constitutional authority chain

**Size:** Comprehensive policy document (~400 lines)

**Status:** CONSTITUTIONAL POLICY - Mandatory for all extraction work

---

### 2. Decision Record Updated

**File:** `.coord/DECISIONS.md`

**Added:** New decision under "Shared Infrastructure" section

**Summary:**
- Decision: Hybrid testing mandatory (3-tier coverage)
- Authority: test-infrastructure-steward (BLOCKING)
- Constitutional basis: North Star I7
- Rationale: Prevents validation theater while allowing adapters
- Historical context: Week 2 extraction incident
- Reference: Points to detailed policy document

**Integration:** Linked to existing test infrastructure decisions

---

### 3. Quick Reference Updated

**File:** `.coord/test-context/RULES.md`

**Added:** Key Policies section at top (lines 5-8)

**Links to:**
- EXTRACTION-TESTING-POLICY.md (3-tier coverage requirement)
- INFRASTRUCTURE-VALIDATION.md (smoke test results)
- SUPABASE-HARNESS.md (setup guide)

**Purpose:** Quick navigation to detailed policy documents

---

## Why This Documentation Matters

### Prevents Future Incidents

**Without Documentation:**
- Each extraction creates same constitutional question
- Teams debate: "Do we test POC directly or just the wrapper?"
- holistic-orchestrator blocks, implementation-lead defends
- 2-4 hours lost in constitutional clarification

**With Documentation:**
- Policy is clear: Both POC and wrapper must be tested
- 3-tier coverage requirement explicit
- Examples show what's acceptable vs validation theater
- No debate, just implementation

### Constitutional Authority

**Policy Establishes:**
- test-infrastructure-steward has BLOCKING authority for test integrity
- North Star I7 applies to extraction (not just new features)
- Adapter patterns allowed IF both layers tested
- CI evidence mandatory (all 3 tiers must execute)

**Without Authority:**
- implementation-lead could skip POC tests ("wrapper calls POC, that's enough")
- holistic-orchestrator could demand wrapper removal ("test POC only")
- No clear resolution path

**With Authority:**
- Clear ruling: Hybrid testing mandatory
- Both concerns addressed (POC validation + API design)
- Blocking power prevents constitutional violations

### Knowledge Continuity

**For Future Teams:**
- "Why do we have extraction fidelity tests AND wrapper tests?"
- Answer: EXTRACTION-TESTING-POLICY.md explains constitutional basis
- Historical context shows real incident that drove policy

**For Current Team:**
- implementation-lead now executing 3-tier coverage (following policy)
- No future blocking on this issue (policy is clear)

---

## Quick Navigation

**For Policy Details:**
→ `.coord/test-context/EXTRACTION-TESTING-POLICY.md`

**For Decision Context:**
→ `.coord/DECISIONS.md` (search "Extraction Testing Policy")

**For Quick Reference:**
→ `.coord/test-context/RULES.md` (see "Key Policies" at top)

---

## Current Implementation Status

**Implementation-Lead Working Through:**
- ☑ Tier 1: Extraction fidelity tests (7/7 passing)
- ☑ Tier 2: Public API integration tests (Week 1 - exists)
- ☑ Tier 3: Negative path tests (added)
- ☐ Database fixtures (fixing 4 failing tests)
- ☐ Git commit with evidence

**Expected Completion:** 2-3 hours

**Outcome:** Week 2 progression unblocked with constitutional compliance

---

**Documentation Complete:** Policy established, authority clear, future incidents prevented
