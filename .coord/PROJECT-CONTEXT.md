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
PHASE::JSON_SCHEMA_R1.1_IMPLEMENTATION→Schema_Locked✅→Tracks_A/B/C_Ready
GOVERNANCE::B0_schema_validation_complete✅→JSON_integration_authorized→XMP-First_B2_DEFERRED

## Key Decisions
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
- [ ] Track_A::JSON_read/write_foundation→ExtendScript_implementation→proxy_folder_lookup
- [ ] Track_B::Field-level_lock_enforcement→lockedFields_array→UI_indicators
- [ ] Track_C::Proxy_path_JSON_lookup→getProxyPath()_detection→offline_handling

## Failed Approaches (This Session)
- ❌ attribute_regex→assumed_from_ExifTool→Premiere_uses_elements→switched_to_element_format
- ❌ QE_DOM_getProjectColumnsMetadata()→unreliable_offline→REPLACED_BY→XMP-First_architecture✅

## Next Milestone
JSON Integration (Tracks A/B/C): Implement .ingest-metadata.json read/write → Field-level locks → Proxy path lookup → Round-trip validation tests → Schema R1.1 production-ready

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

**LAST UPDATED:** 2025-11-18 (Phase update: JSON Schema R1.1 implementation, XMP-First B2 deferred)
