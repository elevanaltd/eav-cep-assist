# Critical-Engineer: CI Readiness Review

**Date:** 2025-11-02  
**Reviewer:** critical-engineer  
**Constitutional Authority:** North Star I6, I7, I8, I11  
**Scope:** Scripts Web extraction migration → CI/CD realignment (Week 1 TDD RED protocol)

---

## Executive Decision

- **Verdict:** **BLOCKED**
- **Registry Token:** CRITICAL-ENGINEER-BLOCKED-20251102-CI-READINESS
- **Summary:** Current CI pipeline cannot support the monorepo extraction program. Jobs depend on `npm` workflows, assume legacy package scopes, and skip integration tiers when path patterns change—creating blind spots that violate RED-state guarantees and jeopardize production readiness. Immediate remediation is required before any extraction work proceeds.

---

## 1. CI Pipeline Timing & Configuration Assessment

1. **Legacy toolchain mismatch:** Quality Gate stages execute `npm install`, `npm run lint`, `npm run test:unit`, and `npm run build`, but the monorepo mandates `pnpm` + `turbo` orchestration (`pnpm-lock.yaml`, `packageManager: pnpm@10.20.0`, and workspace scripts fan out through `turbo run ...`). The workflow never invokes `pnpm` or `turbo`, so it cannot exercise the RED-state tests or shared package builds required by the migration (eav-ops/eav-apps/copy-editor/.github/workflows/ci.yml:139; package.json:5; package.json:10-15; turbo.json:4-16).
2. **High-latency bootstrap with no caching:** Every run cold-starts Supabase (300s timeout loop) and reinstalls node_modules without `actions/cache` or artifact reuse, guaranteeing multi-minute setup per job even on documentation changes (eav-ops/eav-apps/copy-editor/.github/workflows/ci.yml:52-114; eav-ops/eav-apps/copy-editor/.github/workflows/ci.yml:139-143). No timing budget or SLA is documented, breaching North Star observability requirements for CI throughput.
3. **Environment protection stalls:** Both jobs bind to the `production` environment, forcing manual approvals or secret-guard delays on every PR run absent documented bypass criteria (eav-ops/eav-apps/copy-editor/.github/workflows/ci.yml:13; eav-ops/eav-apps/copy-editor/.github/workflows/ci.yml:242). This blocks the 12–14 hour RED protocol timeline by injecting uncontrolled wait states.
4. **Obsolete package validation:** The debug stage still inspects `@elevanaltd/shared-lib`, the pre-extraction package. Once shared modules move under `@workspace/shared`, this check provides no assurance and wastes runtime (eav-ops/eav-apps/copy-editor/.github/workflows/ci.yml:170-188).

**Recommendations:**
- Switch to `pnpm install --frozen-lockfile` and `pnpm turbo run {lint,typecheck,test,build}` with workspace filters so RED tests execute where they live (package.json:5; package.json:10-15).
- Add dependency caching for `~/.pnpm-store`, Supabase docker layers, and turbo cache once GREEN state is reached.
- Introduce job-level timeouts (<=15 minutes) and telemetry on Supabase bootstrap to enforce SLA accountability.
- Remove the production environment gate from PR CI; restrict to deploy workflows with documented approval steps.

---

## 2. CI Execution Phasing & Skip Logic

1. **Quality Gates (Tier 1):** Runs for push/PR, but only inside the legacy repo. Because it never invokes `pnpm turbo`, the job cannot see packages under `packages/shared` or `apps/copy-editor` in the monorepo, so cross-app build/test chains remain unexecuted during RED checks (eav-ops/eav-apps/copy-editor/.github/workflows/ci.yml:9-219; package.json:7-15).
2. **Preview Integration (Tier 2):** Gated to PRs and depends on Supabase preview health. The job exits early if the preview check reports `skipped` or if no branch exists—treating "no preview" as "tests not needed" even when functional code changed (eav-ops/eav-apps/copy-editor/.github/workflows/ci.yml:268-345). This suppresses integration coverage on schema-stable PRs, contradicting the Week 1 checklist requirement to keep cross-app imports failing RED until capability-config extraction lands (APP-CHECKLIST.md:44-63).
3. **Functional-change detector blind spot:** Integration gating looks only for `src/**/*.ts(x|)` changes (eav-ops/eav-apps/copy-editor/.github/workflows/ci.yml:415-476). In the monorepo, core logic resides in `packages/shared/**` and `apps/copy-editor/**`; those paths never match the regex, so the integration tier will skip permanently after migration—eliminating TipTap/position recovery validation precisely when new shared code is introduced.
4. **Artifact placement drift:** Artifact uploads assume `dist/` at repo root, but turborepo outputs will land under `apps/copy-editor/dist`. Without adjusting `path`, deploy evidence is incorrect (eav-ops/eav-apps/copy-editor/.github/workflows/ci.yml:214-220).

