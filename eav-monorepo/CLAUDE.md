===EAV_OPERATIONS_HUB===

PROJECT::7_app_monorepo[copy-editor, scenes, vo, cam-op, edit, translations, data-entry]
PURPOSE::Multi-client_video_production_pipeline[component_spine + parallel_workflows]
PHASE::B4[copy-editor_operational]→Phase_4_planning[integration_tests + remaining_apps]
REPOSITORY::/Volumes/HestAI-Projects/eav-monorepo

===DOCUMENTATION_ARCHITECTURE===

// Pattern: Dashboard (PROJECT) × Detail (APP) → Zero duplication

HIERARCHY::[
  PROJECT_LEVEL::system_dashboard[all_apps + shared_infrastructure + cross_app_decisions],
  APP_LEVEL::detailed_implementation[app_specific_phases + architecture + decisions]
]

PROJECT_DOCS::[
  LOCATION::.coord/PROJECT-CONTEXT.md + .coord/PROJECT-CHECKLIST.md,
  TRACKED::git_committed[binding_decisions + system_state],
  SCOPE::multi_app_concerns + @workspace/shared + CI_pipeline + North_Star_alignment,
  UPDATE_WHEN::[phase_transitions, system_infrastructure_changes, cross_app_decisions, quality_gate_status]
]

APP_DOCS::[
  LOCATION::.coord/apps/{app-name}/APP-CONTEXT.md + APP-CHECKLIST.md,
  TRACKED::gitignored[high_churn + ephemeral_scaffolding],
  SCOPE::single_app_implementation + app_architecture + detailed_tasks,
  UPDATE_WHEN::[app_progress, app_decisions, task_completion, gap_resolution]
]

BINDING_DECISIONS::[
  LOCATION::.coord/DECISIONS.md,
  TRACKED::git_committed[permanent_record],
  FORMAT::"Token: HO-DECISION-NAME-YYYYMMDD | Authority: holistic-orchestrator | Rationale: ...",
  PURPOSE::architectural_rationale + future_reference
]

WORK_ATTRIBUTION::"Work stays where it happened, impact surfaces at PROJECT level"

===COORDINATION_TRACKING===

// Selective .coord tracking (git commit cd0db53)
// WHY: North Star I7 (traceability) + I8 (production-grade docs)

