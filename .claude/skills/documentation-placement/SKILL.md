---
name: documentation-placement
description: Document placement rules, visibility protocols, and timeline test (before-code vs after-code). Defines where documentation belongs (dev/docs/ vs coordination/), documentation-first PR protocol, and phase artifact placement. Critical for documentation organization and visibility.
allowed-tools: Read, Write, Bash
---

# Documentation Placement

CORE_PRINCIPLE::"Timeline determines placement → Planning docs before code = coordination/, Implementation docs after code = dev/"

---

## TIMELINE TEST (THE DECISION RULE)

```octave
DOCUMENT_PLACEMENT::[
  IF[created_before_code_exists]→coordination/workflow-docs/,
  IF[describes_actual_implementation]→dev/docs/,
  IF[guides_implementation]→dev/docs/architecture/[D3-BLUEPRINT-ORIGINAL.md]
]
```

---

## REPOSITORY PLACEMENT RULES

```octave
COORDINATION::[
  workflow-docs/[D1-NORTH-STAR.md, D2-DESIGN.md, B0-VALIDATION.md],
  phase-reports/[B1-BUILD-PLAN.md, B2-IMPLEMENTATION.md, B3-INTEGRATION.md, B4-DELIVERY.md],
  planning-docs/[CHARTER.md, ASSIGNMENTS.md, PROJECT-CONTEXT.md],
  ACTIVE-WORK.md[status_board]
]

DEV_DOCS::[
  architecture/[D3-BLUEPRINT-ORIGINAL.md, ARCHITECTURE-AS-BUILT.md, ARCHITECTURE-DEVIATIONS.md],
  adr/[ADR-XXXX-{decision}.md],
  api/[{endpoint}-api.md],
  guides/[{feature}-guide.md]
]

PHASE_ARTIFACTS::[
  D1_D2_B0→coordination/workflow-docs/,
  D3_BLUEPRINT→dev/docs/architecture/[after_B1_migration],
  B1_B2_B3_B4→coordination/phase-reports/
]
```

---

## DOCUMENTATION-FIRST PR PROTOCOL

**Principle**: "Documentation isn't a side effect of code, it's a prerequisite for code."

**Example Workflow:**
```bash
# 1. Merge documentation FIRST
git checkout -b docs/adr-001
echo "# ADR-001: CQRS Implementation" > docs/adr/ADR-001.md
git commit -m "docs: Add ADR-001 for CQRS implementation"
gh pr create --title "docs: ADR-001 CQRS Implementation"
gh pr merge --merge

# 2. Implementation PR references merged docs
git checkout -b feat/cqrs-implementation
# ... implement code ...
git commit -m "feat: Implement CQRS per ADR-001

Implements decision from docs/adr/ADR-001.md (merged in PR #123)"
```

**Merge Strategy:**
```octave
DOC_TYPE_MERGE::[
  D3_BLUEPRINT→immediate_before_B0,
  ADRs→immediate_before_implementation,
  API_DOCS→with_or_before_implementation,
  ARCHITECTURE_AS_BUILT→with_implementation,
  DEVIATIONS→update_as_discovered
]
```

---

## B1 MIGRATION GATE (CRITICAL CHECKPOINT)

```octave
B1_EXECUTION_FLOW::[
  B1_01[task-decomposer]→EXECUTE_IN[ideation_directory],
  B1_02[workspace-architect]→EXECUTE_IN[ideation_directory],

  MIGRATION_GATE::[
    STOP→human_checkpoint,
    verify→D3_BLUEPRINT_moved_to_dev/docs/architecture/,
    action→cd_/Volumes/HestAI-Projects/{PROJECT}/dev/
  ],

  B1_03[workspace-architect]→VALIDATE_IN[dev_directory],
  B1_04+→EXECUTE_IN[dev_directory]
]
```

**Example Migration:**
```bash
# At B1 migration gate
cd /Volumes/HestAI-Projects/{project}
mv coordination/workflow-docs/D3-BLUEPRINT.md dev/docs/architecture/D3-BLUEPRINT-ORIGINAL.md
git commit -m "docs: Migrate D3 Blueprint to dev/ at B1 gate"
cd dev/  # Continue B1_03 in new location
```

---

## FRONT-MATTER REQUIREMENTS

```octave
ARCHITECTURE_DOCS::[
  applies_to_tag, supersedes, superseded_by,
  schema_version, phase, status[ORIGINAL|AS_BUILT|DEVIATION]
]

ADR_DOCS::[
  adr_number, title, status[ACCEPTED|SUPERSEDED|DEPRECATED],
  decision_date, implements, deviates_from
]
```

---

## ACTIVE-WORK.md STATUS BOARD

**Purpose**: Mitigate worktree isolation via visible status board

**Template:**
```markdown
# Active Work Status Board
_Last Updated: 2025-11-12_

## Feature: CQRS (worktree: feat-cqrs)
- Blueprint: D3-BLUEPRINT-ORIGINAL.md
- ADR: ADR-001 ✅ MERGED
- Status: Implementing (B2_02)
- PR: #456 [WIP]
```

**Update Protocol:**
```octave
VISIBILITY_RULES::[
  check_ACTIVE_WORK.md_before_starting,
  update_when_creating_worktree,
  link_PRs_for_documentation_visibility,
  mark_complete_when_merging
]
```

---

## AGENT RESPONSIBILITIES

```octave
AGENT_BOUNDARIES::[
  directory-curator→reports_violations_only[never_fixes_content],
  workspace-architect→fixes_placement_violations+owns_migrations,
  system-steward→documents_patterns_and_wisdom,
  holistic-orchestrator→enforces_at_phase_gates,
  hestai-doc-steward→governs_/Volumes/HestAI/docs/
]
```

---

## PHASE TRANSITION CLEANUP

```octave
CLEANUP_GATES::[
  B1_02_completion→before_migration_gate,
  B2_04_completion→before_B3,
  B3_04_completion→before_B4,
  B4_05_completion→before_delivery
]

CLEANUP_SEQUENCE::[
  holistic-orchestrator→directory-curator[analyze],
  directory-curator→REPORT[violations],
  holistic-orchestrator→workspace-architect[fix],
  workspace-architect→git_commit[clean_state]
]
```
