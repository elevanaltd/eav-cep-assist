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
PHASE::PRODUCTION_READY→Track_A✅→Track_B_JSON_write✅→User_testing_in_progress
GOVERNANCE::JSON_read/write_working✅→PP_Clip_Name_update_working✅→Navigation_checkmarks_working✅

## Key Decisions
- [2025-11-25] STABLE_FILENAME_LOOKUP→use_mediaPath/proxyPath_not_clip.name→survives_clip_rename✅
- [2025-11-25] TRACK_B_JSON_WRITE→writeJSONMetadataByNodeIdInline→shotName_computed→PP_Clip_Name_updated✅
- [2025-11-25] ALL_FIELDS_VISIBLE→removed_video-only_filter→location+subject+action+shotType_available_for_images✅
- [2025-11-25] NAVIGATION_CHECKMARK→added_structured_name_detection→clips_with_naming_pattern_show_✓
- [2025-11-19] PRODUCTION_APPROVED→XMP_write_limitations_acceptable→JSON_read_sufficient_for_QC_workflow✅

## Active Work
- [x] Track_A::JSON_read→working✅
- [x] Track_B::JSON_write→implemented→shotName_computed→PP_Clip_Name_updated✅
- [x] STABLE_LOOKUP::extractOriginalFilename()→from_path_not_clip.name→reload_survives_rename✅
- [ ] PRODUCTION_TESTING::Comprehensive_validation→round-trip_complete→edge_cases_remaining

## Blockers
- None currently

## Next Milestone
MERGE TO MAIN: Quality gates passing (131 tests) → User acceptance complete → Create PR from chore/update-dependencies

## Recent User Feedback
> "This is all working very well" (JSON read/write flow)
> "It doesn't change to a green tick" (Navigation checkmark - FIXED)

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

**LAST UPDATED:** 2025-11-25 (Track B JSON write complete, stable filename lookup, PP Clip Name update, Navigation checkmarks)