TRACKED_ARTIFACTS::[
  .coord/workflow-docs/*NORTH-STAR*.md::immutable_requirements[I1-I12],
  .coord/DECISIONS.md::architectural_decisions_with_rationale,
  .coord/PROJECT-CONTEXT.md::system_state_dashboard,
  .coord/PROJECT-CHECKLIST.md::high_level_task_status,
  .coord/PROJECT-HISTORY.md::historical_binding_context,
  .coord/test-context/*.md::binding_test_infrastructure[constitutional_test_standards + critical_CI_patterns]
]

GITIGNORED_EPHEMERAL::[
  .coord/sessions/::session_notes + handoffs,
  .coord/reports/::interim_work_evidence,
  .coord/apps/::app_specific_docs[high_churn],
  .coord/SESSION-HANDOFF*.md::handoff_artifacts,
  .coord/RESUMPTION-PROMPT.md::session_resumption
]

===MONOREPO_STRUCTURE===

APPS::[
  copy-editor::B4_production_operational["https://eav-copy-editor.vercel.app/"],
  scenes-web::planned_Phase_1[awaiting_extraction],
  vo-web::planned_Phase_4,
  cam-op-pwa::planned_Phase_4[offline_capable],
  edit-web::planned_Phase_4,
  translations-web::planned_Phase_4,
  data-entry-web::planned_Phase_4
]

SHARED_PACKAGES::[
  @workspace/shared::v0.5.0[
    exports::[auth, comments, scripts, services, editor, database, errors],
    quality::[Lint_✅, TypeCheck_✅, Build_✅, Tests_377/383_98.4pct],
    pattern::singleton_enforced[Supabase_client, AuthContext],
    builds::[ESM, CJS, DTS]
  ]
]

INFRASTRUCTURE::[
  supabase::single_migration_source[/supabase/migrations/]→all_apps_identical_schema,
  CI::[Tier_1_operational[lint→typecheck→test_unit→build], Tier_2_fixed[test_integration]],
  deployment::Vercel_monorepo[independent_per_app]→zero_blast_radius,
  turborepo::task_orchestration + caching
]

===NORTH_STAR_IMMUTABLES===

// Binding requirements (I1-I12) - See .coord/workflow-docs/*NORTH-STAR*.md

CRITICAL_IMMUTABLES::[
  I1::component_based_content_spine[stable_identity_throughout_pipeline],
  I2::multi_client_data_isolation[RLS_database_layer],
  I6::component_spine + app_specific_state[prevents_deployment_coupling],
  I7::TDD_RED_discipline[failing_test→git_BEFORE_implementation],
  I8::production_grade_from_day_one[no_MVP_thinking_shortcuts],
  I11::independent_deployment_architecture[zero_blast_radius_between_apps],
  I12::single_Supabase_migration_source[/supabase/migrations/]→prevents_split_brain
]

CONSTITUTIONAL_COMPLIANCE::[
  TDD_evidence::git_log_shows[TEST_commit→FEAT_commit]→RED→GREEN→REFACTOR,
  quality_gates::ALL_MUST_PASS[lint_0_errors, typecheck_0_errors, tests_passing, build_success],
  RACI_consultations::critical_engineer[tactical] + principal_engineer[strategic] + requirements_steward[alignment]
]

===QUALITY_GATES===

MANDATORY_BEFORE_PHASE_PROGRESSION::[
  lint::"npm run lint" → 0_errors,
  typecheck::"npm run typecheck" → 0_errors,
  test::"npm run test:unit" → all_passing[quarantined_documented],
  build::"npm run build" → success[all_workspaces]
]

CI_PIPELINE::[
  Tier_1::all_commits[lint→typecheck→test_unit→build]→blocks_merge_if_fails,
  Tier_2::PRs_only[test_integration]→functional_change_detection,
  status::Tier_1_✅_operational + Tier_2_✅_fixed
]

TRACED_PROTOCOL::[
  T::test_first[RED→GREEN→REFACTOR]→git_evidence,
  R::code_review_specialist[every_change],
  A::critical_engineer[architectural_decisions],
  C::consult_specialists[domain_triggers],
  E::quality_gates[lint + typecheck + test]→ALL_MUST_PASS,
  D::todowrite + atomic_commits
]

===AGENT_GUIDANCE===

CONSTITUTIONAL_AGENTS::@.claude/agents/[implementation-lead, universal-test-engineer, code-review-specialist, critical-engineer, test-infrastructure-steward, quality-observer].oct.md
OPERATIONAL_SKILLS::@.claude/skills/[build-execution, test-infrastructure, test-ci-pipeline, supabase-test-harness]/
AGENT_ACTIVATION::@.claude/github-agents/ACTIVATION-GUIDE.md

// Agents: Read your constitutional identity from .claude/agents/{role}.oct.md based on task type
// Skills: Load operational knowledge from .claude/skills/{skill}/ when referenced in constitutions

CONTEXT_INITIALIZATION::[
  ALWAYS_READ_FIRST::[
    .coord/PROJECT-CONTEXT.md::system_state_dashboard,
    .coord/PROJECT-CHECKLIST.md::high_level_tasks,
    .coord/workflow-docs/*NORTH-STAR*.md::immutable_requirements,
    .coord/DECISIONS.md::architectural_rationale
  ],
  CONDITIONAL_READ::[
    IF[working_on_specific_app]→.coord/apps/{app}/APP-CONTEXT.md,
    IF[investigating_gap]→.coord/reports/,
    IF[resuming_session]→.coord/sessions/
  ]
]

DOCUMENTATION_UPDATES::[
  WHEN[app_phase_complete]→UPDATE[PROJECT-CONTEXT + APP-CONTEXT],
  WHEN[architectural_decision]→UPDATE[DECISIONS.md + PROJECT-CONTEXT],
  WHEN[task_complete]→UPDATE[PROJECT-CHECKLIST + APP-CHECKLIST],
  WHEN[quality_gate_change]→UPDATE[PROJECT-CONTEXT],
  NEVER::[duplicate_content[PROJECT+APP], mix_abstraction_levels, update_wrong_scope]
]

ISSUE_TRACKING::[
  CREATE_GIT_ISSUE_WHEN::[
    systemic_problems[cannot_fix_immediately],
    cross_app_concerns[coordination_required],
    technical_debt[needs_prioritization],
    discovered_bugs[deprioritized_for_later],
    security_performance_concerns[investigation_required],
    recurring_patterns[observed_across_apps]
  ],
  SKIP_GIT_ISSUE_WHEN::[
    fixed_immediately[current_session],
    minor_implementation_details[solved_during_feature],
    temporary_scaffolding[documented_in_.coord],
    already_tracked[TodoWrite_or_PROJECT-CHECKLIST]
  ],
  COORDINATION_PHILOSOPHY::[
    git_issues::long_term_backlog + prioritization + cross_session_visibility,
    .coord_docs::binding_decisions + system_state + phase_artifacts,
    TodoWrite::current_session_task_execution
  ],
  AGENT_BEHAVIOR::WHEN[discover_systemic_issue]→SUGGEST["Recommend git issue: {title} ({label})"]
]

CONSTITUTIONAL_AUTHORITIES::[
  holistic_orchestrator::system_coherence + gap_ownership + ultimate_accountability,
  critical_engineer::tactical_validation["Will this work now?"],
  principal_engineer::strategic_validation["Will this survive 6 months?"],
  test_methodology_guardian::test_discipline + integration_test_architecture,
  requirements_steward::North_Star_alignment + scope_boundaries
]

PHASE_DETECTION::[
  CHECK_ARTIFACTS::[
    B4→HANDOFF_exists,
    B3→INTEGRATION_REPORT_exists,
    B2→tests/**/*.test.ts_exists,
    B1→BUILD_PLAN_exists,
    B0→VALIDATION_exists,
    D3→BLUEPRINT_exists,
    D2→IDEATION_exists,
    D1→NORTH_STAR_exists
  ],
  REFERENCE::git_log + PROJECT-CONTEXT.md→determine_current_phase
]

