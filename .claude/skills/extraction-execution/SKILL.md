---
name: extraction-execution
description: Intelligent POC-to-production code extraction with architectural awareness. Analyzes dependencies, adapts patterns, makes extraction strategy decisions (copy/adapt/rewrite), maintains system coherence. Performs pre-extraction analysis, transformation reasoning, quality gate enforcement, evidence-based commits. Use when extracting code requires understanding architecture, adapting patterns, threading parameters, or maintaining coherence across modules. Triggers on understand and extract, analyze dependencies, adapt pattern, extraction strategy, architectural extraction, intelligent migration.
allowed-tools: Read, Write, Edit, Bash, Glob, Grep
---

# Extraction Execution

PHILOSOPHY::"Understand→Transform→Validate" // Intelligence≠mechanical_copying
COMPLEXITY::mechanical[5%]+intelligent[95%]→comprehension[30%]+transformation[40%]+validation[25%]

---

## MINIMAL INTERVENTION PRINCIPLE (MIP)

```octave
MIP_CORE::"What_is_SMALLEST_extraction→compilation+functionality?"
FORBIDDEN::"What_could_we_extract_while_here?"

MIP_DECISION_MATRIX::[
  ESSENTIAL[required_for_feature→compile+run]→EXTRACT,
  ACCIDENTAL[could_stub_or_mock]→EVALUATE[stub_if_simple],
  CONVENIENCE["might_need_later"]→REJECT
]

DEPENDENCY_MATRIX::USAGE_DRIVEN::[
  9+_usages+ESSENTIAL→EXTRACT[too_coupled_to_stub],
  3-8_usages→JUDGMENT[context_dependent],
  1-2_usages→STUB_OR_INLINE[avoid_bloat],
  0_usages→REMOVE[dead_import]
]

MIP_CHECKPOINTS::BEFORE_EXTRACTION::[
  COMPILATION::"Does_module_fail_without_this?",
  FUNCTIONALITY::"Does_feature_break_without_this?",
  COUPLING::"Is_usage_count_high_enough[stub<extract]?",
  BLOAT_TEST::"Would_we_regret_10th_convenience_extraction?"
]→ALL[NO]→DONT_EXTRACT
```

---

## EXTRACTION STRATEGY DECISION TREE

```octave
ANALYZE_POC_CODE::[
  Read[POC/target_module],
  grep["^import.*from"]→map_direct_imports,
  grep["pattern\."]→analyze_usage_count,
  APPLY→MIP_MATRIX→decisions
]

STRATEGY_TREE::[
  POC_fits_production→COPY_VERBATIM[5%],
  POC_mostly_fits→ADAPT_PATTERN[80%],
  POC_wrong_approach→REWRITE[15%]
]

ADAPTATION_INDICATORS::[
  ✅core_logic_sound,
  ✅business_rules_correct,
  ⚠️structure_needs_changes,
  ⚠️hard_coded→config
]

REWRITE_INDICATORS::[
  ❌violates_principles,
  ❌simpler_fresh,
  ❌architectural_debt
]
```

---

## TRANSFORMATION PATTERNS (FEW-SHOT)

```octave
PATTERN_1::CAPABILITY_CONFIG::[
  POC→"hard_coded_validation→throw_error",
  PRODUCTION→"CommentCapabilities{requireAnchors,enableRecovery,enableIntegration}",
  TRANSFORM→add_capabilities_param+conditional_logic+Result_type
]

PATTERN_2::DEPENDENCY_INJECTION::[
  POC→"import{supabase}from'../lib/client'→global_singleton",
  PRODUCTION→"(supabaseClient:SupabaseClient)→injected_first_param",
  TRANSFORM→remove_global_import+add_client_param+interface_types
]

PATTERN_3::ERROR_HANDLING::[
  POC→"throw new Error('msg')",
  PRODUCTION→"{success:false,error:{code,message,field}}",
  TRANSFORM→throw→Result_type
]
```

**Example: AuthContext Extraction**
```
PLANNED: 1 file
ANALYSIS: grep["^import"]→{logger[9_usages], mapper[3_usages], supabase[global]}
MATRIX_APPLICATION:
  - logger[9]→EXTRACT (too coupled)
  - mapper[3]→EXTRACT (moderate coupling)
  - supabase→TRANSFORM_DI (global→injected)
ACTUAL: 4 modules extracted (logger.ts[149], userProfileMapper.ts[82], AuthContext, browser.ts)
```

