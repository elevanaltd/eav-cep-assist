# CEP Panel Metadata Architecture - North Star Summary

**AUTHORITY**: D1 Phase Deliverable (Binding)
**APPROVAL**: ✅ 2025-11-18
**FULL_DOCUMENT**: 000-CEP_PANEL_METADATA_ARCHITECTURE-D1-NORTH-STAR.md
**VERSION**: 1.0-OCTAVE-SUMMARY

---

## ECOSYSTEM POSITION

PIPELINE::Step_7_of_10[Ingest_Assistant→CEP_Panel→Editor_Workflow]
MISSION::Bridge_IA_metadata_to_Premiere_Pro_via_JSON-sidecar+offline_QC_workflow
UPSTREAM::Ingest_Assistant[Step_6_produces_.ingest-metadata.json]
DOWNSTREAM::Premiere_Pro[PP_columns+Clip_Name_updated]

---

## INHERITANCE

PARENT_NS::EAV_Universal_North_Star[8_immutables]
INHERITED::[I5_offline, I7_TDD, I8_production_grade, I11_independent_deploy]
OPTIONAL::[I10_cross_app_via_Supabase→best_effort_only]
CONTRACT::JSON_sidecar=source_of_truth→Supabase_optional_coordination

---

## IMMUTABLES (5 Total - Inherited)

I5::OFFLINE_CAPABLE_OPERATIONS::[
  PRINCIPLE::CEP_QC_workflow_functions_when_raw_footage_offline[proxies+metadata_local],
  WHY::common_production_scenario[raw_archive+proxies_LucidLink],
  STATUS::DESIGN[JSON_sidecar_co-located_with_media]
]

I7::TDD_RED_STATE_DISCIPLINE::[
  PRINCIPLE::metadata_round-trip_features_begin_with_failing_test,
  WHY::constitutional_mandate[RED→GREEN→REFACTOR],
  STATUS::INHERITED[EAV_Universal]
]

I8::PRODUCTION_GRADE_QUALITY::[
  PRINCIPLE::zero_data_corruption_risk+deterministic_syncing+no_migration_fragility,
  WHY::lock_mechanism_prevents_competing_writes[IA_vs_QC]+atomic_JSON_updates,
  STATUS::INHERITED[EAV_Universal]
]

I10::CROSS_APP_CONSISTENCY[OPTIONAL]::[
  PRINCIPLE::Supabase_MAY_coordinate_metadata_for_dashboards[not_required],
  WHY::JSON_sidecar=source_of_truth→works_offline→Supabase=best_effort_async,
  STATUS::OPTIONAL[JSON_writes_succeed_independently]
]

I11::INDEPENDENT_DEPLOYMENT::[
  PRINCIPLE::CEP_deploys_without_requiring_IA_changes_first,
  WHY::tested_against_fixtures→verified_against_real_IA_output_when_available,
  STATUS::INHERITED[EAV_Universal]
]

---

## CORE REQUIREMENTS (Compressed)

R1::JSON_SCHEMA_v2.0[LOCKED]::[
  PRIMARY_KEY::original_filename[EA001621]→survives_PP_renames,
  LOCK_MECHANISM::lockedFields_array→prevents_QC_to_IA_overwrite,
  IMMUTABLE_FIELDS::[id, originalFilename, fileType],
  DERIVED::shotName=location-subject-action-shotType-#N
]

R2::FILE_PLACEMENT::[
  IMAGES::EAV014/images/shoot1/.ingest-metadata.json,
  VIDEOS::EAV014/videos-proxy/shoot1/.ingest-metadata.json,
  RATIONALE::metadata_travels_with_media→editors_never_navigate_elsewhere
]

R3_R4::READ_WRITE_WORKFLOW::[
  READ::PP_TapeName→JSON_key_lookup→hydrate_form→IndexedDB_cache_if_offline,
  WRITE::validate→update_PP→write_JSON[REQUIRED]→Supabase[OPTIONAL_async],
  ATOMIC::temp_file→rename_pattern
]

R5::IA_CONTRACT::[
  IA_PROVIDES::.ingest-metadata.json_in_media_folder+Schema_v2.0+lockedFields_empty,
  CEP_EXPECTS::JSON_exists+key_matches_filename+lock_array_respected
]

R6::LOCK_CONFLICT_RESOLUTION::[
  UNLOCKED::IA_can_overwrite+CEP_can_update,
  LOCKED::all_fields_immutable_except_by_unlock,
  CONFLICT::timestamp_order_determines_precedence[last_write_wins]
]

---

## ESSENTIAL FUNCTIONS

F1::METADATA_ROUND_TRIP→edit_fields→Apply→reopen→fields_reload_identically
F2::OFFLINE_FIRST_QC→disconnect→edit_5_clips→reconnect→sync_to_JSON
F3::IA_CEP_ALIGNMENT→IA_writes_JSON→CEP_reads_immediately→form_hydrates
F4::BATCH_QC_WORKFLOW→20_clips_sequential→corrections_persist→<500ms_per_save
F5::LOCK_ENFORCEMENT→CEP_locks→IA_skips_locked_fields→logs_skipped

