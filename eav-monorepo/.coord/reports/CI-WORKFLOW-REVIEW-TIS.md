# Test-Infrastructure-Steward: CI Workflow Review

**Date:** 2025-11-03  
**Reviewer:** test-infrastructure-steward  
**Authority:** RULES.md (CI stewardship) + CI-PIPELINE-GAP-ANALYSIS.md  
**Scope:** Proposed `.github/workflows/ci.yml` (quality-gates + preview integration)

---

## 1. Infrastructure Validation
- The proposed tiering aligns with the documented two-stage pipeline (local quality gates + preview integration) and covers Supabase bootstrap, migrations, Auth API user creation, and failure log capture, satisfying the baseline expectations captured in the gap study (CI-PIPELINE-GAP-ANALYSIS.md:25,344).
- Quality gate ordering follows the documented lint → typecheck → test:unit → build progression, but the current command list collapses all tests into a single `pnpm test`; explicit `test:unit` separation remains a blocker for compliance (RULES.md:119-125).
- Local Supabase startup includes retry attempts, docker cleanup, and GoTrue health verification, closing the most critical failure vector flagged by the POC lessons (CI-PIPELINE-GAP-ANALYSIS.md:83-94).
- Environment overrides must export both the URL and anon key with verification logging to ensure Vitest receives 127.0.0.1 credentials; only the URL override appears in the outline and should be expanded for parity (CI-PIPELINE-GAP-ANALYSIS.md:135-146).

## 2. Gap Analysis Coverage
- Gaps 1, 2, 4, 5, 6, and 8 are either directly reflected in the plan (retry loop, preview tri-state, functional change detector, Vitest worker cap, failure logs) or already delivered in supporting configuration, matching the remediation list (CI-PIPELINE-GAP-ANALYSIS.md:25-376).
- Gap 3 (seed timing + separation) is not explicitly called out; document and script the post-user seed step so CI preserves TRUNCATE safety guarantees (CI-PIPELINE-GAP-ANALYSIS.md:173-183).
- Gap 7 remains unresolved: separate `test:unit` and `test:integration` commands are still outstanding despite being on the mandatory checklist (SUPABASE-HARNESS.md:704-709).

## 3. Gotcha Detection
- Ensure `pnpm install --frozen-lockfile` precedes Supabase CLI usage to prevent mismatched dependency graphs during retry loops; otherwise repeated restarts can invalidate the previous lock state mid-run.
- Add an explicit guard that fails the job if the GoTrue health check never returns within the configured attempts; otherwise the workflow could proceed with half-initialized services, recreating flake scenarios the gap study warned about (CI-PIPELINE-GAP-ANALYSIS.md:89-94).
- Seed data must run after Auth API user creation but before tests; omitting it risks RLS regressions and data drift that were intentionally separated in the POC (SUPABASE-HARNESS.md:682-697).
- Preview tri-state logic should emit telemetry (skip reason, branch details) to the logs; include this to support ARGUS observability and accelerate false-positive diagnosis (CI-PIPELINE-GAP-ANALYSIS.md:214-227).

## 4. Enhancement Recommendations
- Add `actions/cache` entries for `~/.pnpm-store`, `~/.cache/turbo`, and Supabase CLI artifacts to keep job runtime within acceptable SLAs once Phase 3 stabilizes.
- Publish Supabase CLI metrics (startup duration, attempt count) as workflow outputs to enforce reproducibility evidence across runs, aligning with Standards Observability.
- Wrap `pnpm turbo run ...` invocations with `--filter=...` where practical so monorepo scopes stay isolated when future apps join the pipeline, preventing cross-app drift.
- Capture a sanitized snapshot of `$GITHUB_ENV` overrides on success to provide documentary proof that CI used local credentials rather than production values (CI-PIPELINE-GAP-ANALYSIS.md:135-145).

## 5. Risk Assessment
- **Flake Risk:** Missing seed sequencing and health-check failure gating can allow tests to execute against partially initialized services, leading to RED-state instability (CI-PIPELINE-GAP-ANALYSIS.md:89-94,173-183).
- **Credential Risk:** Partial overrides may leak real Supabase URLs into Vitest if the anon key is not set, exposing production data to test writes (CI-PIPELINE-GAP-ANALYSIS.md:135-146).
- **Coverage Drift:** Without distinct unit/integration commands, integration specs will rerun in Tier 1, increasing runtime and encouraging future skip patterns that erode standards (SUPABASE-HARNESS.md:704-709).
- **Observability Gap:** Absent telemetry on skip reasons or Supabase bootstrap metrics, diagnosing CI drift reverts to manual forensics, violating ARGUS vigilance principles (CI-PIPELINE-GAP-ANALYSIS.md:214-227).

## 6. Quality Gate Thresholds
- Zero-tolerance lint/typecheck/test/build gates remain the correct posture for Week 1 RED discipline and are consistent with the post-it rules (RULES.md:119-125).
- Maintain coverage as diagnostic only; continue reporting Vitest coverage but do not introduce hard thresholds that could incentivize validation theater (RULES.md:150-158).

## 7. Activation Sequence Review
- Authoring the workflow now but enabling it post-Phase 3B is acceptable provided we land the missing `test:unit` split and seed documentation before activation; otherwise, a partially compliant workflow risks entering the branch history without enforcement hooks.
- Prior to activation, run a full rehearsal locally (local CLI + `act` dry run if available) to capture the observational evidence mandated by the gap report before CI is switched on.

## 8. Final Verdict
- **Verdict:** **NEEDS_WORK**
- **Blocking Actions Before Activation:**
  1. Define `test:unit`/`test:integration` scripts and update the quality-gates stage to call the unit variant (RULES.md:119-125; SUPABASE-HARNESS.md:704-709).
  2. Extend the environment override step to export the anon key with verification logging (CI-PIPELINE-GAP-ANALYSIS.md:135-146).
  3. Document and automate post-user seed execution within the workflow (CI-PIPELINE-GAP-ANALYSIS.md:173-183; SUPABASE-HARNESS.md:682-697).
- **Non-Blocking Follow-Ups:** Introduce cache layers, telemetry outputs, and preview skip logging enhancements to strengthen reproducibility and observability once the blocking items close.

---

**Next Check-In:** Confirm the three blocking items are resolved, then re-run the stewardship review to upgrade the verdict to READY.