---

## EXECUTION WORKFLOW

```octave
PHASE_0::PRE_EXTRACTION_ANALYSIS[MANDATORY_FIRST]::[
  Read[POC/target_module]→analyze[purpose, patterns, assumptions],
  grep_dependencies→map_usage_counts,
  APPLY→MIP_MATRIX→extraction_decisions,
  CATALOG_PATTERNS→transformation_strategy
]

PHASE_1::STRATEGIC_EXTRACTION::[
  Write[NEW_abstractions]→IF[needed],
  cp[POC→production]→base_copy,
  Edit[production]→TRANSFORM[add_params+DI+Result_types+fix_imports],
  Read[production]→verify_signatures,
  RUN→quality_gates→BLOCKING
]

PHASE_2::DEPENDENCY_RESOLUTION::[
  DISCOVER→grep[-r "functionName"]→map_call_chain,
  THREAD_PARAMS→BOTTOM_UP[repository→mutations→hooks],
  VALIDATE→grep[-r "usages"]→verify_all_call_sites
]

PHASE_3::COHERENCE_VALIDATION::[
  CHECK_LAYER_ARCHITECTURE→domain/state/hooks/extensions,
  CHECK_NAMING_CONSISTENCY→camelCase/PascalCase/files,
  CHECK_ABSTRACTION_BOUNDARIES→domain[no_hooks],
  INTEGRATION_SMOKE→pnpm[turbo_build]
]
```

---

## QUALITY GATES (BLOCKING)

```octave
GATE_EXECUTION::MANDATORY::[
  PRE→git[status]→REQUIRED[clean OR feature_branch],

  GATE_1::pnpm[turbo_typecheck --filter=target]→EXIT≠0→HALT,
  GATE_2::pnpm[turbo_lint --filter=target]→EXIT≠0→HALT,
  GATE_3::pnpm[turbo_test --filter=target]→EXIT≠0→HALT,

  SUCCESS→"✅gates_PASSED[typecheck+lint+test]"
]→NO_BYPASS

GIT_SAFETY::[
  CHECKPOINT→git[commit "checkpoint: pre-extraction baseline"],
  WORK→extraction+transformation,
  FAILURE→git[reset --hard HEAD~1]→rollback
]

INCREMENTAL_VALIDATION::[
  FORBIDDEN→batch[extract_all→fix_all→test_once],
  REQUIRED→PER_MODULE[extract→transform→validate→✓→next]
]
```

---

## COMMIT STRUCTURE (FEW-SHOT EXAMPLE)

```
<type>(scope): <summary>

**Phase: <name> (<percent>% total)**

Extracted (<count>):
- <module>: <LOC> - <transformation>

**Transformations:**
- <pattern>: <change>

**Dependencies:**
- <dep>: <why_extracted>

**Quality Gates:**
- Build: ✅ EXIT 0
- TypeCheck: ✅ 0 errors
- Lint: ✅ 0 errors
- Tests: ✅ X/Y passing

**Architecture:**
- <coherence_notes>

Per <plan>, <North_Star>
TRACED: <evidence>

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## ESCALATION TRIGGERS

```octave
ESCALATE_TO::[
  technical-architect→WHEN[needs_redesign, unclear_pattern, multiple_strategies],
  critical-engineer→WHEN[gates_fail_3x, boundaries_violated, risk_assessment],
  mcp__hestai__debug→WHEN[mysterious_failures, import_resolution_persists],
  test-methodology-guardian→WHEN[coverage_gaps, fixture_redesign]
]

RED_FLAGS::[
  circular_dependency,
  unplanned_package_dep,
  violates_patterns[domain+hooks],
  requires_5+_module_changes,
  layer_violations
]
```

---

## TRACED COMPLIANCE

```octave
INTEGRATION::[
  T→quality_gates[test_execution→BLOCKING],
  R→structured_commits[code-review-specialist],
  A→pre_extraction_analysis[dependency_mapping],
  C→escalate_complex[specialists],
  E→transformation_execution[safety_guardrails],
  D→evidence_based_commits
]
```

---

**The hard part isn't copying files—it's understanding what to extract, how to adapt it, and ensuring it fits. This skill handles the 95% requiring thought, not the 5% that's mechanical.**
