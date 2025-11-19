# CEP Panel (Premiere Pro Ingest Assistant) - Project Context

---

## 🌐 Ecosystem Position

**For complete pipeline positioning (where we fit in EAV production workflow):**
→ **[`ECOSYSTEM-POSITION.md`](ECOSYSTEM-POSITION.md)**

**Pipeline Step:** 7 of 10 | **Role:** Ingestion gateway (raw footage → structured metadata) | **Upstream:** Ingest Assistant | **Downstream:** Edit Web

---

## Project Identity
**Name:** CEP Panel (Premiere Pro Ingest Assistant)
**Purpose:** Adobe Premiere Pro extension for structured metadata tagging and clip organization
**Type:** CEP (Common Extensibility Platform) Panel
**Platform:** Adobe Premiere Pro (macOS/Windows)

## Tech Stack
- **Framework:** Adobe CEP APIs
- **Frontend:** HTML, CSS, JavaScript
- **ExtendScript:** ES3 (Premiere Pro scripting layer)
- **XMP Metadata:** Direct XMP read/write via item.getXMPMetadata() / item.setXMPMetadata()
- **Communication:** CSInterface (CEP ↔ ExtendScript)

## Key Features

### Metadata Tagging & XMP Integration
- **Structured Fields:** Location, Subject, Action, Shot Type
- **Naming Convention:** {location}-{subject}-{action}-{shotType} format
- **XMP Read/Write:**
  - xmpDM:shotName → Combined name (maps to PP Shot field)
  - xmpDM:LogComment → Structured key=value pairs (e.g., location=kitchen, subject=oven, shotType=ESTAB)
  - dc:description → Keywords/tags (Dublin Core standard)
- **IA Compatibility:** Reads/writes same XMP fields as Ingest Assistant (bidirectional workflow)
- **Premiere Pro Integration:** Updates clip Name in project panel

### ML Feedback Loop
- **PP Edits Tracking:** Writes .ingest-metadata-pp.json to original media folder
- **Side-by-side Comparison:** Lives alongside .ingest-metadata.json (IA original)
- **Schema Compatibility:** Identical JSON format for easy diffing
- **ML Training:** Compare AI predictions vs. human corrections
- **Audit Trail:** Tracks modifiedAt, modifiedBy for each edit
- **Documentation:** See docs/002-DOC-ML-FEEDBACK-LOOP.md

## Current Focus
PHASE::PRODUCTION_READY→Track_A_complete✅→CEP_integration_validated✅→JSON_read_working✅→XMP_write_limitations_documented✅
GOVERNANCE::Reality_validation_complete✅→Production_approved✅→XMP_write_limitations_acceptable✅→Documentation_updated✅

## Key Decisions
- [2025-11-19] PRODUCTION_APPROVED→reality_validation_complete→XMP_write_limitations_acceptable→JSON_read_sufficient_for_QC_workflow✅
- [2025-11-19] XMP_WRITE_LIMITATIONS_DOCUMENTED→Clip_Name_reliable✅→Description_uncertain⚠️→Full_JSON_roundtrip_deferred→User_confirmed_acceptable
- [2025-11-18] CEP_INTEGRATION_BUG_FIXED→nodeId_wrapper_functions_added→metadata_loading_confirmed✅
- [2025-11-18] TRACK_A_COMPLETE→JSON_read/write_foundation→code_reviewed✅→committed_fafdf16
- [2025-11-18] FOLDER_LEVEL_COMPLETION_SUFFICIENT→Issue_#37_downgraded_to_enhancement→field_locks_deferred
- [2025-11-18] SCHEMA_R1.1_LOCKED→empirical_PP_testing→shotName_format_confirmed→field-level_locks_validated
- [2025-11-18] JSON_INTEGRATION_AUTHORIZED→Tracks_A/B/C_ready→proxy_folder_priority_strategy_validated
- [2025-11-18] XMP-First_B2_DEFERRED→JSON_sidecar_approach_prioritized→B2_plan_preserved_for_future
- [2025-11-15] B1_WORKSPACE_SETUP→quality_gates_operational→ESLint+TypeScript+Vitest→all_passing
- [2025-11-14] OFFLINE_WORKFLOWS→JSON_sidecar_architecture→North_Star_approved→schema_finalization_required
- [2025-11-14] Issue_#32_RESOLVED→metadata_access_research_complete→JSON_approach_selected

## Active Work
- [x] B0::Schema_R1.1_finalization→empirical_testing_complete→LOCKED✅
- [x] B0::Schema_documentation→authoritative_spec+implementation_guide+migration_guide+quick_ref→complete
- [x] B0::Test_fixtures→R1.1_JSON_created→production_validated
- [x] Track_A::JSON_read/write_foundation→ExtendScript_complete→CEP_integration_deployed→initial_testing_passed✅
- [x] CEP_Panel::Integration→readJSONMetadataByNodeId/writeJSONMetadataByNodeId→wrapper_functions_deployed✅
- [ ] USER_TESTING::Comprehensive_validation→round-trip_metadata→save_functionality→offline_scenarios→NEXT_SESSION
- [ ] Track_B::Field-level_lock_enforcement→lockedFields_array→UI_indicators→DEFERRED (folder-level sufficient)
- [ ] Track_C::Proxy_path_JSON_lookup→getProxyPath()_detection→offline_handling→DEFERRED (Track A handles)

## Failed Approaches (This Session)
- ❌ attribute_regex→assumed_from_ExifTool→Premiere_uses_elements→switched_to_element_format
- ❌ QE_DOM_getProjectColumnsMetadata()→unreliable_offline→REPLACED_BY→XMP-First_architecture✅

## Next Milestone
USER VALIDATION (Next Session): Comprehensive testing with multiple JSON files → Round-trip save validation → Edit workflow testing → Production deployment decision → Issue #38 (unit tests) before production

## Recent User Feedback
> "The purpose of the metadata panel is for users to review the metadata against the photos to do QC and amend where wrong. It is vital." (offline workflow requirement)

---
Full history: (No PROJECT-HISTORY.md yet - append if created)

## Related Documentation

**EAV Ecosystem:**
- **Full Pipeline:** `/Volumes/HestAI-Projects/eav-monorepo/.coord/workflow-docs/002-EAV-PRODUCTION-PIPELINE.md`
- **North Star:** `/Volumes/HestAI-Projects/eav-monorepo/.coord/workflow-docs/000-UNIVERSAL-EAV_SYSTEM-D1-NORTH-STAR.md`

**External Tools:**
- **Ingest Assistant:** `/Volumes/HestAI-Projects/ingest-assistant/.coord/ECOSYSTEM-POSITION.md`

**This Project:**
- **Ecosystem Position:** ECOSYSTEM-POSITION.md (detailed pipeline positioning)
- **ML Feedback Loop:** docs/002-DOC-ML-FEEDBACK-LOOP.md

---

**LAST UPDATED:** 2025-11-18 (Track A complete, CEP integration deployed, initial metadata loading confirmed - comprehensive testing next session)
