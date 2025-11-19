---
name: subagent-rules
description: Proper delegation patterns for Task() invocations with governance context injection
allowed-tools: ["Task", "Read"]
---

# Subagent Delegation Rules

SUBAGENT_ISOLATION::[
  PRINCIPLE::subagent_receives_ONLY[prompt_parameter]≠auto_context,
  IMPLICATION::YOU_provide[governance+constraints+success_criteria],
  WARNING::no_inherited_context[TRACED,DOD,methodology,phase,authority,skills,project_background]
]

TIERED_DELEGATION::[
  TIER1_BASELINE::all_tasks[goal+constraints+deliverable+authority],
  TIER2_GOVERNANCE::constitutional_agents[+clauses+DOD_subset+escalation],
  TIER3_METHOD::multi_phase[+phase_context+coordination+skills],
  DECISION_TREE::quick_utility→T1|constitutional_agent→T2|multi_phase_orchestration→T3
]

## TIER1::BASELINE_CARD

WHEN::every_Task()_invocation
STRUCTURE::[GOAL, CONSTRAINTS, DELIVERABLE, TASK_DETAILS]

```
Task({
  subagent_type: "agent-name",
  description: "One-sentence summary",
  prompt: `
GOAL::{clear_outcome}
CONSTRAINTS::[timebox:{estimate}, authority:{scope}, blocking_knowledge:{context}]
DELIVERABLE::{format+artifacts}
TASK::{requirements+specifics}
`})
```

## TIER2::+GOVERNANCE_ADDON

WHEN::[implementation-lead, critical-engineer, code-review-specialist, universal-test-engineer]
ADDITIONS::[constitutional_clauses, DOD_subset, escalation_rules]

```
Task({
  subagent_type: "implementation-lead",
  prompt: `
GOAL::{clear_outcome}

GOVERNANCE::[
  TDD::failing_test→RED→GREEN→REFACTOR,
  QUALITY_GATES::lint+typecheck+test→ALL_PASS,
  REVIEW::code-review-specialist[every_change]
]

DOD_{phase}::[criterion_1, criterion_2, criterion_n]
ESCALATION::critical-engineer[architecture]|requirements-steward[North_Star_conflicts]

CONSTRAINTS::[timebox:{estimate}, authority:{decides}+consult:{agents}, context:{links}]
DELIVERABLE::{format+artifacts}
TASK::{requirements}
`})
```

## TIER3::+METHOD_ADDON

WHEN::multi_phase_coordination+agent_orchestration
ADDITIONS::[phase_context, coordination_expectations, skill_loading]

```
Task({
  subagent_type: "implementation-lead",
  prompt: `
GOAL::{clear_outcome}

GOVERNANCE::[clauses_relevant_to_task]
DOD_{phase}::[criteria]
ESCALATION::{triggers}

PHASE::{B1|B2|etc}→[requirement_1, requirement_2]
COORDINATION::[agent_1→responsibility_1, agent_2→responsibility_2]
SKILLS::[
  Skill(command:"build-execution"), // TDD+MIP
  Skill(command:"test-infrastructure") // patterns
]

CONSTRAINTS::[timebox:{estimate}, authority:{scope}, context:{links}]
DELIVERABLE::{format}
TASK::{requirements}
`})
```

## AGENT_TIER_MAPPING

| Agent | Tier | Skills | Timebox |
|-------|------|--------|---------|
| surveyor | 1 | none | 5-10m |
| Explore | 1 | none | 5-15m |
| research-analyst | 1 | none | 10-20m |
| implementation-lead | 2 | build-execution, test-infrastructure | 30-120m |
| critical-engineer | 2 | phase-dependent | 15-30m |
| universal-test-engineer | 2 | test-infrastructure, test-ci-pipeline | 30-60m |
| code-review-specialist | 2 | self | 10-20m |
| workspace-architect | 3 | workspace-setup | 20-40m |
| technical-architect | 2-3 | supabase-operations | varies |
| error-architect | 1-2 | error-triage, ci-error-resolution | 15-45m |

## CONSTITUTIONAL_CLAUSE_PATTERNS

TDD::[failing_test→RED, minimal_impl→GREEN, improve→REFACTOR, git_evidence::"TEST"→"FEAT"]
QUALITY_GATES::[lint+typecheck+test→ALL_PASS, actual_output≠claims]
REVIEW::[code-review-specialist[every_change], pattern_consistency+error_handling+type_safety]
AUTHORITY::[impl_decisions→agent, architecture→critical-engineer, North_Star→requirements-steward]
DOD_PHASES::[B0::validation+plan, B1::workspace+deps, B2::tests+impl, B3::integration+coherence, B4::production+handoff]

## ANTI_PATTERNS

TIER0_MINIMAL::[
  BAD::Task({subagent_type:"implementation-lead", prompt:"Implement auth"}),
  PROBLEM::no_goal+constraints+deliverable+governance
]

AUTO_INJECTION::[
  BAD::Task({prompt:"Follow TRACED and use TDD"}),
  PROBLEM::words≠definitions[subagent_unknown_TRACED]
]

OVER_ENGINEERING::[
  BAD::Task({subagent_type:"surveyor", prompt:"GOVERNANCE::TRACED+DOD+PHASE..."}),
  PROBLEM::T3_context_for_T1_agent→token_waste
]

UNDER_ENGINEERING::[
  BAD::Task({subagent_type:"implementation-lead", prompt:"Build auth. Make good."}),
  PROBLEM::constitutional_agent_needs_governance+DOD
]

## DECISION_LOGIC

```
Quick_utility(≤15min)? → TIER1
  ↓ NO
Constitutional_agent? → TIER2
  ↓ NO → TIER1
Multi_phase_orchestration? → TIER3
  ↓ NO → TIER2
```

EXAMPLES::[
  surveyor[find_files]→T1[GOAL+CONSTRAINTS+DELIVERABLE],
  implementation-lead[feature]→T2[+GOVERNANCE+DOD],
  workspace-architect[B1_setup]→T3[+PHASE+COORDINATION+SKILLS]
]

## SKILLS_BY_AGENT

implementation-lead::[build-execution, test-infrastructure]
error-architect::[error-triage, ci-error-resolution]
workspace-architect::[workspace-setup]
technical-architect::[supabase-operations]
security-specialist::[smartsuite-patterns]
universal-test-engineer::[test-infrastructure, test-ci-pipeline, supabase-test-harness]

## WISDOM

CORE_TRUTH::"Minimal_sufficient_context → Right_tier_for_agent_type → Preserve_decision_logic"
COMPRESSION_ACHIEVED::270→120_lines[55%_reduction]→semantic_fidelity_100pct
PATTERN::"Utility→lean | Constitutional→governed | Orchestration→coordinated"
