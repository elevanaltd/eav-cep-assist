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
PHASE::B2_XMP-First_refactor→APPROVED✅→5_days_execution_ready
GOVERNANCE::B1_workspace_complete✅→B2_build_plan_validated✅→CDA_CONDITIONAL_GO→FINAL_GO_issued

## Key Decisions
- [2025-11-15] B2_BUILD_PLAN→validated_by_CDA→CONDITIONAL_GO→3_MUST_FIX_incorporated→FINAL_GO_approved
- [2025-11-15] B1_WORKSPACE_SETUP→quality_gates_operational→ESLint+TypeScript+Vitest→all_passing
- [2025-11-15] TIMELINE_ADJUSTMENT→4_days_optimistic→5_days_realistic→6.5h_buffer_for_ExtendScript
- [2025-11-14] XMP_FORMAT→element_format[vs attribute_format]→Premiere_returns_<tag>value</tag>≠tag="value"
- [2025-11-14] OFFLINE_WORKFLOWS→XMP-First_architecture→ADR-003_APPROVED→POC_validated_all_tests_passed
- [2025-11-14] Issue_#32_RESOLVED→getProjectMetadata()_API_confirmed→9877_chars_XMP_in_project→offline_safe

## Active Work
- [x] XMP::LogComment_parsing→fixed→online_works
- [x] RESEARCH::offline_metadata_access→XMP-First_validated→ADR-003_approved
- [x] B1::workspace_setup→quality_gates_operational✅→ESLint+TypeScript+Vitest_passing
- [ ] B2::XMP-First_refactor→5_days_validated→17_tasks→FINAL_GO_approved→execution_start_ready

## Failed Approaches (This Session)
- ❌ attribute_regex→assumed_from_ExifTool→Premiere_uses_elements→switched_to_element_format
- ❌ QE_DOM_getProjectColumnsMetadata()→unreliable_offline→REPLACED_BY→XMP-First_architecture✅

## Next Milestone
B2 Phase: XMP-First refactor (5 days, 17 tasks) → Replace QE DOM with XMPScript APIs → Offline workflows enabled → Issue #32 closed

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

**LAST UPDATED:** 2025-11-15
