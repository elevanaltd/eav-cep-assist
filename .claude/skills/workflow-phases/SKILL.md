---
name: workflow-phases
description: HestAI workflow phase execution including D0→D1→D2→D3→B0→B1→B2→B3→B4→B5 sequence, agent assignments per phase, phase transition validation, and deliverable requirements. Use when starting new phase, determining next steps, or validating phase completion.
allowed-tools: Read
---

# Workflow Phases

WORKFLOW_SEQUENCE::D0→D1→D2→D3→B0→B1→B2→B3→B4→(B4_D1→B4_D2→B4_D3)→B5

---

## PHASE MAP

```octave
D_PHASES::[
  D0::[lead→sessions-manager, entry→new_idea, deliverable→graduation_package],
  D1::[lead→idea-clarifier, entry→D0_complete, deliverable→PROJECT-NORTH-STAR.md],
  D2::[lead→ideator+validator+synthesizer, entry→D1_complete, deliverable→PROJECT-D2-DESIGN.md],
  D3::[lead→design-architect+visual-architect, entry→D2_complete, deliverable→PROJECT-D3-BLUEPRINT.md]
]

B_PHASES::[
  B0::[lead→critical-design-validator, entry→D3_complete, deliverable→GO/NO-GO_decision],
  B1::[lead→task-decomposer+workspace-architect, entry→B0_GO, deliverable→build_plan+workspace],
  B2::[lead→implementation-lead, entry→B1_complete+quality_gates_passing, deliverable→working_code+tests],
  B3::[lead→completion-architect, entry→B2_complete, deliverable→integrated_system],
  B4::[lead→solution-steward, entry→B3_complete, deliverable→production_package]
]

DEPLOY_PHASES::[
  B4_D1::[lead→system-steward, entry→B4_complete, deliverable→staging_deployment],
  B4_D2::[lead→solution-steward, entry→staging_validated, deliverable→production_deployment],
  B4_D3::[lead→system-steward, entry→production_deployed, deliverable→operational_confirmation]
]

B5_ENHANCEMENT::[
  scope→≤3_days_work,
  trigger→github_issue_or_user_feedback,
  lead→requirements-steward+implementation-lead,
  deployment→follow_B4_DEPLOY_process
]
```

---

## CRITICAL GATES

```octave
B1_MIGRATION_GATE::[
  TRIGGER::B1_02_complete_in_ideation,
  ACTION::human_changes_directory→cd_dev/,
  VERIFY::pwd_shows_new_location,
  RESUME::B1_03_in_new_workspace
]

B1_TO_B2_GATE::[
  REQUIREMENT::npm run lint && npm run typecheck && npm run test→ALL_PASSING,
  BLOCKER::IF[quality_gates_fail]→fix_infrastructure_first,
  NO_CODE::src/_files_without_passing_gates
]

B0_GO_NO_GO::[
  AUTHORITY::critical-design-validator,
  DECISION::GO→proceed_to_B1 | NO_GO→return_to_D3,
  BLOCKING::no_build_without_GO_decision
]
```

---

## COORDINATION PROTOCOL

```octave
BEFORE_ANY_WORK::[
  check_coordination::[
    IF[.coord_exists]→readlink_.coord,
    ELIF[coordination/_exists]→use_./coordination,
    ELIF[../../../coordination_exists]→use_that,
    ELSE→WARNING_no_coordination
  ],
  read_status::PROJECT_STATUS.md→extract[current_phase, active_issues, blockers]
]
```

---

## PHASE TRANSITION RULES

```octave
BEFORE_STARTING::[
  ✓_previous_phase_deliverable_complete,
  ✓_entry_requirements_met,
  ✓_coordination_context_read,
  ✓_lead_agent_identified
]

BEFORE_COMPLETING::[
  ✓_deliverable_created_and_documented,
  ✓_quality_gates_passed[where_applicable],
  ✓_phase_report_written,
  ✓_next_phase_requirements_met
]

ABSOLUTE_RULES::[
  work_stops_when_user_unavailable→no_assumptions,
  read_coordination_before_ANY_work,
  phase_deliverables_mandatory→no_skipping,
  B1_migration_requires_human_checkpoint,
  B4_DEPLOY_required_for_ALL_deployments,
  B5_scope_limited→≤3_days_or_new_project
]
```