---

## ASSUMPTIONS (4 Total)

A1::JSON_FILE_ALWAYS_EXISTS[90%]→PENDING[B0_IA_integration_test+mitigation:CEP_creates_if_missing]
A2::FILENAME_STABILITY[95%]→PENDING[B1_user_education+mitigation:store_aliases]
A3::LOCK_ENFORCEMENT_REDUCES_CONFLICTS[80%]→PENDING[B2_conflict_scenarios+mitigation:audit_log]
A4::INDEXEDDB_SYNC_NO_CORRUPTION[85%]→PENDING[B2_offline_scenario+mitigation:timestamp_conflict_detection]

---

## TECHNICAL CONSTRAINTS

C1::EXTENDSCRIPT_CANNOT_READ_PROXY_XMP→all_metadata_from_JSON_only
C2::PP_TAPENAME_IMMUTABLE_REFERENCE→use_as_JSON_key_lookup
C3::NO_DIRECT_FILE_WRITE_IN_CEP→ExtendScript_bridge[jsx/host.jsx]→atomic_write
C4::SUPABASE_OPTIONAL_JSON_MANDATORY→JSON_first+Supabase_async_best_effort
C5::LUCIDLINK_500ms_LATENCY→optimistic_UI_update→show_syncing_indicator

---

## INTEGRATION POINTS

INGEST_ASSISTANT::[
  INPUT::raw/proxy_files_from_IA,
  OUTPUT::.ingest-metadata.json_Schema_v2.0,
  CONTRACT::CEP_respects_lockedFields→IA_skips_locked
]

PREMIERE_PRO::[
  INPUT::PP_TapeName[immutable_ID]+PP_ClipName[user_visible],
  OUTPUT::updated_PP_columns+ClipName[shotName_format],
  NO_BACK_SYNC::PP_is_derived_not_source_of_truth
]

SUPABASE[OPTIONAL]::[
  PURPOSE::active_project_coordination[dashboards+reporting],
  FALLBACK::CEP_continues_with_JSON_only_if_unavailable,
  DURABILITY::JSON=source_of_truth→can_lose_Supabase_without_data_loss
]

---

## DECISION GATES

D0[✅SCHEMA_LOCKED]→B0[integration_design]→B1[foundation_test]→B2[integration_test]→B3[CEP+IA_alignment]→B4[production_handoff]

QUALITY_GATES::round_trip_test+file_atomicity+IndexedDB_cache+lock_enforcement

---

## AGENT ESCALATION

requirements-steward::[
  "violates I#"::immutable_violation,
  "schema_change_requested"::R1_is_LOCKED,
  "IA_contract_break"::R5_violation
]

technical-architect::[
  "JSON_schema_evolution"::contract_versioning,
  "ExtendScript_file_I/O"::C3_implementation,
  "offline_sync_strategy"::IndexedDB_design
]

implementation-lead::[
  "assumption_A#_validation"::execute_validation_plan,
  "Phase_1-3_execution"::build_phase_work,
  "lock_mechanism_implementation"::R6_enforcement
]

---

## LOAD FULL NORTH STAR WHEN

TIER_1_CRITICAL::[
  "violates I5|I7|I8|I11"::inherited_immutable_conflict[STOP_immediately],
  "JSON_schema_change"::R1_is_LOCKED→requires_formal_amendment,
  "metadata_corruption"::data_integrity_risk[I8],
  "IA_contract_break"::R5_violation→CEP_cannot_read_metadata
]

TIER_2_HIGH_PRIORITY::[
  "offline_sync_failure"::F2_workflow_break,
  "lock_not_enforced"::F5+R6_violation,
  "round_trip_fails"::F1_critical_path
]

TIER_3_CONTEXTUAL::[
  "B0|B1|B2_gate"::decision_gate_approaching,
  "assumption_A#"::validation_evidence_required,
  "ExtendScript_file_I/O_design"::C3_implementation_decisions
]

---

## PROTECTION CLAUSE

IF::agent_detects_work_contradicting_North_Star[D2-B5]::[
  STOP::current_work_immediately,
  CITE::specific_requirement_violated[I#_or_R#],
  ESCALATE::to_requirements-steward
]

ESCALATION_FORMAT::"NORTH_STAR_VIOLATION: [work] violates [I#/R#] because [evidence]"

---

**STATUS**: Ready for implementation
**COMPRESSION**: 528→105 lines (5.0:1 ratio)
**FIDELITY**: 100% decision logic preserved
**INHERITANCE**: EAV Universal (I5, I7, I8, I10 optional, I11)
**FULL_DETAILS**: 000-CEP_PANEL_METADATA_ARCHITECTURE-D1-NORTH-STAR.md