**Recommendations:**
- Rephase CI: Tier 1 (`pnpm turbo run lint typecheck test` for workspace scopes), Tier 2 (Supabase preview integration keyed off workspace diffs), Tier 3 (optional deploy/package checks). Align gating criteria with monorepo path patterns.
- Replace regex gating with turbo change detection (`pnpm turbo run test --filter=@workspace/shared...`), ensuring shared package updates trigger integration runs.
- Fail the integration job if preview infrastructure is missing but functional code changed; skipping silently violates RED discipline.

---

## 3. Overlooked Execution Risks

1. **Cross-app regression coverage absent:** CI never exercises consumer apps (e.g., scenes-web) even though extraction checklist mandates cross-app validation before Phase 2 (APP-CHECKLIST.md:44-63; APP-CHECKLIST.md:169-179). Turborepo dependency wiring remains unvalidated, risking shared package regressions landing unchecked.
2. **Rollback evidence missing from automation:** The workflow lacks steps to archive build/test logs into `.coord/validation/` or tag rollback artifacts demanded by Week 1’s TRACED checkpoint (APP-CHECKLIST.md:139-165). Without automated evidence collection, rollback rehearsals devolve into manual theater.
3. **Security posture erosion:** Running all jobs under `production` environment secrets exposes privileged tokens during routine lint/test runs (eav-ops/eav-apps/copy-editor/.github/workflows/ci.yml:18-27; eav-ops/eav-apps/copy-editor/.github/workflows/ci.yml:247-250). Principle of least privilege is broken, amplifying blast radius for CI compromise.
4. **Supabase lifecycle drift:** No teardown or health assertions after seeding preview branches; stale data may accumulate between runs when tests skip (eav-ops/eav-apps/copy-editor/.github/workflows/ci.yml:369-487). Missing cleanup violates isolation guarantees for RED tests.

---

## 4. Production Deployment Readiness

- **Readiness Gap:** There is no monorepo-aware deployment job verifying bundle size, TTI, or cross-app builds—despite constitutional requirements to capture baselines before Week 2 extraction (APP-CHECKLIST.md:150-163; APP-CHECKLIST.md:169-179). The current pipeline cannot attest to production safety once shared modules move.
- **Release Control Deficit:** Absence of staged rollout, canary, or rollback automation contradicts the Critical-Engineer condition requiring a rollback runbook before Phase 1 (APP-CHECKLIST.md:139-165). CI should publish build artifacts, validation logs, and version tags automatically; none exist today.
- **Secret Management Risks:** Preview integration consumes service-role keys via production secrets for every PR (eav-ops/eav-apps/copy-editor/.github/workflows/ci.yml:247-250). Without scoped preview credentials, a compromised PR run jeopardizes production Supabase access—unacceptable for production-grade readiness.

**Conclusion:** Production deployment is **not** ready. The CI system fails to validate the shared package, lacks rollback automation, and mismanages secrets. Extraction must remain blocked until CI enforces RED-state guarantees for all target apps.

---

## Required Actions (Blocking Unless Noted)

1. **Adopt monorepo-native CI commands** (`pnpm turbo run …` with workspace filters, Supabase bootstrap scripts via `packages/shared/scripts/setup-test-db.sh`) – *BLOCKING* – due before Week 1 RED completion.
2. **Rebuild functional-change detection** using turborepo scopes so integration tests execute on `packages/shared/**` and `apps/copy-editor/**` modifications – *BLOCKING* – TTL: Immediate (prior to RED commit).
3. **Implement cross-app validation stage** running `pnpm turbo run build --filter=scenes-web` and tests post-shared build – *CRITICAL* – TTL: 24h before Phase 2 kickoff.
4. **Introduce evidence archival + rollback automation** emitting artifacts under `.coord/validation/` per TRACED protocol – *CRITICAL* – TTL: 24h before Phase 1 start.
5. **Partition CI secrets** (replace production environment binding with scoped CI secrets, enforce teardown) – *HIGH* – TTL: 72h before production deployment.

---

## Evidence Reviewed

- `eav-ops/eav-apps/copy-editor/.github/workflows/ci.yml`
- `.coord/apps/copy-editor/APP-CHECKLIST.md`
- `package.json`
- `turbo.json`

---

## Accountability & Escalation

- **Accountable Owner:** Implementation Lead (CI realignment).
- **Escalation TTL:** BLOCKING items require resolution before any extraction engineering begins; escalate to project leadership if unresolved within 24h.
- **Verification:** Store updated CI run logs, Supabase bootstrap metrics, and cross-app build outputs in `.coord/validation/` once remediated.