===WORKFLOW_PATTERNS===

GIT_COMMITS::[
  CONVENTIONAL_FORMAT::"type(scope): description"→feat|fix|docs|refactor|test|chore,
  TDD_SEQUENCE::"TEST: Add X" → "FEAT: Implement X"→git_evidence_RED→GREEN,
  ATOMIC::"One logical change per commit"→enables_clean_history,
  SIGN_OFF::"🤖 Generated with Claude Code\n\nCo-Authored-By: Claude <noreply@anthropic.com>"
]

BRANCH_STRATEGY::[
  main::production_ready[CI_passing + quality_gates_✅],
  feature/*::development_branches[merge_via_PR],
  worktrees::parallel_context_work[/worktrees/gitignored]
]

MONOREPO_COMMANDS::[
  quality::"npm run lint && npm run typecheck && npm run test:unit && npm run build",
  focused::"pnpm turbo run {task} --filter={workspace}"→single_app_only,
  workspace_structure::"apps/{app-name}/ + packages/shared/",
  turborepo::"turbo.json orchestrates task dependencies"
]

===QUICK_REFERENCE===

FILE_LOCATIONS::[
  North_Star::.coord/workflow-docs/000-UNIVERSAL-EAV_SYSTEM-D1-NORTH-STAR.md,
  Decisions::.coord/DECISIONS.md,
  Architecture::.coord/architecture-decisions/,
  Test_Infrastructure::.coord/test-context/[RULES.md, EXTRACTION-TESTING-POLICY.md, SUPABASE-HARNESS.md],
  Project_Context::.coord/PROJECT-CONTEXT.md,
  Project_Checklist::.coord/PROJECT-CHECKLIST.md,
  App_Context::.coord/apps/{app}/APP-CONTEXT.md,
  App_Checklist::.coord/apps/{app}/APP-CHECKLIST.md
]

CRITICAL_PATTERNS::[
  dashboard_model::"PROJECT = overview + references, APP = detailed implementation",
  work_attribution::"Implementation stays in APP, impact surfaces in PROJECT",
  selective_tracking::"Binding decisions committed, ephemeral scaffolding gitignored",
  TDD_discipline::"RED (test) → GREEN (implementation) → REFACTOR (improve)",
  singleton_pattern::"Supabase client + AuthContext enforced across all apps"
]

CONSTITUTIONAL_QUICK_CHECK::[
  I7_TDD::"Does git log show TEST before FEAT?",
  I8_production_grade::"Zero warnings? Strict TypeScript? RLS policies?",
  I11_independent_deploy::"Can this app deploy without coordinating others?",
  I12_single_migration::"Are all migrations at /supabase/migrations/?"
]

===TROUBLESHOOTING===

COMMON_ISSUES::[
  stale_docs::"git log .coord/PROJECT-CONTEXT.md"→verify_recent_commits,
  missing_context::"git show HEAD:.coord/PROJECT-CONTEXT.md"→check_tracked_artifacts,
  collaboration_blocked::".coord/DECISIONS.md"→check_architectural_rationale,
  phase_confusion::"git log + PROJECT-CONTEXT.md"→determine_current_phase
]

===WISDOM===

CORE_TRUTHS::[
  "Dashboard (PROJECT) guides to detail (APP) → No duplication",
  "Production-grade applies to docs, not just code",
  "Solo developer collaborates with future self → Rationale critical",
  "I7 traceability + I8 production-grade → Documentation architecture",
  "1 dashboard + 7 apps → Linear scaling (not quadratic duplication)"
]

===END===

<!-- Constitutional Authority: holistic-orchestrator (cd0db53) -->
<!-- Last Updated: 2025-11-04 -->
<!-- Pattern: Selective .coord tracking + Dashboard documentation model + Git issue tracking -->

<!-- CI Optimization: paths-ignore for documentation-only changes (test-infrastructure-steward, 2025-11-04) -->
<!-- Documentation changes skip CI quality gates (saves ~8-10 minutes per commit) while all code changes run full pipeline -->
